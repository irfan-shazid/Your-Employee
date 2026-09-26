import { pricing } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import type { EmployerProfile, WorkerProfile } from "../../generated/prisma/client.js";
import { conflict, notFound } from "../../lib/errors.js";
import { notify } from "../../lib/notify.js";
import { findPage } from "../../lib/pagination.js";
import { createHire } from "../hires/hires.service.js";
import { jobInclude, serializeJob } from "../jobs/jobs.service.js";

export async function listWorkerApplications(worker: WorkerProfile, query: { cursor?: string; limit: number }) {
  const page = await findPage(
    (args) =>
      prisma.application.findMany({
        where: { workerId: worker.id },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        include: { job: { include: jobInclude }, hire: { select: { id: true, status: true } } },
        ...args,
      }),
    query,
  );
  return {
    items: page.items.map((a) => ({
      id: a.id,
      status: a.status,
      message: a.message,
      createdAt: a.createdAt,
      hire: a.hire,
      job: serializeJob(a.job),
    })),
    nextCursor: page.nextCursor,
  };
}

export async function withdraw(applicationId: string, worker: WorkerProfile) {
  const app = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!app || app.workerId !== worker.id) throw notFound("Application not found");
  if (app.status !== "PENDING" && app.status !== "SHORTLISTED") throw conflict("This application can no longer be withdrawn");

  await prisma.$transaction([
    prisma.application.update({ where: { id: app.id }, data: { status: "WITHDRAWN" } }),
    prisma.job.update({ where: { id: app.jobId }, data: { applicationsCount: { decrement: 1 } } }),
  ]);
}

/** Load an application on one of this employer's jobs. */
async function ownApplication(applicationId: string, employer: EmployerProfile) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { job: true, worker: { select: { userId: true } }, hire: true },
  });
  if (!app || app.job.employerId !== employer.id) throw notFound("Application not found");
  return app;
}

export async function shortlist(applicationId: string, employer: EmployerProfile) {
  const app = await ownApplication(applicationId, employer);
  if (app.status !== "PENDING") throw conflict("Only new applications can be shortlisted");
  await prisma.application.update({ where: { id: app.id }, data: { status: "SHORTLISTED" } });
  await notify({
    userId: app.worker.userId,
    type: "APPLICATION_SHORTLISTED",
    title: "You've been shortlisted",
    body: `Your application for "${app.job.title}" was shortlisted.`,
    data: { jobId: app.jobId },
  });
}

export async function reject(applicationId: string, employer: EmployerProfile) {
  const app = await ownApplication(applicationId, employer);
  if (app.status !== "PENDING" && app.status !== "SHORTLISTED") throw conflict("This application can't be rejected");
  await prisma.application.update({ where: { id: app.id }, data: { status: "REJECTED" } });
  await notify({
    userId: app.worker.userId,
    type: "APPLICATION_REJECTED",
    title: "Application update",
    body: `The employer chose someone else for "${app.job.title}". Keep going — new jobs are posted every day.`,
    data: { jobId: app.jobId },
  });
}

/** Hire an applicant: one hiring fee, paid via SSLCommerz or a free credit. */
export async function hireApplicant(applicationId: string, employer: EmployerProfile, useCredit: boolean) {
  const app = await ownApplication(applicationId, employer);

  if (app.hire?.status === "PENDING_PAYMENT") return { hire: app.hire, requiresPayment: true, fee: pricing.hire };
  if (app.hire && app.hire.status !== "CANCELLED") throw conflict("This worker is already hired for this job");
  if (app.status !== "PENDING" && app.status !== "SHORTLISTED") throw conflict("This application can't be hired");
  if (app.job.status !== "OPEN") throw conflict("This job is not open");

  // A cancelled earlier hire keeps the unique applicationId — release it first.
  if (app.hire) await prisma.hire.update({ where: { id: app.hire.id }, data: { applicationId: null } });

  const { job } = app;
  return createHire(
    employer,
    {
      workerId: app.workerId,
      jobId: job.id,
      applicationId: app.id,
      categoryId: job.categoryId,
      source: "APPLICATION",
      title: job.title,
      description: job.description,
      wageAmount: job.wageAmount,
      wageType: job.wageType,
      startDate: job.startDate,
      division: job.division,
      district: job.district,
      area: job.area,
      address: job.address,
    },
    useCredit,
  );
}

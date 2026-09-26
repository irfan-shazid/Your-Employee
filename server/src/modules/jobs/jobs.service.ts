import { pricing } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import type { EmployerProfile, JobStatus, Prisma, WorkerProfile } from "../../generated/prisma/client.js";
import { ApiError, badRequest, conflict, notFound } from "../../lib/errors.js";
import { notify } from "../../lib/notify.js";
import { findPage } from "../../lib/pagination.js";
import type { SessionUser } from "../../lib/session-cache.js";
import {
  categorySelect,
  isSubscriptionActive,
  publicEmployer,
  publicEmployerSelect,
  publicWorker,
  publicWorkerSelect,
} from "../../shared/serializers.js";
import type { CreateJobInput, JobFeedQuery } from "./jobs.schemas.js";

export const jobInclude = {
  category: { select: categorySelect },
  employer: { select: { ...publicEmployerSelect, userId: true } },
} satisfies Prisma.JobInclude;

type JobRow = Prisma.JobGetPayload<{ include: typeof jobInclude }>;

export function serializeJob({ employer, employerId: _employerId, ...job }: JobRow) {
  return { ...job, employer: publicEmployer(employer) };
}

const feedOrder: Record<JobFeedQuery["sort"], Prisma.JobOrderByWithRelationInput[]> = {
  newest: [{ isUrgent: "desc" }, { publishedAt: "desc" }, { id: "asc" }],
  wage: [{ wageAmount: "desc" }, { id: "asc" }],
  start: [{ startDate: "asc" }, { id: "asc" }],
};

/** Open jobs for the feed. `workerId` adds the worker's own application to each item. */
export async function listOpenJobs(query: JobFeedQuery, workerId: string | null) {
  const where: Prisma.JobWhereInput = {
    status: "OPEN",
    ...(query.categoryId && { categoryId: query.categoryId }),
    ...(query.division && { division: query.division }),
    ...(query.district && { district: query.district }),
    ...(query.urgent === "true" && { isUrgent: true }),
    ...(query.q && {
      OR: [
        { title: { contains: query.q, mode: "insensitive" } },
        { area: { contains: query.q, mode: "insensitive" } },
        { description: { contains: query.q, mode: "insensitive" } },
      ],
    }),
  };

  const page = await findPage(
    (args) =>
      prisma.job.findMany({
        where,
        orderBy: feedOrder[query.sort],
        include: {
          ...jobInclude,
          // "Applied" badges without an extra request; non-workers match nothing.
          applications: { where: { workerId: workerId ?? "-" }, select: { id: true, status: true } },
        },
        ...args,
      }),
    query,
  );

  return {
    items: page.items.map(({ applications, ...job }) => ({ ...serializeJob(job), myApplication: applications[0] ?? null })),
    nextCursor: page.nextCursor,
  };
}

export async function listEmployerJobs(employerId: string, query: { status?: JobStatus; cursor?: string; limit: number }) {
  const page = await findPage(
    (args) =>
      prisma.job.findMany({
        where: { employerId, status: query.status ?? { not: "REMOVED" } },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        include: jobInclude,
        ...args,
      }),
    query,
  );
  return { items: page.items.map(serializeJob), nextCursor: page.nextCursor };
}

/** Jobs are created unpaid; they go live when the ৳ job-post payment succeeds. */
export async function createJob(employerId: string, input: CreateJobInput) {
  const category = await prisma.category.findFirst({ where: { id: input.categoryId, isActive: true }, select: { id: true } });
  if (!category) throw badRequest("Invalid category");
  const job = await prisma.job.create({ data: { ...input, employerId }, include: jobInclude });
  return serializeJob(job);
}

export async function getJobDetail(jobId: string, user: SessionUser) {
  const job = await prisma.job.findUnique({ where: { id: jobId }, include: jobInclude });
  if (!job) throw notFound("Job not found");

  const isOwner = job.employer.userId === user.id;
  const myApplication =
    user.role === "WORKER"
      ? await prisma.application.findFirst({
          where: { jobId, worker: { userId: user.id } },
          select: { id: true, status: true, message: true, hire: { select: { id: true } } },
        })
      : null;

  // Unpublished / closed jobs are only visible to the owner, admins and workers who applied.
  if (job.status !== "OPEN" && !isOwner && user.role !== "ADMIN" && !myApplication) throw notFound("Job not found");

  return {
    job: serializeJob(job),
    isOwner,
    myApplication: myApplication && {
      id: myApplication.id,
      status: myApplication.status,
      message: myApplication.message,
      hireId: myApplication.hire?.id ?? null,
    },
    fee: pricing.jobPost,
  };
}

/** Load a job and make sure it belongs to this employer. */
export async function findOwnJob(jobId: string, employer: EmployerProfile) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.employerId !== employer.id) throw notFound("Job not found");
  return job;
}

export async function setJobOpen(jobId: string, employer: EmployerProfile, open: boolean) {
  const job = await findOwnJob(jobId, employer);
  if (open && job.status !== "CLOSED" && job.status !== "FILLED") throw conflict("Only closed jobs can be reopened");
  if (!open && job.status !== "OPEN" && job.status !== "FILLED") throw conflict("Only open jobs can be closed");
  const updated = await prisma.job.update({ where: { id: job.id }, data: { status: open ? "OPEN" : "CLOSED" }, include: jobInclude });
  return serializeJob(updated);
}

export async function deleteDraft(jobId: string, employer: EmployerProfile) {
  const job = await findOwnJob(jobId, employer);
  if (job.status !== "PENDING_PAYMENT") throw conflict("Published jobs can't be deleted — close them instead");
  await prisma.job.delete({ where: { id: job.id } });
}

export async function applyToJob(worker: WorkerProfile, jobId: string, message: string | null) {
  if (!isSubscriptionActive(worker.subscriptionExpiresAt)) {
    throw new ApiError(402, "SUBSCRIPTION_REQUIRED", `Activate your monthly plan (৳${pricing.workerMonthly}) to apply for jobs`);
  }

  const job = await prisma.job.findUnique({ where: { id: jobId }, include: { employer: { select: { userId: true } } } });
  if (!job || job.status !== "OPEN") throw notFound("This job is no longer accepting applications");

  const existing = await prisma.application.findUnique({ where: { jobId_workerId: { jobId, workerId: worker.id } } });
  if (existing && existing.status !== "WITHDRAWN") throw conflict("You have already applied to this job", "ALREADY_APPLIED");

  return prisma.$transaction(async (tx) => {
    const application = existing
      ? await tx.application.update({ where: { id: existing.id }, data: { status: "PENDING", message } })
      : await tx.application.create({ data: { jobId, workerId: worker.id, message } });
    await tx.job.update({ where: { id: jobId }, data: { applicationsCount: { increment: 1 } } });
    await notify(
      {
        userId: job.employer.userId,
        type: "NEW_APPLICATION",
        title: "New applicant",
        body: `${worker.fullName} applied for "${job.title}".`,
        data: { jobId, applicationId: application.id },
      },
      tx,
    );
    return application;
  });
}

export async function listApplicants(jobId: string, employer: EmployerProfile) {
  const job = await findOwnJob(jobId, employer);
  const applications = await prisma.application.findMany({
    where: { jobId: job.id, status: { not: "WITHDRAWN" } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { worker: { select: publicWorkerSelect }, hire: { select: { id: true, status: true } } },
  });
  return applications.map((a) => ({
    id: a.id,
    status: a.status,
    message: a.message,
    createdAt: a.createdAt,
    hire: a.hire,
    worker: publicWorker(a.worker),
  }));
}

import { pricing } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import type { EmployerProfile, Hire, HireStatus, Prisma, WorkerProfile } from "../../generated/prisma/client.js";
import { conflict, forbidden, notFound } from "../../lib/errors.js";
import { notify } from "../../lib/notify.js";
import { findPage } from "../../lib/pagination.js";
import type { SessionUser } from "../../lib/session-cache.js";
import { loadApprovedEmployer, loadApprovedWorker } from "../../middleware/auth.js";
import {
  categorySelect,
  employerDisplayName,
  isSubscriptionActive,
  publicEmployer,
  publicEmployerSelect,
  publicWorker,
  publicWorkerSelect,
} from "../../shared/serializers.js";
import type { DirectHireInput } from "./hires.schemas.js";

type Tx = Prisma.TransactionClient;
export type HireViewer = "EMPLOYER" | "WORKER" | "ADMIN";

const hireInclude = {
  category: { select: categorySelect },
  employer: { select: { ...publicEmployerSelect, userId: true, phone: true, address: true } },
  worker: { select: { ...publicWorkerSelect, userId: true, phone: true, address: true } },
  review: true,
} satisfies Prisma.HireInclude;

type HireRow = Prisma.HireGetPayload<{ include: typeof hireInclude }>;

/** Contact details are revealed to both sides once a hire is confirmed. */
function serializeHire(h: HireRow, viewer: HireViewer) {
  const { employer, worker, employerId: _e, workerId: _w, ...rest } = h;
  const confirmed = h.status === "ACTIVE" || h.status === "COMPLETED";
  const contactOf = viewer === "WORKER" ? employer : worker;
  return {
    ...rest,
    employer: publicEmployer(employer),
    worker: publicWorker(worker),
    contact: confirmed || viewer === "ADMIN" ? { phone: contactOf.phone, name: contactOf.fullName, address: contactOf.address } : null,
  };
}

// ─── Creating & activating hires ────────────────────────────────────────────

type NewHire = Omit<Prisma.HireUncheckedCreateInput, "employerId" | "status" | "paidWithCredit">;

/**
 * Create a hire that costs one hiring fee. If the employer has a free credit (earned when a
 * paid offer was declined) and wants to use it, the hire is activated immediately; otherwise it
 * waits in PENDING_PAYMENT until SSLCommerz confirms the payment.
 */
export async function createHire(employer: EmployerProfile, data: NewHire, useCredit: boolean) {
  const result = await prisma.$transaction(async (tx) => {
    const hire = await tx.hire.create({ data: { ...data, employerId: employer.id } });
    if (useCredit && employer.hireCredits > 0) {
      const spent = await tx.employerProfile.updateMany({
        where: { id: employer.id, hireCredits: { gt: 0 } },
        data: { hireCredits: { decrement: 1 } },
      });
      if (spent.count === 1) {
        await tx.hire.update({ where: { id: hire.id }, data: { paidWithCredit: true } });
        await activatePaidHire(tx, hire);
        return { hireId: hire.id, requiresPayment: false };
      }
    }
    return { hireId: hire.id, requiresPayment: true };
  });

  const hire = await prisma.hire.findUniqueOrThrow({ where: { id: result.hireId }, include: hireInclude });
  return { hire: serializeHire(hire, "EMPLOYER"), requiresPayment: result.requiresPayment, fee: pricing.hire };
}

/**
 * Called once a hire is paid for (SSLCommerz or a credit).
 * - From an application → ACTIVE at once (the worker already applied).
 * - Direct offer → OFFERED; the worker accepts or declines.
 */
export async function activatePaidHire(tx: Tx, hire: Hire) {
  if (hire.status !== "PENDING_PAYMENT") return;
  const now = new Date();
  const [employer, worker] = await Promise.all([
    tx.employerProfile.findUniqueOrThrow({ where: { id: hire.employerId }, select: { type: true, companyName: true, fullName: true } }),
    tx.workerProfile.findUniqueOrThrow({ where: { id: hire.workerId }, select: { userId: true } }),
  ]);
  const employerName = employerDisplayName(employer);

  if (hire.source === "DIRECT") {
    await tx.hire.update({ where: { id: hire.id }, data: { status: "OFFERED", offeredAt: now } });
    await notify(
      {
        userId: worker.userId,
        type: "HIRE_OFFER",
        title: "New job offer",
        body: `${employerName} wants to hire you for "${hire.title}". Accept or decline the offer.`,
        data: { hireId: hire.id },
      },
      tx,
    );
    return;
  }

  await tx.hire.update({ where: { id: hire.id }, data: { status: "ACTIVE", offeredAt: now, respondedAt: now } });
  if (hire.applicationId) await tx.application.update({ where: { id: hire.applicationId }, data: { status: "HIRED" } });
  if (hire.jobId) {
    const job = await tx.job.update({ where: { id: hire.jobId }, data: { hiredCount: { increment: 1 } } });
    if (job.status === "OPEN" && job.hiredCount >= job.workersNeeded) {
      await tx.job.update({ where: { id: job.id }, data: { status: "FILLED" } });
    }
  }
  await notify(
    {
      userId: worker.userId,
      type: "HIRE_CONFIRMED",
      title: "You're hired! 🎉",
      body: `${employerName} hired you for "${hire.title}". Open the job to see contact details.`,
      data: { hireId: hire.id },
    },
    tx,
  );
}

/** Employer finds a worker in the directory and sends an offer without posting a job. */
export async function createDirectHire(employer: EmployerProfile, input: DirectHireInput) {
  const { useCredit, workerId, ...details } = input;

  const worker = await prisma.workerProfile.findUnique({ where: { id: workerId } });
  if (!worker || worker.status !== "APPROVED" || !isSubscriptionActive(worker.subscriptionExpiresAt)) {
    throw notFound("This worker is not available for hire right now");
  }
  if (!worker.isAvailable) throw conflict("This worker is currently not taking new work");

  const pending = await prisma.hire.count({ where: { employerId: employer.id, workerId, status: "OFFERED" } });
  if (pending) throw conflict("You already have a pending offer with this worker", "OFFER_EXISTS");

  return createHire(employer, { ...details, workerId, source: "DIRECT" }, useCredit);
}

// ─── Reading ────────────────────────────────────────────────────────────────

async function viewerFor(user: SessionUser) {
  if (user.role === "EMPLOYER") return { role: "EMPLOYER" as const, employer: await loadApprovedEmployer(user.id) };
  if (user.role === "WORKER") return { role: "WORKER" as const, worker: await loadApprovedWorker(user.id) };
  if (user.role === "ADMIN") return { role: "ADMIN" as const };
  throw forbidden("Complete your profile first", "PROFILE_REQUIRED");
}

export async function listHires(user: SessionUser, query: { status?: HireStatus; cursor?: string; limit: number }) {
  const viewer = await viewerFor(user);
  const where: Prisma.HireWhereInput =
    viewer.role === "EMPLOYER"
      ? { employerId: viewer.employer.id, ...(query.status && { status: query.status }) }
      : viewer.role === "WORKER"
        ? // Workers never see hires the employer hasn't paid for yet.
          { workerId: viewer.worker.id, status: query.status ?? { not: "PENDING_PAYMENT" } }
        : { ...(query.status && { status: query.status }) };

  const page = await findPage(
    (args) => prisma.hire.findMany({ where, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], include: hireInclude, ...args }),
    query,
  );
  return { items: page.items.map((h) => serializeHire(h, viewer.role)), nextCursor: page.nextCursor };
}

export async function getHireDetail(hireId: string, user: SessionUser) {
  const hire = await prisma.hire.findUnique({ where: { id: hireId }, include: hireInclude });
  if (!hire) throw notFound("Hire not found");

  const viewer: HireViewer | null =
    hire.employer.userId === user.id
      ? "EMPLOYER"
      : hire.worker.userId === user.id && hire.status !== "PENDING_PAYMENT"
        ? "WORKER"
        : user.role === "ADMIN"
          ? "ADMIN"
          : null;
  if (!viewer) throw notFound("Hire not found");

  return { hire: serializeHire(hire, viewer), viewer, fee: pricing.hire };
}

// ─── Actions ────────────────────────────────────────────────────────────────

async function loadHire(hireId: string, owner: { workerId: string } | { employerId: string }) {
  const hire = await prisma.hire.findUnique({
    where: { id: hireId },
    include: { worker: { select: { userId: true, fullName: true } }, employer: { select: { userId: true } } },
  });
  const allowed =
    hire &&
    ("workerId" in owner ? hire.workerId === owner.workerId && hire.status !== "PENDING_PAYMENT" : hire.employerId === owner.employerId);
  if (!allowed) throw notFound("Hire not found");
  return hire;
}

export async function respondToOffer(hireId: string, worker: WorkerProfile, accept: boolean) {
  const hire = await loadHire(hireId, { workerId: worker.id });
  if (hire.status !== "OFFERED") throw conflict("This offer is no longer open");
  const respondedAt = new Date();

  if (accept) {
    await prisma.hire.update({ where: { id: hire.id }, data: { status: "ACTIVE", respondedAt } });
  } else {
    // The employer paid for this offer — give them a free hire credit back.
    await prisma.$transaction([
      prisma.hire.update({ where: { id: hire.id }, data: { status: "DECLINED", respondedAt } }),
      prisma.employerProfile.update({ where: { id: hire.employerId }, data: { hireCredits: { increment: 1 } } }),
    ]);
  }

  await notify({
    userId: hire.employer.userId,
    type: accept ? "OFFER_ACCEPTED" : "OFFER_DECLINED",
    title: accept ? "Offer accepted" : "Offer declined",
    body: accept
      ? `${hire.worker.fullName} accepted "${hire.title}". Their phone number is now visible.`
      : `${hire.worker.fullName} declined "${hire.title}". You received 1 free hire credit.`,
    data: { hireId: hire.id },
  });
}

export async function completeHire(hireId: string, employer: EmployerProfile) {
  const hire = await loadHire(hireId, { employerId: employer.id });
  if (hire.status !== "ACTIVE") throw conflict("Only active hires can be completed");

  await prisma.$transaction([
    prisma.hire.update({ where: { id: hire.id }, data: { status: "COMPLETED", completedAt: new Date() } }),
    prisma.workerProfile.update({ where: { id: hire.workerId }, data: { jobsCompleted: { increment: 1 } } }),
  ]);
  await notify({
    userId: hire.worker.userId,
    type: "HIRE_COMPLETED",
    title: "Job completed ✅",
    body: `"${hire.title}" was marked as completed. Great work!`,
    data: { hireId: hire.id },
  });
}

export async function cancelHire(hireId: string, employer: EmployerProfile) {
  const hire = await loadHire(hireId, { employerId: employer.id });
  if (hire.status !== "PENDING_PAYMENT" && hire.status !== "OFFERED" && hire.status !== "ACTIVE") {
    throw conflict("This hire can't be cancelled");
  }

  await prisma.$transaction(async (tx) => {
    await tx.hire.update({
      where: { id: hire.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        // Free the application so this applicant can be hired again later.
        ...(hire.status === "PENDING_PAYMENT" && { applicationId: null }),
      },
    });
    // An unanswered offer was paid for — refund it as a hire credit.
    if (hire.status === "OFFERED") {
      await tx.employerProfile.update({ where: { id: hire.employerId }, data: { hireCredits: { increment: 1 } } });
    }
    if (hire.status === "ACTIVE" && hire.jobId) {
      const job = await tx.job.update({ where: { id: hire.jobId }, data: { hiredCount: { decrement: 1 } } });
      if (job.status === "FILLED" && job.hiredCount < job.workersNeeded) {
        await tx.job.update({ where: { id: job.id }, data: { status: "OPEN" } });
      }
    }
  });

  if (hire.status !== "PENDING_PAYMENT") {
    await notify({
      userId: hire.worker.userId,
      type: "HIRE_CANCELLED",
      title: "Hire cancelled",
      body: `The employer cancelled "${hire.title}".`,
      data: { hireId: hire.id },
    });
  }
}

export async function reviewHire(hireId: string, employer: EmployerProfile, input: { rating: number; comment: string | null }) {
  const hire = await loadHire(hireId, { employerId: employer.id });
  if (hire.status !== "COMPLETED") throw conflict("You can review a worker after the job is completed");

  const review = await prisma.$transaction(async (tx) => {
    if (await tx.review.findUnique({ where: { hireId: hire.id }, select: { id: true } })) {
      throw conflict("You already reviewed this hire");
    }
    const created = await tx.review.create({
      data: { hireId: hire.id, employerId: hire.employerId, workerId: hire.workerId, ...input },
    });
    // Keep the rating denormalised on the worker so search & sorting stay fast.
    const stats = await tx.review.aggregate({ where: { workerId: hire.workerId }, _avg: { rating: true }, _count: true });
    await tx.workerProfile.update({
      where: { id: hire.workerId },
      data: { ratingAvg: stats._avg.rating ?? 0, ratingCount: stats._count },
    });
    return created;
  });

  await notify({
    userId: hire.worker.userId,
    type: "NEW_REVIEW",
    title: `You received a ${"★".repeat(input.rating)} review`,
    body: input.comment ? `"${input.comment.slice(0, 120)}"` : `For "${hire.title}".`,
    data: { hireId: hire.id },
  });
  return review;
}

import { prisma } from "../../db/prisma.js";
import type { EmployerProfile, Prisma } from "../../generated/prisma/client.js";
import { notFound } from "../../lib/errors.js";
import { findPage } from "../../lib/pagination.js";
import {
  isSubscriptionActive,
  publicEmployer,
  publicEmployerSelect,
  publicWorker,
  publicWorkerSelect,
} from "../../shared/serializers.js";
import type { WorkerSearch } from "./workers.schemas.js";

const searchOrder: Record<WorkerSearch["sort"], Prisma.WorkerProfileOrderByWithRelationInput[]> = {
  rating: [{ ratingAvg: "desc" }, { ratingCount: "desc" }, { id: "asc" }],
  experience: [{ experienceYears: "desc" }, { id: "asc" }],
  wage: [{ expectedWage: "asc" }, { id: "asc" }],
  newest: [{ createdAt: "desc" }, { id: "asc" }],
};

/** Only approved, available workers with an active subscription are discoverable. */
export async function searchWorkers(query: WorkerSearch) {
  const where: Prisma.WorkerProfileWhereInput = {
    status: "APPROVED",
    isAvailable: true,
    subscriptionExpiresAt: { gt: new Date() },
    ...(query.categoryId && { categories: { some: { id: query.categoryId } } }),
    ...(query.division && { division: query.division }),
    ...(query.district && { district: query.district }),
    ...(query.minRating && { ratingAvg: { gte: query.minRating } }),
    ...(query.q && {
      OR: [
        { fullName: { contains: query.q, mode: "insensitive" } },
        { area: { contains: query.q, mode: "insensitive" } },
        { skills: { has: query.q.toLowerCase() } },
      ],
    }),
  };

  const page = await findPage(
    (args) => prisma.workerProfile.findMany({ where, orderBy: searchOrder[query.sort], select: publicWorkerSelect, ...args }),
    query,
  );
  return { items: page.items.map(publicWorker), nextCursor: page.nextCursor };
}

/**
 * Public worker profile. The phone number is unlocked once this employer has an active or
 * completed hire with the worker (admins always see it).
 */
export async function getWorkerProfile(workerId: string, viewer: { employer: EmployerProfile | null; isAdmin: boolean }) {
  const worker = await prisma.workerProfile.findUnique({
    where: { id: workerId },
    select: {
      ...publicWorkerSelect,
      phone: true,
      subscriptionExpiresAt: true,
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { employer: { select: publicEmployerSelect }, hire: { select: { title: true } } },
      },
    },
  });
  if (!worker || (worker.status !== "APPROVED" && !viewer.isAdmin)) throw notFound("Worker not found");

  const hires = viewer.employer
    ? await prisma.hire.findMany({
        where: { employerId: viewer.employer.id, workerId, status: { not: "CANCELLED" } },
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, title: true },
        take: 5,
      })
    : [];
  const unlocked = viewer.isAdmin || hires.some((h) => h.status === "ACTIVE" || h.status === "COMPLETED");

  return {
    worker: publicWorker(worker),
    subscriptionActive: isSubscriptionActive(worker.subscriptionExpiresAt),
    contact: unlocked ? { phone: worker.phone } : null,
    hires,
    hireCredits: viewer.employer?.hireCredits ?? 0,
    reviews: worker.reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      jobTitle: r.hire.title,
      employer: publicEmployer(r.employer),
    })),
  };
}

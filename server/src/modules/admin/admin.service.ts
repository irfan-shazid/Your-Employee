import { prisma } from "../../db/prisma.js";
import type { ApprovalStatus, Prisma } from "../../generated/prisma/client.js";
import { conflict, notFound } from "../../lib/errors.js";
import { notify } from "../../lib/notify.js";
import { chargeCurrencies } from "../payments/pricing.js";
import { categorySelect, ownEmployer, ownWorker } from "../../shared/serializers.js";
import type { Decision } from "./admin.schemas.js";

// ─── Dashboard stats ────────────────────────────────────────────────────────

// Business days are Bangladesh calendar days (UTC+6, no DST), whatever the server's timezone.
const DHAKA_OFFSET_MS = 6 * 3600 * 1000;
const DAY_MS = 24 * 3600 * 1000;
const dhakaDay = (d: Date) => new Date(d.getTime() + DHAKA_OFFSET_MS).toISOString().slice(0, 10);
const dhakaMidnight = (day: string) => new Date(`${day}T00:00:00+06:00`);
const STATUSES: ApprovalStatus[] = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"];

export async function getStats() {
  const now = new Date();
  const today = dhakaDay(now);
  const monthStart = dhakaMidnight(`${today.slice(0, 7)}-01`);
  const weekStart = dhakaMidnight(dhakaDay(new Date(now.getTime() - 6 * DAY_MS)));

  const [workers, employers, activeSubscribers, openJobs, activeHires, completedHires, allTime, thisMonth, byPurpose, recent, users] =
    await Promise.all([
      prisma.workerProfile.groupBy({ by: ["status"], _count: true }),
      prisma.employerProfile.groupBy({ by: ["status"], _count: true }),
      prisma.workerProfile.count({ where: { status: "APPROVED", subscriptionExpiresAt: { gt: now } } }),
      prisma.job.count({ where: { status: "OPEN" } }),
      prisma.hire.count({ where: { status: "ACTIVE" } }),
      prisma.hire.count({ where: { status: "COMPLETED" } }),
      prisma.payment.groupBy({ by: ["currency"], where: { status: "SUCCESS" }, _sum: { amount: true }, _count: true }),
      prisma.payment.groupBy({ by: ["currency"], where: { status: "SUCCESS", paidAt: { gte: monthStart } }, _sum: { amount: true } }),
      prisma.payment.groupBy({ by: ["currency", "purpose"], where: { status: "SUCCESS" }, _sum: { amount: true }, _count: true }),
      prisma.payment.findMany({ where: { status: "SUCCESS", paidAt: { gte: weekStart } }, select: { amount: true, currency: true, paidAt: true } }),
      prisma.user.count(),
    ]);

  const byStatus = (rows: { status: ApprovalStatus; _count: number }[]) =>
    Object.fromEntries(STATUSES.map((s) => [s, rows.find((r) => r.status === s)?._count ?? 0])) as Record<ApprovalStatus, number>;

  // Amounts are in minor units and never mixed across currencies: BDT (SSLCommerz) first, then
  // any other currency an enabled gateway charges in or that has revenue.
  const others = new Set([...chargeCurrencies(), ...allTime.map((r) => r.currency)]);
  others.delete("BDT");
  const days = Array.from({ length: 7 }, (_, i) => dhakaDay(new Date(now.getTime() - (6 - i) * DAY_MS)));

  const currencies = ["BDT", ...[...others].sort()].map((currency) => {
    const total = allTime.find((r) => r.currency === currency);
    // Last 7 Dhaka days (oldest first, today last) for the dashboard chart.
    const last7Days = days.map((date) => ({ date, amount: 0 }));
    for (const p of recent) {
      if (p.currency !== currency || !p.paidAt) continue;
      const day = last7Days.find((d) => d.date === dhakaDay(p.paidAt!));
      if (day) day.amount += p.amount;
    }
    return {
      currency,
      total: total?._sum.amount ?? 0,
      payments: total?._count ?? 0,
      thisMonth: thisMonth.find((r) => r.currency === currency)?._sum.amount ?? 0,
      byPurpose: Object.fromEntries(
        byPurpose.filter((r) => r.currency === currency).map((r) => [r.purpose, { amount: r._sum.amount ?? 0, count: r._count }]),
      ),
      last7Days,
    };
  });

  return {
    users,
    workers: byStatus(workers),
    employers: byStatus(employers),
    activeSubscribers,
    openJobs,
    activeHires,
    completedHires,
    revenue: {
      payments: allTime.reduce((sum, r) => sum + r._count, 0),
      currencies,
    },
  };
}

// ─── Profile review (workers & employers share one flow) ────────────────────

export type ProfileKind = "worker" | "employer";

const NEXT_STATUS = { approve: "APPROVED", reject: "REJECTED", suspend: "SUSPENDED", reinstate: "APPROVED" } as const;

export const workerSearch = (q?: string): Prisma.WorkerProfileWhereInput =>
  q ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { nidNumber: { contains: q } }] } : {};

export const employerSearch = (q?: string): Prisma.EmployerProfileWhereInput =>
  q
    ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { companyName: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] }
    : {};

/** Oldest pending first so nobody waits too long; otherwise newest first. */
export const reviewQueueOrder = (status?: ApprovalStatus) =>
  status === "PENDING" ? [{ submittedAt: "asc" as const }, { id: "asc" as const }] : [{ submittedAt: "desc" as const }, { id: "asc" as const }];

export async function decideProfile(kind: ProfileKind, id: string, { action, reason }: Decision) {
  const profile =
    kind === "worker"
      ? await prisma.workerProfile.findUnique({ where: { id }, select: { id: true, userId: true, status: true } })
      : await prisma.employerProfile.findUnique({ where: { id }, select: { id: true, userId: true, status: true } });
  if (!profile) throw notFound(`${kind === "worker" ? "Worker" : "Employer"} not found`);
  if (action === "reinstate" && profile.status !== "SUSPENDED") throw conflict("Only suspended profiles can be reinstated");

  const data = {
    status: NEXT_STATUS[action],
    rejectionReason: action === "reject" || action === "suspend" ? reason : null,
    reviewedAt: new Date(),
  };

  const result = await prisma.$transaction(async (tx) => {
    if (kind === "worker") {
      const worker = await tx.workerProfile.update({
        where: { id },
        data: { ...data, ...(action === "suspend" && { isAvailable: false }) },
        include: { categories: { select: categorySelect } },
      });
      return { worker: ownWorker(worker) };
    }
    const employer = await tx.employerProfile.update({ where: { id }, data });
    // Suspending an employer hides their open jobs.
    if (action === "suspend") await tx.job.updateMany({ where: { employerId: id, status: "OPEN" }, data: { status: "CLOSED" } });
    return { employer: ownEmployer(employer) };
  });

  await notify(decisionNotification(profile.userId, kind, action, reason));
  return result;
}

function decisionNotification(userId: string, kind: ProfileKind, action: Decision["action"], reason: string | null) {
  const copy = {
    approve: {
      title: "You're approved! 🎉",
      body: kind === "worker" ? "Your worker profile is verified. Start finding work today." : "Your employer profile is verified. You can now post jobs and hire workers.",
    },
    reinstate: { title: "Account reinstated", body: "Your profile is active again." },
    reject: { title: "Profile needs changes", body: reason ?? "Please update your profile and resubmit." },
    suspend: { title: "Account suspended", body: reason ?? "Your account was suspended. Contact support." },
  }[action];
  return { userId, type: `PROFILE_${NEXT_STATUS[action]}`, ...copy };
}

// ─── Categories ─────────────────────────────────────────────────────────────

export const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

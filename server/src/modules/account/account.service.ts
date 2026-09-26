import { pricing } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import type { ApprovalStatus } from "../../generated/prisma/enums.js";
import { badRequest, conflict, forbidden, unauthorized } from "../../lib/errors.js";
import { notifyAdmins } from "../../lib/notify.js";
import { forgetUserSessions, type SessionUser } from "../../lib/session-cache.js";
import { categorySelect, employerDisplayName, ownEmployer, ownWorker } from "../../shared/serializers.js";
import type { EmployerProfileInput, WorkerProfileInput } from "./account.schemas.js";

export async function getAccount(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      workerProfile: { include: { categories: { select: categorySelect } } },
      employerProfile: true,
    },
  });
  if (!user) throw unauthorized();

  return {
    user: { id: user.id, name: user.name, email: user.email, image: user.image, role: user.role },
    worker: user.workerProfile ? ownWorker(user.workerProfile) : null,
    employer: user.employerProfile ? ownEmployer(user.employerProfile) : null,
    pricing,
  };
}

/**
 * New profiles, rejected profiles being resubmitted, and approved profiles whose identity
 * changed all go (back) to the admin queue. Other edits keep the current status.
 */
function reviewState(existing: { status: ApprovalStatus } | null, identityChanged: boolean) {
  const resubmitted =
    !existing || existing.status === "REJECTED" || (existing.status === "APPROVED" && identityChanged);
  return {
    resubmitted,
    data: resubmitted
      ? { status: "PENDING" as const, submittedAt: new Date(), rejectionReason: null }
      : { status: existing!.status },
  };
}

function assertRole(user: SessionUser, role: "WORKER" | "EMPLOYER") {
  if (user.role && user.role !== role) {
    throw conflict(`This account is already registered as ${user.role === "ADMIN" ? "an admin" : `a ${user.role.toLowerCase()}`}`);
  }
}

export async function saveWorkerProfile(user: SessionUser, input: WorkerProfileInput) {
  assertRole(user, "WORKER");

  const [categoryCount, nid] = await Promise.all([
    prisma.category.count({ where: { id: { in: input.categoryIds }, isActive: true } }),
    input.nidImageId ? prisma.media.findUnique({ where: { id: input.nidImageId }, select: { ownerId: true } }) : null,
  ]);
  if (categoryCount !== input.categoryIds.length) throw badRequest("One or more categories are invalid");
  if (input.nidImageId && nid?.ownerId !== user.id) throw badRequest("Invalid NID image");

  const existing = await prisma.workerProfile.findUnique({ where: { userId: user.id } });
  const identityChanged = Boolean(
    existing &&
      (existing.fullName !== input.fullName ||
        existing.nidNumber !== input.nidNumber ||
        existing.nidImageId !== input.nidImageId ||
        existing.dateOfBirth?.getTime() !== input.dateOfBirth.getTime()),
  );
  const review = reviewState(existing, identityChanged);
  const { categoryIds, ...fields } = input;
  const categories = categoryIds.map((id) => ({ id }));

  const worker = await prisma.$transaction(async (tx) => {
    if (!user.role) await tx.user.update({ where: { id: user.id }, data: { role: "WORKER" } });
    return existing
      ? tx.workerProfile.update({
          where: { userId: user.id },
          data: { ...fields, ...review.data, categories: { set: categories } },
          include: { categories: { select: categorySelect } },
        })
      : tx.workerProfile.create({
          data: { ...fields, ...review.data, userId: user.id, categories: { connect: categories } },
          include: { categories: { select: categorySelect } },
        });
  });

  if (!user.role) forgetUserSessions(user.id);
  if (review.resubmitted) await notifyAdmins("New worker registration", `${worker.fullName} is waiting for approval.`, { workerId: worker.id });
  return ownWorker(worker);
}

export async function saveEmployerProfile(user: SessionUser, input: EmployerProfileInput) {
  assertRole(user, "EMPLOYER");

  const existing = await prisma.employerProfile.findUnique({ where: { userId: user.id } });
  const identityChanged = Boolean(
    existing &&
      (existing.fullName !== input.fullName ||
        existing.nidNumber !== input.nidNumber ||
        existing.tradeLicense !== input.tradeLicense ||
        existing.companyName !== input.companyName),
  );
  const review = reviewState(existing, identityChanged);
  const data = { ...input, ...review.data };

  const employer = await prisma.$transaction(async (tx) => {
    if (!user.role) await tx.user.update({ where: { id: user.id }, data: { role: "EMPLOYER" } });
    return existing
      ? tx.employerProfile.update({ where: { userId: user.id }, data })
      : tx.employerProfile.create({ data: { ...data, userId: user.id } });
  });

  if (!user.role) forgetUserSessions(user.id);
  if (review.resubmitted) {
    await notifyAdmins("New employer registration", `${employerDisplayName(employer)} is waiting for approval.`, { employerId: employer.id });
  }
  return ownEmployer(employer);
}

export async function setAvailability(userId: string, isAvailable: boolean) {
  const { count } = await prisma.workerProfile.updateMany({ where: { userId }, data: { isAvailable } });
  if (!count) throw forbidden("Only workers can change availability");
  return { isAvailable };
}

/** Account deletion (required by Play Store / App Store). Profiles, jobs, hires… cascade. */
export async function deleteAccount(user: SessionUser) {
  if (user.role === "ADMIN" && (await prisma.user.count({ where: { role: "ADMIN" } })) <= 1) {
    throw conflict("You are the only admin. Create another admin before deleting this account.");
  }
  const activeHires = await prisma.hire.count({
    where: { status: "ACTIVE", OR: [{ worker: { userId: user.id } }, { employer: { userId: user.id } }] },
  });
  if (activeHires > 0) throw conflict("Finish or cancel your active hires before deleting your account.");

  await prisma.user.delete({ where: { id: user.id } });
  forgetUserSessions(user.id);
}

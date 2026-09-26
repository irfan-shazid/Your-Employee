/**
 * Response shapes. `*Select` objects fetch only the columns a serializer needs, so public
 * lists never load private data (phone, NID…) from the database in the first place.
 */
import type { Category, EmployerProfile, Prisma, WorkerProfile } from "../generated/prisma/client.js";

export const isSubscriptionActive = (expiresAt: Date | null | undefined) =>
  Boolean(expiresAt && expiresAt.getTime() > Date.now());

// ─── Categories ─────────────────────────────────────────────────────────────

export const categorySelect = { id: true, slug: true, name: true, nameBn: true, icon: true } as const;
type CategoryRef = Pick<Category, keyof typeof categorySelect>;

// ─── Employers ──────────────────────────────────────────────────────────────

export const publicEmployerSelect = {
  id: true,
  type: true,
  companyName: true,
  fullName: true,
  avatarUrl: true,
  district: true,
  area: true,
  status: true,
  createdAt: true,
} satisfies Prisma.EmployerProfileSelect;

type EmployerRef = Pick<EmployerProfile, keyof typeof publicEmployerSelect>;

export const employerDisplayName = (e: Pick<EmployerProfile, "type" | "companyName" | "fullName">) =>
  e.type === "BUSINESS" && e.companyName ? e.companyName : e.fullName;

/** Employer fields shown to workers on jobs and offers. */
export function publicEmployer(e: EmployerRef) {
  return {
    id: e.id,
    displayName: employerDisplayName(e),
    type: e.type,
    avatarUrl: e.avatarUrl,
    district: e.district,
    area: e.area,
    verified: e.status === "APPROVED",
    memberSince: e.createdAt,
  };
}

/** Full employer profile for the owner and admins. */
export function ownEmployer(e: EmployerProfile) {
  return {
    ...publicEmployer(e),
    fullName: e.fullName,
    companyName: e.companyName,
    phone: e.phone,
    nidNumber: e.nidNumber,
    tradeLicense: e.tradeLicense,
    division: e.division,
    address: e.address,
    about: e.about,
    status: e.status,
    rejectionReason: e.rejectionReason,
    submittedAt: e.submittedAt,
    reviewedAt: e.reviewedAt,
    hireCredits: e.hireCredits,
  };
}

// ─── Workers ────────────────────────────────────────────────────────────────

export const publicWorkerSelect = {
  id: true,
  fullName: true,
  avatarUrl: true,
  gender: true,
  dateOfBirth: true,
  division: true,
  district: true,
  area: true,
  bio: true,
  skills: true,
  experienceYears: true,
  expectedWage: true,
  wageType: true,
  availability: true,
  isAvailable: true,
  ratingAvg: true,
  ratingCount: true,
  jobsCompleted: true,
  status: true,
  createdAt: true,
  categories: { select: categorySelect },
} satisfies Prisma.WorkerProfileSelect;

type WorkerRef = Pick<WorkerProfile, Exclude<keyof typeof publicWorkerSelect, "categories">> & { categories?: CategoryRef[] };

/** Worker fields any approved employer can see. Phone & NID stay private until a hire is confirmed. */
export function publicWorker(w: WorkerRef) {
  return {
    id: w.id,
    fullName: w.fullName,
    avatarUrl: w.avatarUrl,
    gender: w.gender,
    age: w.dateOfBirth ? ageFrom(w.dateOfBirth) : null,
    division: w.division,
    district: w.district,
    area: w.area,
    bio: w.bio,
    skills: w.skills,
    experienceYears: w.experienceYears,
    expectedWage: w.expectedWage,
    wageType: w.wageType,
    availability: w.availability,
    isAvailable: w.isAvailable,
    ratingAvg: Math.round(w.ratingAvg * 10) / 10,
    ratingCount: w.ratingCount,
    jobsCompleted: w.jobsCompleted,
    verified: w.status === "APPROVED",
    categories: w.categories ?? [],
    memberSince: w.createdAt,
  };
}

/** Full worker profile for the owner and admins. */
export function ownWorker(w: WorkerProfile & { categories?: CategoryRef[] }) {
  return {
    ...publicWorker(w),
    phone: w.phone,
    dateOfBirth: w.dateOfBirth,
    nidNumber: w.nidNumber,
    nidImageId: w.nidImageId,
    address: w.address,
    status: w.status,
    rejectionReason: w.rejectionReason,
    submittedAt: w.submittedAt,
    reviewedAt: w.reviewedAt,
    subscriptionExpiresAt: w.subscriptionExpiresAt,
    subscriptionActive: isSubscriptionActive(w.subscriptionExpiresAt),
  };
}

function ageFrom(dob: Date) {
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

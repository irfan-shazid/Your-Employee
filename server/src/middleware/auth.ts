import type { MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";
import { prisma } from "../db/prisma.js";
import type { EmployerProfile, WorkerProfile } from "../generated/prisma/client.js";
import type { Role } from "../generated/prisma/enums.js";
import { forbidden, unauthorized } from "../lib/errors.js";
import { resolveSessionUser, type SessionUser } from "../lib/session-cache.js";

export type { SessionUser };

export type AppEnv = {
  Variables: {
    user: SessionUser | null;
  };
};

/** Resolve the Better Auth session (cookie sent by the Expo client) and attach the user. */
export const sessionMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set("user", await resolveSessionUser(c.req.raw.headers));
  await next();
};

/** Signed-in user, or 401. */
export function currentUser(c: { get: (key: "user") => SessionUser | null }): SessionUser {
  const user = c.get("user");
  if (!user) throw unauthorized();
  return user;
}

export const requireUser = createMiddleware<AppEnv>(async (c, next) => {
  currentUser(c);
  await next();
});

export function requireRole(...roles: Role[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = currentUser(c);
    if (!user.role || !roles.includes(user.role as Role)) throw forbidden();
    await next();
  });
}

// ─── Profile guards ─────────────────────────────────────────────────────────
// Approval status is always read fresh from the database, so a suspension takes effect at once.

export async function loadApprovedWorker(userId: string) {
  const worker = await prisma.workerProfile.findUnique({ where: { userId } });
  if (!worker) throw forbidden("Complete your worker profile first", "PROFILE_REQUIRED");
  if (worker.status !== "APPROVED") throw forbidden("Your profile is waiting for admin approval", "NOT_APPROVED");
  return worker;
}

export async function loadApprovedEmployer(userId: string) {
  const employer = await prisma.employerProfile.findUnique({ where: { userId } });
  if (!employer) throw forbidden("Complete your employer profile first", "PROFILE_REQUIRED");
  if (employer.status !== "APPROVED") throw forbidden("Your profile is waiting for admin approval", "NOT_APPROVED");
  return employer;
}

type WorkerEnv = AppEnv & { Variables: { worker: WorkerProfile } };
type EmployerEnv = AppEnv & { Variables: { employer: EmployerProfile } };

/** Approved worker only; the profile is available as `c.get("worker")`. */
export const approvedWorker = createMiddleware<WorkerEnv>(async (c, next) => {
  const user = currentUser(c);
  if (user.role !== "WORKER") throw forbidden();
  c.set("worker", await loadApprovedWorker(user.id));
  await next();
});

/** Approved employer only; the profile is available as `c.get("employer")`. */
export const approvedEmployer = createMiddleware<EmployerEnv>(async (c, next) => {
  const user = currentUser(c);
  if (user.role !== "EMPLOYER") throw forbidden();
  c.set("employer", await loadApprovedEmployer(user.id));
  await next();
});

/** Any approved participant (worker, employer) or an admin. */
export async function assertApprovedMember(user: SessionUser) {
  if (user.role === "ADMIN") return;
  if (user.role === "WORKER") await loadApprovedWorker(user.id);
  else if (user.role === "EMPLOYER") await loadApprovedEmployer(user.id);
  else throw forbidden("Complete your profile first", "PROFILE_REQUIRED");
}

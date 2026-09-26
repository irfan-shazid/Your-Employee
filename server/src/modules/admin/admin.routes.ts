import { Hono } from "hono";
import { prisma } from "../../db/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { conflict, notFound } from "../../lib/errors.js";
import { notify } from "../../lib/notify.js";
import { findPage } from "../../lib/pagination.js";
import { readJson, readQuery } from "../../lib/validation.js";
import { requireRole, type AppEnv } from "../../middleware/auth.js";
import { categorySelect, ownEmployer, ownWorker, publicEmployer, publicEmployerSelect } from "../../shared/serializers.js";
import {
  categorySchema,
  decisionSchema,
  jobListQuery,
  paymentListQuery,
  profileListQuery,
  removeJobSchema,
  userListQuery,
} from "./admin.schemas.js";
import { decideProfile, employerSearch, getStats, reviewQueueOrder, slugify, workerSearch } from "./admin.service.js";

/** `/api/admin` — dashboard, approvals, users, payments, job moderation and categories. */
export const adminRoutes = new Hono<AppEnv>()
  .use(requireRole("ADMIN"))
  .get("/stats", async (c) => c.json(await getStats()))

  // ─── Workers ──────────────────────────────────────────────────────────────
  .get("/workers", async (c) => {
    const q = readQuery(c, profileListQuery);
    const page = await findPage(
      (args) =>
        prisma.workerProfile.findMany({
          where: { ...(q.status && { status: q.status }), ...workerSearch(q.q) },
          orderBy: reviewQueueOrder(q.status),
          include: { categories: { select: categorySelect }, user: { select: { email: true } } },
          ...args,
        }),
      q,
    );
    return c.json({ items: page.items.map((w) => ({ ...ownWorker(w), email: w.user.email })), nextCursor: page.nextCursor });
  })
  .get("/workers/:id", async (c) => {
    const w = await prisma.workerProfile.findUnique({
      where: { id: c.req.param("id") },
      include: {
        categories: { select: categorySelect },
        user: { select: { email: true, createdAt: true } },
        _count: { select: { hires: true, reviews: true } },
      },
    });
    if (!w) throw notFound("Worker not found");
    return c.json({ worker: { ...ownWorker(w), email: w.user.email, joinedAt: w.user.createdAt }, counts: w._count });
  })
  .post("/workers/:id/decision", async (c) => c.json(await decideProfile("worker", c.req.param("id"), await readJson(c, decisionSchema))))

  // ─── Employers ────────────────────────────────────────────────────────────
  .get("/employers", async (c) => {
    const q = readQuery(c, profileListQuery);
    const page = await findPage(
      (args) =>
        prisma.employerProfile.findMany({
          where: { ...(q.status && { status: q.status }), ...employerSearch(q.q) },
          orderBy: reviewQueueOrder(q.status),
          include: { user: { select: { email: true } } },
          ...args,
        }),
      q,
    );
    return c.json({ items: page.items.map((e) => ({ ...ownEmployer(e), email: e.user.email })), nextCursor: page.nextCursor });
  })
  .get("/employers/:id", async (c) => {
    const id = c.req.param("id");
    const e = await prisma.employerProfile.findUnique({ where: { id }, include: { user: { select: { email: true, createdAt: true } } } });
    if (!e) throw notFound("Employer not found");
    const [jobs, hires] = await Promise.all([
      prisma.job.count({ where: { employerId: id, status: { not: "PENDING_PAYMENT" } } }),
      prisma.hire.count({ where: { employerId: id, status: { notIn: ["PENDING_PAYMENT", "CANCELLED"] } } }),
    ]);
    return c.json({ employer: { ...ownEmployer(e), email: e.user.email, joinedAt: e.user.createdAt }, counts: { jobs, hires } });
  })
  .post("/employers/:id/decision", async (c) => c.json(await decideProfile("employer", c.req.param("id"), await readJson(c, decisionSchema))))

  // ─── Users & payments ─────────────────────────────────────────────────────
  .get("/users", async (c) => {
    const q = readQuery(c, userListQuery);
    const where: Prisma.UserWhereInput = {
      ...(q.role && { role: q.role === "NONE" ? null : q.role }),
      ...(q.q && { OR: [{ name: { contains: q.q, mode: "insensitive" } }, { email: { contains: q.q, mode: "insensitive" } }] }),
    };
    return c.json(
      await findPage(
        (args) =>
          prisma.user.findMany({
            where,
            orderBy: [{ createdAt: "desc" }, { id: "asc" }],
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
              createdAt: true,
              workerProfile: { select: { id: true, status: true } },
              employerProfile: { select: { id: true, status: true } },
            },
            ...args,
          }),
        q,
      ),
    );
  })
  .get("/payments", async (c) => {
    const q = readQuery(c, paymentListQuery);
    return c.json(
      await findPage(
        (args) =>
          prisma.payment.findMany({
            where: { ...(q.status && { status: q.status }), ...(q.purpose && { purpose: q.purpose }) },
            orderBy: [{ createdAt: "desc" }, { id: "asc" }],
            select: {
              id: true,
              tranId: true,
              purpose: true,
              amount: true,
              currency: true,
              status: true,
              cardType: true,
              bankTranId: true,
              failureReason: true,
              paidAt: true,
              createdAt: true,
              user: { select: { name: true, email: true, role: true } },
            },
            ...args,
          }),
        q,
      ),
    );
  })

  // ─── Job moderation ───────────────────────────────────────────────────────
  .get("/jobs", async (c) => {
    const q = readQuery(c, jobListQuery);
    const page = await findPage(
      (args) =>
        prisma.job.findMany({
          where: { ...(q.status && { status: q.status }), ...(q.q && { title: { contains: q.q, mode: "insensitive" } }) },
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          include: { category: { select: categorySelect }, employer: { select: publicEmployerSelect } },
          ...args,
        }),
      q,
    );
    return c.json({
      items: page.items.map(({ employer, ...job }) => ({ ...job, employer: publicEmployer(employer) })),
      nextCursor: page.nextCursor,
    });
  })
  .post("/jobs/:id/remove", async (c) => {
    const { reason } = await readJson(c, removeJobSchema);
    const job = await prisma.job.findUnique({ where: { id: c.req.param("id") }, include: { employer: { select: { userId: true } } } });
    if (!job) throw notFound("Job not found");
    await prisma.job.update({ where: { id: job.id }, data: { status: "REMOVED" } });
    await notify({
      userId: job.employer.userId,
      type: "JOB_REMOVED",
      title: "Job removed by admin",
      body: `"${job.title}" was removed: ${reason}`,
      data: { jobId: job.id },
    });
    return c.json({ ok: true });
  })

  // ─── Categories ───────────────────────────────────────────────────────────
  .get("/categories", async (c) => {
    const items = await prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { workers: true, jobs: true } } },
    });
    return c.json({ items });
  })
  .post("/categories", async (c) => {
    const input = await readJson(c, categorySchema);
    const slug = slugify(input.name);
    if (await prisma.category.findUnique({ where: { slug }, select: { id: true } })) throw conflict("A category with this name already exists");
    return c.json({ category: await prisma.category.create({ data: { ...input, slug } }) }, 201);
  })
  .patch("/categories/:id", async (c) => {
    const input = await readJson(c, categorySchema.partial());
    const category = await prisma.category.update({ where: { id: c.req.param("id") }, data: input }).catch(() => null);
    if (!category) throw notFound("Category not found");
    return c.json({ category });
  });

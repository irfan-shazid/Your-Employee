import { Hono } from "hono";
import { pricing } from "../../config/env.js";
import { byUser, rateLimit } from "../../lib/rate-limit.js";
import { readJson, readQuery } from "../../lib/validation.js";
import {
  approvedEmployer,
  approvedWorker,
  assertApprovedMember,
  currentUser,
  loadApprovedWorker,
  requireUser,
  type AppEnv,
} from "../../middleware/auth.js";
import { applySchema, createJobSchema, jobFeedQuery, myJobsQuery } from "./jobs.schemas.js";
import * as jobs from "./jobs.service.js";

/** `/api/jobs` — job feed, posting, applying and applicants. */
export const jobRoutes = new Hono<AppEnv>()
  .use(requireUser)
  .get("/", async (c) => {
    const user = currentUser(c);
    let workerId: string | null = null;
    if (user.role === "WORKER") workerId = (await loadApprovedWorker(user.id)).id;
    else await assertApprovedMember(user);
    return c.json(await jobs.listOpenJobs(readQuery(c, jobFeedQuery), workerId));
  })
  .get("/mine", approvedEmployer, async (c) => {
    return c.json(await jobs.listEmployerJobs(c.get("employer").id, readQuery(c, myJobsQuery)));
  })
  .post("/", approvedEmployer, rateLimit({ name: "job-create", windowMs: 60 * 60_000, max: 30, key: byUser }), async (c) => {
    const job = await jobs.createJob(c.get("employer").id, await readJson(c, createJobSchema));
    return c.json({ job, fee: pricing.jobPost }, 201);
  })
  .get("/:id", async (c) => c.json(await jobs.getJobDetail(c.req.param("id"), currentUser(c))))
  .post("/:id/close", approvedEmployer, async (c) => c.json({ job: await jobs.setJobOpen(c.req.param("id"), c.get("employer"), false) }))
  .post("/:id/reopen", approvedEmployer, async (c) => c.json({ job: await jobs.setJobOpen(c.req.param("id"), c.get("employer"), true) }))
  .delete("/:id", approvedEmployer, async (c) => {
    await jobs.deleteDraft(c.req.param("id"), c.get("employer"));
    return c.json({ ok: true });
  })
  .post("/:id/apply", approvedWorker, rateLimit({ name: "apply", windowMs: 60 * 60_000, max: 40, key: byUser }), async (c) => {
    const { message } = await readJson(c, applySchema);
    const application = await jobs.applyToJob(c.get("worker"), c.req.param("id"), message);
    return c.json({ application }, 201);
  })
  .get("/:id/applications", approvedEmployer, async (c) => {
    return c.json({ items: await jobs.listApplicants(c.req.param("id"), c.get("employer")) });
  });

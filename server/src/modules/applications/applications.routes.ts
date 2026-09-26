import { Hono } from "hono";
import { pageQuery } from "../../lib/pagination.js";
import { readJson, readQuery } from "../../lib/validation.js";
import { approvedEmployer, approvedWorker, requireUser, type AppEnv } from "../../middleware/auth.js";
import { useCreditSchema } from "../hires/hires.schemas.js";
import * as applications from "./applications.service.js";

/** `/api/applications` — a worker's applications and the employer's decisions on them. */
export const applicationRoutes = new Hono<AppEnv>()
  .use(requireUser)
  .get("/mine", approvedWorker, async (c) => {
    return c.json(await applications.listWorkerApplications(c.get("worker"), readQuery(c, pageQuery)));
  })
  .post("/:id/withdraw", approvedWorker, async (c) => {
    await applications.withdraw(c.req.param("id"), c.get("worker"));
    return c.json({ ok: true });
  })
  .post("/:id/shortlist", approvedEmployer, async (c) => {
    await applications.shortlist(c.req.param("id"), c.get("employer"));
    return c.json({ ok: true });
  })
  .post("/:id/reject", approvedEmployer, async (c) => {
    await applications.reject(c.req.param("id"), c.get("employer"));
    return c.json({ ok: true });
  })
  .post("/:id/hire", approvedEmployer, async (c) => {
    const { useCredit } = await readJson(c, useCreditSchema);
    return c.json(await applications.hireApplicant(c.req.param("id"), c.get("employer"), useCredit), 201);
  });

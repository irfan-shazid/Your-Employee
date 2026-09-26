import { Hono } from "hono";
import { readQuery } from "../../lib/validation.js";
import { currentUser, loadApprovedEmployer, requireRole, type AppEnv } from "../../middleware/auth.js";
import { workerSearchQuery } from "./workers.schemas.js";
import { getWorkerProfile, searchWorkers } from "./workers.service.js";

/** `/api/workers` — employer-facing directory: find workers by category without posting a job. */
export const workerRoutes = new Hono<AppEnv>()
  .use(requireRole("EMPLOYER", "ADMIN"))
  .get("/", async (c) => {
    const user = currentUser(c);
    if (user.role === "EMPLOYER") await loadApprovedEmployer(user.id);
    return c.json(await searchWorkers(readQuery(c, workerSearchQuery)));
  })
  .get("/:id", async (c) => {
    const user = currentUser(c);
    const employer = user.role === "EMPLOYER" ? await loadApprovedEmployer(user.id) : null;
    return c.json(await getWorkerProfile(c.req.param("id"), { employer, isAdmin: user.role === "ADMIN" }));
  });

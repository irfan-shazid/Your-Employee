import { Hono } from "hono";
import { byUser, rateLimit } from "../../lib/rate-limit.js";
import { readJson, readQuery } from "../../lib/validation.js";
import { approvedEmployer, approvedWorker, currentUser, requireUser, type AppEnv } from "../../middleware/auth.js";
import { directHireSchema, hireListQuery, reviewSchema } from "./hires.schemas.js";
import * as hires from "./hires.service.js";

/** `/api/hires` — direct offers, offer responses, completion, cancellation and reviews. */
export const hireRoutes = new Hono<AppEnv>()
  .use(requireUser)
  .get("/", async (c) => c.json(await hires.listHires(currentUser(c), readQuery(c, hireListQuery))))
  .post("/", approvedEmployer, rateLimit({ name: "direct-hire", windowMs: 60 * 60_000, max: 30, key: byUser }), async (c) => {
    return c.json(await hires.createDirectHire(c.get("employer"), await readJson(c, directHireSchema)), 201);
  })
  .get("/:id", async (c) => c.json(await hires.getHireDetail(c.req.param("id"), currentUser(c))))
  .post("/:id/accept", approvedWorker, async (c) => {
    await hires.respondToOffer(c.req.param("id"), c.get("worker"), true);
    return c.json({ ok: true });
  })
  .post("/:id/decline", approvedWorker, async (c) => {
    await hires.respondToOffer(c.req.param("id"), c.get("worker"), false);
    return c.json({ ok: true });
  })
  .post("/:id/complete", approvedEmployer, async (c) => {
    await hires.completeHire(c.req.param("id"), c.get("employer"));
    return c.json({ ok: true });
  })
  .post("/:id/cancel", approvedEmployer, async (c) => {
    await hires.cancelHire(c.req.param("id"), c.get("employer"));
    return c.json({ ok: true });
  })
  .post("/:id/review", approvedEmployer, async (c) => {
    const review = await hires.reviewHire(c.req.param("id"), c.get("employer"), await readJson(c, reviewSchema));
    return c.json({ review }, 201);
  });

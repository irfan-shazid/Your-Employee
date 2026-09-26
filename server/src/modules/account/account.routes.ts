import { Hono } from "hono";
import { readJson } from "../../lib/validation.js";
import { currentUser, requireUser, type AppEnv } from "../../middleware/auth.js";
import { availabilitySchema, employerProfileSchema, workerProfileSchema } from "./account.schemas.js";
import * as account from "./account.service.js";

/** `/api/me` — the signed-in user, onboarding and profile updates. */
export const accountRoutes = new Hono<AppEnv>()
  .use(requireUser)
  .get("/", async (c) => c.json(await account.getAccount(currentUser(c).id)))
  .put("/worker", async (c) => {
    const worker = await account.saveWorkerProfile(currentUser(c), await readJson(c, workerProfileSchema));
    return c.json({ worker });
  })
  .put("/employer", async (c) => {
    const employer = await account.saveEmployerProfile(currentUser(c), await readJson(c, employerProfileSchema));
    return c.json({ employer });
  })
  .patch("/availability", async (c) => {
    const { isAvailable } = await readJson(c, availabilitySchema);
    return c.json(await account.setAvailability(currentUser(c).id, isAvailable));
  })
  .delete("/", async (c) => {
    await account.deleteAccount(currentUser(c));
    return c.json({ ok: true });
  });

import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { findPage, pageQuery } from "../../lib/pagination.js";
import { readJson, readQuery } from "../../lib/validation.js";
import { currentUser, requireUser, type AppEnv } from "../../middleware/auth.js";

/** `/api/notifications` — in-app notification inbox. */
export const notificationRoutes = new Hono<AppEnv>()
  .use(requireUser)
  .get("/", async (c) => {
    const userId = currentUser(c).id;
    const page = await findPage(
      (args) => prisma.notification.findMany({ where: { userId }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], ...args }),
      readQuery(c, pageQuery),
    );
    return c.json(page);
  })
  .get("/unread-count", async (c) => {
    const count = await prisma.notification.count({ where: { userId: currentUser(c).id, readAt: null } });
    return c.json({ count });
  })
  .post("/read", async (c) => {
    const { ids } = await readJson(c, z.object({ ids: z.array(z.string()).max(100).optional() }));
    await prisma.notification.updateMany({
      where: { userId: currentUser(c).id, readAt: null, ...(ids?.length ? { id: { in: ids } } : {}) },
      data: { readAt: new Date() },
    });
    return c.json({ ok: true });
  });

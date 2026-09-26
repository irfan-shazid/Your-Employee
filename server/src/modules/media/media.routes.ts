import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { badRequest, notFound } from "../../lib/errors.js";
import { byUser, rateLimit } from "../../lib/rate-limit.js";
import { resolveSessionUser } from "../../lib/session-cache.js";
import { readJson } from "../../lib/validation.js";
import { currentUser, requireUser, sessionMiddleware, type AppEnv } from "../../middleware/auth.js";

/**
 * Images are resized on the device (≤ 800 px JPEG) and stored in Postgres, so no extra storage
 * service is needed. Avatars are public and cached forever; NID photos are private to the
 * owner and admins.
 */
const MAX_BYTES = 1_500_000;

const uploadSchema = z.object({
  data: z.string().min(100).max(Math.ceil((MAX_BYTES * 4) / 3) + 16),
  mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
  purpose: z.enum(["avatar", "nid"]),
});

const MAGIC: Record<string, (b: Buffer) => boolean> = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => b.subarray(0, 4).toString("hex") === "89504e47",
  "image/webp": (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP",
};

export const mediaRoutes = new Hono<AppEnv>()
  .post(
    "/",
    sessionMiddleware,
    requireUser,
    rateLimit({ name: "media-upload", windowMs: 10 * 60_000, max: 20, key: byUser }),
    async (c) => {
      const input = await readJson(c, uploadSchema);
      const base64 = input.data.replace(/^data:[^;]+;base64,/, "");
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw badRequest("Image must be base64 encoded");

      const bytes = Buffer.from(base64, "base64");
      if (bytes.length > MAX_BYTES) throw badRequest("Image is too large (max 1.5 MB)");
      if (!MAGIC[input.mime]!(bytes)) throw badRequest("File content does not match its type");

      const media = await prisma.media.create({
        data: { ownerId: currentUser(c).id, mime: input.mime, size: bytes.length, data: bytes, isPrivate: input.purpose === "nid" },
        select: { id: true },
      });
      return c.json({ id: media.id, url: `/api/media/${media.id}` }, 201);
    },
  )
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    if (!/^[a-z0-9]{10,40}$/i.test(id)) throw notFound();

    // Conditional request: the id never changes content, so the ETag alone proves freshness.
    if (c.req.header("if-none-match") === `"${id}"`) return c.body(null, 304);

    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) throw notFound();

    if (media.isPrivate) {
      const viewer = await resolveSessionUser(c.req.raw.headers);
      if (!viewer || (viewer.id !== media.ownerId && viewer.role !== "ADMIN")) throw notFound();
      c.header("Cache-Control", "private, max-age=3600");
    } else {
      c.header("Cache-Control", "public, max-age=31536000, immutable");
    }

    c.header("Content-Type", media.mime);
    c.header("Content-Length", String(media.size));
    c.header("ETag", `"${media.id}"`);
    return c.body(new Uint8Array(media.data));
  });

import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { corsOrigins, env, isProd } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import { auth } from "./lib/auth.js";
import { ApiError } from "./lib/errors.js";
import { clientIp, rateLimit } from "./lib/rate-limit.js";
import { forgetSession } from "./lib/session-cache.js";
import { sessionMiddleware, type AppEnv } from "./middleware/auth.js";
import { accountRoutes } from "./modules/account/account.routes.js";
import { adminRoutes } from "./modules/admin/admin.routes.js";
import { applicationRoutes } from "./modules/applications/applications.routes.js";
import { hireRoutes } from "./modules/hires/hires.routes.js";
import { jobRoutes } from "./modules/jobs/jobs.routes.js";
import { mediaRoutes } from "./modules/media/media.routes.js";
import { metaRoutes } from "./modules/meta/meta.routes.js";
import { notificationRoutes } from "./modules/notifications/notifications.routes.js";
import { paymentRoutes } from "./modules/payments/payments.routes.js";
import { workerRoutes } from "./modules/workers/workers.routes.js";

const tooLarge = (message: string) => (c: { json: (b: unknown, s: 413) => Response }) =>
  c.json({ error: { code: "TOO_LARGE", message } }, 413);

/** Builds the HTTP app (no network listener) — used by the server and by the test suite. */
export function createApp() {
  const app = new Hono<AppEnv>();

  // ─── Global middleware ────────────────────────────────────────────────────
  if (!isProd && env.NODE_ENV !== "test") app.use("*", logger());
  app.use("*", secureHeaders({ crossOriginResourcePolicy: "cross-origin" }));
  app.use(
    "/api/*",
    cors({
      origin: (origin) => (corsOrigins.includes(origin) ? origin : null),
      credentials: true,
      allowHeaders: ["Content-Type", "Authorization", "Cookie", "expo-origin"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      maxAge: 86400,
    }),
  );

  // Images are uploaded as base64 (≤ 2.2 MB) and already compressed; everything else is small JSON.
  const mediaLimit = bodyLimit({ maxSize: 2_200_000, onError: tooLarge("Image is too large") });
  const jsonLimit = bodyLimit({ maxSize: 256 * 1024, onError: tooLarge("Request is too large") });
  const gzip = compress();
  app.use("/api/*", (c, next) => {
    const isMedia = c.req.path.startsWith("/api/media");
    if (isMedia) return mediaLimit(c, next);
    return jsonLimit(c, async () => {
      await gzip(c, next);
    });
  });

  // Per-IP limits, stricter in front of authentication.
  app.use("/api/*", rateLimit({ name: "global", windowMs: 60_000, max: 300 }));
  app.use("/api/auth/*", rateLimit({ name: "auth", windowMs: 60_000, max: 40, message: "Too many sign-in attempts. Please wait a minute." }));

  // ─── Better Auth ──────────────────────────────────────────────────────────
  app.on(["GET", "POST"], "/api/auth/*", async (c) => {
    const raw = c.req.raw;
    if (c.req.path.endsWith("/sign-out")) forgetSession(raw.headers);

    // Hand Better Auth the real socket IP so its own rate limiter works without a proxy.
    const headers = new Headers(raw.headers);
    headers.delete("x-yem-client-ip");
    if (!env.TRUST_PROXY) headers.set("x-yem-client-ip", clientIp(c));
    const body = raw.method === "GET" || raw.method === "HEAD" ? undefined : await raw.arrayBuffer();
    return auth.handler(new Request(raw.url, { method: raw.method, headers, body }));
  });

  // ─── API ──────────────────────────────────────────────────────────────────
  app.get("/", (c) => c.json({ name: "Your Employee API", status: "ok" }));
  app.get("/api/health", async (c) => {
    await prisma.$queryRaw`SELECT 1`;
    return c.json({ ok: true, time: new Date().toISOString() });
  });

  // Public (or session handled inside the module).
  app.route("/api/meta", metaRoutes);
  app.route("/api/media", mediaRoutes);
  app.route("/api/payments", paymentRoutes);

  // Signed-in areas.
  const api = new Hono<AppEnv>().use(sessionMiddleware);
  api.route("/me", accountRoutes);
  api.route("/workers", workerRoutes);
  api.route("/jobs", jobRoutes);
  api.route("/applications", applicationRoutes);
  api.route("/hires", hireRoutes);
  api.route("/notifications", notificationRoutes);
  api.route("/admin", adminRoutes);
  app.route("/api", api);

  // ─── Errors ───────────────────────────────────────────────────────────────
  app.notFound((c) => c.json({ error: { code: "NOT_FOUND", message: "Route not found" } }, 404));
  app.onError((err, c) => {
    if (err instanceof ApiError) {
      return c.json({ error: { code: err.code, message: err.message, details: err.details } }, err.status);
    }
    if (err instanceof HTTPException) return c.json({ error: { code: "HTTP_ERROR", message: err.message } }, err.status);
    console.error(`[${c.req.method} ${c.req.path}]`, err);
    return c.json({ error: { code: "INTERNAL", message: "Something went wrong. Please try again." } }, 500);
  });

  return app;
}

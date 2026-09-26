/**
 * Boots the API against an in-process Postgres (PGlite) with the real migration applied,
 * so `npm test` needs no Docker, no Neon account and no network.
 */
import { readFileSync, readdirSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { installSslcommerzMock } from "./sslcommerz-mock.js";

export const ADMIN = { email: "admin@test.dev", password: "Admin12345", name: "Test Admin" };

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address() as { port: number };
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

export async function startTestEnvironment() {
  const db = await PGlite.create();
  const migrations = join(import.meta.dirname, "../../prisma/migrations");
  for (const dir of readdirSync(migrations).filter((d) => /^\d+_/.test(d)).sort()) {
    await db.exec(readFileSync(join(migrations, dir, "migration.sql"), "utf8"));
  }

  const port = await freePort();
  const pg = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 20 });
  await pg.start();

  // Must be set before any app module (and its env validation) is imported.
  Object.assign(process.env, {
    NODE_ENV: "test",
    DATABASE_URL: `postgresql://postgres:postgres@127.0.0.1:${port}/postgres?sslmode=disable`,
    BETTER_AUTH_URL: "http://localhost:4000",
    BETTER_AUTH_SECRET: "test-secret-that-is-long-enough-1234567890",
    TRUST_PROXY: "true",
    CORS_ORIGINS: "http://localhost:8081",
    SSLCOMMERZ_STORE_ID: "teststore",
    SSLCOMMERZ_STORE_PASSWORD: "testpass",
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
  });
  installSslcommerzMock();

  const { createApp } = await import("../../src/app.js");
  const { prisma } = await import("../../src/db/prisma.js");
  const { ensureAdmin, seedCategories } = await import("../../src/db/seed.js");
  await seedCategories();
  await ensureAdmin(ADMIN);

  return {
    app: createApp(),
    prisma,
    async stop() {
      await prisma.$disconnect();
      await pg.stop();
      await db.close();
    },
  };
}

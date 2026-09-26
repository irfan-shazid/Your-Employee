import { PrismaPg } from "@prisma/adapter-pg";
import { env, isProd } from "../config/env.js";
import { PrismaClient } from "../generated/prisma/client.js";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    log: isProd ? ["error"] : ["error", "warn"],
  });
}

// Reuse one client (and one connection pool) per process, including across tsx watch reloads.
export const prisma = globalForPrisma.prisma ?? createClient();
if (!isProd) globalForPrisma.prisma = prisma;

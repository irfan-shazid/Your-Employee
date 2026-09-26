/**
 * Seeds work categories and the first admin account.
 * Run with: npm run db:seed   (safe to run multiple times)
 */
import { env } from "../src/config/env.js";
import { prisma } from "../src/db/prisma.js";
import { ensureAdmin, seedCategories } from "../src/db/seed.js";

async function main() {
  console.log(`✔ ${await seedCategories()} categories ready`);

  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    console.log("ℹ Set ADMIN_EMAIL and ADMIN_PASSWORD in .env to create the admin account.");
    return;
  }
  const email = await ensureAdmin({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD, name: env.ADMIN_NAME });
  console.log(`✔ Admin ready: ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

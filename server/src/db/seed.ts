import { auth } from "../lib/auth.js";
import { DEFAULT_CATEGORIES } from "../shared/categories.js";
import { prisma } from "./prisma.js";

/** Insert or refresh the default work categories. Safe to run repeatedly. */
export async function seedCategories() {
  for (const [index, category] of DEFAULT_CATEGORIES.entries()) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, nameBn: category.nameBn, icon: category.icon },
      create: { ...category, sortOrder: index },
    });
  }
  return DEFAULT_CATEGORIES.length;
}

/** Create the admin account (through Better Auth, so the password is hashed normally) and grant the role. */
export async function ensureAdmin({ email, password, name }: { email: string; password: string; name: string }) {
  const normalized = email.toLowerCase();
  let admin = await prisma.user.findUnique({ where: { email: normalized } });
  if (!admin) {
    await auth.api.signUpEmail({ body: { email: normalized, password, name } });
    admin = await prisma.user.findUniqueOrThrow({ where: { email: normalized } });
  }
  await prisma.user.update({ where: { id: admin.id }, data: { role: "ADMIN", emailVerified: true } });
  return normalized;
}

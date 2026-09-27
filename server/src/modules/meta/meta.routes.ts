import { Hono } from "hono";
import { pricing } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { isGoogleEnabled } from "../../lib/auth.js";
import type { AppEnv } from "../../middleware/auth.js";
import { DIVISIONS } from "../../shared/locations.js";
import { categorySelect } from "../../shared/serializers.js";
import { paymentMethods } from "../payments/pricing.js";

/** `/api/meta` — categories, locations, pricing and payment methods in one cacheable call the app loads at startup. */
export const metaRoutes = new Hono<AppEnv>().get("/", async (c) => {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: categorySelect,
  });
  const methods = paymentMethods();

  c.header("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
  return c.json({
    categories,
    divisions: DIVISIONS,
    pricing,
    paymentMethods: methods,
    features: { googleSignIn: isGoogleEnabled, payments: methods.some((m) => m.enabled) },
  });
});

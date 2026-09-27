import "dotenv/config";
import { z } from "zod";

const bool = z
  .enum(["true", "false", "1", "0"])
  .default("false")
  .transform((v) => v === "true" || v === "1");

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  // Neon pooled connection string (…-pooler.…neon.tech) used at runtime
  DATABASE_URL: z.string().url(),

  // Public base URL of this server, e.g. https://api.yourdomain.com or http://192.168.0.105:4000
  BETTER_AUTH_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),

  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),

  // Deep link scheme of the mobile app (app.json -> expo.scheme)
  APP_SCHEME: z.string().default("youremployee"),
  // Comma separated extra origins allowed for CORS / Better Auth (e.g. Expo web dev server)
  CORS_ORIGINS: z.string().optional().default("http://localhost:8081"),
  // Set to true when running behind a reverse proxy (Render, Railway, Nginx…) so X-Forwarded-For is trusted
  TRUST_PROXY: bool,

  SSLCOMMERZ_STORE_ID: z.string().optional().default(""),
  SSLCOMMERZ_STORE_PASSWORD: z.string().optional().default(""),
  SSLCOMMERZ_IS_LIVE: bool,

  // Stripe (international cards). Leave the secret key empty to disable Stripe.
  STRIPE_SECRET_KEY: z
    .string()
    .optional()
    .default("")
    .refine((v) => !v || /^(sk|rk)_(test|live)_/.test(v), "must start with sk_test_, sk_live_, rk_test_ or rk_live_"),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .optional()
    .default("")
    .refine((v) => !v || v.startsWith("whsec_"), "must start with whsec_"),
  STRIPE_CURRENCY: z
    .string()
    .regex(/^[a-zA-Z]{3}$/, "must be a 3-letter ISO currency code")
    .default("usd")
    .transform((v) => v.toLowerCase()),
  // Stripe prices in STRIPE_CURRENCY (decimals allowed). Stripe rejects charges below its
  // minimum (about USD 0.50), so these are separate from the BDT prices below.
  STRIPE_WORKER_MONTHLY_FEE: z.coerce.number().positive().default(1),
  STRIPE_JOB_POST_FEE: z.coerce.number().positive().default(0.5),
  STRIPE_HIRE_FEE: z.coerce.number().positive().default(0.5),

  WORKER_MONTHLY_FEE: z.coerce.number().int().positive().default(50),
  JOB_POST_FEE: z.coerce.number().int().positive().default(10),
  HIRE_FEE: z.coerce.number().int().positive().default(10),
  SUBSCRIPTION_DAYS: z.coerce.number().int().positive().default(30),

  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  ADMIN_NAME: z.string().optional().default("Admin"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  for (const issue of parsed.error.issues) {
    console.error(`   • ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";

export const corsOrigins = env.CORS_ORIGINS.split(",")
  .map((o) => o.trim())
  .filter(Boolean);

/** Headline prices in whole BDT (SSLCommerz). Stripe prices live in modules/payments/pricing.ts. */
export const pricing = {
  workerMonthly: env.WORKER_MONTHLY_FEE,
  jobPost: env.JOB_POST_FEE,
  hire: env.HIRE_FEE,
  subscriptionDays: env.SUBSCRIPTION_DAYS,
  currency: "BDT",
} as const;

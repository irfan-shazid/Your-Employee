import { env, pricing } from "../../config/env.js";
import type { PaymentProvider, PaymentPurpose } from "../../generated/prisma/enums.js";
import { isStripeConfigured } from "../../lib/stripe.js";
import { isSslcommerzConfigured } from "../../lib/sslcommerz.js";
import { toMajor, toMinor } from "../../shared/money.js";

type Price = { amount: number; currency: string };
type PriceTable = Record<PaymentPurpose, number>;

/**
 * Each gateway charges in its own currency:
 * - SSLCommerz: BDT (the platform's headline prices)
 * - Stripe: STRIPE_CURRENCY with its own prices, because Stripe has a minimum charge
 *   (≈ USD 0.50) that BDT 10 is below.
 */
const TABLES: Record<PaymentProvider, { currency: string; prices: PriceTable }> = {
  SSLCOMMERZ: {
    currency: "BDT",
    prices: {
      WORKER_SUBSCRIPTION: toMinor(pricing.workerMonthly, "BDT"),
      JOB_POST: toMinor(pricing.jobPost, "BDT"),
      HIRE: toMinor(pricing.hire, "BDT"),
    },
  },
  STRIPE: {
    currency: env.STRIPE_CURRENCY.toUpperCase(),
    prices: {
      WORKER_SUBSCRIPTION: toMinor(env.STRIPE_WORKER_MONTHLY_FEE, env.STRIPE_CURRENCY),
      JOB_POST: toMinor(env.STRIPE_JOB_POST_FEE, env.STRIPE_CURRENCY),
      HIRE: toMinor(env.STRIPE_HIRE_FEE, env.STRIPE_CURRENCY),
    },
  },
};

const CONFIGURED: Record<PaymentProvider, () => boolean> = {
  SSLCOMMERZ: () => isSslcommerzConfigured,
  STRIPE: () => isStripeConfigured,
};

export const isProviderEnabled = (provider: PaymentProvider) => CONFIGURED[provider]();

/** Amount (minor units) and currency to charge for a purchase through a gateway. */
export function priceFor(provider: PaymentProvider, purpose: PaymentPurpose): Price {
  const table = TABLES[provider];
  return { amount: table.prices[purpose], currency: table.currency };
}

const DETAILS: Record<PaymentProvider, { name: string; description: string }> = {
  SSLCOMMERZ: { name: "SSLCommerz", description: "bKash, Nagad, Rocket and Bangladeshi cards" },
  STRIPE: { name: "Stripe", description: "International Visa, Mastercard and Amex cards" },
};

/** Currencies the enabled gateways charge in. */
export const chargeCurrencies = () =>
  [...new Set((Object.keys(TABLES) as PaymentProvider[]).filter(isProviderEnabled).map((p) => TABLES[p].currency))];

/** Payment methods shown in the app (enabled ones first). Prices are in minor units. */
export function paymentMethods() {
  return (Object.keys(TABLES) as PaymentProvider[])
    .map((id) => ({
      id,
      ...DETAILS[id],
      currency: TABLES[id].currency,
      prices: TABLES[id].prices,
      enabled: isProviderEnabled(id),
    }))
    .sort((a, b) => Number(b.enabled) - Number(a.enabled));
}

/** Stripe's documented minimum charge for common settlement currencies (major units). */
const STRIPE_MINIMUMS: Record<string, number> = { usd: 0.5, eur: 0.5, gbp: 0.3, cad: 0.5, aud: 0.5, sgd: 0.5, chf: 0.5, inr: 0.5 };

/** Startup warnings for a Stripe setup that will misbehave (missing webhook, prices below Stripe's minimum). */
export function warnAboutStripeSetup(log: (message: string) => void = console.warn) {
  if (!isStripeConfigured) return;
  if (!env.STRIPE_WEBHOOK_SECRET) {
    log("⚠ STRIPE_WEBHOOK_SECRET is not set: Stripe payments only settle when the customer returns to the app.");
  }
  const minimum = STRIPE_MINIMUMS[env.STRIPE_CURRENCY];
  if (minimum === undefined) return;
  for (const [purpose, amount] of Object.entries(TABLES.STRIPE.prices)) {
    const major = toMajor(amount, env.STRIPE_CURRENCY);
    if (major < minimum) {
      log(`⚠ Stripe price for ${purpose} (${major} ${env.STRIPE_CURRENCY.toUpperCase()}) is below Stripe's minimum of ${minimum}; checkout will fail.`);
    }
  }
}

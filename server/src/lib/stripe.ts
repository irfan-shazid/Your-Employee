import Stripe from "stripe";
import { env } from "../config/env.js";

/**
 * Stripe client (null when STRIPE_SECRET_KEY is not set). Uses the fetch-based HTTP client so
 * it behaves the same everywhere Node's fetch is available (and can be mocked in tests).
 */
export const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, {
      httpClient: Stripe.createFetchHttpClient(),
      maxNetworkRetries: 2,
      timeout: 20_000,
      appInfo: { name: "Your Employee" },
    })
  : null;

export const isStripeConfigured = Boolean(stripe);

/**
 * Verify a webhook's `stripe-signature` header against the raw request body.
 * Throws if the signature is missing, invalid or too old.
 */
export function verifyStripeWebhook(rawBody: string, signature: string | undefined) {
  if (!env.STRIPE_WEBHOOK_SECRET) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  if (!signature) throw new Error("Missing stripe-signature header");
  return Stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
}

export type StripeCheckoutSession = Stripe.Checkout.Session;
export type StripeEvent = Stripe.Event;

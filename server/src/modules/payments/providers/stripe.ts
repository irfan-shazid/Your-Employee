import type Stripe from "stripe";
import { env } from "../../../config/env.js";
import { stripe } from "../../../lib/stripe.js";
import type { Gateway, VerifiedPayment } from "./types.js";

/** Checkout sessions stay payable for an hour (Stripe allows 30 minutes to 24 hours). */
const CHECKOUT_TTL_SECONDS = 60 * 60;
/** Expanding the charge gives us the card brand / wallet and the charge id in one call. */
const EXPAND = ["payment_intent.latest_charge"];

function client() {
  if (!stripe) throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  return stripe;
}

const idOf = (value: string | { id: string } | null) => (typeof value === "string" ? value : (value?.id ?? null));

/** Normalise a Checkout Session (ideally retrieved with `EXPAND`). */
export function fromCheckoutSession(session: Stripe.Checkout.Session): VerifiedPayment {
  const intent = typeof session.payment_intent === "object" ? session.payment_intent : null;
  const charge = intent && typeof intent.latest_charge === "object" ? intent.latest_charge : null;
  const details = charge?.payment_method_details;

  const base = {
    tranId: session.client_reference_id ?? session.metadata?.tranId ?? null,
    amount: session.amount_total ?? 0,
    currency: (session.currency ?? "").toUpperCase(),
    providerRef: idOf(session.payment_intent),
    bankTranId: charge?.id ?? null,
    method: details?.card?.wallet?.type ?? details?.card?.brand ?? details?.type ?? null,
    // A compact audit record; the full session holds customer details we don't need to keep.
    raw: {
      id: session.id,
      status: session.status,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      currency: session.currency,
      paymentIntent: idOf(session.payment_intent),
      paymentIntentStatus: intent?.status ?? null,
      charge: charge?.id ?? null,
      presentment: session.presentment_details ?? null,
      livemode: session.livemode,
    },
  };

  if (session.payment_status === "paid") return { ...base, status: "PAID" };
  if (session.status === "expired") return { ...base, status: "CANCELLED", failureReason: "Checkout expired before payment" };
  // Completed with a delayed method (bank debit…) that was later declined.
  if (session.status === "complete" && intent && (intent.status === "canceled" || intent.status === "requires_payment_method")) {
    return { ...base, status: "FAILED", failureReason: intent.last_payment_error?.message ?? "The payment was declined" };
  }
  // Still open, or completed with a delayed method that has not cleared yet.
  return { ...base, status: "PENDING" };
}

export async function retrieveCheckoutSession(sessionId: string) {
  return client().checkout.sessions.retrieve(sessionId, { expand: EXPAND });
}

/** Close an open Checkout Session so it can no longer be paid. Throws if it already completed. */
export async function expireCheckoutSession(sessionId: string) {
  await client().checkout.sessions.expire(sessionId);
}

export const stripeGateway: Gateway = {
  async start(payment, purchase) {
    const base = `${env.BETTER_AUTH_URL.replace(/\/$/, "")}/api/payments/stripe`;
    const metadata = { tranId: payment.tranId, paymentId: payment.id, purpose: payment.purpose, userId: payment.userId };

    const session = await client().checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: payment.currency.toLowerCase(),
              unit_amount: payment.amount,
              product_data: { name: purchase.productName, description: `Your Employee · ${purchase.productCategory}` },
            },
          },
        ],
        client_reference_id: payment.tranId,
        customer_email: purchase.customer.email,
        metadata,
        payment_intent_data: { description: `${purchase.productCategory} (${payment.tranId})`, metadata },
        submit_type: "pay",
        expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_TTL_SECONDS,
        success_url: `${base}/return?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/cancel?tran_id=${encodeURIComponent(payment.tranId)}`,
      },
      // A retried request (network blip) must never open a second checkout for the same payment.
      { idempotencyKey: `checkout-${payment.tranId}` },
    );

    if (!session.url) throw new Error("Stripe did not return a Checkout URL");
    return { url: session.url, checkoutSessionId: session.id };
  },

  async lookup(payment) {
    if (!payment.checkoutSessionId) return null;
    return fromCheckoutSession(await retrieveCheckoutSession(payment.checkoutSessionId));
  },
};

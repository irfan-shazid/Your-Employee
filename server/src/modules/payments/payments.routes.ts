import { Hono, type Context } from "hono";
import { z } from "zod";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import type { Payment } from "../../generated/prisma/client.js";
import { pageQuery } from "../../lib/pagination.js";
import { byUser, rateLimit } from "../../lib/rate-limit.js";
import { validateByValId } from "../../lib/sslcommerz.js";
import { isStripeConfigured, verifyStripeWebhook } from "../../lib/stripe.js";
import { readJson, readQuery } from "../../lib/validation.js";
import { currentUser, requireUser, sessionMiddleware, type AppEnv } from "../../middleware/auth.js";
import { paymentProvider, paymentPurpose } from "../../shared/schemas.js";
import * as payments from "./payments.service.js";
import { fromValidation } from "./providers/sslcommerz.js";
import { renderReturnPage, type ReturnStatus } from "./return-page.js";

const initSchema = z.object({
  provider: paymentProvider.optional(),
  purpose: paymentPurpose,
  referenceId: z.string().optional(),
  redirectUrl: z.string().min(3).max(500),
});

const PAGE_STATUS: Record<Payment["status"], ReturnStatus> = {
  SUCCESS: "success",
  PENDING: "processing",
  FAILED: "failed",
  CANCELLED: "cancelled",
};

/** Page shown in the in-app browser, bouncing back into the app with the payment's state. */
const returnPage = (c: Context, payment: Payment) => c.html(renderReturnPage(PAGE_STATUS[payment.status], payment.tranId, payment.appRedirectUrl));

// ─── SSLCommerz ─────────────────────────────────────────────────────────────

/** Fields SSLCommerz posts (form-encoded) to the success / fail / cancel / IPN URLs. */
async function readGatewayBody(c: Context) {
  const body = await c.req.parseBody().catch(() => ({}) as Record<string, unknown>);
  const fields: Record<string, unknown> = { ...c.req.query(), ...body };
  const str = (key: string) => (typeof fields[key] === "string" ? (fields[key] as string) : "");
  return { tranId: str("tran_id"), valId: str("val_id"), error: str("error") || undefined };
}

const findSslcommerzPayment = (tranId: string) =>
  tranId ? prisma.payment.findFirst({ where: { tranId, provider: "SSLCOMMERZ" } }) : null;

/** Called by SSLCommerz / the payer's browser — no session. */
const sslcommerzCallbacks = new Hono<AppEnv>()
  .all("/success", async (c) => {
    const { tranId, valId } = await readGatewayBody(c);
    const payment = await findSslcommerzPayment(tranId);
    if (!payment) return c.html(renderReturnPage("failed", tranId, null), 404);

    let ok = payment.status === "SUCCESS";
    if (!ok && valId) {
      try {
        ok = (await payments.settlePayment(payment, fromValidation(await validateByValId(valId)))) !== "FAILED";
      } catch (err) {
        console.error("[sslcommerz] success handler", err);
      }
    }
    return c.html(renderReturnPage(ok ? "success" : "failed", payment.tranId, payment.appRedirectUrl));
  })
  .all("/fail", async (c) => {
    const { tranId, error } = await readGatewayBody(c);
    const payment = await findSslcommerzPayment(tranId);
    if (!payment) return c.html(renderReturnPage("failed", tranId, null), 404);
    await payments.markPayment(payment.id, "FAILED", error ?? "Payment failed at the gateway");
    return c.html(renderReturnPage("failed", payment.tranId, payment.appRedirectUrl));
  })
  .all("/cancel", async (c) => {
    const { tranId } = await readGatewayBody(c);
    const payment = await findSslcommerzPayment(tranId);
    if (!payment) return c.html(renderReturnPage("cancelled", tranId, null), 404);
    await payments.markPayment(payment.id, "CANCELLED", "Cancelled by the customer");
    return c.html(renderReturnPage("cancelled", payment.tranId, payment.appRedirectUrl));
  })
  // Instant Payment Notification: server-to-server, the source of truth when the browser never returns.
  .post("/ipn", async (c) => {
    const { tranId, valId } = await readGatewayBody(c);
    const payment = await findSslcommerzPayment(tranId);
    if (!payment) return c.text("UNKNOWN_TRANSACTION", 404);
    if (!valId) {
      await payments.markPayment(payment.id, "FAILED", "IPN without validation id");
      return c.text("OK");
    }
    try {
      await payments.settlePayment(payment, fromValidation(await validateByValId(valId)));
      return c.text("OK");
    } catch (err) {
      console.error("[sslcommerz] IPN handler", err);
      return c.text("ERROR", 500);
    }
  });

// ─── Stripe ─────────────────────────────────────────────────────────────────

/** Stripe Checkout redirects (payer's browser) and webhooks (Stripe's servers) — no session. */
const stripeCallbacks = new Hono<AppEnv>()
  // success_url: `?session_id={CHECKOUT_SESSION_ID}` is filled in by Stripe.
  .get("/return", async (c) => {
    const sessionId = c.req.query("session_id") ?? "";
    const payment = sessionId.startsWith("cs_")
      ? await prisma.payment.findUnique({ where: { checkoutSessionId: sessionId } })
      : null;
    if (!payment) return c.html(renderReturnPage("failed", "", null), 404);

    try {
      return returnPage(c, await payments.syncStripePayment(payment));
    } catch (err) {
      // Stripe unreachable: the webhook or the app's status check will settle it.
      console.error("[stripe] return handler", err);
      return returnPage(c, payment);
    }
  })
  // cancel_url: the customer pressed "back" on the Checkout page.
  .get("/cancel", async (c) => {
    const tranId = c.req.query("tran_id") ?? "";
    const payment = tranId ? await prisma.payment.findFirst({ where: { tranId, provider: "STRIPE" } }) : null;
    if (!payment) return c.html(renderReturnPage("cancelled", tranId, null), 404);
    return returnPage(c, await payments.cancelStripeCheckout(payment, "Cancelled by the customer"));
  })
  // Webhook: verified with STRIPE_WEBHOOK_SECRET against the raw body.
  .post("/webhook", async (c) => {
    if (!isStripeConfigured || !env.STRIPE_WEBHOOK_SECRET) {
      return c.json({ error: { code: "PAYMENTS_DISABLED", message: "Stripe webhooks are not configured" } }, 503);
    }

    let event;
    try {
      event = verifyStripeWebhook(await c.req.text(), c.req.header("stripe-signature"));
    } catch (err) {
      console.warn("[stripe] rejected webhook:", err instanceof Error ? err.message : err);
      return c.json({ error: { code: "INVALID_SIGNATURE", message: "Invalid Stripe signature" } }, 400);
    }

    try {
      return c.json({ received: true, result: await payments.handleStripeEvent(event) });
    } catch (err) {
      // Non-2xx makes Stripe retry the delivery with backoff.
      console.error(`[stripe] webhook ${event.type} ${event.id}`, err);
      return c.json({ error: { code: "INTERNAL", message: "Could not process the event" } }, 500);
    }
  });

// ─── Signed-in API ──────────────────────────────────────────────────────────

/** `/api/payments` — gateway callbacks, plus start / history / status for the signed-in user. */
export const paymentRoutes = new Hono<AppEnv>()
  .route("/sslcommerz", sslcommerzCallbacks)
  .route("/stripe", stripeCallbacks)
  .use("*", sessionMiddleware, requireUser)
  .post("/init", rateLimit({ name: "payment-init", windowMs: 60_000, max: 8, key: byUser }), async (c) => {
    return c.json(await payments.startPayment(currentUser(c), await readJson(c, initSchema)));
  })
  .get("/", async (c) => c.json(await payments.listPayments(currentUser(c).id, readQuery(c, pageQuery))))
  .get("/:tranId", async (c) => c.json({ payment: await payments.getPaymentStatus(c.req.param("tranId"), currentUser(c).id) }));

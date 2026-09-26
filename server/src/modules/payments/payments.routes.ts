import { Hono, type Context } from "hono";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { pageQuery } from "../../lib/pagination.js";
import { byUser, rateLimit } from "../../lib/rate-limit.js";
import { validateByValId } from "../../lib/sslcommerz.js";
import { readJson, readQuery } from "../../lib/validation.js";
import { currentUser, requireUser, sessionMiddleware, type AppEnv } from "../../middleware/auth.js";
import { paymentPurpose } from "../../shared/schemas.js";
import * as payments from "./payments.service.js";
import { renderReturnPage } from "./return-page.js";

const initSchema = z.object({
  purpose: paymentPurpose,
  referenceId: z.string().optional(),
  redirectUrl: z.string().min(3).max(500),
});

/** Fields SSLCommerz posts (form-encoded) to the success / fail / cancel / IPN URLs. */
async function readGatewayBody(c: Context) {
  const body = await c.req.parseBody().catch(() => ({}) as Record<string, unknown>);
  const fields: Record<string, unknown> = { ...c.req.query(), ...body };
  const str = (key: string) => (typeof fields[key] === "string" ? (fields[key] as string) : "");
  return { tranId: str("tran_id"), valId: str("val_id"), error: str("error") || undefined };
}

const findPayment = (tranId: string) => (tranId ? prisma.payment.findUnique({ where: { tranId } }) : null);

/** Called by SSLCommerz / the payer's browser — no session. */
const gatewayCallbacks = new Hono<AppEnv>()
  .all("/success", async (c) => {
    const { tranId, valId } = await readGatewayBody(c);
    const payment = await findPayment(tranId);
    if (!payment) return c.html(renderReturnPage("failed", tranId, null), 404);

    let ok = payment.status === "SUCCESS";
    if (!ok && valId) {
      try {
        ok = (await payments.settlePayment(payment, await validateByValId(valId))) !== "FAILED";
      } catch (err) {
        console.error("[sslcommerz] success handler", err);
      }
    }
    return c.html(renderReturnPage(ok ? "success" : "failed", payment.tranId, payment.appRedirectUrl));
  })
  .all("/fail", async (c) => {
    const { tranId, error } = await readGatewayBody(c);
    const payment = await findPayment(tranId);
    if (!payment) return c.html(renderReturnPage("failed", tranId, null), 404);
    await payments.markPayment(payment.id, "FAILED", error ?? "Payment failed at the gateway");
    return c.html(renderReturnPage("failed", payment.tranId, payment.appRedirectUrl));
  })
  .all("/cancel", async (c) => {
    const { tranId } = await readGatewayBody(c);
    const payment = await findPayment(tranId);
    if (!payment) return c.html(renderReturnPage("cancelled", tranId, null), 404);
    await payments.markPayment(payment.id, "CANCELLED", "Cancelled by the customer");
    return c.html(renderReturnPage("cancelled", payment.tranId, payment.appRedirectUrl));
  })
  // Instant Payment Notification: server-to-server, the source of truth when the browser never returns.
  .post("/ipn", async (c) => {
    const { tranId, valId } = await readGatewayBody(c);
    const payment = await findPayment(tranId);
    if (!payment) return c.text("UNKNOWN_TRANSACTION", 404);
    if (!valId) {
      await payments.markPayment(payment.id, "FAILED", "IPN without validation id");
      return c.text("OK");
    }
    try {
      await payments.settlePayment(payment, await validateByValId(valId));
      return c.text("OK");
    } catch (err) {
      console.error("[sslcommerz] IPN handler", err);
      return c.text("ERROR", 500);
    }
  });

/** `/api/payments` — start a payment, history and status for the signed-in user. */
export const paymentRoutes = new Hono<AppEnv>()
  .route("/sslcommerz", gatewayCallbacks)
  .use("*", sessionMiddleware, requireUser)
  .post("/init", rateLimit({ name: "payment-init", windowMs: 60_000, max: 8, key: byUser }), async (c) => {
    return c.json(await payments.startPayment(currentUser(c), await readJson(c, initSchema)));
  })
  .get("/", async (c) => c.json(await payments.listPayments(currentUser(c).id, readQuery(c, pageQuery))))
  .get("/:tranId", async (c) => c.json({ payment: await payments.getPaymentStatus(c.req.param("tranId"), currentUser(c).id) }));

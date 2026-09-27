import { randomBytes } from "node:crypto";
import { env, pricing } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import type { Payment, PaymentProvider, PaymentPurpose, Prisma } from "../../generated/prisma/client.js";
import { ApiError, badRequest, conflict, notFound } from "../../lib/errors.js";
import { notify, notifyMany } from "../../lib/notify.js";
import { findPage } from "../../lib/pagination.js";
import type { SessionUser } from "../../lib/session-cache.js";
import type { StripeCheckoutSession, StripeEvent } from "../../lib/stripe.js";
import { activatePaidHire } from "../hires/hires.service.js";
import { isProviderEnabled, priceFor } from "./pricing.js";
import { gateways, type Purchase, type VerifiedPayment } from "./providers/index.js";
import { expireCheckoutSession, fromCheckoutSession, retrieveCheckoutSession } from "./providers/stripe.js";

type Tx = Prisma.TransactionClient;

export function toPublicPayment(p: Payment) {
  return {
    id: p.id,
    tranId: p.tranId,
    provider: p.provider,
    purpose: p.purpose,
    referenceId: p.referenceId,
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    method: p.method,
    failureReason: p.failureReason,
    paidAt: p.paidAt,
    createdAt: p.createdAt,
  };
}

const PROVIDER_NAMES: Record<PaymentProvider, string> = { SSLCOMMERZ: "SSLCommerz", STRIPE: "Stripe" };

// ─── Starting a payment ─────────────────────────────────────────────────────

/** Only redirect back into our own app (plus Expo Go / localhost web during development). */
export function isAllowedRedirect(url: string) {
  if (url.startsWith(`${env.APP_SCHEME}://`)) return true;
  if (env.NODE_ENV === "production") return false;
  return url.startsWith("exp://") || url.startsWith("exps://") || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(url);
}

/** SSLCommerz when available (local wallets), otherwise Stripe — for clients that don't choose. */
function defaultProvider(): PaymentProvider {
  return !isProviderEnabled("SSLCOMMERZ") && isProviderEnabled("STRIPE") ? "STRIPE" : "SSLCOMMERZ";
}

/** What is being bought: reference and customer details for the gateway. */
async function describePurchase(user: SessionUser, purpose: PaymentPurpose, referenceId?: string): Promise<Purchase> {
  if (purpose === "WORKER_SUBSCRIPTION") {
    const worker = await prisma.workerProfile.findUnique({ where: { userId: user.id } });
    if (!worker || worker.status !== "APPROVED") throw conflict("Your profile must be approved before subscribing");
    return {
      referenceId: worker.id,
      productName: `Worker plan (${pricing.subscriptionDays} days)`,
      productCategory: "Subscription",
      customer: { name: worker.fullName, email: user.email, phone: worker.phone, address: worker.area, city: worker.district },
    };
  }

  if (!referenceId) throw badRequest("referenceId is required");
  const employer = await prisma.employerProfile.findUnique({ where: { userId: user.id } });
  if (!employer || employer.status !== "APPROVED") throw conflict("Your profile must be approved first");
  const customer = { name: employer.fullName, email: user.email, phone: employer.phone, address: employer.area, city: employer.district };

  if (purpose === "JOB_POST") {
    const job = await prisma.job.findUnique({ where: { id: referenceId } });
    if (!job || job.employerId !== employer.id) throw notFound("Job not found");
    if (job.status !== "PENDING_PAYMENT") throw conflict("This job is already published", "ALREADY_PAID");
    return { referenceId: job.id, productName: `Job post: ${job.title}`.slice(0, 100), productCategory: "Job post", customer };
  }

  const hire = await prisma.hire.findUnique({ where: { id: referenceId } });
  if (!hire || hire.employerId !== employer.id) throw notFound("Hire not found");
  if (hire.status !== "PENDING_PAYMENT") throw conflict("This hire is already paid", "ALREADY_PAID");
  return { referenceId: hire.id, productName: `Hiring fee: ${hire.title}`.slice(0, 100), productCategory: "Hiring fee", customer };
}

export async function startPayment(
  user: SessionUser,
  input: { provider?: PaymentProvider; purpose: PaymentPurpose; referenceId?: string; redirectUrl: string },
) {
  const provider = input.provider ?? defaultProvider();
  if (!isProviderEnabled(provider)) {
    throw new ApiError(503, "PAYMENTS_DISABLED", `${PROVIDER_NAMES[provider]} payments are not configured on the server yet`);
  }
  if (!isAllowedRedirect(input.redirectUrl)) throw badRequest("Invalid redirect URL");

  // Close checkouts left open by earlier attempts first, so the same item can't be paid twice
  // (and if one of them was in fact paid, it settles now and the purchase below reports it).
  await supersedeOpenCheckouts(user.id, input.purpose, input.referenceId);

  const purchase = await describePurchase(user, input.purpose, input.referenceId);
  const price = priceFor(provider, input.purpose);
  const tranId = `YE${Date.now().toString(36).toUpperCase()}${randomBytes(4).toString("hex").toUpperCase()}`;
  const payment = await prisma.payment.create({
    data: {
      tranId,
      userId: user.id,
      provider,
      purpose: input.purpose,
      referenceId: purchase.referenceId,
      amount: price.amount,
      currency: price.currency,
      appRedirectUrl: input.redirectUrl,
    },
  });

  try {
    const checkout = await gateways[provider].start(payment, purchase);
    if (checkout.checkoutSessionId) {
      await prisma.payment.update({ where: { id: payment.id }, data: { checkoutSessionId: checkout.checkoutSessionId } });
    }
    return { tranId, provider, gatewayUrl: checkout.url, amount: price.amount, currency: price.currency };
  } catch (err) {
    await markPayment(payment.id, "FAILED", err instanceof Error ? err.message.slice(0, 300) : "Gateway error");
    console.error(`[${provider.toLowerCase()}] init`, err);
    throw new ApiError(502, "GATEWAY_ERROR", "Could not reach the payment gateway. Please try again.");
  }
}

/** Expire the user's still-open Stripe checkouts for the same item (best effort). */
async function supersedeOpenCheckouts(userId: string, purpose: PaymentPurpose, referenceId?: string) {
  if (!isProviderEnabled("STRIPE")) return;
  const open = await prisma.payment.findMany({
    where: {
      userId,
      purpose,
      ...(referenceId && { referenceId }),
      provider: "STRIPE",
      status: "PENDING",
      checkoutSessionId: { not: null },
      createdAt: { gt: new Date(Date.now() - 2 * 3600 * 1000) }, // sessions live for 1 hour
    },
  });
  for (const payment of open) await cancelStripeCheckout(payment, "Replaced by a newer payment attempt");
}

// ─── Reading ────────────────────────────────────────────────────────────────

export async function listPayments(userId: string, query: { cursor?: string; limit: number }) {
  const page = await findPage(
    (args) => prisma.payment.findMany({ where: { userId }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], ...args }),
    query,
  );
  return { items: page.items.map(toPublicPayment), nextCursor: page.nextCursor };
}

/** Status for the app. An unsettled payment older than 5 s is reconciled with its gateway first. */
export async function getPaymentStatus(tranId: string, userId: string) {
  let payment = await prisma.payment.findUnique({ where: { tranId } });
  if (!payment || payment.userId !== userId) throw notFound("Payment not found");

  if (payment.status !== "SUCCESS" && isProviderEnabled(payment.provider) && Date.now() - payment.createdAt.getTime() > 5_000) {
    try {
      const found = await gateways[payment.provider].lookup(payment);
      if (found && (await settlePayment(payment, found)) !== "PENDING") {
        payment = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      }
    } catch (err) {
      console.error(`[${payment.provider.toLowerCase()}] reconcile`, err);
    }
  }
  return toPublicPayment(payment);
}

// ─── Settlement ─────────────────────────────────────────────────────────────

export type SettleResult = "SUCCESS" | "ALREADY_SETTLED" | "PENDING" | "FAILED";

/**
 * Settle a payment from a gateway's verified answer. Safe to call concurrently (browser
 * return + IPN/webhook + reconciliation): the row is claimed with a conditional update so the
 * purchased effect is applied exactly once.
 */
export async function settlePayment(payment: Payment, v: VerifiedPayment): Promise<SettleResult> {
  if (payment.status === "SUCCESS") return "ALREADY_SETTLED";
  if (v.status === "PENDING") return "PENDING";

  if (v.status !== "PAID") {
    await markPayment(payment.id, v.status, v.failureReason);
    return "FAILED";
  }

  if (v.tranId !== payment.tranId || v.currency !== payment.currency || !(v.amount >= payment.amount)) {
    await markPayment(payment.id, "FAILED", "Amount, currency or transaction mismatch");
    return "FAILED";
  }

  const { settled, jobToAnnounce } = await prisma.$transaction(async (tx) => {
    const claim = await tx.payment.updateMany({
      where: { id: payment.id, status: { not: "SUCCESS" } },
      data: {
        status: "SUCCESS",
        providerRef: v.providerRef ?? null,
        bankTranId: v.bankTranId ?? null,
        method: v.method ?? null,
        failureReason: null,
        paidAt: new Date(),
        gatewayData: v.raw as Prisma.InputJsonValue,
      },
    });
    if (claim.count === 0) return { settled: false, jobToAnnounce: null };
    return { settled: true, jobToAnnounce: await fulfil(tx, payment) };
  });

  if (jobToAnnounce) announceJob(jobToAnnounce).catch((err) => console.error("[payments] announceJob", err));
  return settled ? "SUCCESS" : "ALREADY_SETTLED";
}

/** Record a failed / cancelled attempt. Never downgrades a successful payment. */
export async function markPayment(id: string, status: "FAILED" | "CANCELLED", reason?: string) {
  await prisma.payment.updateMany({ where: { id, status: "PENDING" }, data: { status, failureReason: reason ?? null } });
}

// ─── Stripe ─────────────────────────────────────────────────────────────────

/** Re-read a Stripe payment from Stripe and settle it. Returns the up-to-date row. */
export async function syncStripePayment(payment: Payment, sessionId = payment.checkoutSessionId): Promise<Payment> {
  if (payment.status === "SUCCESS" || !sessionId) return payment;
  const result = await settlePayment(payment, fromCheckoutSession(await retrieveCheckoutSession(sessionId)));
  return result === "PENDING" ? payment : prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
}

/**
 * The customer left Stripe Checkout (or started a new attempt). Expire the session so it can't
 * be paid later; if Stripe refuses because it already completed, settle from Stripe instead.
 */
export async function cancelStripeCheckout(payment: Payment, reason: string): Promise<Payment> {
  if (payment.status !== "PENDING") return payment;
  if (payment.checkoutSessionId) {
    try {
      await expireCheckoutSession(payment.checkoutSessionId);
    } catch {
      try {
        return await syncStripePayment(payment);
      } catch (err) {
        console.error("[stripe] cancel", err);
        return payment;
      }
    }
  }
  await markPayment(payment.id, "CANCELLED", reason);
  return prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
}

const findStripePayment = (session: StripeCheckoutSession) =>
  prisma.payment.findFirst({
    where: {
      provider: "STRIPE",
      OR: [{ checkoutSessionId: session.id }, ...(session.client_reference_id ? [{ tranId: session.client_reference_id }] : [])],
    },
  });

/**
 * Handle a verified Stripe webhook event. The session is re-fetched from Stripe rather than
 * trusted from the payload, so out-of-order or replayed events can't regress a payment.
 */
export async function handleStripeEvent(event: StripeEvent): Promise<"processed" | "ignored"> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired": {
      const session = event.data.object;
      const payment = await findStripePayment(session);
      if (!payment) return "ignored"; // not ours (e.g. another app on the same Stripe account)
      await syncStripePayment(payment, payment.checkoutSessionId ?? session.id);
      return "processed";
    }
    default:
      return "ignored";
  }
}

// ─── Fulfilment ─────────────────────────────────────────────────────────────

/** Apply what was bought. Returns a job id to announce to matching workers, if any. */
async function fulfil(tx: Tx, payment: Payment): Promise<string | null> {
  switch (payment.purpose) {
    case "WORKER_SUBSCRIPTION": {
      const worker = await tx.workerProfile.findUnique({ where: { userId: payment.userId } });
      if (!worker) return null;
      // Renewing early stacks the days on top of the current plan.
      const base = Math.max(Date.now(), worker.subscriptionExpiresAt?.getTime() ?? 0);
      const expiresAt = new Date(base + pricing.subscriptionDays * 24 * 3600 * 1000);
      await tx.workerProfile.update({ where: { id: worker.id }, data: { subscriptionExpiresAt: expiresAt } });
      await notify(
        {
          userId: payment.userId,
          type: "SUBSCRIPTION_ACTIVE",
          title: "Subscription active",
          body: `You can apply for jobs until ${expiresAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.`,
        },
        tx,
      );
      return null;
    }

    case "JOB_POST": {
      const job = payment.referenceId ? await tx.job.findUnique({ where: { id: payment.referenceId } }) : null;
      if (!job || job.status !== "PENDING_PAYMENT") return null;
      await tx.job.update({ where: { id: job.id }, data: { status: "OPEN", publishedAt: new Date() } });
      await notify(
        { userId: payment.userId, type: "JOB_PUBLISHED", title: "Your job is live", body: `"${job.title}" is now visible to workers.`, data: { jobId: job.id } },
        tx,
      );
      return job.id;
    }

    case "HIRE": {
      const hire = payment.referenceId ? await tx.hire.findUnique({ where: { id: payment.referenceId } }) : null;
      if (hire) await activatePaidHire(tx, hire);
      return null;
    }
  }
}

/** Let available, subscribed workers in the same category & district know about a new job. */
async function announceJob(jobId: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId }, include: { category: { select: { name: true } } } });
  if (!job) return;
  const workers = await prisma.workerProfile.findMany({
    where: {
      status: "APPROVED",
      isAvailable: true,
      subscriptionExpiresAt: { gt: new Date() },
      district: job.district,
      categories: { some: { id: job.categoryId } },
    },
    select: { userId: true },
    take: 300,
  });
  await notifyMany(
    workers.map((w) => ({
      userId: w.userId,
      type: "JOB_MATCH",
      title: `New ${job.category.name} job in ${job.area}`,
      body: `${job.title} · ৳${job.wageAmount}`,
      data: { jobId: job.id },
    })),
  );
}

import { randomBytes } from "node:crypto";
import { env, pricing } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import type { Payment, PaymentPurpose, Prisma } from "../../generated/prisma/client.js";
import { ApiError, badRequest, conflict, notFound } from "../../lib/errors.js";
import { notify, notifyMany } from "../../lib/notify.js";
import { findPage } from "../../lib/pagination.js";
import type { SessionUser } from "../../lib/session-cache.js";
import { initSession, isSslcommerzConfigured, isValidStatus, queryByTranId, type ValidationResponse } from "../../lib/sslcommerz.js";
import { activatePaidHire } from "../hires/hires.service.js";

type Tx = Prisma.TransactionClient;

export function toPublicPayment(p: Payment) {
  return {
    id: p.id,
    tranId: p.tranId,
    purpose: p.purpose,
    referenceId: p.referenceId,
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    method: p.cardType,
    failureReason: p.failureReason,
    paidAt: p.paidAt,
    createdAt: p.createdAt,
  };
}

// ─── Starting a payment ─────────────────────────────────────────────────────

/** Only redirect back into our own app (plus Expo Go / localhost web during development). */
export function isAllowedRedirect(url: string) {
  if (url.startsWith(`${env.APP_SCHEME}://`)) return true;
  if (env.NODE_ENV === "production") return false;
  return url.startsWith("exp://") || url.startsWith("exps://") || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(url);
}

/** What is being bought: price, reference and customer details for the gateway. */
async function describePurchase(userId: string, purpose: PaymentPurpose, referenceId?: string) {
  if (purpose === "WORKER_SUBSCRIPTION") {
    const worker = await prisma.workerProfile.findUnique({ where: { userId } });
    if (!worker || worker.status !== "APPROVED") throw conflict("Your profile must be approved before subscribing");
    return {
      amount: pricing.workerMonthly,
      referenceId: worker.id,
      productName: `Worker plan (${pricing.subscriptionDays} days)`,
      productCategory: "Subscription",
      customer: { name: worker.fullName, phone: worker.phone, address: worker.area, city: worker.district },
    };
  }

  if (!referenceId) throw badRequest("referenceId is required");
  const employer = await prisma.employerProfile.findUnique({ where: { userId } });
  if (!employer || employer.status !== "APPROVED") throw conflict("Your profile must be approved first");
  const customer = { name: employer.fullName, phone: employer.phone, address: employer.area, city: employer.district };

  if (purpose === "JOB_POST") {
    const job = await prisma.job.findUnique({ where: { id: referenceId } });
    if (!job || job.employerId !== employer.id) throw notFound("Job not found");
    if (job.status !== "PENDING_PAYMENT") throw conflict("This job is already published", "ALREADY_PAID");
    return { amount: pricing.jobPost, referenceId: job.id, productName: `Job post: ${job.title}`.slice(0, 100), productCategory: "Job post", customer };
  }

  const hire = await prisma.hire.findUnique({ where: { id: referenceId } });
  if (!hire || hire.employerId !== employer.id) throw notFound("Hire not found");
  if (hire.status !== "PENDING_PAYMENT") throw conflict("This hire is already paid", "ALREADY_PAID");
  return { amount: pricing.hire, referenceId: hire.id, productName: `Hiring fee: ${hire.title}`.slice(0, 100), productCategory: "Hiring fee", customer };
}

export async function startPayment(user: SessionUser, input: { purpose: PaymentPurpose; referenceId?: string; redirectUrl: string }) {
  if (!isSslcommerzConfigured) throw new ApiError(503, "PAYMENTS_DISABLED", "Payments are not configured on the server yet");
  if (!isAllowedRedirect(input.redirectUrl)) throw badRequest("Invalid redirect URL");

  const purchase = await describePurchase(user.id, input.purpose, input.referenceId);
  const tranId = `YE${Date.now().toString(36).toUpperCase()}${randomBytes(4).toString("hex").toUpperCase()}`;
  const payment = await prisma.payment.create({
    data: {
      tranId,
      userId: user.id,
      purpose: input.purpose,
      referenceId: purchase.referenceId,
      amount: purchase.amount,
      appRedirectUrl: input.redirectUrl,
    },
  });

  const callback = `${env.BETTER_AUTH_URL.replace(/\/$/, "")}/api/payments/sslcommerz`;
  try {
    const gatewayUrl = await initSession({
      tranId,
      amount: purchase.amount,
      productName: purchase.productName,
      productCategory: purchase.productCategory,
      customer: { ...purchase.customer, email: user.email },
      urls: { success: `${callback}/success`, fail: `${callback}/fail`, cancel: `${callback}/cancel`, ipn: `${callback}/ipn` },
      valueA: payment.id,
      valueB: input.purpose,
    });
    return { tranId, gatewayUrl, amount: purchase.amount };
  } catch (err) {
    await markPayment(payment.id, "FAILED", err instanceof Error ? err.message : "Gateway error");
    console.error("[sslcommerz] init", err);
    throw new ApiError(502, "GATEWAY_ERROR", "Could not reach the payment gateway. Please try again.");
  }
}

// ─── Reading ────────────────────────────────────────────────────────────────

export async function listPayments(userId: string, query: { cursor?: string; limit: number }) {
  const page = await findPage(
    (args) => prisma.payment.findMany({ where: { userId }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], ...args }),
    query,
  );
  return { items: page.items.map(toPublicPayment), nextCursor: page.nextCursor };
}

/** Status for the app. A pending payment older than 5 s is reconciled with SSLCommerz first. */
export async function getPaymentStatus(tranId: string, userId: string) {
  let payment = await prisma.payment.findUnique({ where: { tranId } });
  if (!payment || payment.userId !== userId) throw notFound("Payment not found");

  if (payment.status !== "SUCCESS" && isSslcommerzConfigured && Date.now() - payment.createdAt.getTime() > 5_000) {
    try {
      const found = await queryByTranId(payment.tranId);
      if (found && isValidStatus(found.status)) {
        await settlePayment(payment, found);
        payment = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      }
    } catch (err) {
      console.error("[sslcommerz] reconcile", err);
    }
  }
  return toPublicPayment(payment);
}

// ─── Settlement ─────────────────────────────────────────────────────────────

export type SettleResult = "SUCCESS" | "ALREADY_SETTLED" | "FAILED";

/**
 * Settle a payment from a SSLCommerz validation response. Safe to call concurrently
 * (success URL + IPN + reconciliation): the row is claimed with a conditional update so the
 * purchased effect is applied exactly once.
 */
export async function settlePayment(payment: Payment, v: ValidationResponse): Promise<SettleResult> {
  if (payment.status === "SUCCESS") return "ALREADY_SETTLED";

  if (!isValidStatus(v.status)) {
    await markPayment(payment.id, "FAILED", `Gateway status: ${v.status}`);
    return "FAILED";
  }

  const paidAmount = Number(v.currency_amount ?? v.amount);
  const paidCurrency = String(v.currency_type ?? v.currency ?? "BDT");
  if (v.tran_id !== payment.tranId || paidCurrency !== "BDT" || !(paidAmount >= payment.amount)) {
    await markPayment(payment.id, "FAILED", "Amount, currency or transaction mismatch");
    return "FAILED";
  }

  const { settled, jobToAnnounce } = await prisma.$transaction(async (tx) => {
    const claim = await tx.payment.updateMany({
      where: { id: payment.id, status: { not: "SUCCESS" } },
      data: {
        status: "SUCCESS",
        valId: v.val_id,
        bankTranId: v.bank_tran_id ?? null,
        cardType: v.card_type ?? null,
        failureReason: null,
        paidAt: new Date(),
        gatewayData: v as unknown as Prisma.InputJsonValue,
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

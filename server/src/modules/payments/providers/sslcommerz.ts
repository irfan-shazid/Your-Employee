import { env } from "../../../config/env.js";
import { initSession, isValidStatus, queryByTranId, type ValidationResponse } from "../../../lib/sslcommerz.js";
import { toMajor, toMinor } from "../../../shared/money.js";
import type { Gateway, VerifiedPayment } from "./types.js";

/** Normalise a SSLCommerz validation response (amounts arrive as "50.00" strings). */
export function fromValidation(v: ValidationResponse): VerifiedPayment {
  const valid = isValidStatus(v.status);
  const currency = String(v.currency_type ?? v.currency ?? "BDT").toUpperCase();
  const amount = toMinor(Number(v.currency_amount ?? v.amount), currency);
  return {
    status: valid ? "PAID" : "FAILED",
    tranId: v.tran_id ?? null,
    amount: Number.isFinite(amount) ? amount : 0,
    currency,
    providerRef: v.val_id ?? null,
    bankTranId: v.bank_tran_id ?? null,
    method: v.card_type ?? null,
    failureReason: valid ? undefined : `Gateway status: ${v.status}`,
    raw: v,
  };
}

export const sslcommerzGateway: Gateway = {
  async start(payment, purchase) {
    const callback = `${env.BETTER_AUTH_URL.replace(/\/$/, "")}/api/payments/sslcommerz`;
    const url = await initSession({
      tranId: payment.tranId,
      amount: toMajor(payment.amount, payment.currency),
      productName: purchase.productName,
      productCategory: purchase.productCategory,
      customer: purchase.customer,
      urls: { success: `${callback}/success`, fail: `${callback}/fail`, cancel: `${callback}/cancel`, ipn: `${callback}/ipn` },
      valueA: payment.id,
      valueB: payment.purpose,
    });
    return { url };
  },

  async lookup(payment) {
    const found = await queryByTranId(payment.tranId);
    // Only a VALID / VALIDATED transaction is conclusive; anything else may still change.
    return found && isValidStatus(found.status) ? fromValidation(found) : null;
  },
};

import type { Payment } from "../../../generated/prisma/client.js";

/** What is being bought, as shown on the gateway's checkout page. */
export type Purchase = {
  referenceId: string;
  productName: string;
  productCategory: string;
  customer: { name: string; email: string; phone: string; address: string; city: string };
};

/**
 * A gateway's verified answer about one payment, normalised across providers. Settlement only
 * ever trusts this (fetched server-to-server), never what the browser redirect claims.
 */
export type VerifiedPayment = {
  /** PENDING = nothing conclusive yet (checkout still open, or a delayed method still clearing). */
  status: "PAID" | "PENDING" | "FAILED" | "CANCELLED";
  /** Our tranId as echoed back by the gateway. */
  tranId: string | null;
  /** Amount charged, in minor units of `currency` (upper-case ISO 4217). */
  amount: number;
  currency: string;
  /** SSLCommerz val_id or Stripe PaymentIntent id. */
  providerRef?: string | null;
  /** Bank transaction id (SSLCommerz) or Stripe Charge id. */
  bankTranId?: string | null;
  /** e.g. "BKASH-BKash", "visa", "apple_pay". */
  method?: string | null;
  failureReason?: string;
  /** Stored on the payment for support and audits. */
  raw: unknown;
};

export interface Gateway {
  /** Create a hosted checkout and return the URL the app opens in its in-app browser. */
  start(payment: Payment, purchase: Purchase): Promise<{ url: string; checkoutSessionId?: string }>;
  /**
   * Ask the gateway about a payment whose callback may never have reached us (browser closed,
   * webhook delayed, local development without a public URL). null = nothing known yet.
   */
  lookup(payment: Payment): Promise<VerifiedPayment | null>;
}

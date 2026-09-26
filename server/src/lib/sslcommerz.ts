import { env } from "../config/env.js";

const BASE_URL = env.SSLCOMMERZ_IS_LIVE ? "https://securepay.sslcommerz.com" : "https://sandbox.sslcommerz.com";

export const isSslcommerzConfigured = Boolean(env.SSLCOMMERZ_STORE_ID && env.SSLCOMMERZ_STORE_PASSWORD);

export type InitSessionInput = {
  tranId: string;
  amount: number;
  productName: string;
  productCategory: string;
  customer: { name: string; email: string; phone: string; address: string; city: string };
  urls: { success: string; fail: string; cancel: string; ipn: string };
  valueA?: string;
  valueB?: string;
};

type InitSessionResponse = {
  status: "SUCCESS" | "FAILED";
  failedreason?: string;
  sessionkey?: string;
  GatewayPageURL?: string;
};

export type ValidationResponse = {
  status: "VALID" | "VALIDATED" | "INVALID_TRANSACTION" | string;
  tran_id: string;
  val_id: string;
  amount: string;
  store_amount?: string;
  currency: string;
  currency_type?: string;
  currency_amount?: string;
  bank_tran_id?: string;
  card_type?: string;
  tran_date?: string;
  risk_level?: string;
  risk_title?: string;
  [key: string]: unknown;
};

type TranQueryResponse = {
  APIConnect: string;
  no_of_trans_found?: number;
  element?: (ValidationResponse & { status: string })[];
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) throw new Error(`SSLCommerz responded with HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Create a payment session and return the hosted gateway URL. */
export async function initSession(input: InitSessionInput): Promise<string> {
  if (!isSslcommerzConfigured) {
    throw new Error("SSLCommerz is not configured. Set SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWORD.");
  }

  const form = new URLSearchParams({
    store_id: env.SSLCOMMERZ_STORE_ID,
    store_passwd: env.SSLCOMMERZ_STORE_PASSWORD,
    total_amount: input.amount.toFixed(2),
    currency: "BDT",
    tran_id: input.tranId,
    success_url: input.urls.success,
    fail_url: input.urls.fail,
    cancel_url: input.urls.cancel,
    ipn_url: input.urls.ipn,
    shipping_method: "NO",
    num_of_item: "1",
    product_name: input.productName,
    product_category: input.productCategory,
    product_profile: "non-physical-goods",
    emi_option: "0",
    cus_name: input.customer.name,
    cus_email: input.customer.email,
    cus_add1: input.customer.address,
    cus_city: input.customer.city,
    cus_country: "Bangladesh",
    cus_phone: input.customer.phone,
    value_a: input.valueA ?? "",
    value_b: input.valueB ?? "",
  });

  const data = await request<InitSessionResponse>(`${BASE_URL}/gwprocess/v4/api.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  if (data.status !== "SUCCESS" || !data.GatewayPageURL) {
    throw new Error(data.failedreason || "Could not start SSLCommerz session");
  }
  return data.GatewayPageURL;
}

/** Validate a transaction using the val_id SSLCommerz posts to success/IPN URLs. */
export async function validateByValId(valId: string): Promise<ValidationResponse> {
  const qs = new URLSearchParams({
    val_id: valId,
    store_id: env.SSLCOMMERZ_STORE_ID,
    store_passwd: env.SSLCOMMERZ_STORE_PASSWORD,
    v: "1",
    format: "json",
  });
  return request<ValidationResponse>(`${BASE_URL}/validator/api/validationserverAPI.php?${qs}`);
}

/**
 * Look up a transaction by our tran_id. Used to reconcile payments whose callback never
 * reached us (user closed the browser, IPN delayed, local development without a public URL…).
 */
export async function queryByTranId(tranId: string): Promise<ValidationResponse | null> {
  const qs = new URLSearchParams({
    tran_id: tranId,
    store_id: env.SSLCOMMERZ_STORE_ID,
    store_passwd: env.SSLCOMMERZ_STORE_PASSWORD,
    format: "json",
  });
  const data = await request<TranQueryResponse>(
    `${BASE_URL}/validator/api/merchantTransIDvalidationAPI.php?${qs}`,
  );
  if (data.APIConnect !== "DONE" || !data.element?.length) return null;
  return data.element.find((e) => e.status === "VALID" || e.status === "VALIDATED") ?? data.element[0] ?? null;
}

export function isValidStatus(status: string | undefined) {
  return status === "VALID" || status === "VALIDATED";
}

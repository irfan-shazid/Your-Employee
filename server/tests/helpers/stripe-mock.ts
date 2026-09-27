/**
 * Stands in for the Stripe API (Checkout Sessions only) so Stripe flows run offline and
 * deterministically. Helpers simulate what the customer does on the hosted Checkout page and
 * build correctly signed webhook deliveries.
 */
import Stripe from "stripe";

export const STRIPE_WEBHOOK_SECRET = "whsec_test_secret";

type Intent = { id: string; status: string; error?: string; chargeId?: string };
type MockSession = {
  id: string;
  tranId: string;
  amount: number;
  currency: string;
  status: "open" | "complete" | "expired";
  paymentStatus: "unpaid" | "paid";
  intent: Intent | null;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
};

const sessions = new Map<string, MockSession>();
const byTranId = new Map<string, MockSession>();
const byIdempotencyKey = new Map<string, MockSession>();
let seq = 0;

/** Every Checkout Session creation that reached "Stripe", including idempotent replays. */
export const stripeRequests = { create: 0, expire: 0 };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Request-Id": `req_${++seq}` } });

const stripeError = (status: number, message: string, code?: string) =>
  json({ error: { type: "invalid_request_error", message, ...(code && { code }) } }, status);

function toJson(s: MockSession, expand: boolean) {
  const intent = s.intent && {
    id: s.intent.id,
    object: "payment_intent",
    status: s.intent.status,
    last_payment_error: s.intent.error ? { message: s.intent.error } : null,
    latest_charge: s.intent.chargeId
      ? { id: s.intent.chargeId, object: "charge", payment_method_details: { type: "card", card: { brand: "visa", wallet: null } } }
      : null,
  };
  return {
    id: s.id,
    object: "checkout.session",
    status: s.status,
    payment_status: s.paymentStatus,
    amount_total: s.amount,
    currency: s.currency,
    client_reference_id: s.tranId,
    metadata: s.metadata,
    livemode: false,
    url: s.status === "open" ? `https://checkout.stripe.com/c/pay/${s.id}` : null,
    success_url: s.successUrl,
    cancel_url: s.cancelUrl,
    payment_intent: expand ? intent : (intent?.id ?? null),
  };
}

function handle(url: URL, init?: RequestInit): Response {
  const method = (init?.method ?? "GET").toUpperCase();
  const path = url.pathname.replace(/^\/v1/, "");

  if (method === "POST" && path === "/checkout/sessions") {
    stripeRequests.create++;
    const key = new Headers(init?.headers).get("idempotency-key");
    const replay = key && byIdempotencyKey.get(key);
    if (replay) return json(toJson(replay, false));

    const form = new URLSearchParams(String(init?.body ?? ""));
    const tranId = form.get("client_reference_id")!;
    const metadata: Record<string, string> = {};
    for (const [k, v] of form) {
      const m = /^metadata\[(.+)\]$/.exec(k);
      if (m) metadata[m[1]!] = v;
    }
    const session: MockSession = {
      id: `cs_test_${++seq}${tranId}`,
      tranId,
      amount: Number(form.get("line_items[0][price_data][unit_amount]")),
      currency: form.get("line_items[0][price_data][currency]")!,
      status: "open",
      paymentStatus: "unpaid",
      intent: null,
      successUrl: form.get("success_url")!,
      cancelUrl: form.get("cancel_url")!,
      metadata,
    };
    sessions.set(session.id, session);
    byTranId.set(tranId, session);
    if (key) byIdempotencyKey.set(key, session);
    return json(toJson(session, false));
  }

  const expire = /^\/checkout\/sessions\/([^/]+)\/expire$/.exec(path);
  if (method === "POST" && expire) {
    stripeRequests.expire++;
    const session = sessions.get(expire[1]!);
    if (!session) return stripeError(404, "No such checkout.session", "resource_missing");
    if (session.status !== "open") return stripeError(400, `Only Checkout Sessions with a status in ["open"] can be expired.`);
    session.status = "expired";
    return json(toJson(session, false));
  }

  const retrieve = /^\/checkout\/sessions\/([^/]+)$/.exec(path);
  if (method === "GET" && retrieve) {
    const session = sessions.get(retrieve[1]!);
    if (!session) return stripeError(404, "No such checkout.session", "resource_missing");
    const expand = [...url.searchParams].some(([k, v]) => k.startsWith("expand") && v.startsWith("payment_intent"));
    return json(toJson(session, expand));
  }

  return stripeError(404, `Unrecognized request URL (${method}: ${url.pathname})`);
}

export function installStripeMock() {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    return url.hostname === "api.stripe.com" ? handle(url, init) : realFetch(input, init);
  };
}

function sessionOf(tranId: string) {
  const session = byTranId.get(tranId);
  if (!session) throw new Error(`No Stripe Checkout Session for ${tranId}`);
  return session;
}

/** The customer finished Checkout. `processing` = a delayed method (bank debit) still clearing. */
export function completeStripeCheckout(tranId: string, outcome: "paid" | "processing" = "paid") {
  const session = sessionOf(tranId);
  session.status = "complete";
  session.intent = { id: `pi_test_${tranId}`, status: outcome === "paid" ? "succeeded" : "processing" };
  if (outcome === "paid") {
    session.paymentStatus = "paid";
    session.intent.chargeId = `ch_test_${tranId}`;
  }
  return session;
}

/** A delayed payment method finally cleared (or was declined). */
export function settleDelayedStripePayment(tranId: string, succeeded: boolean) {
  const session = sessionOf(tranId);
  if (succeeded) {
    session.paymentStatus = "paid";
    session.intent = { id: `pi_test_${tranId}`, status: "succeeded", chargeId: `ch_test_${tranId}` };
  } else {
    session.intent = { id: `pi_test_${tranId}`, status: "requires_payment_method", error: "The bank declined the debit." };
  }
  return session;
}

export const stripeSessionFor = (tranId: string) => sessionOf(tranId);

/** A webhook delivery exactly as Stripe would send it (payload + `stripe-signature` header). */
export function signedStripeEvent(type: string, tranId: string, secret = STRIPE_WEBHOOK_SECRET) {
  const payload = JSON.stringify({
    id: `evt_test_${++seq}`,
    object: "event",
    type,
    api_version: "2026-08-26.dahlia",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    data: { object: toJson(sessionOf(tranId), false) },
  });
  return { payload, signature: Stripe.webhooks.generateTestHeaderString({ payload, secret }) };
}

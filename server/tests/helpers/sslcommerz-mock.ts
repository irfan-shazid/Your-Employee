/**
 * Stands in for the SSLCommerz REST API so payment flows run offline and deterministically.
 * `markPaid(tranId)` simulates the customer completing payment on the hosted page.
 */
type Session = { tranId: string; amount: string; paid: boolean; valId: string };

const sessions = new Map<string, Session>();
const byValId = new Map<string, Session>();

const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });

function handle(url: URL, init?: RequestInit): Response {
  if (url.pathname.endsWith("/gwprocess/v4/api.php")) {
    const form = new URLSearchParams(String(init?.body ?? ""));
    const tranId = form.get("tran_id")!;
    const session = { tranId, amount: form.get("total_amount")!, paid: false, valId: `VAL-${tranId}` };
    sessions.set(tranId, session);
    byValId.set(session.valId, session);
    return json({ status: "SUCCESS", GatewayPageURL: `https://sandbox.sslcommerz.com/EasyCheckOut/${tranId}` });
  }

  if (url.pathname.endsWith("/validationserverAPI.php")) {
    const session = byValId.get(url.searchParams.get("val_id") ?? "");
    if (!session?.paid) return json({ status: "INVALID_TRANSACTION" });
    return json({
      status: "VALID",
      tran_id: session.tranId,
      val_id: session.valId,
      amount: session.amount,
      currency: "BDT",
      card_type: "BKASH-BKash",
      bank_tran_id: `BANK-${session.tranId}`,
    });
  }

  if (url.pathname.endsWith("/merchantTransIDvalidationAPI.php")) {
    const session = sessions.get(url.searchParams.get("tran_id") ?? "");
    if (!session?.paid) return json({ APIConnect: "DONE", no_of_trans_found: 0, element: [] });
    return json({
      APIConnect: "DONE",
      no_of_trans_found: 1,
      element: [{ status: "VALID", tran_id: session.tranId, val_id: session.valId, amount: session.amount, currency: "BDT" }],
    });
  }

  return new Response("Unknown SSLCommerz endpoint", { status: 404 });
}

export function installSslcommerzMock() {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    return url.hostname.endsWith("sslcommerz.com") ? handle(url, init) : realFetch(input, init);
  };
}

/** The customer completed the payment; returns the val_id SSLCommerz would post back. */
export function markPaid(tranId: string) {
  const session = sessions.get(tranId);
  if (!session) throw new Error(`No SSLCommerz session for ${tranId}`);
  session.paid = true;
  return session.valId;
}

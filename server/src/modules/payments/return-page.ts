import { env } from "../../config/env.js";

export type ReturnStatus = "success" | "processing" | "failed" | "cancelled";

const COPY: Record<ReturnStatus, { title: string; text: string; color: string; icon: string }> = {
  success: { title: "Payment successful", text: "Taking you back to Your Employee…", color: "#0E8F63", icon: "✓" },
  processing: {
    title: "Payment processing",
    text: "Your payment is being confirmed. We'll notify you as soon as it clears.",
    color: "#B7791F",
    icon: "…",
  },
  failed: { title: "Payment failed", text: "No money was taken. You can try again from the app.", color: "#E5484D", icon: "!" },
  cancelled: { title: "Payment cancelled", text: "You cancelled the payment.", color: "#64748B", icon: "×" },
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

/**
 * Tiny branded page shown in the in-app browser after the payment gateway. It bounces back to
 * the app via deep link, with a visible button in case the browser blocks the automatic redirect.
 */
export function renderReturnPage(status: ReturnStatus, tranId: string, appUrl: string | null) {
  const target = appUrl ?? `${env.APP_SCHEME}://payment-result`;
  const deepLink = `${target}${target.includes("?") ? "&" : "?"}status=${status}&tranId=${encodeURIComponent(tranId)}`;
  const copy = COPY[status];

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${copy.title}</title>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#F6F7F9;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0F172A;padding:24px}
.card{background:#fff;border-radius:24px;padding:32px 24px;max-width:360px;width:100%;text-align:center;box-shadow:0 10px 40px rgba(15,23,42,.08)}
.icon{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;margin:0 auto 16px;color:#fff;font-size:32px;font-weight:700;background:${copy.color}}
h1{font-size:20px;margin:0 0 8px}p{color:#64748B;margin:0 0 24px;line-height:1.5}
a{display:block;background:${copy.color};color:#fff;text-decoration:none;padding:14px;border-radius:14px;font-weight:600}
</style></head><body><div class="card"><div class="icon">${copy.icon}</div><h1>${copy.title}</h1><p>${copy.text}</p>
<a href="${escapeHtml(deepLink)}">Return to the app</a></div><script>setTimeout(function(){location.replace(${JSON.stringify(deepLink)})},300)</script></body></html>`;
}

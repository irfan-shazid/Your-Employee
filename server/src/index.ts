import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import { paymentMethods, warnAboutStripeSetup } from "./modules/payments/pricing.js";

const server = serve({ fetch: createApp().fetch, port: env.PORT, hostname: "0.0.0.0" }, (info) => {
  console.log(`🚀 Your Employee API on http://localhost:${info.port} (public URL: ${env.BETTER_AUTH_URL})`);
  const gateways = paymentMethods().filter((m) => m.enabled).map((m) => m.name);
  console.log(`💳 Payments: ${gateways.length ? gateways.join(", ") : "disabled (no gateway configured)"}`);
  warnAboutStripeSetup();
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

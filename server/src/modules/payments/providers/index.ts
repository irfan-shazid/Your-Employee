import type { PaymentProvider } from "../../../generated/prisma/enums.js";
import { sslcommerzGateway } from "./sslcommerz.js";
import { stripeGateway } from "./stripe.js";
import type { Gateway } from "./types.js";

export const gateways: Record<PaymentProvider, Gateway> = {
  SSLCOMMERZ: sslcommerzGateway,
  STRIPE: stripeGateway,
};

export type { Gateway, Purchase, VerifiedPayment } from "./types.js";

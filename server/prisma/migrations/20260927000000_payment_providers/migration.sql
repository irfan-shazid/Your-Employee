-- Stripe support: payments now record their provider, and every amount is stored in the
-- currency's minor unit (poisha / cents) so several currencies can live side by side.

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('SSLCOMMERZ', 'STRIPE');

-- Existing payments were SSLCommerz payments in whole taka → convert to poisha.
UPDATE "Payment" SET "amount" = "amount" * 100;

-- Provider-neutral names (renamed, not dropped, so existing data is kept).
ALTER TABLE "Payment" RENAME COLUMN "valId" TO "providerRef";
ALTER TABLE "Payment" RENAME COLUMN "cardType" TO "method";

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "provider" "PaymentProvider" NOT NULL DEFAULT 'SSLCOMMERZ',
ADD COLUMN "checkoutSessionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_checkoutSessionId_key" ON "Payment"("checkoutSessionId");

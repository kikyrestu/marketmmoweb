-- CreateEnum
CREATE TYPE "public"."OfferStatus" AS ENUM ('SENT', 'COUNTER', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "public"."Offer" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "public"."OfferStatus" NOT NULL DEFAULT 'SENT',
    "note" TEXT,
    "expiresAt" TIMESTAMP(3),
    "history" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Offer_conversationId_idx" ON "public"."Offer"("conversationId");

-- CreateIndex
CREATE INDEX "Offer_itemId_idx" ON "public"."Offer"("itemId");

-- CreateIndex
CREATE INDEX "Offer_buyerId_idx" ON "public"."Offer"("buyerId");

-- CreateIndex
CREATE INDEX "Offer_sellerId_idx" ON "public"."Offer"("sellerId");

-- CreateIndex
CREATE INDEX "Offer_status_idx" ON "public"."Offer"("status");

-- CreateIndex
CREATE INDEX "Offer_createdAt_idx" ON "public"."Offer"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."Offer" ADD CONSTRAINT "Offer_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Offer" ADD CONSTRAINT "Offer_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Offer" ADD CONSTRAINT "Offer_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Offer" ADD CONSTRAINT "Offer_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Offer" ADD CONSTRAINT "Offer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

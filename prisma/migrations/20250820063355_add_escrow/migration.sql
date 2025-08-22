-- CreateEnum
CREATE TYPE "public"."EscrowStatus" AS ENUM ('INIT', 'FUNDS_HELD', 'RELEASED', 'REFUNDED', 'DISPUTE', 'RESOLVED');

-- CreateTable
CREATE TABLE "public"."EscrowCase" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "adminId" TEXT,
    "status" "public"."EscrowStatus" NOT NULL DEFAULT 'INIT',
    "fee" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscrowCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EscrowParticipant" (
    "id" TEXT NOT NULL,
    "escrowId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscrowParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EscrowAuditLog" (
    "id" TEXT NOT NULL,
    "escrowId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "meta" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscrowAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EscrowCase_conversationId_idx" ON "public"."EscrowCase"("conversationId");

-- CreateIndex
CREATE INDEX "EscrowCase_itemId_idx" ON "public"."EscrowCase"("itemId");

-- CreateIndex
CREATE INDEX "EscrowCase_buyerId_idx" ON "public"."EscrowCase"("buyerId");

-- CreateIndex
CREATE INDEX "EscrowCase_sellerId_idx" ON "public"."EscrowCase"("sellerId");

-- CreateIndex
CREATE INDEX "EscrowCase_adminId_idx" ON "public"."EscrowCase"("adminId");

-- CreateIndex
CREATE INDEX "EscrowCase_status_idx" ON "public"."EscrowCase"("status");

-- CreateIndex
CREATE INDEX "EscrowParticipant_userId_idx" ON "public"."EscrowParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EscrowParticipant_escrowId_userId_key" ON "public"."EscrowParticipant"("escrowId", "userId");

-- CreateIndex
CREATE INDEX "EscrowAuditLog_escrowId_idx" ON "public"."EscrowAuditLog"("escrowId");

-- CreateIndex
CREATE INDEX "EscrowAuditLog_createdById_idx" ON "public"."EscrowAuditLog"("createdById");

-- AddForeignKey
ALTER TABLE "public"."EscrowCase" ADD CONSTRAINT "EscrowCase_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EscrowCase" ADD CONSTRAINT "EscrowCase_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EscrowCase" ADD CONSTRAINT "EscrowCase_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EscrowCase" ADD CONSTRAINT "EscrowCase_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EscrowCase" ADD CONSTRAINT "EscrowCase_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EscrowParticipant" ADD CONSTRAINT "EscrowParticipant_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "public"."EscrowCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EscrowParticipant" ADD CONSTRAINT "EscrowParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EscrowAuditLog" ADD CONSTRAINT "EscrowAuditLog_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "public"."EscrowCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EscrowAuditLog" ADD CONSTRAINT "EscrowAuditLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

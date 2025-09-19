-- CreateTable
CREATE TABLE "public"."ConversationKey" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConversationKey_conversationId_key" ON "public"."ConversationKey"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationKey_signature_key" ON "public"."ConversationKey"("signature");

-- CreateIndex
CREATE INDEX "ConversationKey_itemId_idx" ON "public"."ConversationKey"("itemId");

-- CreateIndex
CREATE INDEX "ConversationKey_buyerId_idx" ON "public"."ConversationKey"("buyerId");

-- CreateIndex
CREATE INDEX "ConversationKey_sellerId_idx" ON "public"."ConversationKey"("sellerId");

-- CreateIndex
CREATE INDEX "ConversationKey_signature_idx" ON "public"."ConversationKey"("signature");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationKey_itemId_buyerId_sellerId_key" ON "public"."ConversationKey"("itemId", "buyerId", "sellerId");

-- AddForeignKey
ALTER TABLE "public"."ConversationKey" ADD CONSTRAINT "ConversationKey_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "public"."CommunityMessage" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunityMessage_createdAt_idx" ON "public"."CommunityMessage"("createdAt");

-- CreateIndex
CREATE INDEX "CommunityMessage_senderId_idx" ON "public"."CommunityMessage"("senderId");

-- AddForeignKey
ALTER TABLE "public"."CommunityMessage" ADD CONSTRAINT "CommunityMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

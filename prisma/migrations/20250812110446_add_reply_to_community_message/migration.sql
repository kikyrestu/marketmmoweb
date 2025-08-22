-- AlterTable
ALTER TABLE "public"."CommunityMessage" ADD COLUMN     "replyToId" TEXT;

-- CreateIndex
CREATE INDEX "CommunityMessage_replyToId_idx" ON "public"."CommunityMessage"("replyToId");

-- AddForeignKey
ALTER TABLE "public"."CommunityMessage" ADD CONSTRAINT "CommunityMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "public"."CommunityMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

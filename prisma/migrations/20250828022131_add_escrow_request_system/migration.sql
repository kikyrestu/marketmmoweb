-- CreateEnum
CREATE TYPE "public"."EscrowRequestStatus" AS ENUM ('PENDING_BUYER_REQUEST', 'PENDING_SELLER_CONFIRMATION', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "public"."EscrowCase" ADD COLUMN     "requestStatus" "public"."EscrowRequestStatus",
ADD COLUMN     "requestedById" TEXT;

-- AddForeignKey
ALTER TABLE "public"."EscrowCase" ADD CONSTRAINT "EscrowCase_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

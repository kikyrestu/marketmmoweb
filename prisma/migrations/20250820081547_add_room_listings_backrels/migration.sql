-- CreateEnum
CREATE TYPE "public"."RoomListingStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'SOLD');

-- CreateTable
CREATE TABLE "public"."RoomListing" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "status" "public"."RoomListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomListing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoomListing_roomId_idx" ON "public"."RoomListing"("roomId");

-- CreateIndex
CREATE INDEX "RoomListing_sellerId_idx" ON "public"."RoomListing"("sellerId");

-- CreateIndex
CREATE INDEX "RoomListing_status_idx" ON "public"."RoomListing"("status");

-- AddForeignKey
ALTER TABLE "public"."RoomListing" ADD CONSTRAINT "RoomListing_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."CommunityRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoomListing" ADD CONSTRAINT "RoomListing_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoomListing" ADD CONSTRAINT "RoomListing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "public"."CommunityMessage" ADD COLUMN     "roomId" TEXT;

-- CreateTable
CREATE TABLE "public"."CommunityRoom" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "imageUrl" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "wordFilter" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "gameName" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CommunityRoomMember" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityRoomMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommunityRoom_slug_key" ON "public"."CommunityRoom"("slug");

-- CreateIndex
CREATE INDEX "CommunityRoom_slug_idx" ON "public"."CommunityRoom"("slug");

-- CreateIndex
CREATE INDEX "CommunityRoom_createdById_idx" ON "public"."CommunityRoom"("createdById");

-- CreateIndex
CREATE INDEX "CommunityRoomMember_userId_idx" ON "public"."CommunityRoomMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityRoomMember_roomId_userId_key" ON "public"."CommunityRoomMember"("roomId", "userId");

-- CreateIndex
CREATE INDEX "CommunityMessage_roomId_idx" ON "public"."CommunityMessage"("roomId");

-- AddForeignKey
ALTER TABLE "public"."CommunityMessage" ADD CONSTRAINT "CommunityMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."CommunityRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CommunityRoom" ADD CONSTRAINT "CommunityRoom_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CommunityRoomMember" ADD CONSTRAINT "CommunityRoomMember_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."CommunityRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CommunityRoomMember" ADD CONSTRAINT "CommunityRoomMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `isPublished` on the `CommunityRoom` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."RoomStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "public"."CommunityRoom" DROP COLUMN "isPublished",
ADD COLUMN     "status" "public"."RoomStatus" NOT NULL DEFAULT 'PUBLISHED';

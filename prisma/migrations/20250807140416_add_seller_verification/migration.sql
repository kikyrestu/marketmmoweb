-- CreateTable
CREATE TABLE "public"."seller_verifications" (
    "id" TEXT NOT NULL,
    "status" "public"."VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fullName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "address" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankAccount" TEXT NOT NULL,
    "bankHolder" TEXT NOT NULL,
    "ktpUrl" TEXT NOT NULL,
    "selfieUrl" TEXT NOT NULL,
    "bankProofUrl" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "seller_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seller_verifications_userId_key" ON "public"."seller_verifications"("userId");

-- AddForeignKey
ALTER TABLE "public"."seller_verifications" ADD CONSTRAINT "seller_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

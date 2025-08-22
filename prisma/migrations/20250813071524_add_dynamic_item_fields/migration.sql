-- CreateEnum
CREATE TYPE "public"."FieldScope" AS ENUM ('GLOBAL');

-- CreateEnum
CREATE TYPE "public"."FieldType" AS ENUM ('TEXT', 'NUMBER', 'SELECT');

-- CreateTable
CREATE TABLE "public"."ItemFieldDefinition" (
    "id" TEXT NOT NULL,
    "scope" "public"."FieldScope" NOT NULL,
    "gameId" TEXT,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "public"."FieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "options" JSONB,
    "constraints" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ItemFieldValue" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "fieldDefinitionId" TEXT NOT NULL,
    "valueText" TEXT,
    "valueNumber" INTEGER,
    "valueDecimal" DECIMAL(65,30),
    "valueBoolean" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemFieldDefinition_scope_isActive_idx" ON "public"."ItemFieldDefinition"("scope", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ItemFieldDefinition_scope_gameId_key_key" ON "public"."ItemFieldDefinition"("scope", "gameId", "key");

-- CreateIndex
CREATE INDEX "ItemFieldValue_fieldDefinitionId_idx" ON "public"."ItemFieldValue"("fieldDefinitionId");

-- CreateIndex
CREATE INDEX "ItemFieldValue_itemId_idx" ON "public"."ItemFieldValue"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemFieldValue_itemId_fieldDefinitionId_key" ON "public"."ItemFieldValue"("itemId", "fieldDefinitionId");

-- AddForeignKey
ALTER TABLE "public"."ItemFieldValue" ADD CONSTRAINT "ItemFieldValue_fieldDefinitionId_fkey" FOREIGN KEY ("fieldDefinitionId") REFERENCES "public"."ItemFieldDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ItemFieldValue" ADD CONSTRAINT "ItemFieldValue_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

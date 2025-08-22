-- Add isTradable boolean column with default false
ALTER TABLE "public"."CommunityRoom"
ADD COLUMN IF NOT EXISTS "isTradable" BOOLEAN NOT NULL DEFAULT false;

-- Backfill not needed due to default; existing rows will have false

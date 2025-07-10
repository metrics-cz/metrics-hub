-- Add type field to applications table and update Google Ads Guard

-- Add type field to applications table
ALTER TABLE "public"."applications" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'application';

-- Add status and execution tracking to company_applications
ALTER TABLE "public"."company_applications" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "public"."company_applications" ADD COLUMN IF NOT EXISTS "last_execution_at" TIMESTAMPTZ;
ALTER TABLE "public"."company_applications" ADD COLUMN IF NOT EXISTS "execution_count" INTEGER DEFAULT 0;

-- Update Google Ads Guard to have automation type
UPDATE "public"."applications" 
SET 
    "type" = 'automation'
WHERE "name" = 'Google Ads Guard';

-- Update all automation category apps to be type automation
UPDATE "public"."applications" 
SET 
    "type" = 'automation'
WHERE "category" = 'automation';

-- Update all other apps to be type application
UPDATE "public"."applications" 
SET 
    "type" = 'application'
WHERE "category" != 'automation' AND "type" IS NULL;
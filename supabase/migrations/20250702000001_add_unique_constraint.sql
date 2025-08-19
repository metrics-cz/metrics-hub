-- Remove duplicate applications before adding unique constraint
DELETE FROM "public"."applications" 
WHERE ctid NOT IN (
    SELECT MIN(ctid) 
    FROM "public"."applications" 
    GROUP BY name
);

-- Add unique constraint to applications name field
ALTER TABLE "public"."applications" ADD CONSTRAINT "applications_name_unique" UNIQUE ("name");
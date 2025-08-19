-- Fix application category references
-- This migration ensures all applications have proper category_id foreign key references

BEGIN;

-- Ensure automation category exists (needed for integrations page)
INSERT INTO "public"."application_categories" ("name", "description", "icon", "sort_order") 
VALUES ('automation', 'Automation and integration tools', 'Zap', 7)
ON CONFLICT (name) DO NOTHING;

-- For any applications without category_id, set them to a default category
-- This handles cases where the cleanup migration didn't properly migrate old data
UPDATE "public"."applications" 
SET "category_id" = (
    SELECT "id" FROM "public"."application_categories" 
    WHERE "name" = 'marketing' 
    LIMIT 1
)
WHERE "category_id" IS NULL;

-- Verify all applications now have category_id
DO $$
DECLARE
    orphaned_apps INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_apps
    FROM "public"."applications"
    WHERE "category_id" IS NULL;
    
    IF orphaned_apps > 0 THEN
        RAISE EXCEPTION 'Failed to fix category references: % applications still missing category_id', orphaned_apps;
    ELSE
        RAISE NOTICE 'Successfully fixed all application category references';
    END IF;
END $$;

COMMIT;
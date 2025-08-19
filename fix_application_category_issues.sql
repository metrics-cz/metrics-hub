-- Fix script for application category issues
-- Run this after reviewing the diagnostic results

BEGIN;

-- 1. Ensure automation category exists (should already exist from migrations)
INSERT INTO "public"."application_categories" ("name", "description", "icon", "sort_order") 
VALUES ('automation', 'Automation and integration tools', 'Zap', 7)
ON CONFLICT (name) DO NOTHING;

-- 2. Fix applications that have string category_id instead of UUID
-- First, get the automation category UUID
DO $$
DECLARE
    automation_category_uuid UUID;
    default_category_uuid UUID;
BEGIN
    -- Get automation category UUID
    SELECT id INTO automation_category_uuid 
    FROM application_categories 
    WHERE name = 'automation' 
    LIMIT 1;
    
    -- Get a default category UUID (marketing) for non-automation apps
    SELECT id INTO default_category_uuid 
    FROM application_categories 
    WHERE name = 'marketing' 
    LIMIT 1;
    
    -- If we couldn't find marketing, use any available category
    IF default_category_uuid IS NULL THEN
        SELECT id INTO default_category_uuid 
        FROM application_categories 
        LIMIT 1;
    END IF;
    
    -- Fix applications with 'automation' string as category_id
    UPDATE applications 
    SET category_id = automation_category_uuid::text
    WHERE category_id = 'automation' 
    AND automation_category_uuid IS NOT NULL;
    
    -- Fix other invalid category_id formats by setting to default
    UPDATE applications 
    SET category_id = default_category_uuid::text
    WHERE category_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND category_id IS NOT NULL
    AND category_id != automation_category_uuid::text
    AND default_category_uuid IS NOT NULL;
    
    RAISE NOTICE 'Fixed application category references';
    RAISE NOTICE 'Automation category UUID: %', automation_category_uuid;
    RAISE NOTICE 'Default category UUID: %', default_category_uuid;
END $$;

-- 3. Verify the fixes
SELECT 
    'Fixed applications' as status,
    COUNT(*) as count
FROM applications a
JOIN application_categories ac ON a.category_id::uuid = ac.id;

COMMIT;

-- 4. Final verification query
SELECT 
    a.name,
    a.category_id,
    ac.name as category_name,
    'Properly linked' as status
FROM applications a
JOIN application_categories ac ON a.category_id::uuid = ac.id
ORDER BY ac.name, a.name;
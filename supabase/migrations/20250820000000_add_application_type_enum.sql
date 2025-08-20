-- Add application type enum to distinguish between applications and integrations
-- This migration adds a type column to separate regular apps from integrations

BEGIN;

-- ============================================================================
-- STEP 1: Create application type enum
-- ============================================================================

-- Create enum type for application types
DO $$ BEGIN
    CREATE TYPE application_type AS ENUM ('application', 'integration');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- STEP 2: Add type column to applications table
-- ============================================================================

-- Add type column with default value for backward compatibility
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS type application_type DEFAULT 'application';

-- Make the column NOT NULL after setting default
ALTER TABLE public.applications 
ALTER COLUMN type SET NOT NULL;

-- ============================================================================
-- STEP 3: Update existing data with correct type values
-- ============================================================================

-- Update applications based on category to set correct type
-- Applications with 'automation' category should be integrations
UPDATE public.applications 
SET type = 'integration'
FROM public.application_categories ac
WHERE applications.category_id = ac.id 
  AND LOWER(ac.name) = 'automation';

-- Also update any applications that have 'integration' in their name or description
UPDATE public.applications 
SET type = 'integration'
WHERE LOWER(name) LIKE '%integration%' 
   OR LOWER(description) LIKE '%integration%'
   OR LOWER(name) LIKE '%webhook%'
   OR LOWER(name) LIKE '%api%'
   OR LOWER(name) LIKE '%connector%';

-- Ensure all other applications are marked as 'application'
UPDATE public.applications 
SET type = 'application'
WHERE type IS NULL;

-- ============================================================================
-- STEP 4: Add indexes for better performance
-- ============================================================================

-- Create index on type column for filtering
CREATE INDEX IF NOT EXISTS idx_applications_type 
ON public.applications(type);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_applications_type_active 
ON public.applications(type, is_active) 
WHERE is_active = true;

-- ============================================================================
-- STEP 5: Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN public.applications.type IS 
'Application type: application for regular apps, integration for integrations/automations';

COMMENT ON TYPE application_type IS 
'Enum to distinguish between regular applications and integrations';

-- ============================================================================
-- STEP 6: Verify the changes
-- ============================================================================

DO $$
DECLARE
    total_apps integer;
    application_count integer;
    integration_count integer;
BEGIN
    -- Count total applications
    SELECT count(*) INTO total_apps FROM public.applications;
    
    -- Count by type
    SELECT count(*) INTO application_count FROM public.applications WHERE type = 'application';
    SELECT count(*) INTO integration_count FROM public.applications WHERE type = 'integration';
    
    -- Log the results
    RAISE NOTICE 'Application type migration completed:';
    RAISE NOTICE '- Total applications: %', total_apps;
    RAISE NOTICE '- Regular applications: %', application_count;
    RAISE NOTICE '- Integrations: %', integration_count;
    
    -- Verify all records have a type
    IF (application_count + integration_count) != total_apps THEN
        RAISE WARNING 'Some applications may not have been assigned a type correctly';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- NOTES
-- ============================================================================

/*
This migration:
1. ✅ Creates application_type enum with 'application' and 'integration' values
2. ✅ Adds type column to applications table with default 'application'
3. ✅ Updates existing records based on category and keywords
4. ✅ Creates indexes for better query performance
5. ✅ Adds documentation comments
6. ✅ Verifies the migration results

After this migration:
- Applications API can filter by type = 'application'
- Integrations API can filter by type = 'integration'
- Clear separation between apps and integrations
- Backward compatibility maintained
*/
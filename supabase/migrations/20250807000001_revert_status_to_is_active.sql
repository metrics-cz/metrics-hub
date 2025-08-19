-- Migration: Revert status column back to is_active boolean in company_applications
-- Date: 2025-08-07
-- Description: Simplify the status system - installations are instant, we just need enabled/disabled

BEGIN;

-- Step 1: Add is_active boolean column
ALTER TABLE public.company_applications 
ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Step 2: Convert existing status values to boolean
-- 'active', 'enabled', 'connected' = true, everything else = false
UPDATE public.company_applications 
SET is_active = CASE 
    WHEN status IN ('active', 'enabled', 'connected') THEN true
    ELSE false
END;

-- Step 3: Make is_active NOT NULL
ALTER TABLE public.company_applications 
ALTER COLUMN is_active SET NOT NULL;

-- Step 4: Drop the old status column and its index
DROP INDEX IF EXISTS idx_company_applications_status;
ALTER TABLE public.company_applications 
DROP COLUMN status;

-- Step 5: Create index for is_active column
CREATE INDEX idx_company_applications_is_active 
ON public.company_applications(is_active);

-- Step 6: Add helpful comment
COMMENT ON COLUMN public.company_applications.is_active IS 
'Boolean flag indicating if this application integration is currently enabled';

COMMIT;
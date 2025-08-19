-- Clean up unnecessary complexity from the over-engineered app storage system
-- This migration removes tables that are not needed for the simplified Apps & Integrations system
-- FIXED VERSION: Only attempt to drop policies on tables that exist

-- Step 1: Drop app_builds table (not needed for static apps or simple integrations)
DROP TABLE IF EXISTS public.app_builds CASCADE;

-- Step 2: Drop app_storage table (replaced by simple storage_path in applications)
DROP TABLE IF EXISTS public.app_storage CASCADE;

-- Step 3: Drop app_permissions table (functionality moved to applications.required_secrets)
DROP TABLE IF EXISTS public.app_permissions CASCADE;

-- Step 4: Simplify app_cron_schedules by moving scheduling to applications table
-- First, migrate any existing cron schedules to the applications table
UPDATE public.applications 
SET 
    cron_schedule = acs.cron_expression,
    last_run_at = acs.last_run_at
FROM public.app_cron_schedules acs
WHERE applications.id = acs.app_id;

-- Then drop the app_cron_schedules table
DROP TABLE IF EXISTS public.app_cron_schedules CASCADE;

-- Step 5: Drop app_outputs table (simplified to just storing results in execution_runs)
-- First, migrate any important output data to execution_runs metadata
UPDATE public.execution_runs
SET metadata = jsonb_build_object(
    'outputs', (
        SELECT jsonb_agg(
            jsonb_build_object(
                'type', ao.output_type,
                'name', ao.output_name,
                'data', ao.output_data,
                'path', ao.output_path,
                'size', ao.file_size
            )
        )
        FROM public.app_outputs ao
        WHERE ao.run_id = execution_runs.id
    )
)
WHERE EXISTS (
    SELECT 1 FROM public.app_outputs ao
    WHERE ao.run_id = execution_runs.id
);

-- Then drop the app_outputs table
DROP TABLE IF EXISTS public.app_outputs CASCADE;

-- Step 6: Update execution_runs table to include simplified output storage
ALTER TABLE public.execution_runs 
ADD COLUMN IF NOT EXISTS output_data jsonb DEFAULT '{}', -- Store small outputs directly
ADD COLUMN IF NOT EXISTS output_files text[], -- Array of output file paths
ADD COLUMN IF NOT EXISTS success boolean DEFAULT false, -- Simple success/failure flag
ADD COLUMN IF NOT EXISTS error_details text; -- Error message if failed

-- Step 7: Update execution_runs with success flag based on status
UPDATE public.execution_runs 
SET success = (status = 'success')
WHERE success IS NULL;

-- Step 8: Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_execution_runs_success ON public.execution_runs (success);
CREATE INDEX IF NOT EXISTS idx_execution_runs_output_files ON public.execution_runs USING gin (output_files);

-- Step 9: Clean up any orphaned records that might have been created
DELETE FROM public.execution_runs 
WHERE app_id NOT IN (SELECT id FROM public.applications);

-- Step 10: Update applications table to remove references to deleted tables
ALTER TABLE public.applications 
DROP COLUMN IF EXISTS build_id,
DROP COLUMN IF EXISTS storage_version,
DROP COLUMN IF EXISTS build_status;

-- Step 11: Update existing execution_runs policies to work with new structure
DROP POLICY IF EXISTS "Companies can view runs for their assigned apps" ON public.execution_runs;
DROP POLICY IF EXISTS "Superadmins can manage all app runs" ON public.execution_runs;

-- Create new simplified policies
CREATE POLICY "Companies can view execution runs for their apps"
ON public.execution_runs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.company_applications ca
        JOIN public.company_users cu ON ca.company_id = cu.company_id
        WHERE cu.user_id = auth.uid()
        AND ca.application_id = execution_runs.app_id
        AND ca.is_active = true
    )
);

CREATE POLICY "Companies can create execution runs for their apps"
ON public.execution_runs FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.company_applications ca
        JOIN public.company_users cu ON ca.company_id = cu.company_id
        WHERE cu.user_id = auth.uid()
        AND ca.application_id = execution_runs.app_id
        AND ca.is_active = true
    )
);

CREATE POLICY "Superadmins can manage all execution runs"
ON public.execution_runs FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.user_id = auth.uid()
        AND cu.role = 'superadmin'
    )
);

-- Step 12: Add comments for the simplified schema
COMMENT ON TABLE public.execution_runs IS 'Unified execution tracking for both Apps (iframe usage) and Integrations (server execution)';
COMMENT ON COLUMN public.execution_runs.execution_type IS 'iframe for Apps, server for Integrations';
COMMENT ON COLUMN public.execution_runs.output_data IS 'Small output data stored directly in the database';
COMMENT ON COLUMN public.execution_runs.output_files IS 'Array of paths to larger output files in storage';
COMMENT ON COLUMN public.execution_runs.success IS 'Simple boolean flag indicating execution success';
COMMENT ON COLUMN public.execution_runs.error_details IS 'Error message if execution failed';

-- Step 13: Ensure proper permissions on remaining tables
GRANT SELECT, INSERT, UPDATE ON TABLE public.execution_runs TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.applications TO authenticated;
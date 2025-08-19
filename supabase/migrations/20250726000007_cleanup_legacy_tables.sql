-- Cleanup legacy integration and automation tables
-- This migration removes redundant tables from the old separate integrations/automations system
-- since we now have a unified executor server architecture

BEGIN;

-- ============================================================================
-- STEP 1: Safety Checks - Verify Unified System is Working
-- ============================================================================

-- Verify that the unified system tables exist and have data
DO $$
DECLARE
    applications_count integer;
    company_applications_count integer;
    executor_tables_exist boolean := true;
BEGIN
    -- Check if unified applications table exists and has data
    SELECT count(*) INTO applications_count FROM public.applications;
    
    -- Check if company_applications table exists and has data
    SELECT count(*) INTO company_applications_count FROM public.company_applications;
    
    -- Check if executor tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'executor_nodes' AND table_schema = 'public') THEN
        executor_tables_exist := false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'executor_jobs' AND table_schema = 'public') THEN
        executor_tables_exist := false;
    END IF;
    
    -- Safety checks
    IF applications_count = 0 THEN
        RAISE EXCEPTION 'Safety check failed: applications table is empty. Cannot proceed with cleanup.';
    END IF;
    
    IF NOT executor_tables_exist THEN
        RAISE EXCEPTION 'Safety check failed: executor tables do not exist. Cannot proceed with cleanup.';
    END IF;
    
    -- Log safety check results
    RAISE NOTICE 'Safety checks passed:';
    RAISE NOTICE '- Applications table has % records', applications_count;
    RAISE NOTICE '- Company applications table has % records', company_applications_count;
    RAISE NOTICE '- Executor server tables exist and are ready';
END $$;

-- ============================================================================
-- STEP 2: Data Verification (Optional - for logging purposes)
-- ============================================================================

-- Count records in legacy tables before cleanup (for logging)
DO $$
DECLARE
    integrations_count integer := 0;
    company_integrations_count integer := 0;
    automations_count integer := 0;
    company_automations_count integer := 0;
    automation_runs_count integer := 0;
BEGIN
    -- Count legacy table records if they exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'integrations' AND table_schema = 'public') THEN
        SELECT count(*) INTO integrations_count FROM public.integrations;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_integrations' AND table_schema = 'public') THEN
        SELECT count(*) INTO company_integrations_count FROM public.company_integrations;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'automations' AND table_schema = 'public') THEN
        SELECT count(*) INTO automations_count FROM public.automations;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_automations' AND table_schema = 'public') THEN
        SELECT count(*) INTO company_automations_count FROM public.company_automations;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'automation_runs' AND table_schema = 'public') THEN
        SELECT count(*) INTO automation_runs_count FROM public.automation_runs;
    END IF;
    
    -- Log what we're about to clean up
    RAISE NOTICE '=== LEGACY TABLE CLEANUP ===';
    RAISE NOTICE 'About to drop legacy tables with the following record counts:';
    RAISE NOTICE '- integrations: % records', integrations_count;
    RAISE NOTICE '- company_integrations: % records', company_integrations_count;
    RAISE NOTICE '- automations: % records', automations_count;
    RAISE NOTICE '- company_automations: % records', company_automations_count;
    RAISE NOTICE '- automation_runs: % records', automation_runs_count;
    RAISE NOTICE '=============================';
END $$;

-- ============================================================================
-- STEP 3: Drop Legacy Tables (in dependency order)
-- ============================================================================

-- Drop tables that reference other legacy tables first

-- Drop automation_runs (references company_automations)
DROP TABLE IF EXISTS public.automation_runs CASCADE;

-- Drop company_automations (references automations and companies)  
DROP TABLE IF EXISTS public.company_automations CASCADE;

-- Drop company_integrations (references integrations and companies)
DROP TABLE IF EXISTS public.company_integrations CASCADE;

-- Drop the base definition tables
DROP TABLE IF EXISTS public.automations CASCADE;
DROP TABLE IF EXISTS public.integrations CASCADE;

-- ============================================================================
-- STEP 4: Clean Up Related Objects
-- ============================================================================

-- Drop any indexes that were specifically for legacy tables
-- (Most will be automatically dropped with CASCADE, but being explicit)

DROP INDEX IF EXISTS public.idx_company_integrations_company;
DROP INDEX IF EXISTS public.idx_company_integrations_integration;
DROP INDEX IF EXISTS public.idx_company_integrations_status;

DROP INDEX IF EXISTS public.idx_company_automations_company;
DROP INDEX IF EXISTS public.idx_company_automations_automation;
DROP INDEX IF EXISTS public.idx_company_automations_active;
DROP INDEX IF EXISTS public.idx_company_automations_next_run;

DROP INDEX IF EXISTS public.idx_automation_runs_company_automation;
DROP INDEX IF EXISTS public.idx_automation_runs_status;
DROP INDEX IF EXISTS public.idx_automation_runs_started;

-- Drop any RLS policies that were specifically for legacy tables
-- (These will be automatically dropped with the tables, but being explicit)
-- Note: Policy drops are handled automatically with table drops

-- ============================================================================
-- STEP 5: Verification - Ensure Tables Are Gone
-- ============================================================================

DO $$
DECLARE
    remaining_tables text[] := ARRAY[]::text[];
BEGIN
    -- Check for any remaining legacy tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'integrations' AND table_schema = 'public') THEN
        remaining_tables := array_append(remaining_tables, 'integrations');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_integrations' AND table_schema = 'public') THEN
        remaining_tables := array_append(remaining_tables, 'company_integrations');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'automations' AND table_schema = 'public') THEN
        remaining_tables := array_append(remaining_tables, 'automations');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_automations' AND table_schema = 'public') THEN
        remaining_tables := array_append(remaining_tables, 'company_automations');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'automation_runs' AND table_schema = 'public') THEN
        remaining_tables := array_append(remaining_tables, 'automation_runs');
    END IF;
    
    -- Report cleanup results
    IF array_length(remaining_tables, 1) > 0 THEN
        RAISE WARNING 'Some legacy tables were not dropped: %', array_to_string(remaining_tables, ', ');
    ELSE
        RAISE NOTICE 'Successfully dropped all legacy integration and automation tables';
    END IF;
END $$;

-- ============================================================================
-- STEP 6: Final Status Report
-- ============================================================================

DO $$
DECLARE
    current_app_count integer;
    current_company_app_count integer;
    executor_job_count integer;
BEGIN
    -- Count current unified system records
    SELECT count(*) INTO current_app_count FROM public.applications;
    SELECT count(*) INTO current_company_app_count FROM public.company_applications;
    SELECT count(*) INTO executor_job_count FROM public.executor_jobs;
    
    RAISE NOTICE '=== CLEANUP COMPLETE ===';
    RAISE NOTICE 'Current unified system status:';
    RAISE NOTICE '- Applications: % records', current_app_count;
    RAISE NOTICE '- Company applications: % records', current_company_app_count;
    RAISE NOTICE '- Executor jobs: % records', executor_job_count;
    RAISE NOTICE 'Legacy tables successfully removed.';
    RAISE NOTICE 'Database is now optimized for unified executor server architecture.';
    RAISE NOTICE '========================';
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (for reference only)
-- ============================================================================

/*
If you need to rollback this migration, you would need to:

1. Restore the legacy tables from the original migration:
   \i supabase/migrations/20250708100000_create_integrations_and_automations_tables.sql

2. If you had data that was migrated, you would need to restore it from:
   - Database backup
   - Or re-run the data migration scripts if they're still compatible

3. However, this is NOT RECOMMENDED as the unified executor server system
   is the current architecture and rolling back would break the executor server functionality.

IMPORTANT: The unified system in applications/company_applications tables 
contains all the functionality of the legacy system and more. This cleanup
only removes redundant tables that are no longer needed.
*/

-- ============================================================================
-- NOTES
-- ============================================================================

/*
This migration removes the following legacy tables that were part of the
old separate integrations/automations system:

DROPPED TABLES:
- integrations: Third-party service definitions (replaced by applications.app_type = 'integration')
- company_integrations: Company integration instances (replaced by company_applications)  
- automations: Workflow definitions (replaced by applications with automation capabilities)
- company_automations: Company automation instances (replaced by company_applications)
- automation_runs: Execution history (replaced by execution_runs and executor_jobs)

MODERN REPLACEMENT SYSTEM:
- applications: Unified table for apps, integrations, and automations
- company_applications: Unified installation/instance management
- executor_jobs: Advanced job queue for BullMQ integration
- executor_nodes: Distributed executor server management
- integration_health: Third-party service monitoring
- automation_schedules: Enhanced scheduling with timezone support
- execution_runs: Comprehensive execution tracking

The new system provides:
✅ Unified management interface
✅ Better performance with optimized indexes
✅ Distributed execution capabilities
✅ Enhanced monitoring and health checks
✅ Advanced scheduling features
✅ BullMQ integration for reliable job processing
✅ Scalable executor server architecture
*/
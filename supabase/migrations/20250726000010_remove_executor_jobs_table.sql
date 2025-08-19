-- Remove executor_jobs table - use BullMQ + execution_runs instead
-- This migration eliminates redundancy between BullMQ and database job tracking

BEGIN;

-- ============================================================================
-- STEP 1: Safety Checks and Current State Analysis
-- ============================================================================

DO $$
DECLARE
    executor_jobs_count integer;
    execution_runs_count integer;
    automation_schedules_count integer;
BEGIN
    -- Check current state
    SELECT count(*) INTO executor_jobs_count FROM public.executor_jobs;
    SELECT count(*) INTO execution_runs_count FROM public.execution_runs;
    SELECT count(*) INTO automation_schedules_count FROM public.automation_schedules;
    
    RAISE NOTICE '=== REMOVING EXECUTOR_JOBS TABLE ===';
    RAISE NOTICE 'Current state:';
    RAISE NOTICE '- Executor jobs: %', executor_jobs_count;
    RAISE NOTICE '- Execution runs: %', execution_runs_count;
    RAISE NOTICE '- Automation schedules: %', automation_schedules_count;
    RAISE NOTICE '=====================================';
    
    -- Warn if there are jobs in the table
    IF executor_jobs_count > 0 THEN
        RAISE WARNING 'Found % executor jobs - they will be removed as BullMQ is the source of truth', executor_jobs_count;
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Remove Foreign Key Dependencies
-- ============================================================================

-- Drop foreign key constraints that reference executor_jobs
ALTER TABLE public.execution_runs 
DROP CONSTRAINT IF EXISTS execution_runs_executor_job_id_fkey;

ALTER TABLE public.automation_schedules 
DROP CONSTRAINT IF EXISTS automation_schedules_last_job_id_fkey;

-- ============================================================================
-- STEP 3: Remove Columns That Reference executor_jobs
-- ============================================================================

-- Remove executor_job_id from execution_runs (not needed - BullMQ job ID can be stored in metadata)
ALTER TABLE public.execution_runs 
DROP COLUMN IF EXISTS executor_job_id;

-- Remove last_job_id from automation_schedules (use last_run_at timestamp instead)
ALTER TABLE public.automation_schedules 
DROP COLUMN IF EXISTS last_job_id;

-- ============================================================================
-- STEP 4: Drop Triggers and Functions Related to executor_jobs
-- ============================================================================

-- Drop the job statistics trigger
DROP TRIGGER IF EXISTS update_job_statistics_trigger ON public.executor_jobs;

-- Update the job statistics function to work with execution_runs instead
CREATE OR REPLACE FUNCTION update_execution_statistics()
RETURNS trigger AS $$
BEGIN
    IF NEW.status = 'success' AND OLD.status != 'success' THEN
        UPDATE public.company_applications 
        SET 
            success_count = success_count + 1,
            run_count = run_count + 1,
            last_run_at = NEW.completed_at
        WHERE id = NEW.company_application_id;
        
    ELSIF NEW.status = 'error' AND OLD.status != 'error' THEN
        UPDATE public.company_applications 
        SET 
            error_count = error_count + 1,
            run_count = run_count + 1,
            last_error_message = NEW.error_message
        WHERE id = NEW.company_application_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on execution_runs instead of executor_jobs
DROP TRIGGER IF EXISTS update_execution_statistics_trigger ON public.execution_runs;
CREATE TRIGGER update_execution_statistics_trigger
    AFTER UPDATE ON public.execution_runs
    FOR EACH ROW
    WHEN (NEW.status IN ('success', 'error') AND OLD.status NOT IN ('success', 'error'))
    EXECUTE FUNCTION update_execution_statistics();

-- ============================================================================
-- STEP 5: Drop Indexes Related to executor_jobs
-- ============================================================================

-- Drop all executor_jobs indexes
DROP INDEX IF EXISTS public.idx_executor_jobs_status;
DROP INDEX IF EXISTS public.idx_executor_jobs_queue;
DROP INDEX IF EXISTS public.idx_executor_jobs_scheduled;
DROP INDEX IF EXISTS public.idx_executor_jobs_company_app;
DROP INDEX IF EXISTS public.idx_executor_jobs_node;
DROP INDEX IF EXISTS public.idx_executor_jobs_priority;
DROP INDEX IF EXISTS public.idx_executor_jobs_status_priority;
DROP INDEX IF EXISTS public.idx_executor_jobs_active_monitoring;

-- ============================================================================
-- STEP 6: Drop RLS Policies for executor_jobs
-- ============================================================================

-- Drop RLS policies for executor_jobs
DROP POLICY IF EXISTS "executor_jobs_company_access" ON public.executor_jobs;
DROP POLICY IF EXISTS "executor_jobs_service_access" ON public.executor_jobs;

-- ============================================================================
-- STEP 7: Drop the executor_jobs Table
-- ============================================================================

-- Drop the executor_jobs table entirely
DROP TABLE IF EXISTS public.executor_jobs CASCADE;

-- ============================================================================
-- STEP 8: Update Server Info Function (Remove Job Queue Stats)
-- ============================================================================

-- Update server info function to focus on execution_runs instead
CREATE OR REPLACE FUNCTION get_executor_server_info()
RETURNS jsonb AS $$
DECLARE
    active_executions integer;
    pending_executions integer;
    total_executions_today integer;
    server_info jsonb;
BEGIN
    -- Get current execution counts
    SELECT count(*) INTO active_executions 
    FROM public.execution_runs 
    WHERE status = 'running';
    
    -- Pending executions are those scheduled for future (in automation_schedules)
    SELECT count(*) INTO pending_executions 
    FROM public.automation_schedules 
    WHERE is_active = true AND next_run_at <= now() + interval '1 hour';
    
    SELECT count(*) INTO total_executions_today 
    FROM public.execution_runs 
    WHERE started_at >= current_date;
    
    -- Build server info object
    server_info := jsonb_build_object(
        'server_type', 'single_executor',
        'active_executions', active_executions,
        'pending_schedules', pending_executions,
        'total_executions_today', total_executions_today,
        'max_concurrent_executions', 10, -- Default single server limit
        'capacity_utilization', round((active_executions::numeric / 10) * 100, 2),
        'last_checked', now(),
        'job_queue_system', 'bullmq'
    );
    
    RETURN server_info;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 9: Add BullMQ Job ID to execution_runs (Optional)
-- ============================================================================

-- Add optional BullMQ job ID tracking to execution_runs for debugging
ALTER TABLE public.execution_runs 
ADD COLUMN IF NOT EXISTS bullmq_job_id text;

-- Create index for BullMQ job ID lookups
CREATE INDEX IF NOT EXISTS idx_execution_runs_bullmq_job_id 
    ON public.execution_runs(bullmq_job_id) 
    WHERE bullmq_job_id IS NOT NULL;

-- ============================================================================
-- STEP 10: Update Comments and Documentation
-- ============================================================================

-- Update execution_runs table comment
COMMENT ON TABLE public.execution_runs IS 'Tracks execution history for apps and integrations (works with BullMQ job queue)';
COMMENT ON COLUMN public.execution_runs.bullmq_job_id IS 'Optional BullMQ job ID for debugging and correlation';

-- Update server info function comment
COMMENT ON FUNCTION get_executor_server_info() IS 'Returns executor server status without job queue table (uses BullMQ + execution_runs)';

-- ============================================================================
-- STEP 11: Verification and Final Status
-- ============================================================================

DO $$
DECLARE
    executor_jobs_exists boolean;
    execution_runs_exists boolean;
    automation_schedules_exists boolean;
    remaining_refs integer := 0;
    server_info jsonb;
BEGIN
    -- Check if executor_jobs table still exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'executor_jobs' AND table_schema = 'public'
    ) INTO executor_jobs_exists;
    
    -- Check if other tables exist and are functional
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'execution_runs' AND table_schema = 'public'
    ) INTO execution_runs_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'automation_schedules' AND table_schema = 'public'
    ) INTO automation_schedules_exists;
    
    -- Check for any remaining references to executor_jobs
    SELECT count(*) INTO remaining_refs
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
        AND column_name LIKE '%executor_job%';
    
    -- Test the updated server info function
    SELECT get_executor_server_info() INTO server_info;
    
    -- Final status report
    RAISE NOTICE '=== EXECUTOR_JOBS TABLE REMOVAL COMPLETE ===';
    RAISE NOTICE 'Job queue architecture simplified:';
    RAISE NOTICE '- executor_jobs table: %', CASE WHEN executor_jobs_exists THEN 'STILL EXISTS' ELSE 'REMOVED' END;
    RAISE NOTICE '- execution_runs table: %', CASE WHEN execution_runs_exists THEN 'EXISTS' ELSE 'MISSING' END;
    RAISE NOTICE '- automation_schedules table: %', CASE WHEN automation_schedules_exists THEN 'EXISTS' ELSE 'MISSING' END;
    RAISE NOTICE '- Remaining executor_job references: %', remaining_refs;
    RAISE NOTICE '- Updated server info function: WORKING';
    RAISE NOTICE '- Job queue system: BullMQ (Redis)';
    RAISE NOTICE '- Execution tracking: execution_runs table';
    RAISE NOTICE '- Current server status: %', server_info;
    RAISE NOTICE '==============================================';
END $$;

COMMIT;

-- ============================================================================
-- NOTES FOR SIMPLIFIED ARCHITECTURE
-- ============================================================================

/*
SIMPLIFIED JOB QUEUE ARCHITECTURE:

┌─────────────┐    ┌─────────────┐    ┌─────────────────┐
│   BullMQ    │───▶│  Executor   │───▶│ execution_runs  │
│  (Redis)    │    │   Server    │    │   (Database)    │
└─────────────┘    └─────────────┘    └─────────────────┘
Job Queue          Job Processing     Execution History

BENEFITS:
✅ Eliminates data duplication between BullMQ and database
✅ Single source of truth for job queue state (BullMQ)
✅ Single source of truth for execution history (execution_runs)
✅ Reduced complexity and maintenance overhead
✅ Better performance (no DB writes during job processing)
✅ Leverages BullMQ's built-in monitoring and retry logic

JOB FLOW:
1. Schedule job → BullMQ Redis queue
2. Executor picks up job → Creates execution_run record
3. Job completes → Updates execution_run with results
4. Statistics updated via trigger → company_applications table

MONITORING:
- Active jobs: Query BullMQ Redis directly
- Job history: Query execution_runs table
- Schedules: Query automation_schedules table
- Health: Query integration_health table

NO LONGER NEEDED:
❌ executor_jobs table (redundant with BullMQ)
❌ Job status synchronization between BullMQ and DB
❌ executor_nodes table (single server architecture)
❌ Complex job assignment logic
*/
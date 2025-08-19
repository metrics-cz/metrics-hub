-- Simplify executor architecture for single server deployment
-- This migration removes the multi-node complexity since only one executor server will be used

BEGIN;

-- ============================================================================
-- STEP 1: Safety Checks and Current State Analysis
-- ============================================================================

DO $$
DECLARE
    executor_nodes_count integer;
    executor_jobs_count integer;
    health_records_count integer;
BEGIN
    -- Check current state
    SELECT count(*) INTO executor_nodes_count FROM public.executor_nodes;
    SELECT count(*) INTO executor_jobs_count FROM public.executor_jobs;
    SELECT count(*) INTO health_records_count FROM public.integration_health;
    
    RAISE NOTICE '=== SINGLE EXECUTOR SIMPLIFICATION ===';
    RAISE NOTICE 'Current state:';
    RAISE NOTICE '- Executor nodes: %', executor_nodes_count;
    RAISE NOTICE '- Executor jobs: %', executor_jobs_count;
    RAISE NOTICE '- Health records: %', health_records_count;
    RAISE NOTICE '=====================================';
    
    -- Warn if there are multiple nodes
    IF executor_nodes_count > 1 THEN
        RAISE WARNING 'Found % executor nodes - this migration will remove multi-node support', executor_nodes_count;
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Remove Foreign Key Dependencies
-- ============================================================================

-- Drop foreign key constraints that reference executor_nodes
ALTER TABLE public.executor_jobs 
DROP CONSTRAINT IF EXISTS executor_jobs_executor_node_id_fkey;

ALTER TABLE public.integration_health 
DROP CONSTRAINT IF EXISTS integration_health_checked_by_node_fkey;

-- ============================================================================
-- STEP 3: Remove Node-Related Columns
-- ============================================================================

-- Remove executor_node_id from executor_jobs (single server doesn't need node assignment)
ALTER TABLE public.executor_jobs 
DROP COLUMN IF EXISTS executor_node_id;

-- Remove checked_by_node from integration_health (single server does all checks)
ALTER TABLE public.integration_health 
DROP COLUMN IF EXISTS checked_by_node;

-- ============================================================================
-- STEP 4: Drop Executor Nodes Table and Related Objects
-- ============================================================================

-- Drop indexes related to executor_nodes
DROP INDEX IF EXISTS public.idx_executor_nodes_status;
DROP INDEX IF EXISTS public.idx_executor_nodes_heartbeat;
DROP INDEX IF EXISTS public.idx_executor_nodes_capacity;

-- Drop indexes that referenced executor_node_id
DROP INDEX IF EXISTS public.idx_executor_jobs_node;

-- Drop RLS policies for executor_nodes
DROP POLICY IF EXISTS "executor_nodes_service_access" ON public.executor_nodes;
DROP POLICY IF EXISTS "executor_nodes_read_only" ON public.executor_nodes;

-- Drop the executor_nodes table entirely
DROP TABLE IF EXISTS public.executor_nodes CASCADE;

-- ============================================================================
-- STEP 5: Update Job Statistics Function (Remove Node Logic)
-- ============================================================================

-- Update the job statistics function to remove node-related logic
CREATE OR REPLACE FUNCTION update_job_statistics()
RETURNS trigger AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE public.company_applications 
        SET 
            success_count = success_count + 1,
            run_count = run_count + 1,
            last_run_at = NEW.completed_at
        WHERE id = NEW.company_application_id;
        
    ELSIF NEW.status = 'failed' AND OLD.status != 'failed' THEN
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

-- ============================================================================
-- STEP 6: Update Indexes for Single Server Optimization
-- ============================================================================

-- Remove node-specific indexes and add single-server optimized ones
DROP INDEX IF EXISTS public.idx_executor_nodes_capacity; -- Already dropped above, but being explicit

-- Optimize executor_jobs indexes for single server (no node distribution needed)
CREATE INDEX IF NOT EXISTS idx_executor_jobs_status_priority 
    ON public.executor_jobs(status, priority DESC, created_at ASC) 
    WHERE status IN ('pending', 'active');

-- Create index for active jobs monitoring (single server capacity management)
CREATE INDEX IF NOT EXISTS idx_executor_jobs_active_monitoring
    ON public.executor_jobs(status, started_at)
    WHERE status = 'active';

-- ============================================================================
-- STEP 7: Update Comments and Documentation
-- ============================================================================

-- Update table comments to reflect single server architecture
COMMENT ON TABLE public.executor_jobs IS 'Job queue for single executor server with BullMQ integration';
COMMENT ON TABLE public.integration_health IS 'Health monitoring for integrations (single server architecture)';

-- Update column comments
COMMENT ON COLUMN public.executor_jobs.queue_name IS 'BullMQ queue name (single server processes all queues)';
COMMENT ON COLUMN public.executor_jobs.priority IS 'Job priority for single server queue processing (higher = more urgent)';

-- ============================================================================
-- STEP 8: Create Single Server Configuration Function
-- ============================================================================

-- Create a simple function to get server capacity info without nodes table
CREATE OR REPLACE FUNCTION get_executor_server_info()
RETURNS jsonb AS $$
DECLARE
    active_jobs integer;
    pending_jobs integer;
    total_jobs_today integer;
    server_info jsonb;
BEGIN
    -- Get current job counts
    SELECT count(*) INTO active_jobs 
    FROM public.executor_jobs 
    WHERE status = 'active';
    
    SELECT count(*) INTO pending_jobs 
    FROM public.executor_jobs 
    WHERE status = 'pending';
    
    SELECT count(*) INTO total_jobs_today 
    FROM public.executor_jobs 
    WHERE created_at >= current_date;
    
    -- Build server info object
    server_info := jsonb_build_object(
        'server_type', 'single_executor',
        'active_jobs', active_jobs,
        'pending_jobs', pending_jobs,
        'total_jobs_today', total_jobs_today,
        'max_concurrent_jobs', 10, -- Default single server limit
        'capacity_utilization', round((active_jobs::numeric / 10) * 100, 2),
        'last_checked', now()
    );
    
    RETURN server_info;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 9: Grant Permissions for Single Server Functions
-- ============================================================================

-- Grant execute permissions for the new server info function
GRANT EXECUTE ON FUNCTION get_executor_server_info() TO authenticated;
GRANT EXECUTE ON FUNCTION get_executor_server_info() TO service_role;

-- ============================================================================
-- STEP 10: Verification and Final Status
-- ============================================================================

DO $$
DECLARE
    remaining_node_refs integer := 0;
    job_table_exists boolean;
    health_table_exists boolean;
    server_info jsonb;
BEGIN
    -- Check if executor_nodes table still exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'executor_nodes' AND table_schema = 'public'
    ) THEN
        RAISE WARNING 'executor_nodes table still exists after cleanup attempt';
    ELSE
        RAISE NOTICE 'executor_nodes table successfully removed';
    END IF;
    
    -- Check if other tables exist and are functional
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'executor_jobs' AND table_schema = 'public'
    ) INTO job_table_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'integration_health' AND table_schema = 'public'
    ) INTO health_table_exists;
    
    -- Check for any remaining node references in columns
    SELECT count(*) INTO remaining_node_refs
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
        AND column_name LIKE '%node%' 
        AND table_name IN ('executor_jobs', 'integration_health');
    
    -- Test the new server info function
    SELECT get_executor_server_info() INTO server_info;
    
    -- Final status report
    RAISE NOTICE '=== SINGLE EXECUTOR SIMPLIFICATION COMPLETE ===';
    RAISE NOTICE 'Executor infrastructure simplified for single server:';
    RAISE NOTICE '- executor_nodes table: REMOVED';
    RAISE NOTICE '- executor_jobs table: % (simplified)', CASE WHEN job_table_exists THEN 'EXISTS' ELSE 'MISSING' END;
    RAISE NOTICE '- integration_health table: % (simplified)', CASE WHEN health_table_exists THEN 'EXISTS' ELSE 'MISSING' END;
    RAISE NOTICE '- Remaining node column references: %', remaining_node_refs;
    RAISE NOTICE '- Server info function: WORKING';
    RAISE NOTICE '- Current server status: %', server_info;
    RAISE NOTICE '===============================================';
END $$;

COMMIT;

-- ============================================================================
-- NOTES FOR FUTURE SCALING
-- ============================================================================

/*
FUTURE MULTI-NODE SCALING:

If you need to scale back to multiple executor servers in the future:

1. Recreate executor_nodes table:
   CREATE TABLE executor_nodes (
       id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
       node_id text UNIQUE NOT NULL,
       hostname text NOT NULL,
       status text DEFAULT 'active',
       max_concurrent_jobs integer DEFAULT 10,
       current_job_count integer DEFAULT 0,
       last_heartbeat timestamptz DEFAULT now(),
       created_at timestamptz DEFAULT now()
   );

2. Add back foreign key columns:
   ALTER TABLE executor_jobs ADD COLUMN executor_node_id uuid REFERENCES executor_nodes(id);
   ALTER TABLE integration_health ADD COLUMN checked_by_node uuid REFERENCES executor_nodes(id);

3. Implement node selection logic in your application code
4. Add back node-specific monitoring and load balancing

CURRENT SINGLE SERVER BENEFITS:
✅ Simplified deployment (no node registration/discovery)
✅ Reduced infrastructure complexity 
✅ Easier monitoring and debugging
✅ Lower resource overhead
✅ Faster development iteration
✅ Still supports full job queue functionality with BullMQ
✅ Still supports comprehensive health monitoring
✅ Still supports priority-based job processing
✅ Still supports retry logic and error handling

The core executor functionality remains intact - only the multi-node
orchestration complexity has been removed.
*/
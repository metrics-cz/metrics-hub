-- Create core executor server tables without data migration
-- This creates the essential tables for the executor server to function

BEGIN;

-- ============================================================================
-- STEP 1: Create Executor Infrastructure Tables
-- ============================================================================

-- Executor nodes table for distributed execution
CREATE TABLE IF NOT EXISTS public.executor_nodes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id text NOT NULL UNIQUE, -- Unique identifier for executor instance
    hostname text NOT NULL,
    ip_address inet,
    
    -- Capacity management
    max_concurrent_jobs integer DEFAULT 10,
    current_job_count integer DEFAULT 0,
    cpu_cores integer,
    memory_mb integer,
    
    -- Health status
    status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'error')),
    last_heartbeat timestamptz DEFAULT now(),
    version text, -- Executor version
    
    -- Capabilities
    supported_app_types text[] DEFAULT ARRAY['integration', 'automation'], -- What types can this node run
    docker_enabled boolean DEFAULT true,
    
    -- Metadata
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Job queue table for BullMQ integration
CREATE TABLE IF NOT EXISTS public.executor_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Job identification
    job_id text UNIQUE, -- BullMQ job ID
    queue_name text NOT NULL DEFAULT 'default',
    job_type text NOT NULL, -- 'execute_integration', 'run_automation', 'health_check'
    
    -- Application context
    company_application_id uuid NOT NULL REFERENCES public.company_applications(id) ON DELETE CASCADE,
    execution_run_id uuid REFERENCES public.execution_runs(id) ON DELETE SET NULL,
    
    -- Scheduling
    scheduled_at timestamptz NOT NULL,
    started_at timestamptz,
    completed_at timestamptz,
    
    -- Execution
    executor_node_id uuid REFERENCES public.executor_nodes(id) ON DELETE SET NULL,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'failed', 'cancelled', 'delayed')),
    priority integer DEFAULT 0, -- Higher number = higher priority
    attempts integer DEFAULT 0,
    max_attempts integer DEFAULT 3,
    
    -- Results
    result jsonb DEFAULT '{}',
    error_message text,
    duration_ms integer,
    
    -- Metadata
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Integration health monitoring
CREATE TABLE IF NOT EXISTS public.integration_health (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_application_id uuid NOT NULL REFERENCES public.company_applications(id) ON DELETE CASCADE,
    
    -- Health check details
    checked_at timestamptz DEFAULT now(),
    status text NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
    response_time_ms integer,
    
    -- API/Connection status
    api_status text CHECK (api_status IN ('connected', 'disconnected', 'rate_limited', 'unauthorized', 'error')),
    api_response_code integer,
    api_error_message text,
    
    -- Credential status
    credentials_valid boolean,
    credentials_expire_at timestamptz,
    
    -- Usage metrics
    daily_api_calls integer DEFAULT 0,
    daily_quota_limit integer,
    monthly_usage_mb numeric(10,2) DEFAULT 0,
    
    -- Metadata
    checked_by_node uuid REFERENCES public.executor_nodes(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

-- Enhanced scheduling table
CREATE TABLE IF NOT EXISTS public.automation_schedules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_application_id uuid NOT NULL REFERENCES public.company_applications(id) ON DELETE CASCADE,
    
    -- Schedule configuration
    cron_expression text NOT NULL, -- Full cron expression
    timezone text DEFAULT 'UTC',
    is_active boolean DEFAULT true,
    
    -- Execution windows
    start_date date,
    end_date date,
    execution_window_start time, -- Time of day to start allowing execution
    execution_window_end time, -- Time of day to stop allowing execution
    
    -- Tracking
    next_run_at timestamptz NOT NULL,
    last_run_at timestamptz,
    last_job_id uuid REFERENCES public.executor_jobs(id) ON DELETE SET NULL,
    
    -- Metadata
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Ensure one active schedule per company application
    UNIQUE(company_application_id) DEFERRABLE INITIALLY DEFERRED
);

-- ============================================================================
-- STEP 2: Create Indexes for Performance
-- ============================================================================

-- Executor nodes indexes
CREATE INDEX IF NOT EXISTS idx_executor_nodes_status ON public.executor_nodes(status);
CREATE INDEX IF NOT EXISTS idx_executor_nodes_heartbeat ON public.executor_nodes(last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_executor_nodes_capacity ON public.executor_nodes(current_job_count, max_concurrent_jobs);

-- Executor jobs indexes
CREATE INDEX IF NOT EXISTS idx_executor_jobs_status ON public.executor_jobs(status);
CREATE INDEX IF NOT EXISTS idx_executor_jobs_queue ON public.executor_jobs(queue_name, status);
CREATE INDEX IF NOT EXISTS idx_executor_jobs_scheduled ON public.executor_jobs(scheduled_at, status);
CREATE INDEX IF NOT EXISTS idx_executor_jobs_company_app ON public.executor_jobs(company_application_id);
CREATE INDEX IF NOT EXISTS idx_executor_jobs_node ON public.executor_jobs(executor_node_id) WHERE executor_node_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_executor_jobs_priority ON public.executor_jobs(priority DESC, created_at ASC) WHERE status = 'pending';

-- Integration health indexes
CREATE INDEX IF NOT EXISTS idx_integration_health_company_app ON public.integration_health(company_application_id);
CREATE INDEX IF NOT EXISTS idx_integration_health_status ON public.integration_health(status, checked_at);
CREATE INDEX IF NOT EXISTS idx_integration_health_recent ON public.integration_health(checked_at DESC);

-- Automation schedules indexes
CREATE INDEX IF NOT EXISTS idx_automation_schedules_next_run ON public.automation_schedules(next_run_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_automation_schedules_company_app ON public.automation_schedules(company_application_id);

-- ============================================================================
-- STEP 3: Create Functions for Job Management
-- ============================================================================

-- Function to calculate next run time for automations
CREATE OR REPLACE FUNCTION calculate_next_run_time(
    cron_expr text,
    tz text DEFAULT 'UTC',
    from_time timestamptz DEFAULT now()
) RETURNS timestamptz AS $$
DECLARE
    next_run timestamptz;
BEGIN
    -- This is a simplified implementation
    -- In production, you'd want to use a proper cron parser
    -- For now, handle basic cases
    CASE 
        WHEN cron_expr = '0 * * * *' THEN -- Every hour
            next_run := date_trunc('hour', from_time) + interval '1 hour';
        WHEN cron_expr = '0 */6 * * *' THEN -- Every 6 hours
            next_run := date_trunc('hour', from_time) + 
                       interval '6 hours' * ceiling(extract(hour from from_time)::float / 6);
        WHEN cron_expr = '0 0 * * *' THEN -- Daily at midnight
            next_run := date_trunc('day', from_time) + interval '1 day';
        ELSE -- Default to 1 hour
            next_run := from_time + interval '1 hour';
    END CASE;
    
    -- Convert to specified timezone if needed
    -- This is simplified - you'd want proper timezone handling
    RETURN next_run;
END;
$$ LANGUAGE plpgsql;

-- Function to update job statistics
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
-- STEP 4: Create Triggers
-- ============================================================================

-- Trigger to update statistics when job completes
DROP TRIGGER IF EXISTS update_job_statistics_trigger ON public.executor_jobs;
CREATE TRIGGER update_job_statistics_trigger
    AFTER UPDATE ON public.executor_jobs
    FOR EACH ROW
    WHEN (NEW.status IN ('completed', 'failed') AND OLD.status NOT IN ('completed', 'failed'))
    EXECUTE FUNCTION update_job_statistics();

-- Update timestamps triggers for new tables (handle existing triggers)
DROP TRIGGER IF EXISTS update_executor_nodes_updated_at ON public.executor_nodes;
CREATE TRIGGER update_executor_nodes_updated_at 
    BEFORE UPDATE ON public.executor_nodes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_executor_jobs_updated_at ON public.executor_jobs;
CREATE TRIGGER update_executor_jobs_updated_at 
    BEFORE UPDATE ON public.executor_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_automation_schedules_updated_at ON public.automation_schedules;
CREATE TRIGGER update_automation_schedules_updated_at 
    BEFORE UPDATE ON public.automation_schedules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 5: Enable RLS and Create Policies
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.executor_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executor_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_schedules ENABLE ROW LEVEL SECURITY;

-- Executor nodes policies (service role only)
DROP POLICY IF EXISTS "executor_nodes_service_access" ON public.executor_nodes;
CREATE POLICY "executor_nodes_service_access" ON public.executor_nodes
    FOR ALL TO service_role
    USING (true);

DROP POLICY IF EXISTS "executor_nodes_read_only" ON public.executor_nodes;
CREATE POLICY "executor_nodes_read_only" ON public.executor_nodes
    FOR SELECT TO authenticated
    USING (true);

-- Executor jobs policies
DROP POLICY IF EXISTS "executor_jobs_company_access" ON public.executor_jobs;
CREATE POLICY "executor_jobs_company_access" ON public.executor_jobs
    FOR SELECT TO authenticated
    USING (
        company_application_id IN (
            SELECT id FROM public.company_applications
            WHERE company_id IN (
                SELECT company_id FROM company_users WHERE user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "executor_jobs_service_access" ON public.executor_jobs;
CREATE POLICY "executor_jobs_service_access" ON public.executor_jobs
    FOR ALL TO service_role
    USING (true);

-- Integration health policies
DROP POLICY IF EXISTS "integration_health_company_access" ON public.integration_health;
CREATE POLICY "integration_health_company_access" ON public.integration_health
    FOR ALL TO authenticated
    USING (
        company_application_id IN (
            SELECT id FROM public.company_applications
            WHERE company_id IN (
                SELECT company_id FROM company_users WHERE user_id = auth.uid()
            )
        )
    );

-- Automation schedules policies
DROP POLICY IF EXISTS "automation_schedules_company_access" ON public.automation_schedules;
CREATE POLICY "automation_schedules_company_access" ON public.automation_schedules
    FOR ALL TO authenticated
    USING (
        company_application_id IN (
            SELECT id FROM public.company_applications
            WHERE company_id IN (
                SELECT company_id FROM company_users WHERE user_id = auth.uid()
            )
        )
    );

-- ============================================================================
-- STEP 6: Grant Service Role Permissions
-- ============================================================================

-- Grant necessary permissions to service role for executor operations
GRANT ALL ON TABLE public.executor_nodes TO service_role;
GRANT ALL ON TABLE public.executor_jobs TO service_role;
GRANT ALL ON TABLE public.integration_health TO service_role;
GRANT ALL ON TABLE public.automation_schedules TO service_role;

-- Grant sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================================
-- STEP 7: Add Comments for Documentation
-- ============================================================================

COMMENT ON TABLE public.executor_nodes IS 'Tracks executor server instances for distributed job processing';
COMMENT ON TABLE public.executor_jobs IS 'Job queue table integrated with BullMQ for reliable job processing';
COMMENT ON TABLE public.integration_health IS 'Monitors health and performance of third-party integrations';
COMMENT ON TABLE public.automation_schedules IS 'Enhanced scheduling system with timezone and execution window support';

COMMENT ON COLUMN public.executor_jobs.job_id IS 'Corresponds to BullMQ job ID for tracking';
COMMENT ON COLUMN public.executor_jobs.priority IS 'Higher numbers have higher priority (0-100 typical range)';

COMMIT;
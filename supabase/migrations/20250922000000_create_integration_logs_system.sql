-- Create Universal Integration Logs System
-- This migration adds comprehensive logging support for all integrations running in executor server

BEGIN;

-- ============================================================================
-- STEP 1: Create Integration Logs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.integration_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Company and application context
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_application_id uuid NOT NULL REFERENCES public.company_applications(id) ON DELETE CASCADE,
    execution_run_id uuid REFERENCES public.execution_runs(id) ON DELETE SET NULL,
    -- executor_job_id removed as executor_jobs table no longer exists

    -- Log classification
    log_level text NOT NULL CHECK (log_level IN ('debug', 'info', 'warn', 'error', 'fatal')),
    log_source text NOT NULL CHECK (log_source IN ('integration', 'docker', 'executor', 'api', 'system')),
    log_category text, -- e.g., 'api_call', 'data_processing', 'authentication', 'validation'

    -- Core content
    message text NOT NULL,
    structured_data jsonb DEFAULT '{}', -- Flexible structure for integration-specific data

    -- Integration context
    integration_name text NOT NULL, -- e.g., 'google-ads', 'facebook-ads', 'linkedin-ads'
    integration_version text,
    container_id text, -- Docker container ID if applicable

    -- Timing and sequencing
    logged_at timestamptz NOT NULL DEFAULT now(),
    log_sequence integer DEFAULT 0, -- For ordering logs within same execution

    -- Performance and metadata
    execution_time_ms integer,
    memory_usage_mb numeric(10,2),
    metadata jsonb DEFAULT '{}', -- Additional integration-specific metadata

    -- Audit fields
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- STEP 2: Enhance Existing Tables
-- ============================================================================

-- Add logs summary to execution_runs table
ALTER TABLE public.execution_runs
ADD COLUMN IF NOT EXISTS logs_summary jsonb DEFAULT '{}';

-- executor_jobs table no longer exists, so skipping log tracking columns

-- ============================================================================
-- STEP 3: Create Performance Indexes
-- ============================================================================

-- Primary access patterns
CREATE INDEX IF NOT EXISTS idx_integration_logs_company_time
ON public.integration_logs(company_id, logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_integration_logs_company_app_time
ON public.integration_logs(company_application_id, logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_integration_logs_execution_seq
ON public.integration_logs(execution_run_id, log_sequence)
WHERE execution_run_id IS NOT NULL;

-- executor_job_id index removed as executor_jobs table no longer exists

-- Filtering and search patterns
CREATE INDEX IF NOT EXISTS idx_integration_logs_level_time
ON public.integration_logs(log_level, logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_integration_logs_source_time
ON public.integration_logs(log_source, logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_integration_logs_integration_time
ON public.integration_logs(integration_name, logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_integration_logs_category_time
ON public.integration_logs(log_category, logged_at DESC)
WHERE log_category IS NOT NULL;

-- JSONB search indexes
CREATE INDEX IF NOT EXISTS idx_integration_logs_structured_data
ON public.integration_logs USING gin(structured_data);

CREATE INDEX IF NOT EXISTS idx_integration_logs_metadata
ON public.integration_logs USING gin(metadata);

-- Full-text search on message
CREATE INDEX IF NOT EXISTS idx_integration_logs_message_search
ON public.integration_logs USING gin(to_tsvector('english', message));

-- ============================================================================
-- STEP 4: Create Helper Functions
-- ============================================================================

-- executor_jobs table no longer exists, so removing job statistics function

-- Function to update execution run log summary
CREATE OR REPLACE FUNCTION update_execution_logs_summary()
RETURNS trigger AS $$
DECLARE
    log_summary jsonb;
BEGIN
    -- Recalculate logs summary for the execution run
    IF TG_OP = 'INSERT' AND NEW.execution_run_id IS NOT NULL THEN
        SELECT jsonb_build_object(
            'total_logs', COUNT(*),
            'error_count', COUNT(*) FILTER (WHERE log_level IN ('error', 'fatal')),
            'warning_count', COUNT(*) FILTER (WHERE log_level = 'warn'),
            'info_count', COUNT(*) FILTER (WHERE log_level = 'info'),
            'debug_count', COUNT(*) FILTER (WHERE log_level = 'debug'),
            'last_log_at', MAX(logged_at),
            'log_sources', jsonb_object_agg(log_source, count(*)),
            'log_categories', jsonb_object_agg(COALESCE(log_category, 'uncategorized'), count(*))
        ) INTO log_summary
        FROM public.integration_logs
        WHERE execution_run_id = NEW.execution_run_id
        GROUP BY execution_run_id;

        UPDATE public.execution_runs
        SET logs_summary = log_summary
        WHERE id = NEW.execution_run_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get integration logs with filtering
CREATE OR REPLACE FUNCTION get_integration_logs(
    p_company_id uuid,
    p_integration_name text DEFAULT NULL,
    p_log_level text DEFAULT NULL,
    p_date_from timestamptz DEFAULT NULL,
    p_date_to timestamptz DEFAULT NULL,
    p_search_text text DEFAULT NULL,
    p_limit integer DEFAULT 100,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    log_level text,
    log_source text,
    log_category text,
    message text,
    structured_data jsonb,
    integration_name text,
    logged_at timestamptz,
    execution_run_id uuid,
    company_application_id uuid
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        il.id,
        il.log_level,
        il.log_source,
        il.log_category,
        il.message,
        il.structured_data,
        il.integration_name,
        il.logged_at,
        il.execution_run_id,
        il.company_application_id
    FROM public.integration_logs il
    WHERE il.company_id = p_company_id
      AND (p_integration_name IS NULL OR il.integration_name = p_integration_name)
      AND (p_log_level IS NULL OR il.log_level = p_log_level)
      AND (p_date_from IS NULL OR il.logged_at >= p_date_from)
      AND (p_date_to IS NULL OR il.logged_at <= p_date_to)
      AND (p_search_text IS NULL OR il.message ILIKE '%' || p_search_text || '%')
    ORDER BY il.logged_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 5: Create Triggers
-- ============================================================================

-- executor_jobs table no longer exists, so removing job statistics trigger

-- Trigger to update execution run summary
DROP TRIGGER IF EXISTS update_execution_logs_summary_trigger ON public.integration_logs;
CREATE TRIGGER update_execution_logs_summary_trigger
    AFTER INSERT ON public.integration_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_execution_logs_summary();

-- Update timestamps trigger
DROP TRIGGER IF EXISTS update_integration_logs_updated_at ON public.integration_logs;
CREATE TRIGGER update_integration_logs_updated_at
    BEFORE UPDATE ON public.integration_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 6: Enable RLS and Create Policies
-- ============================================================================

-- Enable RLS on integration_logs table
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to access their company's logs
DROP POLICY IF EXISTS "integration_logs_company_access" ON public.integration_logs;
CREATE POLICY "integration_logs_company_access" ON public.integration_logs
    FOR ALL TO authenticated
    USING (
        company_id IN (
            SELECT company_id FROM public.company_users
            WHERE user_id = auth.uid()
        )
    );

-- Policy for service role (executor server) to insert logs
DROP POLICY IF EXISTS "integration_logs_service_access" ON public.integration_logs;
CREATE POLICY "integration_logs_service_access" ON public.integration_logs
    FOR ALL TO service_role
    USING (true);

-- Policy for read-only access to logs via company applications
DROP POLICY IF EXISTS "integration_logs_read_via_company_apps" ON public.integration_logs;
CREATE POLICY "integration_logs_read_via_company_apps" ON public.integration_logs
    FOR SELECT TO authenticated
    USING (
        company_application_id IN (
            SELECT ca.id FROM public.company_applications ca
            JOIN public.company_users cu ON ca.company_id = cu.company_id
            WHERE cu.user_id = auth.uid()
        )
    );

-- ============================================================================
-- STEP 7: Grant Permissions
-- ============================================================================

-- Grant permissions to service role for executor operations
GRANT ALL ON TABLE public.integration_logs TO service_role;
GRANT EXECUTE ON FUNCTION get_integration_logs(uuid, text, text, timestamptz, timestamptz, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_integration_logs(uuid, text, text, timestamptz, timestamptz, text, integer, integer) TO service_role;

-- Grant sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================================
-- STEP 8: Add Comments for Documentation
-- ============================================================================

COMMENT ON TABLE public.integration_logs IS 'Universal logging table for all integration executions from executor server';
COMMENT ON COLUMN public.integration_logs.structured_data IS 'Flexible JSONB field for integration-specific log data structures';
COMMENT ON COLUMN public.integration_logs.log_category IS 'Categorizes logs for filtering (api_call, data_processing, authentication, etc.)';
COMMENT ON COLUMN public.integration_logs.log_sequence IS 'Sequential ordering of logs within the same execution run';
COMMENT ON COLUMN public.integration_logs.metadata IS 'Additional integration-specific metadata and context';

COMMENT ON FUNCTION get_integration_logs IS 'Helper function to query integration logs with common filtering options';

-- ============================================================================
-- STEP 9: Create Initial Log Categories Enum (Optional)
-- ============================================================================

-- Create a reference table for common log categories
CREATE TABLE IF NOT EXISTS public.log_categories (
    category text PRIMARY KEY,
    description text,
    integration_types text[], -- Which integrations use this category
    created_at timestamptz DEFAULT now()
);

-- Insert common log categories
INSERT INTO public.log_categories (category, description, integration_types) VALUES
('api_call', 'External API requests and responses', ARRAY['google-ads', 'facebook-ads', 'linkedin-ads']),
('data_processing', 'Data transformation and processing steps', ARRAY['*']),
('authentication', 'Authentication and authorization events', ARRAY['*']),
('validation', 'Data validation and schema checking', ARRAY['*']),
('error_handling', 'Error recovery and retry logic', ARRAY['*']),
('performance', 'Performance metrics and benchmarks', ARRAY['*']),
('docker_output', 'Raw Docker container output', ARRAY['*']),
('integration_startup', 'Integration initialization and setup', ARRAY['*']),
('data_sync', 'Data synchronization operations', ARRAY['*']),
('cleanup', 'Resource cleanup and finalization', ARRAY['*'])
ON CONFLICT (category) DO NOTHING;

-- Enable RLS on log_categories
ALTER TABLE public.log_categories ENABLE ROW LEVEL SECURITY;

-- Policy for reading log categories
DROP POLICY IF EXISTS "log_categories_read_access" ON public.log_categories;
CREATE POLICY "log_categories_read_access" ON public.log_categories
    FOR SELECT TO authenticated
    USING (true);

GRANT SELECT ON TABLE public.log_categories TO authenticated;
GRANT ALL ON TABLE public.log_categories TO service_role;

COMMIT;
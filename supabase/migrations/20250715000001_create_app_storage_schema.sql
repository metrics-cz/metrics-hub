-- Create database schema for app storage and execution system
-- This migration creates tables to support app code storage, builds, and execution tracking

-- Create app_storage table to track app files and versions
CREATE TABLE public.app_storage (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    file_path text NOT NULL, -- Path in storage bucket (e.g., "app_123/manifest.json")
    file_type text NOT NULL, -- Type of file (manifest, source, build, asset)
    file_size bigint NOT NULL, -- File size in bytes
    version text NOT NULL DEFAULT '1.0.0', -- App version
    checksum text, -- File checksum for integrity
    metadata jsonb DEFAULT '{}', -- Additional metadata
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Ensure unique file paths per app
    CONSTRAINT unique_app_file_path UNIQUE (app_id, file_path),
    
    -- Validate file types
    CONSTRAINT valid_file_type CHECK (
        file_type IN ('manifest', 'source', 'build', 'asset', 'dist', 'config')
    )
);

-- Create app_builds table to store build metadata
CREATE TABLE public.app_builds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    build_version text NOT NULL, -- Build version (e.g., "v1.0.0-build.123")
    build_status text NOT NULL DEFAULT 'pending', -- Status of the build
    build_path text, -- Path to build artifacts in storage
    build_config jsonb DEFAULT '{}', -- Build configuration
    build_logs text, -- Build logs
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    
    -- Validate build status
    CONSTRAINT valid_build_status CHECK (
        build_status IN ('pending', 'building', 'success', 'failed', 'cancelled')
    )
);

-- Create app_runs table to track execution history
CREATE TABLE public.app_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    build_id uuid REFERENCES public.app_builds(id) ON DELETE SET NULL,
    run_type text NOT NULL, -- Type of run (manual, cron, webhook)
    status text NOT NULL DEFAULT 'pending', -- Execution status
    executor_id text, -- ID of the executor server that ran this
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    duration_ms integer, -- Execution duration in milliseconds
    logs_path text, -- Path to logs in storage
    output_path text, -- Path to output files in storage
    error_message text, -- Error message if failed
    metadata jsonb DEFAULT '{}', -- Additional run metadata
    
    -- Validate run type
    CONSTRAINT valid_run_type CHECK (
        run_type IN ('manual', 'cron', 'webhook', 'test')
    ),
    
    -- Validate status
    CONSTRAINT valid_run_status CHECK (
        status IN ('pending', 'running', 'success', 'failed', 'cancelled', 'timeout')
    )
);

-- Create app_outputs table to store execution results
CREATE TABLE public.app_outputs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id uuid NOT NULL REFERENCES public.app_runs(id) ON DELETE CASCADE,
    output_type text NOT NULL, -- Type of output (stdout, stderr, file, metric)
    output_name text, -- Name/identifier of the output
    output_data jsonb, -- Output data (for small outputs)
    output_path text, -- Path to output file in storage (for large outputs)
    file_size bigint, -- Size of output file
    created_at timestamp with time zone DEFAULT now(),
    
    -- Validate output type
    CONSTRAINT valid_output_type CHECK (
        output_type IN ('stdout', 'stderr', 'file', 'metric', 'result', 'error')
    )
);

-- Create app_cron_schedules table for scheduled executions
CREATE TABLE public.app_cron_schedules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    cron_expression text NOT NULL, -- Cron expression (e.g., "0 0 * * *")
    timezone text DEFAULT 'UTC', -- Timezone for schedule
    is_active boolean DEFAULT true, -- Whether schedule is active
    last_run_at timestamp with time zone, -- Last execution time
    next_run_at timestamp with time zone, -- Next scheduled execution
    last_run_id uuid REFERENCES public.app_runs(id) ON DELETE SET NULL,
    config jsonb DEFAULT '{}', -- Schedule configuration
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Ensure unique schedule per app per company
    CONSTRAINT unique_app_company_schedule UNIQUE (app_id, company_id)
);

-- Create app_permissions table for app-specific permissions
CREATE TABLE public.app_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    permission_type text NOT NULL, -- Type of permission
    permission_value text NOT NULL, -- Permission value/scope
    description text, -- Human-readable description
    is_required boolean DEFAULT false, -- Whether permission is required
    created_at timestamp with time zone DEFAULT now(),
    
    -- Validate permission types
    CONSTRAINT valid_permission_type CHECK (
        permission_type IN ('storage', 'network', 'database', 'api', 'system', 'custom')
    ),
    
    -- Ensure unique permission per app
    CONSTRAINT unique_app_permission UNIQUE (app_id, permission_type, permission_value)
);

-- Create indexes for better performance
CREATE INDEX idx_app_storage_app_id ON public.app_storage (app_id);
CREATE INDEX idx_app_storage_file_type ON public.app_storage (file_type);
CREATE INDEX idx_app_storage_version ON public.app_storage (version);

CREATE INDEX idx_app_builds_app_id ON public.app_builds (app_id);
CREATE INDEX idx_app_builds_status ON public.app_builds (build_status);
CREATE INDEX idx_app_builds_created_at ON public.app_builds (created_at DESC);

CREATE INDEX idx_app_runs_app_id ON public.app_runs (app_id);
CREATE INDEX idx_app_runs_company_id ON public.app_runs (company_id);
CREATE INDEX idx_app_runs_status ON public.app_runs (status);
CREATE INDEX idx_app_runs_run_type ON public.app_runs (run_type);
CREATE INDEX idx_app_runs_started_at ON public.app_runs (started_at DESC);

CREATE INDEX idx_app_outputs_run_id ON public.app_outputs (run_id);
CREATE INDEX idx_app_outputs_type ON public.app_outputs (output_type);

CREATE INDEX idx_app_cron_schedules_app_id ON public.app_cron_schedules (app_id);
CREATE INDEX idx_app_cron_schedules_company_id ON public.app_cron_schedules (company_id);
CREATE INDEX idx_app_cron_schedules_active ON public.app_cron_schedules (is_active);
CREATE INDEX idx_app_cron_schedules_next_run ON public.app_cron_schedules (next_run_at) WHERE is_active = true;

CREATE INDEX idx_app_permissions_app_id ON public.app_permissions (app_id);
CREATE INDEX idx_app_permissions_type ON public.app_permissions (permission_type);

-- Enable RLS on all tables
ALTER TABLE public.app_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_cron_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_permissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for app_storage
CREATE POLICY "Companies can view app storage for their assigned apps"
ON public.app_storage FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.company_applications ca
        JOIN public.company_users cu ON ca.company_id = cu.company_id
        WHERE cu.user_id = auth.uid()
        AND ca.application_id = app_storage.app_id
        AND ca.is_active = true
    )
);

CREATE POLICY "Superadmins can manage all app storage"
ON public.app_storage FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.user_id = auth.uid()
        AND cu.role = 'superadmin'
    )
);

-- Create RLS policies for app_builds
CREATE POLICY "Companies can view builds for their assigned apps"
ON public.app_builds FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.company_applications ca
        JOIN public.company_users cu ON ca.company_id = cu.company_id
        WHERE cu.user_id = auth.uid()
        AND ca.application_id = app_builds.app_id
        AND ca.is_active = true
    )
);

CREATE POLICY "Superadmins can manage all app builds"
ON public.app_builds FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.user_id = auth.uid()
        AND cu.role = 'superadmin'
    )
);

-- Create RLS policies for app_runs
CREATE POLICY "Companies can view runs for their assigned apps"
ON public.app_runs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.user_id = auth.uid()
        AND cu.company_id = app_runs.company_id
    )
);

CREATE POLICY "Superadmins can manage all app runs"
ON public.app_runs FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.user_id = auth.uid()
        AND cu.role = 'superadmin'
    )
);

-- Create RLS policies for app_outputs
CREATE POLICY "Companies can view outputs for their runs"
ON public.app_outputs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.app_runs ar
        JOIN public.company_users cu ON ar.company_id = cu.company_id
        WHERE cu.user_id = auth.uid()
        AND ar.id = app_outputs.run_id
    )
);

CREATE POLICY "Superadmins can manage all app outputs"
ON public.app_outputs FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.user_id = auth.uid()
        AND cu.role = 'superadmin'
    )
);

-- Create RLS policies for app_cron_schedules
CREATE POLICY "Companies can manage their cron schedules"
ON public.app_cron_schedules FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.user_id = auth.uid()
        AND cu.company_id = app_cron_schedules.company_id
        AND cu.role IN ('owner', 'admin')
    )
);

CREATE POLICY "Companies can view their cron schedules"
ON public.app_cron_schedules FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.user_id = auth.uid()
        AND cu.company_id = app_cron_schedules.company_id
    )
);

CREATE POLICY "Superadmins can manage all cron schedules"
ON public.app_cron_schedules FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.user_id = auth.uid()
        AND cu.role = 'superadmin'
    )
);

-- Create RLS policies for app_permissions
CREATE POLICY "Companies can view permissions for their assigned apps"
ON public.app_permissions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.company_applications ca
        JOIN public.company_users cu ON ca.company_id = cu.company_id
        WHERE cu.user_id = auth.uid()
        AND ca.application_id = app_permissions.app_id
        AND ca.is_active = true
    )
);

CREATE POLICY "Superadmins can manage all app permissions"
ON public.app_permissions FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.user_id = auth.uid()
        AND cu.role = 'superadmin'
    )
);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_app_storage_updated_at
    BEFORE UPDATE ON public.app_storage
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_app_cron_schedules_updated_at
    BEFORE UPDATE ON public.app_cron_schedules
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
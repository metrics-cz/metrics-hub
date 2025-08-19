-- Create unified Apps & Integrations system
-- This migration transforms the existing schema to support both frontend Apps and backend Integrations

-- Step 1: Create secrets table for secure credential storage
CREATE TABLE public.secrets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    key text NOT NULL, -- e.g., "google_ads_token", "slack_webhook"
    value text NOT NULL, -- encrypted credential value
    app_id uuid REFERENCES public.applications(id) ON DELETE CASCADE, -- optional: app-specific secret
    description text, -- human-readable description
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_used_at timestamp with time zone,
    
    -- Ensure unique keys per company (unless app-specific)
    CONSTRAINT unique_company_key UNIQUE (company_id, key),
    
    -- Validate key format
    CONSTRAINT valid_key_format CHECK (key ~ '^[a-z0-9_]+$')
);

-- Step 2: Extend applications table to support both Apps and Integrations
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS app_type text DEFAULT 'app' CHECK (app_type IN ('app', 'integration', 'both')),
ADD COLUMN IF NOT EXISTS has_frontend boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_backend boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS execution_type text DEFAULT 'iframe' CHECK (execution_type IN ('iframe', 'server', 'both')),
ADD COLUMN IF NOT EXISTS storage_path text, -- Path in storage bucket
ADD COLUMN IF NOT EXISTS manifest_data jsonb DEFAULT '{}', -- Manifest configuration
ADD COLUMN IF NOT EXISTS required_secrets text[] DEFAULT '{}', -- List of required secret keys
ADD COLUMN IF NOT EXISTS cron_schedule text, -- Cron expression for integrations
ADD COLUMN IF NOT EXISTS timeout_seconds integer DEFAULT 300, -- Execution timeout
ADD COLUMN IF NOT EXISTS memory_limit text DEFAULT '256MB', -- Memory limit
ADD COLUMN IF NOT EXISTS last_run_at timestamp with time zone, -- Last execution time
ADD COLUMN IF NOT EXISTS last_run_status text; -- Last execution status

-- Step 3: Rename app_runs to execution_runs for unified tracking
ALTER TABLE public.app_runs RENAME TO execution_runs;

-- Update foreign key references
ALTER TABLE public.app_outputs 
DROP CONSTRAINT IF EXISTS app_outputs_run_id_fkey,
ADD CONSTRAINT app_outputs_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.execution_runs(id) ON DELETE CASCADE;

ALTER TABLE public.app_cron_schedules 
DROP CONSTRAINT IF EXISTS app_cron_schedules_last_run_id_fkey,
ADD CONSTRAINT app_cron_schedules_last_run_id_fkey FOREIGN KEY (last_run_id) REFERENCES public.execution_runs(id) ON DELETE SET NULL;

-- Step 4: Update execution_runs table to handle both Apps and Integrations
ALTER TABLE public.execution_runs 
ADD COLUMN IF NOT EXISTS execution_type text DEFAULT 'server' CHECK (execution_type IN ('iframe', 'server')),
ADD COLUMN IF NOT EXISTS triggered_by text DEFAULT 'manual' CHECK (triggered_by IN ('manual', 'cron', 'webhook', 'user')),
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL; -- User who triggered execution

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_secrets_company_id ON public.secrets (company_id);
CREATE INDEX IF NOT EXISTS idx_secrets_app_id ON public.secrets (app_id);
CREATE INDEX IF NOT EXISTS idx_secrets_key ON public.secrets (key);
CREATE INDEX IF NOT EXISTS idx_secrets_last_used ON public.secrets (last_used_at);

CREATE INDEX IF NOT EXISTS idx_applications_app_type ON public.applications (app_type);
CREATE INDEX IF NOT EXISTS idx_applications_has_frontend ON public.applications (has_frontend);
CREATE INDEX IF NOT EXISTS idx_applications_has_backend ON public.applications (has_backend);
CREATE INDEX IF NOT EXISTS idx_applications_execution_type ON public.applications (execution_type);
CREATE INDEX IF NOT EXISTS idx_applications_cron_schedule ON public.applications (cron_schedule) WHERE cron_schedule IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_applications_last_run_at ON public.applications (last_run_at);

CREATE INDEX IF NOT EXISTS idx_execution_runs_execution_type ON public.execution_runs (execution_type);
CREATE INDEX IF NOT EXISTS idx_execution_runs_triggered_by ON public.execution_runs (triggered_by);
CREATE INDEX IF NOT EXISTS idx_execution_runs_user_id ON public.execution_runs (user_id);

-- Step 6: Enable RLS on secrets table
ALTER TABLE public.secrets ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies for secrets
CREATE POLICY "Companies can manage their own secrets"
ON public.secrets FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.user_id = auth.uid()
        AND cu.company_id = secrets.company_id
        AND cu.role IN ('owner', 'admin')
    )
);

CREATE POLICY "Companies can view their own secrets"
ON public.secrets FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.user_id = auth.uid()
        AND cu.company_id = secrets.company_id
    )
);

CREATE POLICY "Superadmins can manage all secrets"
ON public.secrets FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.user_id = auth.uid()
        AND cu.role = 'superadmin'
    )
);

-- Step 8: Update existing applications to have proper types
UPDATE public.applications 
SET 
    app_type = 'app',
    has_frontend = true,
    has_backend = false,
    execution_type = 'iframe',
    storage_path = 'apps/' || id::text || '/'
WHERE app_type IS NULL;

-- Step 9: Create trigger for automatic timestamp updates on secrets
CREATE TRIGGER update_secrets_updated_at
    BEFORE UPDATE ON public.secrets
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Step 10: Update last_used_at when secrets are accessed
CREATE OR REPLACE FUNCTION update_secret_last_used()
RETURNS TRIGGER AS $$
BEGIN
    -- This would be called when a secret is accessed
    -- For now, it's just a placeholder for future implementation
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 11: Add sample secret types for common integrations
INSERT INTO public.secrets (company_id, key, value, description, created_by)
SELECT 
    c.id,
    'sample_api_key',
    'encrypted_placeholder_value',
    'Sample API key for demonstration',
    c.owner_uid
FROM public.companies c
WHERE c.id = (SELECT id FROM public.companies LIMIT 1)
ON CONFLICT (company_id, key) DO NOTHING;

-- Step 12: Create function to encrypt/decrypt secrets (placeholder)
CREATE OR REPLACE FUNCTION encrypt_secret(secret_value text)
RETURNS text AS $$
BEGIN
    -- This is a placeholder - in production, use proper encryption
    -- Consider using pgcrypto or application-level encryption
    RETURN encode(secret_value::bytea, 'base64');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrypt_secret(encrypted_value text)
RETURNS text AS $$
BEGIN
    -- This is a placeholder - in production, use proper decryption
    -- Consider using pgcrypto or application-level decryption
    RETURN decode(encrypted_value, 'base64')::text;
END;
$$ LANGUAGE plpgsql;

-- Step 13: Add comments for documentation
COMMENT ON TABLE public.secrets IS 'Stores encrypted credentials and API keys for apps and integrations';
COMMENT ON COLUMN public.secrets.key IS 'Unique identifier for the secret (e.g., google_ads_token)';
COMMENT ON COLUMN public.secrets.value IS 'Encrypted secret value';
COMMENT ON COLUMN public.secrets.app_id IS 'Optional: Associates secret with specific app/integration';

COMMENT ON COLUMN public.applications.app_type IS 'Type of application: app (frontend), integration (backend), or both';
COMMENT ON COLUMN public.applications.has_frontend IS 'Whether app has frontend components (for iframe embedding)';
COMMENT ON COLUMN public.applications.has_backend IS 'Whether app has backend components (for server execution)';
COMMENT ON COLUMN public.applications.execution_type IS 'How the app is executed: iframe, server, or both';
COMMENT ON COLUMN public.applications.storage_path IS 'Path to app files in storage bucket';
COMMENT ON COLUMN public.applications.required_secrets IS 'List of secret keys required by this app';
COMMENT ON COLUMN public.applications.cron_schedule IS 'Cron expression for scheduled execution (integrations only)';

COMMENT ON TABLE public.execution_runs IS 'Tracks execution history for both apps and integrations';
COMMENT ON COLUMN public.execution_runs.execution_type IS 'Type of execution: iframe (for apps) or server (for integrations)';
COMMENT ON COLUMN public.execution_runs.triggered_by IS 'What triggered the execution: manual, cron, webhook, or user';

-- Step 14: Grant necessary permissions
GRANT SELECT ON TABLE public.secrets TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.secrets TO authenticated;
GRANT SELECT ON TABLE public.execution_runs TO authenticated;
GRANT INSERT, UPDATE ON TABLE public.execution_runs TO authenticated;
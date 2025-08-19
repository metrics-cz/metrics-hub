-- Add missing columns to applications table for executor server support
-- This migration adds all the columns needed for the unified integrations/automations system

BEGIN;

-- Add missing columns to applications table
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS app_type text DEFAULT 'app' CHECK (app_type IN ('app', 'integration', 'both')),
ADD COLUMN IF NOT EXISTS has_frontend boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_backend boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS execution_type text DEFAULT 'iframe' CHECK (execution_type IN ('iframe', 'server', 'both')),
ADD COLUMN IF NOT EXISTS storage_path text,
ADD COLUMN IF NOT EXISTS manifest_data jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS required_secrets text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS cron_schedule text,
ADD COLUMN IF NOT EXISTS timeout_seconds integer DEFAULT 300,
ADD COLUMN IF NOT EXISTS memory_limit text DEFAULT '256MB',
ADD COLUMN IF NOT EXISTS last_run_at timestamptz,
ADD COLUMN IF NOT EXISTS last_run_status text,
ADD COLUMN IF NOT EXISTS integration_provider text,
ADD COLUMN IF NOT EXISTS auth_type text DEFAULT 'oauth2' CHECK (auth_type IN ('oauth2', 'api_key', 'webhook', 'basic')),
ADD COLUMN IF NOT EXISTS auth_config jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS supported_features jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS trigger_type text DEFAULT 'schedule' CHECK (trigger_type IN ('schedule', 'webhook', 'manual', 'event')),
ADD COLUMN IF NOT EXISTS supported_frequencies jsonb DEFAULT '["1h", "6h", "24h"]',
ADD COLUMN IF NOT EXISTS pricing_model_executor text DEFAULT 'frequency' CHECK (pricing_model_executor IN ('frequency', 'flat', 'usage')),
ADD COLUMN IF NOT EXISTS pricing_config jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS default_config jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS health_check_url text,
ADD COLUMN IF NOT EXISTS webhook_url text;

-- Update existing applications to have proper app_type
UPDATE public.applications 
SET 
    app_type = 'app',
    has_frontend = true,
    has_backend = false,
    execution_type = 'iframe',
    storage_path = 'apps/' || id::text || '/'
WHERE app_type IS NULL;

-- Log success (commented as it's outside transaction)
-- RAISE NOTICE 'Successfully added missing columns to applications table';

COMMIT;
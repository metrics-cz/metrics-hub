-- Create separate tables for integrations and automations
-- This migration separates the current mixed applications table into proper entities

-- Create integrations table for third-party service connections
CREATE TABLE IF NOT EXISTS "public"."integrations" (
    "id" UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    "integration_key" TEXT NOT NULL UNIQUE, -- e.g., 'google_ads', 'discord', 'slack'
    "name" TEXT NOT NULL, -- Display name (e.g., "Google Ads", "Discord")
    "description" TEXT,
    "icon_url" TEXT,
    "provider" TEXT, -- e.g., 'google', 'microsoft', 'slack'
    "auth_type" TEXT DEFAULT 'oauth2', -- 'oauth2', 'api_key', 'webhook'
    "auth_config" JSONB DEFAULT '{}', -- OAuth endpoints, scopes, etc.
    "supported_features" JSONB DEFAULT '[]', -- What this integration can do
    "documentation_url" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create company_integrations table for company-specific integration instances
CREATE TABLE IF NOT EXISTS "public"."company_integrations" (
    "id" UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    "company_id" UUID NOT NULL REFERENCES "public"."companies"("id") ON DELETE CASCADE,
    "integration_id" UUID NOT NULL REFERENCES "public"."integrations"("id") ON DELETE CASCADE,
    "name" TEXT, -- Optional custom name override
    "status" TEXT DEFAULT 'active', -- 'active', 'inactive', 'error', 'pending'
    "connected_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "connected_by" UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    "auth_data" JSONB DEFAULT '{}', -- OAuth tokens, API keys, etc. (encrypted)
    "config" JSONB DEFAULT '{}', -- Service-specific config (e.g., MCC ID, channels)
    "last_sync_at" TIMESTAMPTZ,
    "sync_status" TEXT DEFAULT 'pending', -- 'pending', 'syncing', 'success', 'error'
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, integration_id)
);

-- Create automations table for workflow definitions
CREATE TABLE IF NOT EXISTS "public"."automations" (
    "id" UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    "script_key" TEXT NOT NULL UNIQUE, -- e.g., 'gads_guard', 'facebook_monitor'
    "name" TEXT NOT NULL, -- "Google Ads Guard", "Facebook Monitor"
    "description" TEXT,
    "icon_url" TEXT,
    "category" TEXT DEFAULT 'monitoring', -- 'monitoring', 'optimization', 'reporting'
    "trigger_type" TEXT DEFAULT 'schedule', -- 'schedule', 'webhook', 'manual'
    "supported_frequencies" JSONB DEFAULT '["24h"]', -- Available scheduling options
    "supported_metrics" JSONB DEFAULT '[]', -- Configurable metrics
    "pricing_model" TEXT DEFAULT 'frequency', -- 'frequency', 'flat', 'usage'
    "pricing_config" JSONB DEFAULT '{}', -- Pricing tiers by frequency/usage
    "default_config" JSONB DEFAULT '{}', -- Default settings template
    "documentation_url" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create company_automations table for company-specific automation instances
CREATE TABLE IF NOT EXISTS "public"."company_automations" (
    "id" UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    "company_id" UUID NOT NULL REFERENCES "public"."companies"("id") ON DELETE CASCADE,
    "automation_id" UUID NOT NULL REFERENCES "public"."automations"("id") ON DELETE CASCADE,
    "integration_id" UUID REFERENCES "public"."company_integrations"("id") ON DELETE SET NULL, -- Optional: which integration powers this
    "name" TEXT, -- Optional custom name override
    "is_active" BOOLEAN DEFAULT false,
    "frequency" TEXT DEFAULT '24h', -- How often it runs
    "metrics_watched" JSONB DEFAULT '[]', -- [{ metric: "clicks", drop: 80 }, ...]
    "period_days" INTEGER DEFAULT 7, -- Lookback window
    "price_per_month" NUMERIC(10,2) DEFAULT 0, -- Based on frequency
    "notification_channels" JSONB DEFAULT '{}', -- { email: "...", slack_webhook: "...", ... }
    "config" JSONB DEFAULT '{}', -- Automation-specific configuration
    "last_run_at" TIMESTAMPTZ,
    "next_run_at" TIMESTAMPTZ,
    "run_count" INTEGER DEFAULT 0,
    "success_count" INTEGER DEFAULT 0,
    "error_count" INTEGER DEFAULT 0,
    "last_error_message" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(company_id, automation_id)
);

-- Create automation_runs table for execution tracking
CREATE TABLE IF NOT EXISTS "public"."automation_runs" (
    "id" UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    "company_automation_id" UUID NOT NULL REFERENCES "public"."company_automations"("id") ON DELETE CASCADE,
    "status" TEXT NOT NULL, -- 'running', 'success', 'error', 'cancelled'
    "started_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,
    "duration_ms" INTEGER,
    "results" JSONB DEFAULT '{}', -- Execution results, metrics found, actions taken
    "error_message" TEXT,
    "logs" JSONB DEFAULT '[]', -- Step-by-step execution log
    "triggered_by" TEXT DEFAULT 'schedule', -- 'schedule', 'manual', 'webhook'
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "idx_company_integrations_company" ON "public"."company_integrations"("company_id");
CREATE INDEX IF NOT EXISTS "idx_company_integrations_integration" ON "public"."company_integrations"("integration_id");
CREATE INDEX IF NOT EXISTS "idx_company_integrations_status" ON "public"."company_integrations"("status");

CREATE INDEX IF NOT EXISTS "idx_company_automations_company" ON "public"."company_automations"("company_id");
CREATE INDEX IF NOT EXISTS "idx_company_automations_automation" ON "public"."company_automations"("automation_id");
CREATE INDEX IF NOT EXISTS "idx_company_automations_active" ON "public"."company_automations"("is_active");
CREATE INDEX IF NOT EXISTS "idx_company_automations_next_run" ON "public"."company_automations"("next_run_at") WHERE "is_active" = true;

CREATE INDEX IF NOT EXISTS "idx_automation_runs_company_automation" ON "public"."automation_runs"("company_automation_id");
CREATE INDEX IF NOT EXISTS "idx_automation_runs_status" ON "public"."automation_runs"("status");
CREATE INDEX IF NOT EXISTS "idx_automation_runs_started" ON "public"."automation_runs"("started_at");

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_integrations_updated_at 
    BEFORE UPDATE ON "public"."integrations" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_integrations_updated_at 
    BEFORE UPDATE ON "public"."company_integrations" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automations_updated_at 
    BEFORE UPDATE ON "public"."automations" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_automations_updated_at 
    BEFORE UPDATE ON "public"."company_automations" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies for security
ALTER TABLE "public"."integrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."company_integrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."automations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."company_automations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."automation_runs" ENABLE ROW LEVEL SECURITY;

-- Integrations are publicly readable (like applications)
CREATE POLICY "integrations_public_read" ON "public"."integrations"
    FOR SELECT TO authenticated USING (true);

-- Users can only see their company's integrations
CREATE POLICY "company_integrations_company_access" ON "public"."company_integrations"
    FOR ALL TO authenticated
    USING (
        company_id IN (
            SELECT company_id 
            FROM company_users 
            WHERE user_id = auth.uid()
        )
    );

-- Automations are publicly readable (like applications)
CREATE POLICY "automations_public_read" ON "public"."automations"
    FOR SELECT TO authenticated USING (true);

-- Users can only see their company's automations
CREATE POLICY "company_automations_company_access" ON "public"."company_automations"
    FOR ALL TO authenticated
    USING (
        company_id IN (
            SELECT company_id 
            FROM company_users 
            WHERE user_id = auth.uid()
        )
    );

-- Users can only see their company's automation runs
CREATE POLICY "automation_runs_company_access" ON "public"."automation_runs"
    FOR ALL TO authenticated
    USING (
        company_automation_id IN (
            SELECT id 
            FROM company_automations 
            WHERE company_id IN (
                SELECT company_id 
                FROM company_users 
                WHERE user_id = auth.uid()
            )
        )
    );
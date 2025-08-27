-- Create connections system for OAuth and API service integrations
-- This is separate from applications/integrations which are marketplace apps

-- Create connections table for service definitions (Google, Slack, etc.)
CREATE TABLE IF NOT EXISTS "public"."connections" (
    "id" UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    "connection_key" TEXT NOT NULL UNIQUE, -- 'google', 'slack', 'discord', etc.
    "name" TEXT NOT NULL, -- Display name (e.g., "Google Services", "Slack")
    "description" TEXT,
    "icon_url" TEXT,
    "provider" TEXT, -- e.g., 'google', 'microsoft', 'slack'
    "auth_type" TEXT NOT NULL DEFAULT 'oauth2', -- 'oauth2', 'api_key', 'webhook'
    "auth_config" JSONB DEFAULT '{}', -- OAuth endpoints, scopes, etc.
    "supported_features" JSONB DEFAULT '[]', -- What this connection enables
    "documentation_url" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create company_connections table for company-specific connection instances
CREATE TABLE IF NOT EXISTS "public"."company_connections" (
    "id" UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    "company_id" UUID NOT NULL REFERENCES "public"."companies"("id") ON DELETE CASCADE,
    "connection_id" UUID NOT NULL REFERENCES "public"."connections"("id") ON DELETE CASCADE,
    "name" TEXT, -- Optional custom name override
    "status" TEXT DEFAULT 'connected', -- 'connected', 'disconnected', 'error', 'pending'
    "connected_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "connected_by" UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    "config" JSONB DEFAULT '{}', -- Connection-specific config (e.g., selected scopes, channels)
    "last_sync_at" TIMESTAMPTZ,
    "sync_status" TEXT DEFAULT 'pending', -- 'pending', 'syncing', 'success', 'error'
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, connection_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "idx_company_connections_company" ON "public"."company_connections"("company_id");
CREATE INDEX IF NOT EXISTS "idx_company_connections_connection" ON "public"."company_connections"("connection_id");
CREATE INDEX IF NOT EXISTS "idx_company_connections_status" ON "public"."company_connections"("status");

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_connections_updated_at 
    BEFORE UPDATE ON "public"."connections" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_connections_updated_at 
    BEFORE UPDATE ON "public"."company_connections" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies for security
ALTER TABLE "public"."connections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."company_connections" ENABLE ROW LEVEL SECURITY;

-- Connections are publicly readable (like applications)
CREATE POLICY "connections_public_read" ON "public"."connections"
    FOR SELECT TO authenticated USING (true);

-- Users can only see their company's connections
CREATE POLICY "company_connections_company_access" ON "public"."company_connections"
    FOR ALL TO authenticated
    USING (
        company_id IN (
            SELECT company_id 
            FROM company_users 
            WHERE user_id = auth.uid()
        )
    );

-- Insert Google connection definition
INSERT INTO "public"."connections" (
    "connection_key",
    "name", 
    "description",
    "icon_url",
    "provider",
    "auth_type",
    "auth_config",
    "supported_features",
    "documentation_url",
    "is_active"
) VALUES (
    'google',
    'Google Services',
    'OAuth connection to Google services providing access to Ads, Analytics, Sheets, Gmail, Search Console, YouTube, My Business, and Drive',
    'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/google.svg',
    'google',
    'oauth2',
    '{
        "auth_uri": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "scopes": [
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/adwords",
            "https://www.googleapis.com/auth/analytics.readonly",
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/webmasters.readonly",
            "https://www.googleapis.com/auth/youtube.readonly",
            "https://www.googleapis.com/auth/yt-analytics.readonly",
            "https://www.googleapis.com/auth/business.manage",
            "https://www.googleapis.com/auth/drive.readonly"
        ]
    }',
    '["ads", "analytics", "sheets", "gmail", "search_console", "youtube", "my_business", "drive", "oauth", "profile"]',
    'https://developers.google.com/identity/protocols/oauth2',
    true
) ON CONFLICT (connection_key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    auth_config = EXCLUDED.auth_config,
    supported_features = EXCLUDED.supported_features,
    updated_at = CURRENT_TIMESTAMP;

-- Add comments
COMMENT ON TABLE "public"."connections" IS 'Service connection definitions (Google, Slack, etc.) for OAuth and API integrations';
COMMENT ON TABLE "public"."company_connections" IS 'Company-specific instances of service connections with OAuth tokens stored in secrets table';
COMMENT ON COLUMN "public"."company_connections"."config" IS 'Connection-specific configuration (selected scopes, channels, etc.)';
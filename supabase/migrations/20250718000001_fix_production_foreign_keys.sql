-- Fix foreign key relationships for company_integrations table on correct production database
-- This ensures the table exists and has proper foreign key relationships

-- First, ensure the company_integrations table exists
CREATE TABLE IF NOT EXISTS "public"."company_integrations" (
    "id" UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    "company_id" UUID NOT NULL REFERENCES "public"."companies"("id") ON DELETE CASCADE,
    "integration_id" UUID NOT NULL REFERENCES "public"."integrations"("id") ON DELETE CASCADE,
    "name" TEXT,
    "status" TEXT DEFAULT 'active',
    "connected_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "connected_by" UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    "auth_data" JSONB DEFAULT '{}',
    "config" JSONB DEFAULT '{}',
    "last_sync_at" TIMESTAMPTZ,
    "sync_status" TEXT DEFAULT 'pending',
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "connected_by_user_id" UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    "last_sync" TIMESTAMPTZ,
    UNIQUE(company_id, integration_id)
);

-- Ensure the integrations table exists
CREATE TABLE IF NOT EXISTS "public"."integrations" (
    "id" UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    "integration_key" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon_url" TEXT,
    "provider" TEXT,
    "auth_type" TEXT DEFAULT 'oauth2',
    "auth_config" JSONB DEFAULT '{}',
    "supported_features" JSONB DEFAULT '[]',
    "documentation_url" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add connected_by_user_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'company_integrations' 
        AND column_name = 'connected_by_user_id'
    ) THEN
        ALTER TABLE public.company_integrations 
        ADD COLUMN connected_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
    
    -- Add last_sync column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'company_integrations' 
        AND column_name = 'last_sync'
    ) THEN
        ALTER TABLE public.company_integrations 
        ADD COLUMN last_sync TIMESTAMPTZ;
    END IF;
END $$;

-- Ensure proper indexes exist
CREATE INDEX IF NOT EXISTS idx_company_integrations_company_id ON public.company_integrations(company_id);
CREATE INDEX IF NOT EXISTS idx_company_integrations_integration_id ON public.company_integrations(integration_id);
CREATE INDEX IF NOT EXISTS idx_company_integrations_connected_by ON public.company_integrations(connected_by);
CREATE INDEX IF NOT EXISTS idx_company_integrations_connected_by_user_id ON public.company_integrations(connected_by_user_id);
CREATE INDEX IF NOT EXISTS idx_company_integrations_status ON public.company_integrations(status);
CREATE INDEX IF NOT EXISTS idx_company_integrations_sync_status ON public.company_integrations(sync_status);
CREATE INDEX IF NOT EXISTS idx_company_integrations_last_sync ON public.company_integrations(last_sync);
CREATE INDEX IF NOT EXISTS idx_company_integrations_connected_at ON public.company_integrations(connected_at);

-- Enable RLS
ALTER TABLE public.company_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for company_integrations
DROP POLICY IF EXISTS "Users can view their company integrations" ON public.company_integrations;
CREATE POLICY "Users can view their company integrations"
ON public.company_integrations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.user_id = auth.uid()
        AND cu.company_id = company_integrations.company_id
    )
);

DROP POLICY IF EXISTS "Users can manage their company integrations" ON public.company_integrations;
CREATE POLICY "Users can manage their company integrations"
ON public.company_integrations FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.user_id = auth.uid()
        AND cu.company_id = company_integrations.company_id
        AND cu.role IN ('owner', 'admin')
    )
);

-- Create RLS policy for integrations (publicly readable)
DROP POLICY IF EXISTS "Integrations are publicly readable" ON public.integrations;
CREATE POLICY "Integrations are publicly readable"
ON public.integrations FOR SELECT
TO authenticated
USING (is_active = true);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_integrations TO authenticated;
GRANT SELECT ON public.integrations TO authenticated;

-- Add constraint for sync_status validation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_sync_status'
        AND conrelid = 'public.company_integrations'::regclass
    ) THEN
        ALTER TABLE public.company_integrations 
        ADD CONSTRAINT chk_sync_status 
        CHECK (sync_status IN ('pending', 'syncing', 'success', 'error'));
    END IF;
END $$;

-- Create a function to refresh PostgREST schema cache
CREATE OR REPLACE FUNCTION public.refresh_schema_cache()
RETURNS void AS $$
BEGIN
    NOTIFY pgrst, 'reload schema';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.refresh_schema_cache() TO authenticated;

-- Refresh the schema cache
SELECT public.refresh_schema_cache();

-- Insert Google integration if it doesn't exist
INSERT INTO public.integrations (integration_key, name, description, provider, auth_type, auth_config, supported_features)
VALUES (
    'google',
    'Google',
    'Google services integration including Google Ads, Analytics, and more',
    'google',
    'oauth2',
    '{
        "client_id": "351772423524-4h9fd3qr3hf0bmfbdmns80ganec17ipe.apps.googleusercontent.com",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "scopes": ["openid", "email", "profile"]
    }',
    '["google_ads", "google_analytics", "google_drive"]'
) ON CONFLICT (integration_key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    auth_config = EXCLUDED.auth_config,
    supported_features = EXCLUDED.supported_features,
    updated_at = CURRENT_TIMESTAMP;
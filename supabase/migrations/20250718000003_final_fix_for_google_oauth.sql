-- Final fix for Google OAuth integration
-- This migration ensures the Google OAuth integration works properly

-- Ensure the Google integration exists in the integrations table
INSERT INTO public.integrations (integration_key, name, description, provider, auth_type, auth_config, supported_features, icon_url)
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
        "scopes": ["openid", "email", "profile", "https://www.googleapis.com/auth/adwords"]
    }',
    '["google_ads", "google_analytics", "google_drive"]',
    'https://developers.google.com/identity/branding-guidelines/g-logo.png'
) ON CONFLICT (integration_key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    auth_config = EXCLUDED.auth_config,
    supported_features = EXCLUDED.supported_features,
    icon_url = EXCLUDED.icon_url,
    updated_at = CURRENT_TIMESTAMP;

-- Remove any problematic foreign key constraints that reference auth.users
ALTER TABLE public.company_integrations 
DROP CONSTRAINT IF EXISTS company_integrations_connected_by_fkey;

ALTER TABLE public.company_integrations 
DROP CONSTRAINT IF EXISTS company_integrations_connected_by_user_id_fkey;

-- The connected_by and connected_by_user_id columns will still work for storing user IDs
-- but won't have foreign key constraints that PostgREST can't handle across schemas

-- Add proper comments to document the relationship
COMMENT ON COLUMN public.company_integrations.connected_by IS 'References auth.users.id - user who connected the integration';
COMMENT ON COLUMN public.company_integrations.connected_by_user_id IS 'References auth.users.id - alternative user reference';

-- Ensure all necessary indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_company_integrations_connected_by ON public.company_integrations(connected_by);
CREATE INDEX IF NOT EXISTS idx_company_integrations_connected_by_user_id ON public.company_integrations(connected_by_user_id);

-- Create a function to get user info for integrations without using foreign keys
CREATE OR REPLACE FUNCTION public.get_company_integrations_with_user_info(p_company_id uuid)
RETURNS TABLE (
    id uuid,
    company_id uuid,
    integration_id uuid,
    name text,
    status text,
    connected_at timestamptz,
    connected_by uuid,
    connected_by_user_id uuid,
    auth_data jsonb,
    config jsonb,
    last_sync_at timestamptz,
    sync_status text,
    error_message text,
    created_at timestamptz,
    updated_at timestamptz,
    last_sync timestamptz,
    integration_name text,
    integration_key text,
    integration_icon_url text,
    connected_by_email text,
    connected_by_name text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ci.id,
        ci.company_id,
        ci.integration_id,
        ci.name,
        ci.status,
        ci.connected_at,
        ci.connected_by,
        ci.connected_by_user_id,
        ci.auth_data,
        ci.config,
        ci.last_sync_at,
        ci.sync_status,
        ci.error_message,
        ci.created_at,
        ci.updated_at,
        ci.last_sync,
        i.name as integration_name,
        i.integration_key,
        i.icon_url as integration_icon_url,
        u.email as connected_by_email,
        (u.raw_user_meta_data->>'full_name')::text as connected_by_name
    FROM public.company_integrations ci
    JOIN public.integrations i ON ci.integration_id = i.id
    LEFT JOIN auth.users u ON ci.connected_by = u.id
    WHERE ci.company_id = p_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_company_integrations_with_user_info(uuid) TO authenticated;

-- Create RLS policy for the function
CREATE POLICY "Users can call get_company_integrations_with_user_info for their companies"
ON public.company_integrations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.user_id = auth.uid()
        AND cu.company_id = company_integrations.company_id
    )
);

-- Refresh the schema cache one final time
SELECT public.refresh_schema_cache();

-- Add final comment
COMMENT ON FUNCTION public.get_company_integrations_with_user_info(uuid) IS 'Get company integrations with user information, avoiding cross-schema foreign key issues';
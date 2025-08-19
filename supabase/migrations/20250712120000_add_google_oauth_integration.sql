-- Add Google OAuth integration record for general Google services authentication
-- This is needed for the Google OAuth callback to work properly

INSERT INTO "public"."integrations" (
    "integration_key",
    "name", 
    "description",
    "icon_url",
    "provider",
    "auth_type",
    "supported_features",
    "documentation_url",
    "is_active"
) VALUES (
    'google',
    'Google Services',
    'OAuth connection to Google services providing access to Ads, Sheets, Gmail, and Analytics',
    'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/google.svg',
    'google',
    'oauth2',
    '["ads", "sheets", "gmail", "analytics", "oauth", "profile"]',
    'https://developers.google.com/identity/protocols/oauth2',
    true
) ON CONFLICT (integration_key) DO NOTHING;

-- Comment explaining this integration
COMMENT ON TABLE "public"."integrations" IS 'Third-party service definitions. The "google" integration represents the general OAuth connection to Google services.';

-- Note: This general Google integration serves as the OAuth entry point.
-- Specific Google services (google_ads, google_sheets, etc.) represent individual service capabilities.
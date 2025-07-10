-- Migrate existing data from applications to new integrations and automations tables

-- Insert sample integrations (third-party services)
INSERT INTO "public"."integrations" (
    "integration_key",
    "name", 
    "description",
    "icon_url",
    "provider",
    "auth_type",
    "supported_features",
    "documentation_url"
) VALUES 
-- Communication integrations
('slack', 'Slack', 'Team communication and collaboration platform', 
 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/slack.svg', 'slack', 'oauth2',
 '["send_messages", "create_channels", "manage_users", "webhooks"]',
 'https://api.slack.com/'),
 
('discord', 'Discord', 'Voice, video and text communication service', 
 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/discord.svg', 'discord', 'webhook',
 '["send_messages", "webhooks", "bots"]',
 'https://discord.com/developers/docs'),

-- Productivity integrations
('google_sheets', 'Google Sheets', 'Online spreadsheet application', 
 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/googlesheets.svg', 'google', 'oauth2',
 '["read_sheets", "write_sheets", "create_sheets", "sharing"]',
 'https://developers.google.com/sheets/api'),

('microsoft_excel', 'Microsoft Excel', 'Spreadsheet application from Microsoft Office', 
 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/microsoftexcel.svg', 'microsoft', 'oauth2',
 '["read_workbooks", "write_workbooks", "create_workbooks"]',
 'https://docs.microsoft.com/en-us/graph/api/resources/excel'),

('trello', 'Trello', 'Visual project management tool', 
 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/trello.svg', 'atlassian', 'oauth2',
 '["manage_boards", "create_cards", "manage_lists", "webhooks"]',
 'https://developer.atlassian.com/cloud/trello/'),

-- CRM integrations
('hubspot', 'HubSpot', 'Customer relationship management platform', 
 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/hubspot.svg', 'hubspot', 'oauth2',
 '["contacts", "deals", "companies", "tickets", "marketing"]',
 'https://developers.hubspot.com/'),

-- Email integrations
('gmail', 'Gmail', 'Email service from Google', 
 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/gmail.svg', 'google', 'oauth2',
 '["send_email", "read_email", "manage_labels", "search"]',
 'https://developers.google.com/gmail/api'),

-- Analytics integrations
('google_ads', 'Google Ads', 'Online advertising platform', 
 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/googleads.svg', 'google', 'oauth2',
 '["campaign_management", "reporting", "keywords", "ads", "billing"]',
 'https://developers.google.com/google-ads/api'),
 
('facebook_ads', 'Facebook Ads', 'Social media advertising platform', 
 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/facebook.svg', 'meta', 'oauth2',
 '["campaign_management", "reporting", "audiences", "creatives"]',
 'https://developers.facebook.com/docs/marketing-api'),

('google_analytics', 'Google Analytics', 'Web analytics service', 
 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/googleanalytics.svg', 'google', 'oauth2',
 '["reporting", "real_time", "audiences", "goals", "ecommerce"]',
 'https://developers.google.com/analytics'),

-- Business Intelligence
('power_bi', 'Power BI', 'Business analytics service by Microsoft', 
 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/powerbi.svg', 'microsoft', 'oauth2',
 '["datasets", "reports", "dashboards", "dataflows"]',
 'https://docs.microsoft.com/en-us/rest/api/power-bi/');

-- Insert automations (workflow definitions)
INSERT INTO "public"."automations" (
    "script_key",
    "name",
    "description", 
    "icon_url",
    "category",
    "supported_frequencies",
    "supported_metrics",
    "pricing_model",
    "pricing_config",
    "default_config",
    "documentation_url"
) VALUES (
    'google_ads_guard',
    'Google Ads Guard',
    'Automated Google Ads monitoring and alerting system with customizable thresholds and multiple notification channels.',
    'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/googleads.svg',
    'monitoring',
    '["4h", "8h", "12h", "24h", "48h"]',
    '["impressions", "clicks", "conversions", "value", "cost"]',
    'frequency',
    '{
        "4h": 50,
        "8h": 40, 
        "12h": 30,
        "24h": 20,
        "48h": 15
    }',
    '{
        "frequency": "24h",
        "period_days": 7,
        "metrics_watched": [
            {"metric": "impressions", "enabled": true, "drop_threshold": 80},
            {"metric": "clicks", "enabled": true, "drop_threshold": 80},
            {"metric": "conversions", "enabled": true, "drop_threshold": 80},
            {"metric": "value", "enabled": true, "drop_threshold": 80},
            {"metric": "cost", "enabled": false, "drop_threshold": 80}
        ],
        "notification_channels": {
            "email": {"enabled": false, "address": ""},
            "slack": {"enabled": false, "webhook": ""},
            "discord": {"enabled": false, "webhook": ""},
            "whatsapp": {"enabled": false, "webhook": ""}
        }
    }',
    'https://developers.google.com/google-ads/api'
);

-- Migrate existing company_applications data for integrations
-- First, let's create company_integrations records for all non-automation applications
INSERT INTO "public"."company_integrations" (
    "company_id",
    "integration_id", 
    "status",
    "connected_at",
    "connected_by",
    "config"
)
SELECT 
    ca.company_id,
    i.id as integration_id,
    CASE 
        WHEN ca.is_active THEN 'active'
        ELSE 'inactive'
    END as status,
    ca.installed_at as connected_at,
    ca.installed_by as connected_by,
    COALESCE(ca.settings, '{}') as config
FROM company_applications ca
JOIN applications a ON ca.application_id = a.id
JOIN integrations i ON (
    -- Map application names to integration keys
    CASE 
        WHEN LOWER(a.name) LIKE '%slack%' THEN i.integration_key = 'slack'
        WHEN LOWER(a.name) LIKE '%google sheets%' THEN i.integration_key = 'google_sheets'
        WHEN LOWER(a.name) LIKE '%trello%' THEN i.integration_key = 'trello'
        WHEN LOWER(a.name) LIKE '%hubspot%' THEN i.integration_key = 'hubspot' 
        WHEN LOWER(a.name) LIKE '%gmail%' THEN i.integration_key = 'gmail'
        WHEN LOWER(a.name) LIKE '%power bi%' THEN i.integration_key = 'power_bi'
        WHEN LOWER(a.name) LIKE '%google ads%' AND a.category != 'automation' THEN i.integration_key = 'google_ads'
        WHEN LOWER(a.name) LIKE '%discord%' THEN i.integration_key = 'discord'
        WHEN LOWER(a.name) LIKE '%facebook%' THEN i.integration_key = 'facebook_ads'
        WHEN LOWER(a.name) LIKE '%analytics%' THEN i.integration_key = 'google_analytics'
        WHEN LOWER(a.name) LIKE '%excel%' THEN i.integration_key = 'microsoft_excel'
        ELSE FALSE
    END
)
WHERE a.category != 'automation' -- Only migrate non-automation applications
ON CONFLICT (company_id, integration_id) DO NOTHING;

-- Migrate existing company_applications data for automations  
-- Create company_automations records for automation applications
INSERT INTO "public"."company_automations" (
    "company_id",
    "automation_id",
    "integration_id", -- Will be NULL for now, can be linked later
    "is_active",
    "frequency",
    "metrics_watched",
    "period_days", 
    "price_per_month",
    "notification_channels",
    "config",
    "last_run_at",
    "created_at",
    "created_by"
)
SELECT 
    ca.company_id,
    au.id as automation_id,
    NULL as integration_id, -- Will link to Google Ads integration later if needed
    ca.is_active,
    COALESCE(ca.settings->>'frequency', '24h') as frequency,
    COALESCE(ca.settings->'guardMetrics', '[]') as metrics_watched,
    COALESCE((ca.settings->>'guardPeriod')::int, 7) as period_days,
    CASE 
        WHEN ca.settings->>'frequency' = '4h' THEN 50
        WHEN ca.settings->>'frequency' = '8h' THEN 40
        WHEN ca.settings->>'frequency' = '12h' THEN 30
        WHEN ca.settings->>'frequency' = '24h' THEN 20
        WHEN ca.settings->>'frequency' = '48h' THEN 15
        ELSE 20
    END as price_per_month,
    COALESCE(ca.settings->'notifications', '{}') as notification_channels,
    COALESCE(ca.settings, '{}') as config,
    ca.last_used_at as last_run_at,
    ca.installed_at as created_at,
    ca.installed_by as created_by
FROM company_applications ca
JOIN applications a ON ca.application_id = a.id  
JOIN automations au ON (
    -- Map automation application names to automation script_keys
    CASE 
        WHEN LOWER(a.name) LIKE '%google ads guard%' THEN au.script_key = 'google_ads_guard'
        ELSE FALSE
    END
)
WHERE a.category = 'automation' -- Only migrate automation applications
ON CONFLICT (company_id, automation_id) DO NOTHING;

-- Update company_automations to link with Google Ads integrations where applicable
UPDATE "public"."company_automations" 
SET integration_id = ci.id
FROM "public"."company_integrations" ci,
     "public"."integrations" i,
     "public"."automations" au
WHERE ci.integration_id = i.id
  AND "public"."company_automations".automation_id = au.id
  AND ci.company_id = "public"."company_automations".company_id
  AND i.integration_key = 'google_ads'
  AND au.script_key = 'google_ads_guard';

-- Add helpful comments for the migration
COMMENT ON TABLE "public"."integrations" IS 'Third-party service definitions (Google Ads, Slack, etc.)';
COMMENT ON TABLE "public"."company_integrations" IS 'Company-specific instances of integrations with auth/config';
COMMENT ON TABLE "public"."automations" IS 'Workflow/automation definitions (monitoring, optimization scripts)'; 
COMMENT ON TABLE "public"."company_automations" IS 'Company-specific automation instances with scheduling/config';
COMMENT ON TABLE "public"."automation_runs" IS 'Execution history and logs for automation runs';
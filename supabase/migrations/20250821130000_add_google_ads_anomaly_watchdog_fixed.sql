-- Add Google Ads Anomaly Watchdog integration to applications table (fixed)
-- Migration: 20250821130000_add_google_ads_anomaly_watchdog_fixed.sql

-- First, ensure we have the advertising category
INSERT INTO application_categories (id, name, description, icon, sort_order, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Advertising & Marketing',
  'Applications for managing advertising campaigns and marketing automation',
  '📢',
  3,
  NOW(),
  NOW()
) ON CONFLICT (name) DO NOTHING;

-- Get the category ID for advertising
DO $$
DECLARE
    advertising_category_id UUID;
BEGIN
    SELECT id INTO advertising_category_id FROM application_categories WHERE name = 'Advertising & Marketing';
    
    -- Insert the Google Ads Anomaly Watchdog application (only columns that exist after cleanup)
    INSERT INTO applications (
        id,
        name,
        description,
        long_description,
        category_id,
        developer,
        version,
        icon_url,
        screenshots,
        documentation_url,
        pricing_model,
        price,
        features,
        tags,
        is_premium,
        is_active,
        metadata,
        created_at,
        updated_at,
        type,
        execution_type,
        storage_path,
        manifest_data,
        required_secrets,
        timeout_seconds,
        memory_limit,
        last_run_at,
        last_run_status,
        integration_provider,
        auth_type,
        auth_config,
        supported_features,
        trigger_type,
        supported_frequencies,
        pricing_config,
        default_config
    ) VALUES (
        gen_random_uuid(),
        'Google Ads Anomaly Watchdog',
        'Automated Google Ads performance monitoring with intelligent anomaly detection',
        'Advanced monitoring integration that automatically detects performance anomalies in Google Ads accounts. Uses sophisticated algorithms to compare recent performance against historical data and seasonal patterns, providing early warnings for issues like broken tracking, budget problems, or campaign failures. Supports both e-commerce and service business models with customizable alert thresholds.',
        advertising_category_id,
        'MetricsHub',
        '1.0.0',
        'https://developers.google.com/google-ads/images/google-ads-logo.png',
        ARRAY[]::text[],
        'https://github.com/your-org/metrics-hub/blob/main/plugins/google-ads-anomaly-watchdog/README.md',
        'subscription',
        '$0-29/month',
        '[
            "Intelligent anomaly detection",
            "Seasonal awareness",
            "Multi-account monitoring", 
            "Customizable thresholds",
            "Real-time alerts",
            "Performance recommendations",
            "E-commerce & service business support",
            "Automated scheduling"
        ]'::json,
        ARRAY['google-ads', 'anomaly-detection', 'monitoring', 'advertising', 'ppc', 'alerts']::text[],
        false,
        true,
        '{
            "plugin_path": "/plugins/google-ads-anomaly-watchdog",
            "container_image": "metrics-hub/google-ads-anomaly-watchdog:latest",
            "documentation_links": [
                {
                    "title": "Setup Guide",
                    "url": "https://github.com/your-org/metrics-hub/blob/main/plugins/google-ads-anomaly-watchdog/README.md#setup"
                },
                {
                    "title": "Google Ads API Documentation", 
                    "url": "https://developers.google.com/google-ads/api/docs/start"
                }
            ],
            "support_email": "support@metricshub.io"
        }'::json,
        NOW(),
        NOW(),
        'integration',
        'server',
        '/plugins/google-ads-anomaly-watchdog',
        '{
            "name": "google-ads-anomaly-watchdog",
            "version": "1.0.0",
            "displayName": "Google Ads Anomaly Watchdog",
            "description": "Automated Google Ads performance monitoring with intelligent anomaly detection",
            "category": "advertising",
            "provider": "google-ads",
            "type": "server-side",
            "executionType": "scheduled"
        }'::json,
        ARRAY[
            'google_ads_client_id',
            'google_ads_client_secret',
            'google_ads_developer_token',
            'google_ads_refresh_token'
        ]::text[],
        600,
        '512MB',
        NULL,
        NULL,
        'google-ads-anomaly-watchdog',
        'oauth2',
        '{
            "provider": "google",
            "scopes": ["https://www.googleapis.com/auth/adwords"],
            "auth_url": "https://accounts.google.com/o/oauth2/auth",
            "token_url": "https://oauth2.googleapis.com/token"
        }'::json,
        '[
            "oauth2_authentication",
            "scheduled_execution", 
            "anomaly_detection",
            "multi_account_support",
            "custom_thresholds",
            "notifications"
        ]'::json,
        'schedule',
        '[43200, 86400, 604800]'::json,
        '{
            "free_tier": {
                "max_accounts": 3,
                "max_checks_per_month": 100
            },
            "pro_tier": {
                "price_per_month": 29,
                "max_accounts": "unlimited",
                "max_checks_per_month": "unlimited"
            }
        }'::json,
        '{
            "accountType": "service",
            "frequency": 86400,
            "customThresholds": {
                "scoreThreshold": -50,
                "costChangeThresholdHigh": 100,
                "costChangeThresholdLow": -80,
                "metricDropThreshold": -80
            }
        }'::json
    ) ON CONFLICT (name) DO UPDATE SET
        description = EXCLUDED.description,
        long_description = EXCLUDED.long_description,
        metadata = EXCLUDED.metadata,
        manifest_data = EXCLUDED.manifest_data,
        required_secrets = EXCLUDED.required_secrets,
        default_config = EXCLUDED.default_config,
        updated_at = NOW();
        
END $$;
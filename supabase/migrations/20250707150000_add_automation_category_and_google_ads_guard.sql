-- Add automation category and Google Ads Guard automation

-- Add automation category
INSERT INTO "public"."application_categories" ("name", "description", "icon", "sort_order") VALUES
    ('automation', 'Automation and workflow management tools', 'Zap', 7)
ON CONFLICT (name) DO NOTHING;

-- Add Google Ads Guard automation
INSERT INTO "public"."applications" (
    "name", 
    "description", 
    "long_description", 
    "category", 
    "developer", 
    "version", 
    "icon_url", 
    "documentation_url", 
    "pricing_model", 
    "price", 
    "features", 
    "tags", 
    "rating", 
    "download_count", 
    "is_premium",
    "metadata"
) VALUES (
    'Google Ads Guard',
    'Automated Google Ads monitoring and alerting system with customizable thresholds and multiple notification channels.',
    'Google Ads Guard is an automated monitoring system that continuously watches your Google Ads campaigns for significant performance changes. It tracks key metrics like impressions, clicks, conversions, and costs, alerting you when performance drops below configurable thresholds. The system supports MCC (Manager) account access, multiple notification channels (Email, Slack, Discord, WhatsApp), and frequency-based pricing. Perfect for agencies and advertisers who need proactive campaign monitoring.',
    'automation',
    'Viktory',
    '1.0.0',
    'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/googleads.svg',
    'https://developers.google.com/google-ads/api',
    'subscription',
    '$20/month',
    '["Real-time Google Ads monitoring", "MCC account support", "Customizable alert thresholds", "Multiple notification channels", "Performance trend analysis", "7/14/30 day comparison periods", "Automatic script execution", "Campaign health scoring", "Seasonal factor analysis", "Multi-metric tracking"]',
    '{"google-ads", "automation", "monitoring", "alerts", "ppc", "campaigns", "performance", "mcc", "guard", "notifications"}',
    4.9,
    0,
    true,
    '{
        "automationType": "monitoring",
        "scriptId": "8426813",
        "scriptUrl": "https://ads.google.com/aw/bulk/scripts/edit?ocid=381897981&ascid=381897981&scriptId=8426813&euid=374638237&__u=8924148213&uscid=381897981&__c=4437590869&authuser=0&subid=cz-cs-awhp-g-aw-c-home-signin!o2-adshp-hv-q4-22",
        "supportedMetrics": ["impressions", "clicks", "conversions", "value", "price"],
        "supportedFrequencies": ["4h", "8h", "12h", "24h", "48h"],
        "supportedPeriods": ["7", "14", "30"],
        "pricingByFrequency": {
            "4h": 50,
            "8h": 40,
            "12h": 30,
            "24h": 20,
            "48h": 15
        },
        "defaultSettings": {
            "frequency": "24h",
            "guardPeriod": "7",
            "metrics": {
                "impressions": {"enabled": true, "dropThreshold": 80},
                "clicks": {"enabled": true, "dropThreshold": 80},
                "conversions": {"enabled": true, "dropThreshold": 80},
                "value": {"enabled": true, "dropThreshold": 80},
                "price": {"enabled": true, "dropThreshold": 80}
            }
        }
    }'
);
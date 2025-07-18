-- Force add Google Ads Central Overview application to marketplace

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
    "is_premium"
) VALUES (
    'Google Ads Central Overview',
    'Track Google Ads performance — users, sales, and trends in one dashboard.',
    'Google Ads Central Overview is a web-based dashboard that provides companies with clear, actionable insights into their Google Ads performance. It displays key metrics such as user activity, visitor counts, conversions/sales, and the team member assigned to each account. The app also includes date-based comparisons, making it easy to track progress, analyze trends, and optimize campaign effectiveness over time.',
    'marketing',
    'Viktory',
    '1.0.0',
    'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/googleads.svg',
    'https://developers.google.com/google-ads/api',
    'subscription',
    '$20/month',
    '["Real-time Google Ads data", "MCC account support", "Performance analytics", "Custom date ranges", "Specialist tracking", "Source/medium filtering", "Campaign overview", "Account comparison", "Export capabilities", "Agency management"]',
    '{"google-ads", "ppc", "advertising", "analytics", "marketing", "mcc", "campaigns", "performance"}',
    4.8,
    0,
    true
) ON CONFLICT (name) DO NOTHING;
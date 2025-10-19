-- Add Google Ads Central Overview application if it doesn't exist
-- This ensures the plugin can be installed as a company application

INSERT INTO public.applications (
  id,
  name,
  description,
  category_id,
  type,
  developer,
  version,
  icon_url,
  is_premium,
  price,
  features,
  tags,
  execution_type,
  storage_path,
  is_active,
  created_at,
  updated_at
) 
SELECT
  'ee582805-1029-4d59-8887-6649c6f83be1'::uuid,
  'Google Ads Central Overview',
  'Comprehensive dashboard for Google Ads accounts overview with performance metrics, account hierarchy, and advanced analytics',
  (SELECT id FROM public.application_categories WHERE name = 'marketing' LIMIT 1),
  'application',
  'MetricsHub Team',
  '1.0.0',
  'https://cdn.jsdelivr.net/gh/FortAwesome/Font-Awesome@6.0.0/svgs/brands/google.svg',
  false,
  0.00,
  '[
    "Real-time Google Ads accounts overview",
    "Performance metrics with period comparisons", 
    "Account hierarchy visualization",
    "MCC (Manager) account support",
    "Advanced DataTables with export capabilities",
    "Responsive design for all screen sizes",
    "OAuth2 Google Ads API integration"
  ]'::jsonb,
  ARRAY['google-ads', 'marketing', 'analytics', 'dashboard', 'ppc'],
  'iframe',
  'apps/ee582805-1029-4d59-8887-6649c6f83be1/',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.applications
  WHERE name = 'Google Ads Central Overview' OR id = 'ee582805-1029-4d59-8887-6649c6f83be1'::uuid
);

-- Log the result
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM public.applications WHERE id = 'ee582805-1029-4d59-8887-6649c6f83be1'::uuid) THEN
    RAISE NOTICE 'Google Ads Central Overview application is now available in the applications catalog';
  END IF;
END $$;
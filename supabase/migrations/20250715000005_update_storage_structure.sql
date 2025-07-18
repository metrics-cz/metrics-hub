-- Update storage structure to support frontend/backend distinction
-- This migration updates the storage bucket organization for Apps vs Integrations

-- Step 1: Update storage bucket allowed MIME types for both Apps and Integrations
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
    -- Frontend files (for Apps)
    'text/html',                 -- HTML files
    'text/css',                  -- CSS files
    'application/javascript',    -- JS files
    'text/javascript',          -- JS files
    'application/json',         -- JSON files, manifests
    'image/png',                -- Images
    'image/jpeg',               -- Images
    'image/svg+xml',            -- SVG icons
    'image/webp',               -- WebP images
    'image/gif',                -- GIF images
    'text/plain',               -- Text files
    
    -- Backend files (for Integrations)
    'application/zip',          -- Compressed packages
    'application/x-tar',        -- Tar archives
    'application/gzip',         -- Gzip files
    'application/octet-stream', -- Binary files, Docker images
    'text/x-python',            -- Python files
    'text/x-javascript',        -- Node.js files
    'application/x-docker',     -- Docker files
    'application/x-yaml',       -- YAML files
    'text/yaml',                -- YAML files
    'application/xml',          -- XML files
    'text/xml'                  -- XML files
]
WHERE id = 'app-storage';

-- Step 2: Create helper function to get storage path for an application
CREATE OR REPLACE FUNCTION get_app_storage_path(app_id uuid, app_type text)
RETURNS text AS $$
BEGIN
    CASE app_type
        WHEN 'app' THEN 
            RETURN 'apps/' || app_id::text || '/';
        WHEN 'integration' THEN 
            RETURN 'integrations/' || app_id::text || '/';
        WHEN 'both' THEN 
            RETURN 'hybrid/' || app_id::text || '/';
        ELSE 
            RETURN 'apps/' || app_id::text || '/';
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Update existing applications with proper storage paths
UPDATE public.applications 
SET storage_path = get_app_storage_path(id, COALESCE(app_type, 'app'))
WHERE storage_path IS NULL OR storage_path = '';

-- Step 4: Create trigger to automatically set storage path for new applications
CREATE OR REPLACE FUNCTION set_app_storage_path()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.storage_path IS NULL OR NEW.storage_path = '' THEN
        NEW.storage_path = get_app_storage_path(NEW.id, NEW.app_type);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_app_storage_path_trigger
    BEFORE INSERT OR UPDATE ON public.applications
    FOR EACH ROW
    EXECUTE FUNCTION set_app_storage_path();

-- Step 5: Update storage bucket policies to work with new structure
DROP POLICY IF EXISTS "Companies can view their assigned apps" ON storage.objects;
DROP POLICY IF EXISTS "Companies can view their app logs" ON storage.objects;

-- Create new policies for the unified structure
CREATE POLICY "Companies can view their assigned app files"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'app-storage' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.company_applications ca
        JOIN public.company_users cu ON ca.company_id = cu.company_id
        JOIN public.applications a ON ca.application_id = a.id
        WHERE cu.user_id = auth.uid()
        AND ca.is_active = true
        AND (
            -- Match apps path
            name LIKE 'apps/' || a.id::text || '/%' OR
            -- Match integrations path
            name LIKE 'integrations/' || a.id::text || '/%' OR
            -- Match hybrid path
            name LIKE 'hybrid/' || a.id::text || '/%'
        )
    )
);

CREATE POLICY "Companies can view their assigned app logs"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'app-logs' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.company_applications ca
        JOIN public.company_users cu ON ca.company_id = cu.company_id
        JOIN public.applications a ON ca.application_id = a.id
        WHERE cu.user_id = auth.uid()
        AND ca.is_active = true
        AND (
            -- Match apps path
            name LIKE 'apps/' || a.id::text || '/%' OR
            -- Match integrations path
            name LIKE 'integrations/' || a.id::text || '/%' OR
            -- Match hybrid path
            name LIKE 'hybrid/' || a.id::text || '/%'
        )
    )
);

-- Step 6: Add policies for app developers to upload their own files
CREATE POLICY "App developers can manage their app files"
ON storage.objects FOR ALL
USING (
    bucket_id = 'app-storage' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.applications a
        WHERE a.developer = (
            SELECT (raw_user_meta_data ->> 'full_name')::text
            FROM auth.users 
            WHERE id = auth.uid()
        )
        AND (
            -- Match apps path
            name LIKE 'apps/' || a.id::text || '/%' OR
            -- Match integrations path
            name LIKE 'integrations/' || a.id::text || '/%' OR
            -- Match hybrid path
            name LIKE 'hybrid/' || a.id::text || '/%'
        )
    )
);

-- Step 7: Create function to validate app file structure
CREATE OR REPLACE FUNCTION validate_app_file_structure(
    app_id uuid,
    app_type text,
    file_path text
) RETURNS boolean AS $$
BEGIN
    CASE app_type
        WHEN 'app' THEN 
            -- Apps must have files in frontend/ directory
            RETURN file_path LIKE 'apps/' || app_id::text || '/frontend/%' OR
                   file_path LIKE 'apps/' || app_id::text || '/manifest.json';
        WHEN 'integration' THEN 
            -- Integrations must have files in backend/ directory
            RETURN file_path LIKE 'integrations/' || app_id::text || '/backend/%' OR
                   file_path LIKE 'integrations/' || app_id::text || '/manifest.json';
        WHEN 'both' THEN 
            -- Both types can have files in either directory
            RETURN file_path LIKE 'hybrid/' || app_id::text || '/frontend/%' OR
                   file_path LIKE 'hybrid/' || app_id::text || '/backend/%' OR
                   file_path LIKE 'hybrid/' || app_id::text || '/manifest.json';
        ELSE 
            RETURN false;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Add sample manifest structure for documentation
INSERT INTO public.applications (
    name, 
    description, 
    category, 
    developer, 
    version,
    app_type,
    has_frontend,
    has_backend,
    execution_type,
    manifest_data,
    required_secrets
) VALUES 
(
    'Sample Frontend App',
    'A sample app that runs in iframe sandbox',
    'productivity',
    'System',
    '1.0.0',
    'app',
    true,
    false,
    'iframe',
    '{
        "name": "sample-frontend-app",
        "version": "1.0.0",
        "type": "app",
        "frontend": {
            "entrypoint": "frontend/dist/index.html",
            "assets": ["frontend/dist/"]
        },
        "permissions": {
            "secrets": ["user_profile", "company_settings"],
            "apis": ["internal"]
        }
    }',
    ARRAY['user_profile', 'company_settings']
),
(
    'Sample Integration',
    'A sample integration that runs scheduled tasks',
    'productivity',
    'System',
    '1.0.0',
    'integration',
    false,
    true,
    'server',
    '{
        "name": "sample-integration",
        "version": "1.0.0",
        "type": "integration",
        "backend": {
            "entrypoint": "backend/main.js",
            "runtime": "nodejs",
            "version": "18"
        },
        "schedule": {
            "cron": "0 */4 * * *",
            "timezone": "UTC"
        },
        "permissions": {
            "secrets": ["google_ads_token", "slack_webhook"],
            "apis": ["external"]
        }
    }',
    ARRAY['google_ads_token', 'slack_webhook']
)
ON CONFLICT (name) DO NOTHING;

-- Step 9: Add comments for the updated storage structure
COMMENT ON FUNCTION get_app_storage_path(uuid, text) IS 'Returns the storage path for an application based on its type';
COMMENT ON FUNCTION validate_app_file_structure(uuid, text, text) IS 'Validates that uploaded files follow the correct directory structure';
COMMENT ON COLUMN public.applications.storage_path IS 'Base path in storage bucket: apps/{id}/, integrations/{id}/, or hybrid/{id}/';
COMMENT ON COLUMN public.applications.manifest_data IS 'JSON manifest describing app structure, dependencies, and configuration';

-- Step 10: Update sample data to reflect new structure
UPDATE public.applications 
SET 
    app_type = 'app',
    has_frontend = true,
    has_backend = false,
    execution_type = 'iframe',
    manifest_data = jsonb_build_object(
        'name', lower(replace(name, ' ', '-')),
        'version', version,
        'type', 'app',
        'frontend', jsonb_build_object(
            'entrypoint', 'frontend/dist/index.html',
            'assets', jsonb_build_array('frontend/dist/')
        )
    )
WHERE app_type IS NULL AND name NOT LIKE '%Integration%';

-- Step 11: Create indexes for storage path queries
CREATE INDEX IF NOT EXISTS idx_applications_storage_path ON public.applications (storage_path);
CREATE INDEX IF NOT EXISTS idx_applications_manifest_data ON public.applications USING gin (manifest_data);

-- Step 12: Grant necessary permissions for storage operations
GRANT EXECUTE ON FUNCTION get_app_storage_path(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_app_file_structure(uuid, text, text) TO authenticated;
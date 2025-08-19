-- Create app storage buckets for app files, builds, and execution logs
-- This migration creates the necessary storage infrastructure for the app execution system

-- Create app-storage bucket for application files, builds, and source code
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'app-storage',
    'app-storage',
    false, -- Private bucket, access controlled by RLS
    104857600, -- 100MB limit per upload
    ARRAY[
        'application/json',           -- manifest.json files
        'application/javascript',     -- JS files
        'text/javascript',           -- JS files
        'text/html',                 -- HTML files
        'text/css',                  -- CSS files
        'application/zip',           -- Compressed builds
        'application/x-tar',         -- Tar archives
        'application/gzip',          -- Gzip files
        'text/plain',                -- Text files, logs
        'application/octet-stream',  -- Binary executables
        'image/png',                 -- Icons, images
        'image/jpeg',                -- Icons, images
        'image/svg+xml'              -- SVG icons
    ]
);

-- Create app-logs bucket for execution logs and outputs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'app-logs',
    'app-logs',
    false, -- Private bucket, access controlled by RLS
    52428800, -- 50MB limit per log file
    ARRAY[
        'text/plain',                -- Log files
        'application/json',          -- JSON output
        'text/csv',                  -- CSV output
        'application/xml',           -- XML output
        'text/xml'                   -- XML output
    ]
);

-- Create RLS policies for app-storage bucket
CREATE POLICY "Companies can view their assigned apps"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'app-storage' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.company_applications ca
        JOIN public.company_users cu ON ca.company_id = cu.company_id
        WHERE cu.user_id = auth.uid()
        AND ca.application_id::text = split_part(name, '/', 1)
        AND ca.is_active = true
    )
);

CREATE POLICY "Superadmins can manage all app storage"
ON storage.objects FOR ALL
USING (
    bucket_id = 'app-storage' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.company_users cu
        JOIN public.companies c ON cu.company_id = c.id
        WHERE cu.user_id = auth.uid()
        AND cu.role = 'superadmin'
    )
);

CREATE POLICY "System can read all app storage"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'app-storage' AND
    auth.uid() IS NOT NULL AND
    auth.jwt() ->> 'role' = 'service_role'
);

-- Create RLS policies for app-logs bucket
CREATE POLICY "Companies can view their app logs"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'app-logs' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.company_applications ca
        JOIN public.company_users cu ON ca.company_id = cu.company_id
        WHERE cu.user_id = auth.uid()
        AND ca.application_id::text = split_part(name, '/', 1)
        AND ca.is_active = true
    )
);

CREATE POLICY "Superadmins can manage all app logs"
ON storage.objects FOR ALL
USING (
    bucket_id = 'app-logs' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.company_users cu
        JOIN public.companies c ON cu.company_id = c.id
        WHERE cu.user_id = auth.uid()
        AND cu.role = 'superadmin'
    )
);

CREATE POLICY "System can write app logs"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'app-logs' AND
    auth.uid() IS NOT NULL AND
    auth.jwt() ->> 'role' = 'service_role'
);

-- Note: RLS is already enabled on storage.objects
-- Note: Indexes on storage.objects are managed by Supabase
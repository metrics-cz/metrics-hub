-- Migration: Sync dev to prod schema changes
-- Created: 2025-10-21
-- Description: Adds missing columns and removes obsolete indexes/triggers to sync dev schema to prod

-- Add square_logo_url column to companies table
-- This column stores square format logos for avatars and general display
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'companies'
        AND column_name = 'square_logo_url'
    ) THEN
        ALTER TABLE public.companies
        ADD COLUMN square_logo_url text;
    END IF;
END $$;

-- Add plugin_data column to company_applications table
-- This column stores zip file data for iframe plugins
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'company_applications'
        AND column_name = 'plugin_data'
    ) THEN
        ALTER TABLE public.company_applications
        ADD COLUMN plugin_data bytea;

        COMMENT ON COLUMN public.company_applications.plugin_data
        IS 'Stores the zip file data for iframe plugins';
    END IF;
END $$;

-- Drop obsolete indexes (replaced by composite index idx_company_users_lookup)
DROP INDEX IF EXISTS public.idx_company_users_company_id;
DROP INDEX IF EXISTS public.idx_company_users_user_id;

-- Drop obsolete trigger and function for execution statistics
-- (Statistics are now calculated differently)
DROP TRIGGER IF EXISTS update_execution_statistics_trigger ON public.execution_runs;
DROP FUNCTION IF EXISTS public.update_execution_statistics();

-- Create integrations storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('integrations', 'integrations', false, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- Add RLS policies for integrations bucket (if needed)
-- This ensures proper access control for integration files
DO $$
BEGIN
    -- Add your RLS policies here if needed
    -- Example:
    -- CREATE POLICY "Company admins can upload integrations"
    --   ON storage.objects FOR INSERT
    --   TO authenticated
    --   WITH CHECK (bucket_id = 'integrations' AND ...);
END $$;

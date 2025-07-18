-- Fix foreign key relationships for company_integrations table
-- This migration ensures PostgREST can properly detect the relationships

-- Add missing foreign key constraints if they don't exist
DO $$ 
BEGIN
    -- Check if the connected_by foreign key exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'company_integrations_connected_by_fkey' 
        AND conrelid = 'public.company_integrations'::regclass
    ) THEN
        ALTER TABLE public.company_integrations 
        ADD CONSTRAINT company_integrations_connected_by_fkey 
        FOREIGN KEY (connected_by) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
    
    -- Check if additional user reference exists (from later migrations)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'company_integrations_connected_by_user_id_fkey' 
        AND conrelid = 'public.company_integrations'::regclass
    ) THEN
        -- Add the connected_by_user_id column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'company_integrations' 
            AND column_name = 'connected_by_user_id'
        ) THEN
            ALTER TABLE public.company_integrations 
            ADD COLUMN connected_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Create a view that PostgREST can use to access the user relationships
CREATE OR REPLACE VIEW public.company_integrations_with_users AS
SELECT 
    ci.*,
    u1.email as connected_by_email,
    u1.raw_user_meta_data->>'full_name' as connected_by_name,
    u2.email as connected_by_user_email,
    u2.raw_user_meta_data->>'full_name' as connected_by_user_name
FROM public.company_integrations ci
LEFT JOIN auth.users u1 ON ci.connected_by = u1.id
LEFT JOIN auth.users u2 ON ci.connected_by_user_id = u2.id;

-- Grant access to the view
GRANT SELECT ON public.company_integrations_with_users TO authenticated;
GRANT SELECT ON public.company_integrations_with_users TO anon;

-- Note: RLS cannot be enabled on views in PostgreSQL, 
-- security is handled through the underlying table policies

-- Security is handled by the underlying table RLS policies
-- No need to create policies on views

-- Create a function to manually refresh PostgREST schema cache
CREATE OR REPLACE FUNCTION public.refresh_schema_cache()
RETURNS void AS $$
BEGIN
    NOTIFY pgrst, 'reload schema';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.refresh_schema_cache() TO authenticated;

-- Refresh the schema cache
SELECT public.refresh_schema_cache();

-- Add comments for documentation
COMMENT ON VIEW public.company_integrations_with_users IS 'View that includes user information for company integrations, accessible by PostgREST';
COMMENT ON FUNCTION public.refresh_schema_cache IS 'Function to manually refresh PostgREST schema cache';
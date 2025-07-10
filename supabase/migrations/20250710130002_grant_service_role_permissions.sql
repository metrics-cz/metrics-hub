-- Grant necessary permissions to service_role for API operations
-- This fixes the "permission denied for schema public" error

-- =============================================
-- Grant Schema Access to Service Role
-- =============================================

-- Grant USAGE permission on public schema to service_role
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant SELECT permission on all tables in public schema to service_role
GRANT SELECT ON ALL TABLES IN SCHEMA public TO service_role;

-- Grant INSERT, UPDATE, DELETE permissions for specific operations
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;

-- Grant permission on sequences (for auto-incrementing columns)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- =============================================
-- Grant permissions on future tables (for new migrations)
-- =============================================

-- Ensure service_role gets permissions on any new tables created
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO service_role;

-- =============================================
-- Specific permissions for critical tables
-- =============================================

-- Ensure critical tables have explicit permissions
DO $$
BEGIN
    -- company_users table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_users' AND table_schema = 'public') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON company_users TO service_role;
    END IF;
    
    -- company_applications table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_applications' AND table_schema = 'public') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON company_applications TO service_role;
    END IF;
    
    -- applications table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'applications' AND table_schema = 'public') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON applications TO service_role;
    END IF;
    
    -- notifications table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO service_role;
    END IF;
    
    -- companies table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies' AND table_schema = 'public') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON companies TO service_role;
    END IF;
END $$;

-- =============================================
-- Add comments for documentation
-- =============================================

COMMENT ON SCHEMA public IS 'Public schema with service_role permissions for API operations';

-- Show current permissions (for debugging)
-- This will be visible in the migration logs
SELECT 
    table_schema, 
    table_name, 
    grantee, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE grantee = 'service_role' AND table_schema = 'public'
ORDER BY table_name;
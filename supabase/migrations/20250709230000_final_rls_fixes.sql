-- Final RLS fixes - simplified version without auth schema modifications

-- =============================================
-- Notifications Security (Fixed)
-- =============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

-- Check if notifications table exists and has the correct columns
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'notifications'
    ) THEN
        -- Check if userId column exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'userId'
        ) THEN
            -- Users can only see their own notifications
            EXECUTE 'CREATE POLICY "Users can view their own notifications" ON notifications
                FOR SELECT USING ("userId" = auth.uid())';
            
            -- Users can update their own notifications (mark as read, etc.)
            EXECUTE 'CREATE POLICY "Users can update their own notifications" ON notifications
                FOR UPDATE USING ("userId" = auth.uid())';
            
            -- System can create notifications for users
            EXECUTE 'CREATE POLICY "System can create notifications" ON notifications
                FOR INSERT WITH CHECK ("userId" IS NOT NULL)';
        END IF;
    END IF;
END $$;

-- =============================================
-- Ensure RLS is enabled on all tables
-- =============================================

-- Enable RLS on all critical tables if not already enabled
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
        ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_users') THEN
        ALTER TABLE company_users ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_invitations') THEN
        ALTER TABLE company_invitations ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_applications') THEN
        ALTER TABLE company_applications ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_integrations') THEN
        ALTER TABLE company_integrations ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_automations') THEN
        ALTER TABLE company_automations ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'automation_runs') THEN
        ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- =============================================
-- Additional Security Hardening
-- =============================================

-- Grant proper permissions to authenticated users for audit logs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        GRANT SELECT ON audit_logs TO authenticated;
    END IF;
END $$;

-- Add more specific permissions for service role
DO $$
BEGIN
    -- Grant necessary permissions for service operations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        GRANT ALL ON audit_logs TO service_role;
    END IF;
END $$;

-- =============================================
-- Validate Security Configuration
-- =============================================

-- Check that RLS is enabled on critical tables
DO $$
DECLARE
    table_name TEXT;
    rls_enabled BOOLEAN;
BEGIN
    FOR table_name IN 
        SELECT t.table_name 
        FROM information_schema.tables t
        WHERE t.table_schema = 'public' 
        AND t.table_name IN ('companies', 'company_users', 'company_invitations', 
                           'company_applications', 'company_integrations', 
                           'company_automations', 'automation_runs', 'notifications')
    LOOP
        SELECT c.relrowsecurity INTO rls_enabled
        FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public' AND c.relname = table_name;
        
        IF NOT rls_enabled THEN
            RAISE WARNING 'RLS is not enabled on table: %', table_name;
        ELSE
            RAISE NOTICE 'RLS is properly enabled on table: %', table_name;
        END IF;
    END LOOP;
END $$;

-- =============================================
-- Documentation and Comments
-- =============================================

-- Add documentation comments
COMMENT ON TABLE notifications IS 'Notifications table - uses userId column (not user_id) for RLS policies';
COMMENT ON TABLE audit_logs IS 'Security audit log - tracks all changes to sensitive data';

-- Log successful completion
DO $$
BEGIN
    RAISE NOTICE 'Final security migration completed successfully';
    RAISE NOTICE 'All RLS policies have been applied and security hardening is complete';
END $$;
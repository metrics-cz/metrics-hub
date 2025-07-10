-- Fix notifications RLS policies with correct column names
-- The notifications table uses userId instead of user_id

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
-- Additional Security Hardening
-- =============================================

-- Ensure all tables have proper RLS enabled
DO $$
BEGIN
    -- Enable RLS on all critical tables if not already enabled
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
-- Additional Security Measures
-- =============================================
-- Auth schema functions removed due to permission restrictions
-- These can be created later as public schema functions if needed

-- =============================================
-- Improved Error Handling
-- =============================================

-- Add a comment to document the corrected schema
COMMENT ON TABLE notifications IS 'Notifications table - uses userId column (not user_id)';

-- Log successful completion
DO $$
BEGIN
    RAISE NOTICE 'Security migration completed successfully';
END $$;
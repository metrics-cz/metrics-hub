-- Fix RLS policies and security issues (corrected version)
-- This migration addresses the issues from previous migrations

-- =============================================
-- Fix connection metadata tracking
-- =============================================

-- Add missing columns if they don't exist
ALTER TABLE company_integrations 
ADD COLUMN IF NOT EXISTS connected_by_user_id UUID,
ADD COLUMN IF NOT EXISTS connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_sync TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add foreign key constraint for connected_by_user_id (referencing auth.users)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_connected_by_user' 
        AND table_name = 'company_integrations'
    ) THEN
        ALTER TABLE company_integrations
        ADD CONSTRAINT fk_connected_by_user
        FOREIGN KEY (connected_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create or replace trigger function for updated_at
CREATE OR REPLACE FUNCTION update_company_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_company_integrations_updated_at_trigger ON company_integrations;
CREATE TRIGGER update_company_integrations_updated_at_trigger
    BEFORE UPDATE ON company_integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_company_integrations_updated_at();

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_company_integrations_connected_by ON company_integrations(connected_by_user_id);
CREATE INDEX IF NOT EXISTS idx_company_integrations_connected_at ON company_integrations(connected_at);
CREATE INDEX IF NOT EXISTS idx_company_integrations_last_sync ON company_integrations(last_sync);
CREATE INDEX IF NOT EXISTS idx_company_integrations_sync_status ON company_integrations(sync_status);

-- Add check constraint for sync_status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'chk_sync_status'
    ) THEN
        ALTER TABLE company_integrations
        ADD CONSTRAINT chk_sync_status 
        CHECK (sync_status IN ('pending', 'syncing', 'success', 'error'));
    END IF;
END $$;

-- =============================================
-- Company Invitations RLS Policies
-- =============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view relevant company invitations" ON company_invitations;
DROP POLICY IF EXISTS "Company admins can manage invitations" ON company_invitations;
DROP POLICY IF EXISTS "Users can accept their own invitations" ON company_invitations;

-- Allow users to view invitations for companies they're part of, invitations they sent, or invitations sent to them
CREATE POLICY "Users can view relevant company invitations" ON company_invitations
    FOR SELECT USING (
        -- User is part of the company being invited to
        "companyId" IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
        ) 
        OR 
        -- User sent the invitation
        "invitedBy" = auth.uid() 
        OR 
        -- Invitation is sent to the current user
        "userId" = auth.uid()
        OR
        -- User can view invitations sent to their email
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Allow company admins to manage invitations for their companies
CREATE POLICY "Company admins can manage invitations" ON company_invitations
    FOR ALL USING (
        "companyId" IN (
            SELECT company_id FROM company_users 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'superadmin')
        )
    );

-- Allow users to accept invitations sent to them
CREATE POLICY "Users can accept their own invitations" ON company_invitations
    FOR UPDATE USING (
        "userId" = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- =============================================
-- Company Table Enhanced RLS Policies
-- =============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Company admins can update company details" ON companies;
DROP POLICY IF EXISTS "Members see limited company info" ON companies;

-- Add policy for company updates (branding, contact details, etc.)
CREATE POLICY "Company admins can update company details" ON companies
    FOR UPDATE USING (
        id IN (
            SELECT company_id FROM company_users 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'superadmin')
        )
    );

-- =============================================
-- Enhanced Security for Company Applications
-- =============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Company members can view company applications" ON company_applications;
DROP POLICY IF EXISTS "Company admins can manage applications" ON company_applications;

-- Restrict access to company application configurations
CREATE POLICY "Company members can view company applications" ON company_applications
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
        )
    );

-- Only admins can manage company applications
CREATE POLICY "Company admins can manage applications" ON company_applications
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM company_users 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'superadmin')
        )
    );

-- =============================================
-- Company Integrations Enhanced Security
-- =============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Company members can view integrations (limited)" ON company_integrations;
DROP POLICY IF EXISTS "Company admins can manage integrations" ON company_integrations;

-- Add policy to protect sensitive integration data (OAuth tokens, API keys)
CREATE POLICY "Company members can view integrations (limited)" ON company_integrations
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
        )
    );

-- Only admins can manage integrations and access sensitive data
CREATE POLICY "Company admins can manage integrations" ON company_integrations
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM company_users 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'superadmin')
        )
    );

-- =============================================
-- Company Automations Enhanced Security
-- =============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Company members can view automation runs" ON automation_runs;
DROP POLICY IF EXISTS "Company admins can manage automation runs" ON automation_runs;

-- Allow company members to view automation runs
CREATE POLICY "Company members can view automation runs" ON automation_runs
    FOR SELECT USING (
        company_automation_id IN (
            SELECT id FROM company_automations ca
            WHERE ca.company_id IN (
                SELECT company_id FROM company_users WHERE user_id = auth.uid()
            )
        )
    );

-- Only admins can manage automation runs
CREATE POLICY "Company admins can manage automation runs" ON automation_runs
    FOR ALL USING (
        company_automation_id IN (
            SELECT id FROM company_automations ca
            WHERE ca.company_id IN (
                SELECT company_id FROM company_users 
                WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'superadmin')
            )
        )
    );

-- =============================================
-- Notifications Security - Handled in separate migration
-- =============================================
-- The notifications table uses userId instead of user_id
-- This is handled in migration 20250709220000_fix_notifications_rls.sql

-- =============================================
-- Revoke Overprivileged Anonymous Access
-- =============================================

-- Remove anonymous access to sensitive tables
DO $$
BEGIN
    -- Check if tables exist before revoking permissions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_invitations') THEN
        REVOKE ALL ON company_invitations FROM anon;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_users') THEN
        REVOKE ALL ON company_users FROM anon;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        REVOKE ALL ON notifications FROM anon;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_integrations') THEN
        REVOKE ALL ON company_integrations FROM anon;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_automations') THEN
        REVOKE ALL ON company_automations FROM anon;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'automation_runs') THEN
        REVOKE ALL ON automation_runs FROM anon;
    END IF;
END $$;

-- =============================================
-- Create Audit Log Table
-- =============================================

-- Create audit log table for security monitoring
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    user_id UUID REFERENCES auth.users(id),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB
);

-- Enable RLS on audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists
DROP POLICY IF EXISTS "System admins can view audit logs" ON audit_logs;

-- Only system admins can view audit logs
CREATE POLICY "System admins can view audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM company_users cu
            JOIN companies c ON cu.company_id = c.id
            WHERE cu.user_id = auth.uid() AND cu.role = 'superadmin'
        )
    );

-- Create or replace audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (table_name, operation, old_data, new_data, user_id, metadata)
    VALUES (
        TG_TABLE_NAME,
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        auth.uid(),
        jsonb_build_object('timestamp', NOW(), 'session_id', current_setting('request.jwt.claim.sub', true))
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to sensitive tables (only if tables exist)
DO $$
BEGIN
    -- Companies table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
        DROP TRIGGER IF EXISTS audit_companies ON companies;
        CREATE TRIGGER audit_companies AFTER INSERT OR UPDATE OR DELETE ON companies
            FOR EACH ROW EXECUTE FUNCTION audit_trigger();
    END IF;
    
    -- Company users table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_users') THEN
        DROP TRIGGER IF EXISTS audit_company_users ON company_users;
        CREATE TRIGGER audit_company_users AFTER INSERT OR UPDATE OR DELETE ON company_users
            FOR EACH ROW EXECUTE FUNCTION audit_trigger();
    END IF;
    
    -- Company integrations table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_integrations') THEN
        DROP TRIGGER IF EXISTS audit_company_integrations ON company_integrations;
        CREATE TRIGGER audit_company_integrations AFTER INSERT OR UPDATE OR DELETE ON company_integrations
            FOR EACH ROW EXECUTE FUNCTION audit_trigger();
    END IF;
    
    -- Company invitations table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_invitations') THEN
        DROP TRIGGER IF EXISTS audit_company_invitations ON company_invitations;
        CREATE TRIGGER audit_company_invitations AFTER INSERT OR UPDATE OR DELETE ON company_invitations
            FOR EACH ROW EXECUTE FUNCTION audit_trigger();
    END IF;
END $$;

-- =============================================
-- Add Comments for Documentation
-- =============================================

COMMENT ON POLICY "Users can view relevant company invitations" ON company_invitations IS 
'Allows users to view invitations for companies they belong to, invitations they sent, or invitations sent to them';

COMMENT ON POLICY "Company admins can update company details" ON companies IS 
'Allows company administrators to update company information including branding and contact details';

COMMENT ON TABLE audit_logs IS 
'Security audit log tracking all changes to sensitive company data';

COMMENT ON FUNCTION audit_trigger() IS 
'Trigger function that logs all changes to sensitive tables for security auditing';

-- =============================================
-- Create indexes for performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation ON audit_logs(operation);

-- Update existing records to have connected_at timestamp if the column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'company_integrations' AND column_name = 'connected_at'
    ) THEN
        UPDATE company_integrations 
        SET connected_at = created_at 
        WHERE connected_at IS NULL AND created_at IS NOT NULL;
    END IF;
END $$;
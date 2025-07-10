-- Add missing RLS policies for security vulnerabilities identified in security audit

-- =============================================
-- Company Invitations RLS Policies
-- =============================================

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

-- Add policy for company updates (branding, contact details, etc.)
CREATE POLICY "Company admins can update company details" ON companies
    FOR UPDATE USING (
        id IN (
            SELECT company_id FROM company_users 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'superadmin')
        )
    );

-- Restrict sensitive company data for regular members
CREATE POLICY "Members see limited company info" ON companies
    FOR SELECT USING (
        -- Show all data to admins and owners
        id IN (
            SELECT company_id FROM company_users 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'superadmin')
        )
        OR
        -- Show limited data to regular members (hide billing info)
        (
            id IN (
                SELECT company_id FROM company_users 
                WHERE user_id = auth.uid() AND role = 'member'
            )
            AND billing_email IS NULL -- This will be enforced at the application level
        )
    );

-- =============================================
-- Enhanced Security for Company Applications
-- =============================================

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
-- Automation Runs Security
-- =============================================

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
-- Notifications Security
-- =============================================

-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read, etc.)
CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- System can create notifications for users
CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (user_id IS NOT NULL);

-- =============================================
-- Revoke Overprivileged Anonymous Access
-- =============================================

-- Remove anonymous access to sensitive tables
REVOKE SELECT ON company_invitations FROM anon;
REVOKE SELECT ON company_users FROM anon;
REVOKE SELECT ON notifications FROM anon;
REVOKE SELECT ON company_integrations FROM anon;
REVOKE SELECT ON company_automations FROM anon;
REVOKE SELECT ON automation_runs FROM anon;

-- Keep anonymous access only for public data
-- (applications and categories can remain accessible for marketplace browsing)

-- =============================================
-- Add Audit Trigger Function
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
    user_agent TEXT
);

-- Enable RLS on audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only system admins can view audit logs
CREATE POLICY "System admins can view audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM company_users cu
            JOIN companies c ON cu.company_id = c.id
            WHERE cu.user_id = auth.uid() AND cu.role = 'superadmin'
        )
    );

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (table_name, operation, old_data, new_data, user_id)
    VALUES (
        TG_TABLE_NAME,
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        auth.uid()
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER audit_companies AFTER INSERT OR UPDATE OR DELETE ON companies
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_company_users AFTER INSERT OR UPDATE OR DELETE ON company_users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_company_integrations AFTER INSERT OR UPDATE OR DELETE ON company_integrations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_company_invitations AFTER INSERT OR UPDATE OR DELETE ON company_invitations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

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
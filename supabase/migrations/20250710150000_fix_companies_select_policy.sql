-- Fix Companies Table SELECT Policy
-- The current policy blocks access to companies with billing_email set
-- This prevents both regular members AND admins from accessing companies

-- =============================================
-- Drop the problematic SELECT policy
-- =============================================

DROP POLICY IF EXISTS "Members see limited company info" ON companies;

-- =============================================
-- Create a proper SELECT policy for companies
-- =============================================

-- Allow company members to view their companies
-- Sensitive data filtering should be handled at the application level, not via RLS
CREATE POLICY "Company members can view their companies" ON companies
    FOR SELECT USING (
        -- Company owners can see their companies
        owner_uid = auth.uid()
        OR
        -- Company members (all roles) can see companies they belong to
        id IN (
            SELECT company_id FROM company_users 
            WHERE user_id = auth.uid()
        )
    );

-- =============================================
-- Ensure the UPDATE policy is correct
-- =============================================

-- Recreate the UPDATE policy to make sure it's properly set
DROP POLICY IF EXISTS "Company admins can update company details" ON companies;

CREATE POLICY "Company admins can update company details" ON companies
    FOR UPDATE USING (
        -- Company owners can update their companies
        owner_uid = auth.uid()
        OR
        -- Company admins can update companies they have admin access to
        id IN (
            SELECT company_id FROM company_users 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'superadmin')
        )
    );

-- =============================================
-- Add INSERT policy for company creation
-- =============================================

DROP POLICY IF EXISTS "Users can create companies they own" ON companies;

CREATE POLICY "Users can create companies they own" ON companies
    FOR INSERT WITH CHECK (
        owner_uid = auth.uid()
    );

-- =============================================
-- Add documentation
-- =============================================

COMMENT ON POLICY "Company members can view their companies" ON companies IS 
'Allows company members to view companies they belong to. Sensitive data filtering is handled at application level.';

COMMENT ON POLICY "Company admins can update company details" ON companies IS 
'Allows company owners and administrators to update company information including branding and contact details';

COMMENT ON POLICY "Users can create companies they own" ON companies IS 
'Allows authenticated users to create new companies where they are the owner';

-- =============================================
-- Log successful completion
-- =============================================

DO $$
BEGIN
    RAISE NOTICE 'Companies table RLS policies fixed successfully';
    RAISE NOTICE 'Admin users should now be able to update company details including logos';
END $$;
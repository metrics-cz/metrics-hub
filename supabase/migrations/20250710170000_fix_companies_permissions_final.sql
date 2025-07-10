-- Final fix for companies table permissions and RLS policies
-- This addresses the root cause: authenticated role lacks UPDATE permission

-- =============================================
-- Grant basic table permissions to authenticated role
-- =============================================

-- Grant UPDATE permission to authenticated role (this is the main issue!)
GRANT UPDATE ON companies TO authenticated;

-- Also ensure SELECT is granted
GRANT SELECT ON companies TO authenticated;

-- =============================================
-- Clean up duplicate and conflicting RLS policies
-- =============================================

-- Remove the old duplicate SELECT policy
DROP POLICY IF EXISTS "User can select their companies" ON companies;

-- Remove duplicate INSERT policy
DROP POLICY IF EXISTS "Users can insert companies they own" ON companies;

-- Ensure our fixed policies are in place
DROP POLICY IF EXISTS "Company members can view their companies" ON companies;
DROP POLICY IF EXISTS "Company admins can update company details" ON companies;
DROP POLICY IF EXISTS "Users can create companies they own" ON companies;

-- =============================================
-- Create clean, non-conflicting RLS policies
-- =============================================

-- SELECT policy: Allow company members to view their companies
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

-- UPDATE policy: Allow admins to update company details
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

-- INSERT policy: Allow users to create companies they own
CREATE POLICY "Users can create companies they own" ON companies
    FOR INSERT WITH CHECK (
        owner_uid = auth.uid()
    );

-- =============================================
-- Ensure service role has full access
-- =============================================

-- Service role should have full access for server-side operations
GRANT ALL ON companies TO service_role;

-- =============================================
-- Add documentation
-- =============================================

COMMENT ON POLICY "Company members can view their companies" ON companies IS 
'Allows company members to view companies they belong to. Clean policy without conflicts.';

COMMENT ON POLICY "Company admins can update company details" ON companies IS 
'Allows company owners and administrators to update company information including branding and contact details';

COMMENT ON POLICY "Users can create companies they own" ON companies IS 
'Allows authenticated users to create new companies where they are the owner';

-- =============================================
-- Verify the fix
-- =============================================

DO $$
BEGIN
    -- Check that authenticated role now has UPDATE permission
    IF has_table_privilege('authenticated', 'companies', 'UPDATE') THEN
        RAISE NOTICE 'SUCCESS: Authenticated role now has UPDATE permission on companies';
    ELSE
        RAISE WARNING 'ISSUE: Authenticated role still lacks UPDATE permission on companies';
    END IF;
    
    -- Check that service role has full access
    IF has_table_privilege('service_role', 'companies', 'UPDATE') THEN
        RAISE NOTICE 'SUCCESS: Service role has UPDATE permission on companies';
    ELSE
        RAISE WARNING 'ISSUE: Service role lacks UPDATE permission on companies';
    END IF;
    
    RAISE NOTICE 'Companies table permissions fix completed successfully';
    RAISE NOTICE 'Logo upload should now work for admin users';
END $$;
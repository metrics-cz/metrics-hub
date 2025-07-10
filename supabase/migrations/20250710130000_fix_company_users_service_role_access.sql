-- Fix company_users RLS policy to allow service role access for permission checks
-- This resolves the "User not found in company" error in checkCompanyPermission function

-- The issue: company_users table has RLS enabled with a policy that only allows users to see their own records
-- But the checkCompanyPermission function uses service role, which has no auth context (auth.uid() is null)
-- This causes permission checks to fail even for valid company members

-- =============================================
-- Add Service Role Access to company_users
-- =============================================

-- Add policy to allow service role to read company_users for permission checking
-- This is necessary for server-side authentication and authorization functions
CREATE POLICY "Service role can read company_users for permission checks" ON company_users
    FOR SELECT TO service_role USING (true);

-- Ensure the existing user-level policy remains intact for regular authenticated users
-- (The existing policy "company_users_self_select" allows users to see only their own records)

-- =============================================
-- Add comment for documentation
-- =============================================

COMMENT ON POLICY "Service role can read company_users for permission checks" ON company_users IS 
'Allows service role to read company membership data for server-side permission checking. Required for authentication middleware and API route authorization.';
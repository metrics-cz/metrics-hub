-- Fix company_applications RLS policy to allow service role access for API operations
-- This resolves the fetchCompanyApplications error in the apps page

-- The issue: company_applications table has RLS policies that depend on auth.uid()
-- But the API route uses service role, which has no auth context (auth.uid() is null)
-- This causes API queries to fail even after proper authentication and permission checking

-- =============================================
-- Add Service Role Access to company_applications
-- =============================================

-- Add policy to allow service role to read company_applications for API operations
-- This is safe because the API route already performs proper authentication via checkCompanyPermission
CREATE POLICY "Service role can read company_applications for API access" ON company_applications
    FOR SELECT TO service_role USING (true);

-- The existing user-level policies remain intact:
-- - "Company members can view company applications" (for direct user access)
-- - "Company admins can manage applications" (for admin operations)

-- =============================================
-- Add comment for documentation
-- =============================================

COMMENT ON POLICY "Service role can read company_applications for API access" ON company_applications IS 
'Allows service role to read company applications for API routes. Safe because API routes perform proper authentication and company permission checking.';
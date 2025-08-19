-- Fix RLS infinite recursion issue
-- This migration fixes the problematic RLS policies that cause infinite recursion

-- First drop all policies that depend on the functions
DROP POLICY IF EXISTS "Users can view company members" ON company_users;
DROP POLICY IF EXISTS "Users can view company integrations" ON company_integrations;
DROP POLICY IF EXISTS "Users can view company applications" ON company_applications;
DROP POLICY IF EXISTS "Users can view invitations for their companies" ON company_invitations;
DROP POLICY IF EXISTS "Admins can manage company integrations" ON company_integrations;
DROP POLICY IF EXISTS "Admins can manage company applications" ON company_applications;

-- Now drop the functions
DROP FUNCTION IF EXISTS public.has_company_access(UUID);
DROP FUNCTION IF EXISTS public.is_company_admin(UUID);

-- Create RLS-safe function to check company membership
-- This function will bypass RLS to avoid recursion
CREATE OR REPLACE FUNCTION public.has_company_access(target_company_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  membership_exists BOOLEAN;
BEGIN
  -- Use a security definer function that bypasses RLS
  SELECT EXISTS (
    SELECT 1 
    FROM company_users 
    WHERE company_id = target_company_id 
    AND user_id = auth.uid()
  ) INTO membership_exists;
  
  RETURN membership_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS-safe function to check admin role
CREATE OR REPLACE FUNCTION public.is_company_admin(target_company_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Use a security definer function that bypasses RLS
  SELECT EXISTS (
    SELECT 1 
    FROM company_users 
    WHERE company_id = target_company_id 
    AND user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  ) INTO is_admin;
  
  RETURN is_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION public.has_company_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_company_access(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_company_admin(UUID) TO service_role;

-- Create a simple, non-recursive policy for company_users
-- Users can only see their own company memberships
CREATE POLICY "Users can view their own company memberships" ON company_users
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Also allow service role to access all company_users for internal operations
CREATE POLICY "Service role can access all company_users" ON company_users
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Recreate other policies to use the corrected approach
-- Fix company_integrations policies
CREATE POLICY "Users can view company integrations" ON company_integrations
FOR SELECT TO authenticated
USING (public.has_company_access(company_id));

-- Fix company_applications policies  
CREATE POLICY "Users can view company applications" ON company_applications
FOR SELECT TO authenticated
USING (public.has_company_access(company_id));

-- Fix company_invitations policies
CREATE POLICY "Users can view invitations for their companies" ON company_invitations
FOR SELECT TO authenticated
USING (public.has_company_access("companyId"));

-- Recreate admin policies
CREATE POLICY "Admins can manage company integrations" ON company_integrations
FOR ALL TO authenticated
USING (public.is_company_admin(company_id))
WITH CHECK (public.is_company_admin(company_id));

CREATE POLICY "Admins can manage company applications" ON company_applications
FOR ALL TO authenticated
USING (public.is_company_admin(company_id))
WITH CHECK (public.is_company_admin(company_id));

-- Ensure companies table has proper RLS
DROP POLICY IF EXISTS "Users can view their companies" ON companies;
CREATE POLICY "Users can view their companies" ON companies
FOR SELECT TO authenticated
USING (public.has_company_access(id));

-- Add policy for company owners to manage their companies
DROP POLICY IF EXISTS "Company owners can manage their companies" ON companies;
CREATE POLICY "Company owners can manage their companies" ON companies
FOR ALL TO authenticated
USING (owner_uid = auth.uid())
WITH CHECK (owner_uid = auth.uid());

-- Add comments explaining the approach
COMMENT ON FUNCTION public.has_company_access(UUID) IS 'RLS-safe function to check if current user has access to a company. Uses SECURITY DEFINER to bypass RLS and avoid recursion.';
COMMENT ON FUNCTION public.is_company_admin(UUID) IS 'RLS-safe function to check if current user is admin/owner of a company. Uses SECURITY DEFINER to bypass RLS and avoid recursion.';

-- Analyze tables for query planner
ANALYZE company_users;
ANALYZE companies;
ANALYZE company_integrations;
ANALYZE company_applications;
ANALYZE company_invitations;
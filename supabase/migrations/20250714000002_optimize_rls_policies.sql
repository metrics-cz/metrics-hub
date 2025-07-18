-- RLS Policy optimization for better performance
-- This migration optimizes Row Level Security policies to use indexes effectively

-- Drop and recreate notifications RLS policies with better performance
DROP POLICY IF EXISTS "Users can view notifications for their companies" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- Optimized notifications policies
CREATE POLICY "Users can view notifications for their companies" ON notifications
FOR SELECT TO authenticated
USING ("userId" = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
FOR UPDATE TO authenticated
USING ("userId" = auth.uid())
WITH CHECK ("userId" = auth.uid());

-- Optimize company_users RLS policies
DROP POLICY IF EXISTS "Users can view company members" ON company_users;
CREATE POLICY "Users can view company members" ON company_users
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR
  company_id IN (
    SELECT company_id 
    FROM company_users 
    WHERE user_id = auth.uid()
  )
);

-- Optimize company_integrations RLS policies
DROP POLICY IF EXISTS "Users can view company integrations" ON company_integrations;
CREATE POLICY "Users can view company integrations" ON company_integrations
FOR SELECT TO authenticated
USING (
  company_id IN (
    SELECT company_id 
    FROM company_users 
    WHERE user_id = auth.uid() 
      )
);

-- Optimize company_applications RLS policies
DROP POLICY IF EXISTS "Users can view company applications" ON company_applications;
CREATE POLICY "Users can view company applications" ON company_applications
FOR SELECT TO authenticated
USING (
  company_id IN (
    SELECT company_id 
    FROM company_users 
    WHERE user_id = auth.uid() 
      )
);

-- Create a function to check company membership efficiently
CREATE OR REPLACE FUNCTION public.has_company_access(target_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM company_users 
    WHERE company_id = target_company_id 
    AND user_id = auth.uid() 
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check admin role efficiently  
CREATE OR REPLACE FUNCTION public.is_company_admin(target_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM company_users 
    WHERE company_id = target_company_id 
    AND user_id = auth.uid() 
    AND role IN ('admin', 'owner')
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update policies to use the new functions for better performance
DROP POLICY IF EXISTS "Admins can manage company integrations" ON company_integrations;
CREATE POLICY "Admins can manage company integrations" ON company_integrations
FOR ALL TO authenticated
USING (public.is_company_admin(company_id))
WITH CHECK (public.is_company_admin(company_id));

DROP POLICY IF EXISTS "Admins can manage company applications" ON company_applications;
CREATE POLICY "Admins can manage company applications" ON company_applications
FOR ALL TO authenticated
USING (public.is_company_admin(company_id))
WITH CHECK (public.is_company_admin(company_id));

-- Optimize company_invitations RLS policies
DROP POLICY IF EXISTS "Users can view invitations for their companies" ON company_invitations;
CREATE POLICY "Users can view invitations for their companies" ON company_invitations
FOR SELECT TO authenticated
USING (public.has_company_access("companyId"));

-- Add statistics for query planner optimization
ANALYZE company_users;
ANALYZE notifications;
ANALYZE company_integrations;
ANALYZE company_applications;
ANALYZE company_invitations;
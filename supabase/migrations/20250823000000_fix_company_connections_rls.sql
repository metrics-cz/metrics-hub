-- Fix RLS policies for company_connections table
-- Add service role access and ensure proper user permissions

-- Add service role policy for company_connections
CREATE POLICY "service_role_can_manage_company_connections"
ON "public"."company_connections"
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Update the existing policy to include WITH CHECK clause for inserts/updates
DROP POLICY IF EXISTS "company_connections_company_access" ON "public"."company_connections";

CREATE POLICY "company_connections_company_access" ON "public"."company_connections"
    FOR ALL TO authenticated
    USING (
        company_id IN (
            SELECT company_id 
            FROM company_users 
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        company_id IN (
            SELECT company_id 
            FROM company_users 
            WHERE user_id = auth.uid()
        )
    );

-- Add policy for admin/owner level operations (DELETE requires elevated permissions)
CREATE POLICY "company_connections_admin_delete" ON "public"."company_connections"
    FOR DELETE TO authenticated
    USING (
        company_id IN (
            SELECT company_id 
            FROM company_users 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'owner')
        )
    );

-- Add comments for clarity
COMMENT ON POLICY "service_role_can_manage_company_connections" ON "public"."company_connections" 
IS 'Service role can perform all operations on company connections';

COMMENT ON POLICY "company_connections_company_access" ON "public"."company_connections" 
IS 'Users can manage connections for their companies';

COMMENT ON POLICY "company_connections_admin_delete" ON "public"."company_connections" 
IS 'Only admins and owners can delete company connections';
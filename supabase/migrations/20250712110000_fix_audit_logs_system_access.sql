-- Fix audit_logs RLS policy to allow system-level INSERT operations
-- This resolves the "permission denied for table audit_logs" error

-- Drop the restrictive INSERT policy that only allows user-specific inserts
DROP POLICY IF EXISTS "authenticated_users_can_insert_audit_logs" ON audit_logs;

-- Create a new INSERT policy that allows system-level operations
-- This allows both authenticated users and service role to insert audit logs
CREATE POLICY "system_can_insert_audit_logs" ON audit_logs
    FOR INSERT TO authenticated, service_role
    WITH CHECK (true);

-- Ensure proper grants for audit logging
GRANT INSERT ON audit_logs TO authenticated;
GRANT INSERT ON audit_logs TO service_role;

-- Comment explaining the policy change
COMMENT ON POLICY "system_can_insert_audit_logs" ON audit_logs 
IS 'Allows system-level audit log insertions from both authenticated users and service role. This enables audit logging for all application operations without user-specific restrictions.';
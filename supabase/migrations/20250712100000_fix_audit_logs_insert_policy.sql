-- Fix audit_logs RLS policy to allow authenticated users to insert audit log entries
-- This fixes the "permission denied for table audit_logs" error

-- Add INSERT policy for audit_logs table
-- Allow authenticated users to insert their own audit log entries
CREATE POLICY "authenticated_users_can_insert_audit_logs" ON audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Grant INSERT permission to authenticated users on audit_logs table
-- (This might already exist, but ensuring it's there)
GRANT INSERT ON audit_logs TO authenticated;

-- Comment explaining the policy
COMMENT ON POLICY "authenticated_users_can_insert_audit_logs" ON audit_logs 
IS 'Allows authenticated users to insert audit log entries for their own actions. Users can only insert records where user_id matches their auth.uid().';
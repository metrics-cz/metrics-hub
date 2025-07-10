-- Test script to verify security implementations
-- Run this against your Supabase database to verify RLS is working

-- Test 1: Check RLS is enabled on all critical tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM information_schema.table_privileges WHERE table_name = tablename) as policies_count
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('companies', 'company_users', 'company_invitations', 'company_applications', 'company_integrations', 'notifications', 'audit_logs')
ORDER BY tablename;

-- Test 2: Check audit log table exists and has proper structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'audit_logs' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test 3: Check policies exist on critical tables
SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('companies', 'company_users', 'company_invitations', 'company_applications', 'company_integrations', 'notifications')
ORDER BY tablename, policyname;

-- Test 4: Check company_integrations has new security columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'company_integrations' 
AND table_schema = 'public'
AND column_name IN ('connected_by_user_id', 'connected_at', 'last_sync', 'sync_status', 'error_message', 'updated_at')
ORDER BY column_name;

-- Test 5: Check companies table has branding columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND table_schema = 'public'
AND column_name IN ('square_logo_url', 'rectangular_logo_url', 'primary_color', 'secondary_color', 'contact_details', 'updated_at')
ORDER BY column_name;
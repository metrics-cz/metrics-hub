-- Comprehensive analysis of public schema with actual data
-- This will show table structures and sample data

-- Get all tables with row counts
SELECT 
    schemaname,
    tablename,
    n_tup_ins as total_inserts,
    n_tup_upd as total_updates,
    n_tup_del as total_deletes,
    n_live_tup as current_rows,
    n_dead_tup as dead_rows
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY current_rows DESC;

-- Show sample data from each major table
SELECT 'COMPANIES' as table_name, count(*) as row_count FROM companies
UNION ALL
SELECT 'APPLICATIONS', count(*) FROM applications
UNION ALL  
SELECT 'COMPANY_USERS', count(*) FROM company_users
UNION ALL
SELECT 'COMPANY_APPLICATIONS', count(*) FROM company_applications
UNION ALL
SELECT 'SECRETS', count(*) FROM secrets
UNION ALL
SELECT 'EXECUTOR_NODES', count(*) FROM executor_nodes
UNION ALL
SELECT 'EXECUTOR_JOBS', count(*) FROM executor_jobs
UNION ALL
SELECT 'INTEGRATION_HEALTH', count(*) FROM integration_health
UNION ALL
SELECT 'AUTOMATION_SCHEDULES', count(*) FROM automation_schedules
UNION ALL
SELECT 'EXECUTION_RUNS', count(*) FROM execution_runs
UNION ALL
SELECT 'NOTIFICATIONS', count(*) FROM notifications
UNION ALL
SELECT 'INVITATIONS', count(*) FROM invitations
UNION ALL
SELECT 'AUDIT_LOGS', count(*) FROM audit_logs
ORDER BY row_count DESC;
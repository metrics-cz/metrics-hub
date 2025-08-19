-- Verify executor server schema deployment
-- Run this to check what tables and columns exist

-- Check for executor server tables
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN (
        'executor_nodes',
        'executor_jobs', 
        'integration_health',
        'automation_schedules',
        'company_applications',
        'secrets'
    )
ORDER BY table_name;

-- Check applications table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'applications'
    AND column_name IN (
        'app_type',
        'integration_provider', 
        'auth_type',
        'pricing_model_executor',
        'trigger_type'
    )
ORDER BY column_name;

-- Check company_applications table columns  
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'company_applications'
    AND column_name IN (
        'is_enabled',
        'frequency',
        'timezone',
        'next_run_at'
    )
ORDER BY column_name;
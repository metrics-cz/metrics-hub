-- TARGETED Remote Database Cleanup: Executor Server Related Only
-- This script removes ONLY executor server webhook implementations
-- Preserves all other database functionality

-- ====================================
-- STEP 1: Remove Executor Server Triggers
-- ====================================

-- Remove executor server webhook triggers
DROP TRIGGER IF EXISTS executor_webhook_trigger ON company_applications;
DROP TRIGGER IF EXISTS executor_company_applications_insert ON company_applications;
DROP TRIGGER IF EXISTS executor_company_applications_update ON company_applications;
DROP TRIGGER IF EXISTS executor_company_applications_delete ON company_applications;
DROP TRIGGER IF EXISTS company_application_executor_server ON company_applications;

-- ====================================
-- STEP 2: Remove Executor Server Functions
-- ====================================

-- Remove executor server webhook functions
DROP FUNCTION IF EXISTS notify_webhook(TEXT, TEXT, TEXT, JSONB, JSONB);
DROP FUNCTION IF EXISTS trigger_executor_webhook();
DROP FUNCTION IF EXISTS notify_executor_company_applications();
DROP FUNCTION IF EXISTS company_application_executor_server();

-- ====================================
-- STEP 3: Remove Executor Server Tables
-- ====================================

-- Remove executor server webhook tables
DROP TABLE IF EXISTS supabase_webhooks;
DROP TABLE IF EXISTS executor_webhooks;
DROP TABLE IF EXISTS company_application_webhooks;

-- ====================================
-- STEP 4: Clean Up Executor Server Hooks
-- ====================================

-- Remove executor server hooks from Supabase Functions
DELETE FROM supabase_functions.hooks WHERE hook_name ILIKE '%executor%';
DELETE FROM supabase_functions.hooks WHERE hook_name ILIKE '%company_application%';
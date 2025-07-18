-- Performance optimization: Add missing database indexes
-- This migration adds critical indexes for better query performance

-- Company Users table indexes
CREATE INDEX IF NOT EXISTS idx_company_users_user_id 
ON company_users(user_id);

CREATE INDEX IF NOT EXISTS idx_company_users_company_id 
ON company_users(company_id);

CREATE INDEX IF NOT EXISTS idx_company_users_role_company_id 
ON company_users(role, company_id);

-- Company Integrations table indexes
CREATE INDEX IF NOT EXISTS idx_company_integrations_company_id_status 
ON company_integrations(company_id, status) WHERE status = 'connected';

CREATE INDEX IF NOT EXISTS idx_company_integrations_integration_id 
ON company_integrations(integration_id);

CREATE INDEX IF NOT EXISTS idx_company_integrations_connected_at 
ON company_integrations(connected_at DESC);

-- Notifications table indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_unread 
ON notifications("userId", read) WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
ON notifications("createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_type 
ON notifications(type);

-- Company Applications table indexes
CREATE INDEX IF NOT EXISTS idx_company_applications_company_id_active 
ON company_applications(company_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_company_applications_app_id 
ON company_applications(application_id);

CREATE INDEX IF NOT EXISTS idx_company_applications_installed_at 
ON company_applications(installed_at DESC);

-- Company Invitations table indexes
CREATE INDEX IF NOT EXISTS idx_company_invitations_email_status 
ON company_invitations(email, status);

CREATE INDEX IF NOT EXISTS idx_company_invitations_company_id_status 
ON company_invitations("companyId", status);

CREATE INDEX IF NOT EXISTS idx_company_invitations_expires_at 
ON company_invitations("expiresAt");

-- Skip audit logs indexes - table may not exist or have different structure

-- Skip auth users table indexes - no permission to modify auth schema

-- Companies table optimization
CREATE INDEX IF NOT EXISTS idx_companies_active_created 
ON companies(active, created_at DESC) WHERE active = true;

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_company_users_lookup 
ON company_users(company_id, user_id, role);


-- Skip auth sessions table indexes - no permission to modify auth schema

COMMENT ON INDEX idx_company_users_user_id IS 'Optimize user company lookups';
COMMENT ON INDEX idx_company_users_company_id IS 'Optimize company member queries';
COMMENT ON INDEX idx_notifications_user_id_unread IS 'Optimize unread notification queries';
COMMENT ON INDEX idx_company_integrations_company_id_status IS 'Optimize connected integration queries';
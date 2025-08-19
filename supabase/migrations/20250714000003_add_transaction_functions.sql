-- Add transaction management functions for standardized database access

-- Function to begin a transaction
CREATE OR REPLACE FUNCTION begin_transaction()
RETURNS void AS $$
BEGIN
  -- This is just a placeholder - PostgreSQL auto-manages transactions
  -- The actual transaction management happens at the connection level
  NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to commit a transaction  
CREATE OR REPLACE FUNCTION commit_transaction()
RETURNS void AS $$
BEGIN
  -- This is just a placeholder - PostgreSQL auto-manages transactions
  -- The actual transaction management happens at the connection level
  NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to rollback a transaction
CREATE OR REPLACE FUNCTION rollback_transaction()
RETURNS void AS $$
BEGIN
  -- This is just a placeholder - PostgreSQL auto-manages transactions
  -- The actual transaction management happens at the connection level
  NULL;
END;
$$ LANGUAGE plpgsql;

-- Enhanced company user lookup function for better performance
CREATE OR REPLACE FUNCTION get_user_companies(target_user_id UUID)
RETURNS TABLE (
  company_id UUID,
  company_name TEXT,
  company_logo_url TEXT,
  user_role TEXT,
  user_status TEXT,
  joined_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cu.company_id,
    c.name as company_name,
    c.logo_url as company_logo_url,
    cu.role as user_role,
    cu.status as user_status,
    cu.joined_at
  FROM company_users cu
  JOIN companies c ON c.id = cu.company_id
  WHERE cu.user_id = target_user_id
  AND cu.status = 'active'
  AND c.status = 'active'
  ORDER BY cu.joined_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count efficiently
CREATE OR REPLACE FUNCTION get_unread_notification_count(target_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  count_result INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO count_result
  FROM notifications
  WHERE user_id = target_user_id
  AND read_at IS NULL;
  
  RETURN COALESCE(count_result, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all user notifications as read efficiently
CREATE OR REPLACE FUNCTION mark_all_notifications_read(target_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications 
  SET read_at = NOW()
  WHERE user_id = target_user_id
  AND read_at IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has permission for a company
CREATE OR REPLACE FUNCTION check_company_permission(
  target_user_id UUID,
  target_company_id UUID,
  required_roles TEXT[] DEFAULT ARRAY['member', 'admin', 'owner']
)
RETURNS TABLE (
  has_permission BOOLEAN,
  user_role TEXT,
  user_status TEXT
) AS $$
DECLARE
  result_role TEXT;
  result_status TEXT;
BEGIN
  SELECT cu.role, cu.status 
  INTO result_role, result_status
  FROM company_users cu
  WHERE cu.user_id = target_user_id
  AND cu.company_id = target_company_id
  AND cu.status = 'active'
  AND cu.role = ANY(required_roles);
  
  IF result_role IS NOT NULL THEN
    RETURN QUERY SELECT true, result_role, result_status;
  ELSE
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get company integrations with details
CREATE OR REPLACE FUNCTION get_company_integrations(target_company_id UUID)
RETURNS TABLE (
  integration_id UUID,
  integration_name TEXT,
  integration_key TEXT,
  status TEXT,
  connected_at TIMESTAMPTZ,
  config JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ci.id as integration_id,
    ci.name as integration_name,
    i.integration_key,
    ci.status,
    ci.connected_at,
    ci.config
  FROM company_integrations ci
  JOIN integrations i ON i.id = ci.integration_id
  WHERE ci.company_id = target_company_id
  ORDER BY ci.connected_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant appropriate permissions
GRANT EXECUTE ON FUNCTION begin_transaction() TO authenticated;
GRANT EXECUTE ON FUNCTION commit_transaction() TO authenticated;
GRANT EXECUTE ON FUNCTION rollback_transaction() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_companies(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_company_permission(UUID, UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_company_integrations(UUID) TO authenticated;
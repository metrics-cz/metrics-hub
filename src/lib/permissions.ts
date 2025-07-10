// Permission utility functions for role-based access control

// Define the roles that can manage integration settings
const SETTINGS_MANAGEMENT_ROLES = ['admin', 'superadmin', 'owner'];

// Define the roles that can install/uninstall integrations
const INTEGRATION_MANAGEMENT_ROLES = ['admin', 'superadmin', 'owner'];

/**
 * Check if a user role can manage integration settings
 */
export function canManageIntegrationSettings(userRole?: string): boolean {
  if (!userRole) return false;
  return SETTINGS_MANAGEMENT_ROLES.includes(userRole);
}

/**
 * Check if a user role can install/uninstall integrations
 */
export function canManageIntegrations(userRole?: string): boolean {
  if (!userRole) return false;
  return INTEGRATION_MANAGEMENT_ROLES.includes(userRole);
}

/**
 * Check if a user role is an admin or higher
 */
export function isAdminOrHigher(userRole?: string): boolean {
  if (!userRole) return false;
  return ['admin', 'superadmin', 'owner'].includes(userRole);
}

/**
 * Check if a user role is owner
 */
export function isOwner(userRole?: string): boolean {
  return userRole === 'owner';
}
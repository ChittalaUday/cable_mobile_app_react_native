/**
 * User roles in the application.
 */
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  STAFF: 'staff',
  CUSTOMER: 'customer',
} as const;

/**
 * React Query key constants.
 */
export const QUERY_KEYS = {
  ADMIN_DASHBOARD: 'admin-dashboard',
  USER_ACCESS: 'user-access',
  APP_REGISTRY: 'app-registry',
  PACKAGES: 'packages',
} as const;

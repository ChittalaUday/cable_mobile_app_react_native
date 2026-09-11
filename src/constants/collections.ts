/**
 * Firestore collection name constants.
 */
export const COLLECTIONS = {
  USERS: 'users',
  TENANTS: 'tenants',
  CUSTOMERS: 'customers',
  CUSTOMER_ACCOUNTS: 'customer_accounts',
  PAYMENTS: 'payments',
  TICKETS: 'tickets',
  SERVICES: 'services',
  PACKAGES: 'packages',
  SERVICE_PROVIDERS: 'service_providers',
  PERMISSION_REGISTRY: 'permissionRegistry',
  ROLES: 'roles',
  USER_ACCESS: 'userAccess',
  APP_REGISTRY: 'appRegistry',
  TEAMS: 'teams',
  LOCATIONS: 'locations',
  AREAS: 'areas',
  COMPLAINTS: 'complaints',
  ASSETS: 'assets',
  INVENTORY: 'inventory',
  DEALERS: 'dealers',
} as const;

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
} as const;

/**
 * Common error messages.
 */
export const ERROR_MESSAGES = {
  NO_TENANT_ID: 'No tenant ID available for current user',
  ACCOUNT_ACCESS_UNAVAILABLE: 'Account access unavailable',
  GOOGLE_TOKEN_MISSING: 'Google sign-in did not return a token.',
} as const;

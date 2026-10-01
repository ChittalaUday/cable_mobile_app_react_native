/**
 * Permission scopes representing access boundaries.
 */
export type PermissionScope = 'OWN' | 'ASSIGNED' | 'TEAM' | 'AREA' | 'LOCATION' | 'ALL';

/**
 * Scope hierarchy ranking: ALL > LOCATION > AREA > TEAM > ASSIGNED > OWN
 */
export const SCOPE_HIERARCHY: Record<PermissionScope, number> = {
  OWN: 1,
  ASSIGNED: 2,
  TEAM: 3,
  AREA: 4,
  LOCATION: 5,
  ALL: 6,
};

/**
 * Standard resource.action permission definitions.
 */
export const PERMISSIONS = {
  // Users
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',

  // Customers
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_CREATE: 'customers.create',
  CUSTOMERS_UPDATE: 'customers.update',
  CUSTOMERS_DELETE: 'customers.delete',

  // Staff
  STAFF_VIEW: 'staff.view',
  STAFF_CREATE: 'staff.create',
  STAFF_UPDATE: 'staff.update',

  // Complaints. The server calls them tickets, and these strings are matched
  // against its grants verbatim — `complaints.*` matched nothing, so every
  // guard behind them was silently closed.
  TICKETS_VIEW: 'tickets.view',
  TICKETS_CREATE: 'tickets.create',
  TICKETS_UPDATE: 'tickets.update',
  TICKETS_ASSIGN: 'tickets.assign',
  TICKETS_RESOLVE: 'tickets.resolve',
  TICKETS_DELETE: 'tickets.delete',

  // Payments
  PAYMENTS_VIEW: 'payments.view',
  PAYMENTS_CREATE: 'payments.create',
  PAYMENTS_UPDATE: 'payments.update',
  PAYMENTS_DELETE: 'payments.delete',
  PAYMENTS_COLLECT: 'payments.collect',

  // Assets
  ASSETS_VIEW: 'assets.view',
  ASSETS_CREATE: 'assets.create',
  ASSETS_UPDATE: 'assets.update',
  ASSETS_ASSIGN: 'assets.assign',
  ASSETS_UNASSIGN: 'assets.unassign',
  ASSETS_TRANSFER: 'assets.transfer',
  ASSETS_DELETE: 'assets.delete',

  // Locations
  LOCATIONS_VIEW: 'locations.view',
  LOCATIONS_CREATE: 'locations.create',
  LOCATIONS_UPDATE: 'locations.update',
  LOCATIONS_DELETE: 'locations.delete',
  LOCATIONS_CONFIGURE: 'locations.configure',

  // Areas
  AREAS_VIEW: 'areas.view',
  AREAS_CREATE: 'areas.create',
  AREAS_UPDATE: 'areas.update',
  AREAS_DELETE: 'areas.delete',

  // Dealers
  DEALERS_VIEW: 'dealers.view',
  DEALERS_CREATE: 'dealers.create',
  DEALERS_UPDATE: 'dealers.update',
  DEALERS_DELETE: 'dealers.delete',

  // Packages & Plans
  PACKAGES_VIEW: 'packages.view',
  PACKAGES_CREATE: 'packages.create',
  PACKAGES_UPDATE: 'packages.update',
  PACKAGES_DELETE: 'packages.delete',

  // Service catalogue
  SERVICES_VIEW: 'services.view',
  SERVICES_CREATE: 'services.create',
  SERVICES_UPDATE: 'services.update',
  SERVICES_DELETE: 'services.delete',

  // Inventory
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_UPDATE: 'inventory.update',
  INVENTORY_ISSUE: 'inventory.issue',

  // Remotes & notifications
  REMOTES_VIEW: 'remotes.view',
  NOTIFICATIONS_SEND: 'notifications.send',

  // Reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',

  // Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_UPDATE: 'settings.update',

  // Roles & Permissions
  ROLES_VIEW: 'roles.view',
  ROLES_CREATE: 'roles.create',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',
  PERMISSIONS_VIEW: 'permissions.view',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

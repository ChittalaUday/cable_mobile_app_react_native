import type { PermissionKey, PermissionScope } from '@/constants/permissions';

/**
 * Definition of a single permission in permissionRegistry.
 */
export type PermissionRegistryItem = {
  key: PermissionKey;
  resource: string;
  action: string;
  name: string;
  description?: string;
  module: string;
  allowedScopes: PermissionScope[];
  enabled: boolean;
  system: boolean;
};

/**
 * Permission assignment inside a role doc.
 */
export type RolePermissionSetting = {
  scope: PermissionScope;
};

/**
 * Role document stored in `roles/{roleId}`.
 */
export type RoleDoc = {
  id: string;
  name: string;
  description?: string;
  permissions: Record<string, RolePermissionSetting>;
  system: boolean;
  enabled: boolean;
};

/**
 * Compiled authorization document stored in `userAccess/{uid}`.
 */
export type UserAccessDoc = {
  uid: string;
  permissions: Record<string, PermissionScope>;
  locationIds: Record<string, boolean>;
  areaIds: Record<string, boolean>;
  tenantId?: string | null;
  tenantIds?: string[];
  teamId?: string | null;
  version: number;
  updatedAt?: string;
};

/**
 * User document context used for compilation and checks.
 */
export type UserProfileDoc = {
  uid: string;
  name?: string | null;
  phone?: string | null;
  roleIds: string[];
  tenantId?: string | null;
  tenantIds?: string[];
  teamId?: string | null;
  locationIds?: string[];
  areaIds?: string[];
  active?: boolean;
  permissionOverrides?: Record<
    string,
    { effect: 'ALLOW' | 'DENY'; scope?: PermissionScope }
  >;
};

/**
 * Item types supported in appRegistry.
 */
export type RegistryItemType = 'screen' | 'action' | 'report' | 'setting';

/**
 * App Registry item stored in `appRegistry/{id}` for search, navigation & actions.
 */
export type AppRegistryItem = {
  id: string;
  key: string;
  type: RegistryItemType;
  title: string;
  description?: string;
  route: string;
  icon?: string;
  keywords: string[];
  requiredPermission: PermissionKey;
  searchable: boolean;
  enabled: boolean;
  order?: number;
  featured?: boolean;
};

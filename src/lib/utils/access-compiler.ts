import type { PermissionKey, PermissionScope } from '@/constants/permissions';
import type { RoleDoc, UserAccessDoc, UserProfileDoc } from '@/types/access';
import { SCOPE_HIERARCHY } from '@/constants/permissions';

/**
 * Merges multiple scopes by selecting the highest ranking scope in hierarchy.
 */
export function mergeScopes(scopeA: PermissionScope, scopeB: PermissionScope): PermissionScope {
  return SCOPE_HIERARCHY[scopeA] >= SCOPE_HIERARCHY[scopeB] ? scopeA : scopeB;
}

/**
 * Compiles a UserAccessDoc from a user profile and assigned role documents.
 * This compiles roles + user context into a compact authorization document.
 */
export function compileUserAccess(
  user: UserProfileDoc,
  roles: RoleDoc[],
  version = 1,
): UserAccessDoc {
  const mergedPermissions: Record<string, PermissionScope> = {};

  // 1. Merge permissions from all assigned roles
  const activeRoleIds = new Set(user.roleIds || []);
  for (const role of roles) {
    if (!role.enabled || !activeRoleIds.has(role.id))
      continue;

    for (const [permKey, setting] of Object.entries(role.permissions)) {
      if (!setting || !setting.scope)
        continue;
      const currentScope = mergedPermissions[permKey];
      mergedPermissions[permKey] = currentScope
        ? mergeScopes(currentScope, setting.scope)
        : setting.scope;
    }
  }

  // 2. Apply user-specific permission overrides (DENY takes precedence, ALLOW adds/overrides)
  if (user.permissionOverrides) {
    for (const [permKey, override] of Object.entries(user.permissionOverrides)) {
      if (override.effect === 'DENY') {
        delete mergedPermissions[permKey];
      }
      else if (override.effect === 'ALLOW' && override.scope) {
        const currentScope = mergedPermissions[permKey];
        mergedPermissions[permKey] = currentScope
          ? mergeScopes(currentScope, override.scope)
          : override.scope;
      }
    }
  }

  // 3. Convert location IDs and area IDs arrays to lookup maps for fast rule evaluation
  const locationLookup: Record<string, boolean> = {};
  if (user.locationIds) {
    for (const locId of user.locationIds) {
      if (locId)
        locationLookup[locId] = true;
    }
  }

  const areaLookup: Record<string, boolean> = {};
  if (user.areaIds) {
    for (const areaId of user.areaIds) {
      if (areaId)
        areaLookup[areaId] = true;
    }
  }

  return {
    uid: user.uid,
    permissions: mergedPermissions,
    locationIds: locationLookup,
    areaIds: areaLookup,
    teamId: user.teamId ?? null,
    version,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Metadata of a target resource document being checked against user's scope.
 */
export type ResourceMeta = {
  createdBy?: string | null;
  assignedTo?: string | null;
  teamId?: string | null;
  locationId?: string | null;
  areaId?: string | null;
};

/**
 * Evaluates whether a user's compiled access permits an action on a specific resource.
 */
export function evaluateScopeAccess(
  userAccess: UserAccessDoc | null,
  permissionKey: PermissionKey | string,
  resourceMeta?: ResourceMeta,
): boolean {
  if (!userAccess)
    return false;

  const grantedScope = userAccess.permissions[permissionKey];
  if (!grantedScope)
    return false;

  if (grantedScope === 'ALL')
    return true;

  if (!resourceMeta)
    return true;

  if (grantedScope === 'LOCATION' && resourceMeta.locationId) {
    return Boolean(userAccess.locationIds?.[resourceMeta.locationId]);
  }

  if (grantedScope === 'AREA' && resourceMeta.areaId) {
    return Boolean(userAccess.areaIds?.[resourceMeta.areaId]);
  }

  if (grantedScope === 'TEAM' && resourceMeta.teamId) {
    return userAccess.teamId === resourceMeta.teamId;
  }

  if (grantedScope === 'ASSIGNED' && resourceMeta.assignedTo) {
    return resourceMeta.assignedTo === userAccess.uid;
  }

  if (grantedScope === 'OWN' && resourceMeta.createdBy) {
    return resourceMeta.createdBy === userAccess.uid;
  }

  return false;
}

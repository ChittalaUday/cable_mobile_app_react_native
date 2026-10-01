import type { PermissionKey, PermissionScope } from '@/constants/permissions';
import type { ResourceMeta } from '@/lib/utils/access-compiler';
import * as React from 'react';
import { SCOPE_HIERARCHY } from '@/constants/permissions';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';
import { evaluateScopeAccess } from '@/lib/utils/access-compiler';

export function usePermissions() {
  const user = useAuthStore.use.user();
  const tenantId = useAuthStore.use.tenantId();
  const memberships = useAuthStore.use.memberships();
  const status = useAuthStore.use.status();
  const membership = memberships.find(item => item.tenantId === tenantId);
  const permissions = React.useMemo(
    () => Object.fromEntries(membership?.permissions?.map(item => [item.key, item.scope]) ?? []),
    [membership],
  );
  const userAccess = React.useMemo(() => user && membership
    ? {
        uid: user.uid,
        permissions,
        locationIds: {},
        areaIds: {},
        tenantId: membership.tenantId,
        tenantIds: memberships.map(item => item.tenantId),
        teamId: membership.teamId ?? null,
        version: membership.permissionVersion ?? 0,
      }
    : null, [membership, memberships, permissions, user]);
  const isLoading = status === 'idle';

  /**
   * Checks if the user has a granted permission.
   */
  const can = React.useCallback(
    (permissionKey: PermissionKey | string): boolean => {
      return Boolean(permissions[permissionKey]);
    },
    [permissions],
  );

  /**
   * Gets the granted scope for a permission key, or null if ungranted.
   */
  const getScope = React.useCallback(
    (permissionKey: PermissionKey | string): PermissionScope | null => {
      return permissions[permissionKey] || null;
    },
    [permissions],
  );

  /**
   * Checks if the user has a permission with at least the required scope level.
   */
  const hasScope = React.useCallback(
    (permissionKey: PermissionKey | string, requiredScope: PermissionScope): boolean => {
      const currentScope = permissions[permissionKey];
      if (!currentScope)
        return false;
      return SCOPE_HIERARCHY[currentScope] >= SCOPE_HIERARCHY[requiredScope];
    },
    [permissions],
  );

  /**
   * Evaluates if an action on a specific resource is permitted given the resource metadata.
   */
  const evaluateResource = React.useCallback(
    (permissionKey: PermissionKey | string, resourceMeta?: ResourceMeta): boolean => {
      return evaluateScopeAccess(userAccess, permissionKey, resourceMeta);
    },
    [userAccess],
  );

  return {
    can,
    getScope,
    hasScope,
    evaluateResource,
    permissions,
    isLoading,
    userAccess,
  };
}

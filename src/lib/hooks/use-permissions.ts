import type { PermissionKey, PermissionScope } from '@/constants/permissions';
import type { ResourceMeta } from '@/lib/utils/access-compiler';
import * as React from 'react';
import { SCOPE_HIERARCHY } from '@/constants/permissions';
import { useAccessStore } from '@/lib/hooks/use-access-store';
import { evaluateScopeAccess } from '@/lib/utils/access-compiler';

export function usePermissions() {
  const userAccess = useAccessStore.use.userAccess();
  const permissions = useAccessStore.use.permissions();
  const isLoading = useAccessStore.use.isLoading();

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

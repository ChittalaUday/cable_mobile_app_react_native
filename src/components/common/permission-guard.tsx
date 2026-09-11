import type { PermissionKey, PermissionScope } from '@/constants/permissions';
import type { ResourceMeta } from '@/lib/utils/access-compiler';
import * as React from 'react';
import { usePermissions } from '@/lib/hooks/use-permissions';

export type PermissionGuardProps = {
  permission: PermissionKey | string;
  scope?: PermissionScope;
  resourceMeta?: ResourceMeta;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

/**
 * UI Guard component that conditionally renders content based on user permissions and scopes.
 *
 * Example:
 *   <PermissionGuard permission={PERMISSIONS.CUSTOMERS_CREATE}>
 *     <AddCustomerButton />
 *   </PermissionGuard>
 */
export function PermissionGuard({
  permission,
  scope,
  resourceMeta,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const { can, hasScope, evaluateResource } = usePermissions();

  const isPermitted = can(permission);
  if (!isPermitted)
    return <>{fallback}</>;

  if (scope && !hasScope(permission, scope))
    return <>{fallback}</>;

  if (resourceMeta && !evaluateResource(permission, resourceMeta))
    return <>{fallback}</>;

  return <>{children}</>;
}

import { renderHook } from '@testing-library/react-native';
import { act } from 'react';

import { usePermissions } from '@/lib/hooks/common/use-permissions';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';

describe('usePermissions', () => {
  it('uses the selected membership permissions returned by the API', () => {
    act(() => useAuthStore.setState({
      status: 'signIn',
      tenantId: 'tenant-1',
      memberships: [{
        tenantId: 'tenant-1',
        tenantName: 'Satya Cable',
        roleId: 'admin',
        teamId: 'team-1',
        permissions: [{ key: 'customers.view', scope: 'ALL' }],
      }],
      user: {
        uid: 'user-1',
        email: 'admin@sscn.com',
        displayName: 'Admin',
        photoURL: null,
        phone: null,
        phoneNumber: null,
        isSuperAdmin: false,
        isAnonymous: false,
      },
    }));

    const { result } = renderHook(() => usePermissions());

    expect(result.current.can('customers.view')).toBe(true);
    expect(result.current.hasScope('customers.view', 'LOCATION')).toBe(true);
    expect(result.current.userAccess?.teamId).toBe('team-1');
  });
});

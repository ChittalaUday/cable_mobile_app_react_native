import { setSessionExpiredHandler } from '@/lib/api/client';
import { authApi } from '@/lib/api/routes/auth';
import { removeTenantId, setTenantId, setToken } from '@/lib/auth/utils';
import { useAuthStore } from '@/lib/hooks/use-auth-store';

jest.mock('@/lib/api/routes/auth', () => ({
  authApi: { login: jest.fn(), logout: jest.fn(), logoutEverywhere: jest.fn(), me: jest.fn(), requestOtp: jest.fn(), verifyOtp: jest.fn() },
}));

jest.mock('@/lib/api/client', () => ({ setSessionExpiredHandler: jest.fn() }));

jest.mock('@/lib/auth/utils', () => ({
  getToken: jest.fn(),
  removeTenantId: jest.fn(),
  removeToken: jest.fn(),
  setTenantId: jest.fn(),
  setToken: jest.fn(),
}));

describe('useAuthStore OTP authentication', () => {
  it('persists tokens and hydrates the backend membership', async () => {
    jest.mocked(authApi.verifyOtp).mockResolvedValue({
      accessToken: 'access-token',
      expiresIn: 900,
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      user: { id: 'user-id', email: null, phone: '9876543210', name: 'Uday', photoUrl: null, isSuperAdmin: false },
    });
    jest.mocked(authApi.me).mockResolvedValue({
      deviceId: 'device-id',
      memberships: [{ tenantId: 'tenant-id', roleId: 'admin' }],
      sessionId: 'session-id',
      user: { id: 'user-id', email: null, phone: '9876543210', name: 'Uday', photoUrl: null, isSuperAdmin: false },
    });

    await useAuthStore.getState().verifyOtp('9876543210', '123456');

    expect(setToken).toHaveBeenCalledWith({ access: 'access-token', refresh: 'refresh-token' });
    expect(useAuthStore.getState()).toMatchObject({ role: 'admin', status: 'signIn', tenantId: 'tenant-id' });

    // The API client reads the tenant from storage, not from this store — a
    // member of two tenants gets 400 TENANT_HEADER_MISSING without it.
    expect(setTenantId).toHaveBeenCalledWith('tenant-id');

    jest.mocked(setSessionExpiredHandler).mock.calls[0][0]();
    expect(useAuthStore.getState()).toMatchObject({ role: null, status: 'signOut', tenantId: null });
    expect(removeTenantId).toHaveBeenCalled();
  });

  it('mirrors a tenant switch to storage, so the next request acts in it', async () => {
    jest.mocked(authApi.me).mockResolvedValue({
      deviceId: 'device-id',
      memberships: [{ tenantId: 'tenant-a', roleId: 'admin' }, { tenantId: 'tenant-b', roleId: 'staff' }],
      sessionId: 'session-id',
      user: { id: 'user-id', email: null, phone: '9876543210', name: 'Uday', photoUrl: null, isSuperAdmin: false },
    });
    jest.mocked(authApi.verifyOtp).mockResolvedValue({
      accessToken: 'access-token',
      expiresIn: 900,
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      user: { id: 'user-id', email: null, phone: '9876543210', name: 'Uday', photoUrl: null, isSuperAdmin: false },
    });

    await useAuthStore.getState().verifyOtp('9876543210', '123456');
    expect(setTenantId).toHaveBeenLastCalledWith('tenant-a');

    useAuthStore.getState().switchTenant('tenant-b');
    expect(useAuthStore.getState().tenantId).toBe('tenant-b');
    expect(setTenantId).toHaveBeenLastCalledWith('tenant-b');
  });
});

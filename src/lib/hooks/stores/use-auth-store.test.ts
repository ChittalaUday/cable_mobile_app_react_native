import type { AuthResponse, OtpChallengeResponse, OtpRequestResponse } from '@/lib/api/types';
import { client, setSessionExpiredHandler } from '@/lib/api/client';
import { getTenantId, getToken, removeTenantId, removeToken, setTenantId, setToken } from '@/lib/auth/utils';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';
import { httpResponse } from '@/test/http';

jest.mock('@/lib/api/client', () => ({
  client: {
    get: jest.fn(),
    post: jest.fn(),
  },
  setSessionExpiredHandler: jest.fn(),
}));
jest.mock('@/lib/auth/utils', () => ({
  getTenantId: jest.fn(),
  getToken: jest.fn(),
  removeTenantId: jest.fn(),
  removeToken: jest.fn(),
  setTenantId: jest.fn(),
  setToken: jest.fn(),
}));
describe('useAuthStore OTP authentication', () => {
  it('persists tokens and hydrates the backend membership', async () => {
    jest.mocked(client.post).mockResolvedValueOnce(httpResponse<AuthResponse>({
      accessToken: 'access-token',
      expiresIn: 900,
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      memberships: [{ tenantId: 'tenant-id', tenantName: 'Alpha Cable', roleId: 'admin', membershipId: 'membership-test', status: 'active', permissionVersion: 1, teamId: null, permissions: [] }],
      user: { id: 'user-id', email: null, phone: '9876543210', name: 'Uday', photoUrl: null },
    }));
    await useAuthStore.getState().verifyOtp('9876543210', '123456');
    // Sign-in carries the memberships, so signing in costs one request.
    expect(client.get).not.toHaveBeenCalled();
    expect(setToken).toHaveBeenCalledWith({ access: 'access-token', refresh: 'refresh-token' });
    expect(useAuthStore.getState()).toMatchObject({ role: 'admin', status: 'signIn', tenantId: 'tenant-id' });
    // The API client reads the tenant from storage, not from this store
    expect(setTenantId).toHaveBeenCalledWith('tenant-id');
    jest.mocked(setSessionExpiredHandler).mock.calls[0][0]();
    expect(useAuthStore.getState()).toMatchObject({ role: null, status: 'signOut', tenantId: null });
    expect(removeTenantId).toHaveBeenCalled();
  });
  it('mirrors a tenant switch to storage, so the next request acts in it', async () => {
    jest.mocked(client.post).mockResolvedValueOnce(httpResponse<AuthResponse>({
      accessToken: 'access-token',
      expiresIn: 900,
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      memberships: [{ tenantId: 'tenant-a', tenantName: 'Alpha Cable', roleId: 'admin', membershipId: 'membership-test', status: 'active', permissionVersion: 1, teamId: null, permissions: [] }, { tenantId: 'tenant-b', tenantName: 'Beta Cable', roleId: 'staff', membershipId: 'membership-test', status: 'active', permissionVersion: 1, teamId: null, permissions: [] }],
      user: { id: 'user-id', email: null, phone: '9876543210', name: 'Uday', photoUrl: null },
    }));
    await useAuthStore.getState().verifyOtp('9876543210', '123456');
    // Two memberships is a question, not a default. Picking one here is silent
    // and wrong half the time, and the app would file records into it.
    expect(useAuthStore.getState()).toMatchObject({ status: 'signIn', tenantId: null, role: null });
    expect(setTenantId).not.toHaveBeenCalledWith('tenant-a');
    useAuthStore.getState().switchTenant('tenant-b');
    expect(useAuthStore.getState()).toMatchObject({ tenantId: 'tenant-b', role: 'staff' });
    // The API client reads the tenant from storage, not from this store.
    expect(setTenantId).toHaveBeenLastCalledWith('tenant-b');
  });
  it('takes the only membership there is, because one is not a choice', async () => {
    jest.mocked(client.post).mockResolvedValueOnce(httpResponse<AuthResponse>({
      accessToken: 'access-token',
      expiresIn: 900,
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      memberships: [{ tenantId: 'only-tenant', tenantName: 'Alpha Cable', roleId: 'admin', membershipId: 'membership-test', status: 'active', permissionVersion: 1, teamId: null, permissions: [] }],
      user: { id: 'user-id', email: null, phone: '9876543210', name: 'Uday', photoUrl: null },
    }));
    await useAuthStore.getState().verifyOtp('9876543210', '123456');
    expect(useAuthStore.getState()).toMatchObject({ tenantId: 'only-tenant', role: 'admin' });
  });
});
describe('requesting an OTP', () => {
  beforeEach(() => jest.clearAllMocks());
  it('hands the screen the cooldown the server asked for, and the channel it used', async () => {
    jest.mocked(client.post).mockResolvedValueOnce(httpResponse<OtpRequestResponse>({ status: 'accepted', channel: 'sms', expiresInSeconds: 300, nextCooldownSeconds: 120 }));
    // The ladder is the server's to decide: a second unverified resend costs
    // 120s. The channel comes back too, because WhatsApp may have been down and
    // the code gone by SMS — the person has to be told where to look.
    await expect(useAuthStore.getState().requestOtp('9876543210', 'whatsapp'))
      .resolves
      .toEqual({ expiresInSeconds: 300, nextCooldownSeconds: 120, channel: 'sms' });
    expect(client.post).toHaveBeenCalledWith('/auth/otp/request', { phone: '9876543210', channel: 'whatsapp' });
  });
  it('leaves the channel out when the caller has no preference', async () => {
    jest.mocked(client.post).mockResolvedValueOnce(httpResponse<OtpRequestResponse>({ status: 'accepted', channel: 'whatsapp', expiresInSeconds: 300, nextCooldownSeconds: 60 }));
    await useAuthStore.getState().requestOtp('9876543210');
    // Sending `channel: undefined` would override the server's own default.
    expect(client.post).toHaveBeenCalledWith('/auth/otp/request', { phone: '9876543210' });
  });
  it('falls back to the base cooldown when the server sends none', async () => {
    // A backend older than the ladder. Without the fallback the resend button
    // counts down from undefined and never re-enables.
    jest.mocked(client.post).mockResolvedValueOnce(httpResponse<Omit<OtpRequestResponse, 'nextCooldownSeconds'>>({ status: 'accepted', channel: 'whatsapp', expiresInSeconds: 300 }));
    await expect(useAuthStore.getState().requestOtp('9876543210'))
      .resolves
      .toEqual({ expiresInSeconds: 300, nextCooldownSeconds: 60, channel: 'whatsapp' });
  });
});
describe('a password that needs an emailed code as well', () => {
  beforeEach(() => jest.clearAllMocks());
  it('hands back the challenge and stores no tokens', async () => {
    jest.mocked(client.post).mockResolvedValueOnce(httpResponse<OtpChallengeResponse>({
      status: 'otp_required',
      challengeToken: 'challenge-1',
      channel: 'email',
      expiresInSeconds: 300,
      nextCooldownSeconds: 60,
    }));
    const challenge = await useAuthStore.getState().signIn('operator@satya.test', 'pw');
    expect(challenge).toMatchObject({ status: 'otp_required', challengeToken: 'challenge-1' });
    // Half a sign-in is not a sign-in: no token is persisted, so nothing the
    // api client reads will start authenticating requests.
    expect(setToken).not.toHaveBeenCalled();
  });
  it('signs in once the emailed code is verified against the challenge', async () => {
    jest.mocked(client.post).mockResolvedValueOnce(httpResponse<AuthResponse>({
      accessToken: 'access-token',
      expiresIn: 900,
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      memberships: [{ tenantId: 'tenant-id', tenantName: 'Alpha Cable', roleId: 'admin', membershipId: 'membership-test', status: 'active', permissionVersion: 1, teamId: null, permissions: [] }],
      user: { id: 'user-id', email: 'operator@satya.test', phone: null, name: 'Op', photoUrl: null },
    }));
    await useAuthStore.getState().verifyEmailCode('challenge-1', '135791');
    expect(client.post).toHaveBeenCalledWith('/auth/otp/verify', { challengeToken: 'challenge-1', code: '135791' });
    expect(setToken).toHaveBeenCalledWith({ access: 'access-token', refresh: 'refresh-token' });
    expect(useAuthStore.getState().status).toBe('signIn');
  });
  it('resends against the challenge, not a phone number', async () => {
    jest.mocked(client.post).mockResolvedValueOnce(httpResponse<OtpRequestResponse>({ status: 'accepted', channel: 'email', expiresInSeconds: 300, nextCooldownSeconds: 120 }));
    await expect(useAuthStore.getState().resendEmailCode('challenge-1'))
      .resolves
      .toEqual({ expiresInSeconds: 300, nextCooldownSeconds: 120, channel: 'email' });
    expect(client.post).toHaveBeenCalledWith('/auth/otp/request', { challengeToken: 'challenge-1' });
  });
  it('returns null from a sign-in that needed no code', async () => {
    jest.mocked(client.post).mockResolvedValueOnce(httpResponse<AuthResponse>({
      accessToken: 'access-token',
      expiresIn: 900,
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      memberships: [{ tenantId: 'tenant-id', tenantName: 'Alpha Cable', roleId: 'admin', membershipId: 'membership-test', status: 'active', permissionVersion: 1, teamId: null, permissions: [] }],
      user: { id: 'user-id', email: 'operator@satya.test', phone: null, name: 'Op', photoUrl: null },
    }));
    await expect(useAuthStore.getState().signIn('operator@satya.test', 'pw')).resolves.toBeNull();
    expect(useAuthStore.getState().status).toBe('signIn');
  });
});
describe('restoring a session on launch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getToken).mockReturnValue({ access: 'a', refresh: 'r' });
  });
  it('keeps the token when the request fails for a reason that is not the session', async () => {
    // A timeout is the common one: a phone on a bad connection at launch.
    jest.mocked(client.get).mockRejectedValueOnce(Object.assign(new Error('timeout of 15000ms exceeded'), {
      code: 'ECONNABORTED',
    }));
    useAuthStore.getState().hydrate();
    await new Promise(resolve => setTimeout(resolve, 0));
    // The refresh token is good for 30 days — throwing it away here is what
    // signs people out for no reason.
    expect(removeToken).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe('idle');
    expect(useAuthStore.getState().error).toContain('timeout');
  });
  it('keeps the token through a server error too', async () => {
    jest.mocked(client.get).mockRejectedValueOnce(Object.assign(new Error('boom'), {
      response: { status: 500, data: { code: 'INTERNAL' } },
    }));
    useAuthStore.getState().hydrate();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(removeToken).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe('idle');
  });
  it('signs out only when the server rejects the session', async () => {
    jest.mocked(client.get).mockRejectedValueOnce(Object.assign(new Error('revoked'), {
      response: { status: 401, data: { code: 'AUTH_SESSION_REVOKED' } },
    }));
    useAuthStore.getState().hydrate();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(removeToken).toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe('signOut');
  });
  it('restores the session when the call succeeds', async () => {
    jest.mocked(client.get).mockResolvedValueOnce(httpResponse({
      user: { id: 'u1', email: null, phone: '9', name: 'U', photoUrl: null },
      memberships: [{ tenantId: 't1', tenantName: 'Alpha Cable', roleId: 'admin', membershipId: 'membership-test', status: 'active', permissionVersion: 1, teamId: null, permissions: [] }],
    }));
    useAuthStore.getState().hydrate();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(useAuthStore.getState()).toMatchObject({ status: 'signIn', role: 'admin', tenantId: 't1' });
  });
  it('restores the tenant the operator last chose, and asks again if it is gone', async () => {
    jest.mocked(getTenantId).mockReturnValue('t2');
    jest.mocked(client.get).mockResolvedValueOnce(httpResponse({
      user: { id: 'u1', email: null, phone: '9', name: 'U', photoUrl: null },
      memberships: [
        { tenantId: 't1', tenantName: 'Alpha Cable', roleId: 'admin', membershipId: 'membership-test', status: 'active', permissionVersion: 1, teamId: null, permissions: [] },
        { tenantId: 't2', tenantName: 'Beta Cable', roleId: 'staff', membershipId: 'membership-test', status: 'active', permissionVersion: 1, teamId: null, permissions: [] },
      ],
    }));
    useAuthStore.getState().hydrate();
    await new Promise(resolve => setTimeout(resolve, 0));
    // Their own previous answer, not a guess the app made for them.
    expect(useAuthStore.getState()).toMatchObject({ tenantId: 't2', role: 'staff' });
    // A membership that has since been revoked is not a valid answer any more.
    jest.mocked(getTenantId).mockReturnValue('t2');
    jest.mocked(client.get).mockResolvedValueOnce(httpResponse({
      user: { id: 'u1', email: null, phone: '9', name: 'U', photoUrl: null },
      memberships: [
        { tenantId: 't1', tenantName: 'Alpha Cable', roleId: 'admin', membershipId: 'membership-test', status: 'active', permissionVersion: 1, teamId: null, permissions: [] },
        { tenantId: 't3', tenantName: 'Gamma Cable', roleId: 'staff', membershipId: 'membership-test', status: 'active', permissionVersion: 1, teamId: null, permissions: [] },
      ],
    }));
    useAuthStore.getState().hydrate();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(useAuthStore.getState().tenantId).toBeNull();
  });
});
describe('tenant selection persistence and sign out', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getToken).mockReturnValue({ access: 'a', refresh: 'r' });
  });
  it('clears stored tenant preference on sign out', async () => {
    jest.mocked(client.post).mockResolvedValueOnce({});
    await useAuthStore.getState().signOut();
    expect(removeToken).toHaveBeenCalled();
    expect(removeTenantId).toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({ status: 'signOut', tenantId: null, role: null });
  });
  it('clears stored tenant preference on sign out everywhere', async () => {
    jest.mocked(client.post).mockResolvedValueOnce({});
    await useAuthStore.getState().signOutEverywhere();
    expect(removeToken).toHaveBeenCalled();
    expect(removeTenantId).toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({ status: 'signOut', tenantId: null, role: null });
  });
  it('does not persist tenant to storage when switchTenant persist is false', async () => {
    jest.mocked(client.post).mockResolvedValueOnce(httpResponse<AuthResponse>({
      accessToken: 'access-token',
      expiresIn: 900,
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      memberships: [
        { tenantId: 'tenant-a', tenantName: 'Alpha Cable', roleId: 'admin', membershipId: 'membership-test', status: 'active', permissionVersion: 1, teamId: null, permissions: [] },
        { tenantId: 'tenant-b', tenantName: 'Beta Cable', roleId: 'staff', membershipId: 'membership-test', status: 'active', permissionVersion: 1, teamId: null, permissions: [] },
      ],
      user: { id: 'user-id', email: null, phone: '9876543210', name: 'Uday', photoUrl: null },
    }));
    await useAuthStore.getState().verifyOtp('9876543210', '123456');
    jest.clearAllMocks();
    useAuthStore.getState().switchTenant('tenant-b', false);
    expect(useAuthStore.getState()).toMatchObject({ tenantId: 'tenant-b', role: 'staff' });
    expect(removeTenantId).toHaveBeenCalled();
    expect(setTenantId).not.toHaveBeenCalled();
  });
  it('preserves remembered tenant on app reopen without wiping storage during hydrate', async () => {
    // Stored tenant in storage
    jest.mocked(getTenantId).mockReturnValue('tenant-b');
    jest.mocked(client.get).mockResolvedValueOnce(httpResponse({
      user: { id: 'u1', email: null, phone: '9', name: 'U', photoUrl: null },
      memberships: [
        { tenantId: 'tenant-a', tenantName: 'Alpha Cable', roleId: 'admin', membershipId: 'membership-test', status: 'active', permissionVersion: 1, teamId: null, permissions: [] },
        { tenantId: 'tenant-b', tenantName: 'Beta Cable', roleId: 'staff', membershipId: 'membership-test', status: 'active', permissionVersion: 1, teamId: null, permissions: [] },
      ],
    }));
    useAuthStore.getState().hydrate();
    // Verify removeTenantId was NOT called during the hydrate lifecycle
    expect(removeTenantId).not.toHaveBeenCalled();
    await new Promise(resolve => setTimeout(resolve, 0));
    // The remembered tenant is restored
    expect(useAuthStore.getState()).toMatchObject({ tenantId: 'tenant-b', role: 'staff' });
    expect(removeTenantId).not.toHaveBeenCalled();
  });
});
describe('exchanging a google id token', () => {
  beforeEach(() => jest.clearAllMocks());
  it('posts the token to the google endpoint and keeps our session', async () => {
    jest.mocked(client.post).mockResolvedValueOnce(httpResponse<AuthResponse>({
      accessToken: 'access-token',
      expiresIn: 900,
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      memberships: [{ tenantId: 'tenant-id', tenantName: 'Alpha Cable', roleId: 'admin', membershipId: 'membership-test', status: 'active', permissionVersion: 1, teamId: null, permissions: [] }],
      user: { id: 'user-id', email: 'op@satya.test', phone: null, name: 'Op', photoUrl: null },
    }));
    await useAuthStore.getState().signInWithGoogle('google-id-token');
    expect(client.post).toHaveBeenCalledWith('/auth/google', { idToken: 'google-id-token' });
    expect(setToken).toHaveBeenCalledWith({ access: 'access-token', refresh: 'refresh-token' });
    expect(useAuthStore.getState().status).toBe('signIn');
  });
});

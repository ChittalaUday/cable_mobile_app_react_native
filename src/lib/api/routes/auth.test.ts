import { client } from '@/lib/api/client';
import { authApi } from '@/lib/api/routes/auth';

jest.mock('@/lib/api/client', () => ({
  client: { get: jest.fn(), post: jest.fn() },
}));

const post = jest.mocked(client.post);

describe('authApi', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses the backend auth route contracts', async () => {
    post.mockResolvedValue({ data: { accessToken: 'access', refreshToken: 'refresh' } });

    await authApi.login(' admin@example.com ', 'password');
    await authApi.requestOtp('9876543210', 'sms');
    await authApi.verifyOtp('9876543210', '123456');
    await authApi.logout();
    await authApi.logoutEverywhere();

    expect(post.mock.calls).toEqual([
      ['/auth/login', { identifier: 'admin@example.com', password: 'password' }],
      ['/auth/otp/request', { phone: '9876543210', channel: 'sms' }],
      ['/auth/otp/verify', { phone: '9876543210', code: '123456' }],
      ['/auth/logout'],
      ['/auth/logout-all'],
    ]);
  });
});

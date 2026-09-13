import { client } from '@/lib/api/client';

export type ApiUser = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  photoUrl: string | null;
  isSuperAdmin: boolean;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
};

export type Membership = { tenantId: string; roleId: string };
export type AuthResponse = AuthTokens & { user: ApiUser };
export type MeResponse = {
  user: ApiUser;
  sessionId: string;
  deviceId: string;
  memberships: Membership[];
};

export const authApi = {
  login: async (identifier: string, password: string) => (await client.post<AuthResponse>('/auth/login', { identifier: identifier.trim(), password })).data,
  requestOtp: async (phone: string, channel?: 'whatsapp' | 'sms') => (await client.post<{ status: 'accepted'; channel: string; expiresInSeconds: number }>('/auth/otp/request', { phone, channel })).data,
  verifyOtp: async (phone: string, code: string) => (await client.post<AuthResponse>('/auth/otp/verify', { phone, code })).data,
  me: async () => (await client.get<MeResponse>('/auth/me')).data,
  logout: async () => { await client.post('/auth/logout'); },
  logoutEverywhere: async () => { await client.post('/auth/logout-all'); },
};

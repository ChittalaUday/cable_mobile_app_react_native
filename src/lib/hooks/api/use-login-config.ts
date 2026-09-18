import type { LoginConfig } from '@/lib/api/types';
import { createQuery } from 'react-query-kit';
import { client } from '@/lib/api/client';

/**
 * What the app offers when the server cannot be reached, or is older than the
 * endpoint: email and password, and a phone code over WhatsApp. Those two have
 * always worked, so falling back to them leaves nobody staring at a login
 * screen with no way in.
 */
export const OFFLINE_LOGIN_CONFIG: LoginConfig = {
  password: true,
  passwordNeedsEmailOtp: false,
  phoneOtp: true,
  phoneOtpChannels: ['whatsapp'],
  defaultPhoneOtpChannel: 'whatsapp',
  google: false,
};

export const useLoginConfig = createQuery<LoginConfig, void, Error>({
  queryKey: ['auth', 'config'],
  fetcher: async () => {
    const response = await client.get<LoginConfig>('/auth/config');
    return response.data;
  },
  // Channels come and go with their providers, so this is worth re-reading —
  // but not on every keystroke of a login form.
  staleTime: 60 * 1000,
  retry: 1,
});

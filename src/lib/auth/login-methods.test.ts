import type { LoginConfig } from '@/lib/api/types';
import { offersMode, openingMode } from '@/lib/auth/login-methods';
import { OFFLINE_LOGIN_CONFIG } from '@/lib/hooks/api/use-login-config';

const config = (overrides: Partial<LoginConfig>): LoginConfig => ({ ...OFFLINE_LOGIN_CONFIG, ...overrides });

describe('which sign-in methods a deployment offers', () => {
  it('reads each mode off the field that governs it', () => {
    const only = config({ password: false, phoneOtp: true });

    expect(offersMode(only, 'password')).toBe(false);
    expect(offersMode(only, 'otp')).toBe(true);
  });

  it('opens on a password, then a phone code', () => {
    expect(openingMode(config({}))).toBe('password');
    expect(openingMode(config({ password: false }))).toBe('otp');
  });

  it('answers null when every method is off, rather than naming a dead one', () => {
    // The screen shows a message on null. Returning 'password' here instead
    // would put back the form nobody can sign in with.
    expect(openingMode(config({ password: false, phoneOtp: false }))).toBeNull();
  });
});

import type { LoginConfig } from '@/lib/api/types';

export type LoginMode = 'password' | 'otp';

/**
 * Pure predicates over what `GET /auth/config` said, kept apart from the sign-in
 * actions on purpose: the actions reach for Google's native SDK, and a screen
 * only asking "is this method on?" should not have to load it.
 */
export function offersMode(config: LoginConfig, mode: LoginMode): boolean {
  return mode === 'password' ? config.password : config.phoneOtp;
}

/**
 * The method a screen should open on, or `null` when the server offers none.
 *
 * Preference order, not a guess: a password is the one most operators have and
 * a phone code the one most subscribers do. What it must never do is open on a
 * method the server has switched off — that is a form the person can fill in
 * and submit and never get anywhere with.
 */
export function openingMode(config: LoginConfig): LoginMode | null {
  return (['password', 'otp'] as const).find(mode => offersMode(config, mode)) ?? null;
}

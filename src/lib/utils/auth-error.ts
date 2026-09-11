import type { TxKeyPath } from '@/lib/i18n';
import { translate } from '@/lib/i18n';

export function authErrorMessageKey(code: string): TxKeyPath {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'login.errors.invalid_credential';
    case 'auth/email-already-in-use':
      return 'login.errors.email_already_in_use';
    case 'auth/invalid-email':
      return 'login.errors.invalid_email';
    case 'auth/weak-password':
      return 'login.errors.weak_password';
    case 'auth/network-request-failed':
      return 'login.errors.network_request_failed';
    default:
      return 'login.errors.default';
  }
}

export function authErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string')
    return translate(authErrorMessageKey(error.code));
  if (error instanceof Error && error.message)
    return error.message;
  return translate('login.errors.default');
}

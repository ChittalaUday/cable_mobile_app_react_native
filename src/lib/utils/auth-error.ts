import type { TxKeyPath } from '@/lib/i18n';
import { isAxiosError } from 'axios';
import { translate } from '@/lib/i18n';

export function authErrorMessageKey(code: string): TxKeyPath {
  switch (code) {
    case 'AUTH_CREDENTIALS_INVALID':
    case 'AUTH_PASSWORD_NOT_SET':
      return 'login.errors.invalid_credential';
    case 'ECONNABORTED':
    case 'ERR_NETWORK':
      return 'login.errors.network_request_failed';
    default:
      return 'login.errors.default';
  }
}

export function authErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error) && typeof error.response?.data?.message === 'string' && error.response.data.message.trim() !== '')
    return error.response.data.message;
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string')
    return translate(authErrorMessageKey(error.code));
  if (error instanceof Error && error.message)
    return error.message;
  return translate('login.errors.default');
}

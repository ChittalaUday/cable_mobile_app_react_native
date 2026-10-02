import { isPaymentReferenceConflict, isPaymentResultUnknown } from '@/lib/payments/payment-errors';
import { apiErrorMessage } from './api-error';
import { authErrorMessage } from './auth-error';

function httpError(status: number, data: unknown): Error {
  return Object.assign(new Error('Request failed'), { isAxiosError: true, response: { status, data } });
}

describe('malformed API error responses', () => {
  it.each([null, undefined, {}, { message: { detail: 'Invalid' } }, { message: 42 }])('keeps auth and API error messages safe for %p', (data) => {
    const error = httpError(400, data);
    expect(authErrorMessage(error)).toBe('Request failed');
    expect(apiErrorMessage(error, 'Fallback')).toBe('Request failed');
    expect(isPaymentReferenceConflict(httpError(409, data))).toBe(false);
  });
  it('shows server validation messages', () => {
    expect(apiErrorMessage(httpError(400, { message: 'The total cannot exceed ₹99,000' }), 'Fallback')).toBe('The total cannot exceed ₹99,000');
  });
  it.each([500, 502, 503, 504])('treats HTTP %s as an uncertain payment result', (status) => {
    expect(isPaymentResultUnknown(httpError(status, { message: 'Internal error' }))).toBe(true);
  });
  it('recognizes only the specific reference conflict', () => {
    expect(isPaymentReferenceConflict(httpError(409, { message: 'Reference was already used for a different payment request' }))).toBe(true);
    expect(isPaymentResultUnknown(httpError(400, { message: 'Invalid' }))).toBe(false);
  });
});

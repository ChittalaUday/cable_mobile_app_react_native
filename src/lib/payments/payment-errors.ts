type PaymentHttpError = Error & {
  response?: {
    status?: number;
    data?: { message?: string };
  } | null;
};

function asPaymentHttpError(error: unknown): PaymentHttpError | null {
  return error instanceof Error ? error as PaymentHttpError : null;
}

/** A missing response or server failure may happen after the payment commits. */
export function isPaymentResultUnknown(error: unknown): boolean {
  const paymentError = asPaymentHttpError(error);
  return paymentError === null || paymentError.response == null || (paymentError.response.status ?? 0) >= 500;
}

/** Identifies the server's specific idempotency conflict, not other 409s. */
export function isPaymentReferenceConflict(error: unknown): boolean {
  const paymentError = asPaymentHttpError(error);
  if (paymentError?.response?.status !== 409)
    return false;

  const serverMessage = paymentError.response.data?.message;
  const message = typeof serverMessage === 'string' ? serverMessage : paymentError.message;
  const lower = message.toLowerCase();
  return lower.includes('reference was already used for a different payment request')
    || lower.includes('reference already belongs to another collector');
}

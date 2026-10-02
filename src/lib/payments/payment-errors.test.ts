import i18n from '@/lib/i18n';

describe('payment recovery copy', () => {
  it('loads distinct recovery actions in English and Telugu', () => {
    expect(i18n.t('payment_errors.retry', { lng: 'en' })).toBe('Retry');
    expect(i18n.t('payment_errors.view_receipts', { lng: 'en' })).toBe('View receipts');
    expect(i18n.t('payment_errors.retry', { lng: 'te' })).toBe('మళ్లీ ప్రయత్నించండి');
    expect(i18n.t('payment_errors.view_receipts', { lng: 'te' })).toBe('రసీదులను చూడండి');
  });
});

import { canRecord, hasUnsavedWork, useRechargeStore } from './use-recharge-store';

jest.mock('@/lib/hooks/api/use-payments', () => ({
  newCollectionReference: () => `ref-${Math.random()}`,
}));

const store = () => useRechargeStore.getState();

beforeEach(() => {
  store().reset();
});

describe('the recharge flow state', () => {
  it('starts a visit on the plan step with nothing typed', () => {
    store().begin({ customerId: 'cust-1', subscriptionId: 'sub-2' });

    expect(store()).toMatchObject({
      customerId: 'cust-1',
      subscriptionId: 'sub-2',
      step: 'plan',
      amount: '',
      charge: 'subscription',
      receiptId: null,
    });
  });

  it('gives each visit its own reference, so two rounds cannot replay as one', () => {
    store().begin({ customerId: 'cust-1' });
    const first = store().reference;

    store().begin({ customerId: 'cust-2' });

    expect(store().reference).not.toBe(first);
  });

  it('keeps one reference across retries within a visit', () => {
    store().begin({ customerId: 'cust-1' });
    const reference = store().reference;

    store().setField('amount', '500');
    store().next();

    expect(store().reference).toBe(reference);
  });

  it('walks the steps and stops at both ends', () => {
    store().begin({ customerId: 'cust-1' });

    store().back();
    expect(store().step).toBe('plan');

    store().next();
    expect(store().step).toBe('amount');

    store().next();
    store().next();
    expect(store().step).toBe('done');
  });

  it('will not record without money on it', () => {
    store().begin({ customerId: 'cust-1' });
    expect(canRecord(store())).toBe(false);

    store().setField('amount', '0');
    expect(canRecord(store())).toBe(false);

    store().setField('amount', '500');
    expect(canRecord(store())).toBe(true);
  });

  it('will not record an equipment charge with no equipment picked', () => {
    store().begin({ customerId: 'cust-1' });
    store().setField('amount', '250');
    store().setCharge('equipment');

    expect(canRecord(store())).toBe(false);

    store().setTarget({ kind: 'issue', catalogId: 'cat-1' });
    expect(canRecord(store())).toBe(true);
  });

  it('counts a typed amount as work worth warning about', () => {
    store().begin({ customerId: 'cust-1' });
    expect(hasUnsavedWork(store())).toBe(false);

    store().setField('amount', '200');
    expect(hasUnsavedWork(store())).toBe(true);
  });

  it('stops warning once the money is recorded — there is nothing left to lose', () => {
    store().begin({ customerId: 'cust-1' });
    store().setField('amount', '200');
    store().recorded('rcpt-1');

    expect(hasUnsavedWork(store())).toBe(false);
    expect(store().step).toBe('done');
  });

  it('clears everything on reset, including the receipt', () => {
    store().begin({ customerId: 'cust-1' });
    store().setField('amount', '200');
    store().setField('notes', 'paid at the door');
    store().recorded('rcpt-1');
    store().markPrinted();

    store().reset();

    expect(store()).toMatchObject({
      customerId: null,
      amount: '',
      notes: '',
      receiptId: null,
      printed: false,
      step: 'plan',
    });
  });
});

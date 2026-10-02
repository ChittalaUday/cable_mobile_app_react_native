import { canRecord, hasUnsavedWork, useRechargeStore } from './use-recharge-store';

const mockPendingValues = new Map<string, string>();
let mockReferenceCounter = 0;

jest.mock('@/lib/hooks/api/use-payments', () => ({
  newCollectionReference: () => `ref-${++mockReferenceCounter}`,
}));

jest.mock('@/lib/storage', () => ({
  storage: {
    getString: () => undefined,
    set: () => undefined,
    remove: () => undefined,
  },
  getItem: (key: string) => {
    const value = mockPendingValues.get(key);
    return value === undefined ? null : JSON.parse(value) as unknown;
  },
  setItem: async (key: string, value: unknown) => {
    mockPendingValues.set(key, JSON.stringify(value));
  },
  removeItem: async (key: string) => {
    mockPendingValues.delete(key);
  },
}));

const store = () => useRechargeStore.getState();

beforeEach(() => {
  mockPendingValues.clear();
  mockReferenceCounter = 0;
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

  it('reuses a pending reference when the same customer reopens the recharge flow', () => {
    store().begin({ customerId: 'cust-1' });
    const first = store().reference;

    store().begin({ customerId: 'cust-1' });

    expect(store().reference).toBe(first);
  });

  it('uses a separate pending reference when switching between dues and equipment', () => {
    store().begin({ customerId: 'cust-1' });
    const duesReference = store().reference;

    store().setCharge('equipment');
    const equipmentReference = store().reference;

    expect(equipmentReference).not.toBe(duesReference);
    store().setCharge('subscription');
    expect(store().reference).toBe(duesReference);
  });

  it('clears the pending reference when the collector discards the recharge flow', () => {
    store().begin({ customerId: 'cust-1' });
    const first = store().reference;

    store().reset(true);
    store().begin({ customerId: 'cust-1' });

    expect(store().reference).not.toBe(first);
  });

  it('clears the pending reference when the payment is recorded', () => {
    store().begin({ customerId: 'cust-1' });
    const first = store().reference;

    store().recorded('receipt-1');
    store().begin({ customerId: 'cust-1' });

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

  it.each([
    ['99000', true],
    ['99000.01', false],
    ['NaN', false],
    ['Infinity', false],
    ['1e2', false],
    ['0x10', false],
    ['1.001', false],
    ['99000.001', false],
  ])('validates payment amount %s', (amount, allowed) => {
    store().begin({ customerId: 'cust-1' });
    store().setField('amount', amount as string);
    expect(canRecord(store())).toBe(allowed);
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

it('preserves unresolved references on ordinary reset', () => {
  store().begin({ customerId: 'cust-1' });
  const reference = store().reference;
  store().reset();
  store().begin({ customerId: 'cust-1' });
  expect(store().reference).toBe(reference);
});

it('clears the submitted kind even if the picker changes before success', () => {
  store().begin({ customerId: 'cust-1' });
  const reference = store().reference;
  store().setCharge('equipment');
  const equipmentReference = store().reference;
  store().recorded('receipt-1', { customerId: 'cust-1', charge: 'subscription' });
  store().begin({ customerId: 'cust-1' });
  expect(store().reference).not.toBe(reference);
  store().setCharge('equipment');
  expect(store().reference).toBe(equipmentReference);
});

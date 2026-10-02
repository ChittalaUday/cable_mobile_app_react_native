import { clear, get, metadata } from './pending-reference';

const mockValues = new Map<string, string>();
let mockReferenceCounter = 0;

jest.mock('@/lib/storage', () => ({
  storage: {
    getString: () => undefined,
    set: () => undefined,
    remove: () => undefined,
  },
  getItem: (key: string) => {
    const value = mockValues.get(key);
    return value === undefined ? null : JSON.parse(value) as unknown;
  },
  setItem: async (key: string, value: unknown) => {
    mockValues.set(key, JSON.stringify(value));
  },
  removeItem: async (key: string) => {
    mockValues.delete(key);
  },
}));

jest.mock('@/lib/hooks/api/use-payments', () => ({
  newCollectionReference: () => `reference-${++mockReferenceCounter}`,
}));

beforeEach(() => {
  mockValues.clear();
  mockReferenceCounter = 0;
});

describe('pending payment references', () => {
  it('reuses an unexpired reference for the same customer and payment kind', () => {
    const first = get('customer-1', 'dues');

    expect(get('customer-1', 'dues')).toEqual(first);
    expect(first.reference).toBe('reference-1');
    expect(typeof first.startedAt).toBe('number');
  });

  it('keeps customers and payment kinds isolated', () => {
    const dues = get('customer-1', 'dues');

    expect(get('customer-2', 'dues').reference).not.toBe(dues.reference);
    expect(get('customer-1', 'equipment').reference).not.toBe(dues.reference);
  });

  it('creates a new reference after the pending one is cleared', () => {
    const first = get('customer-1', 'dues');
    clear('customer-1', 'dues');

    expect(get('customer-1', 'dues').reference).not.toBe(first.reference);
  });

  it('replaces references older than 24 hours', () => {
    const now = 1_800_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(now);

    mockValues.set('payments.pending-reference.customer-1.dues', JSON.stringify({
      reference: 'expired-reference',
      startedAt: now - 24 * 60 * 60 * 1000 - 1,
    }));

    expect(get('customer-1', 'dues').reference).toBe('reference-1');
    jest.restoreAllMocks();
  });
});

it('freezes GPS metadata across retries and reopening the same pending payment', () => {
  const first = metadata('customer-1', 'dues', { latitude: 16.8, longitude: 81.5, gpsAccuracyM: 10 });
  expect(metadata('customer-1', 'dues', { latitude: 16.9, longitude: 81.6, gpsAccuracyM: 5 })).toEqual(first);
  clear('customer-1', 'dues');
  expect(metadata('customer-1', 'dues', {})).toEqual({});
});

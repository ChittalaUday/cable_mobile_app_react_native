import type { Collection } from '@/lib/hooks/api/use-payments';
import { render, screen } from '@testing-library/react-native';
import * as React from 'react';
import i18n from '@/lib/i18n';
import { ReceiptView } from './receipt-view';

const mockReverse = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/lib/hooks/api/use-payments', () => ({
  useCollection: jest.fn(),
  useReverseCollection: () => ({ mutate: mockReverse, isPending: false }),
}));

jest.mock('@/lib/hooks/common/use-permissions', () => ({
  usePermissions: jest.fn(),
}));

const { useCollection } = jest.requireMock<{ useCollection: jest.Mock }>('@/lib/hooks/api/use-payments');
const { usePermissions } = jest.requireMock<{ usePermissions: jest.Mock }>('@/lib/hooks/common/use-permissions');

function receipt(overrides: Partial<Collection> = {}): Collection {
  return {
    id: 'rcp-1',
    customerId: 'cust-1',
    customerName: 'Kavitha Devi',
    customerCode: 'SSCN-1',
    subscriptionId: 'sub-1',
    customerEquipmentId: null,
    equipment: null,
    serviceAccountNumber: 'ACT9001',
    locationId: 'loc-1',
    locationPath: 'Mandapeta / Main Road',
    collectedBy: 'user-1',
    collectorName: 'Ravi',
    outcome: 'full',
    method: 'cash',
    dueAmount: '500.00',
    duesPaid: '500.00',
    accessoryAmount: '0.00',
    totalCollected: '500.00',
    balanceAfter: '0.00',
    transactionId: null,
    accessories: [],
    reversesId: null,
    reversedById: null,
    reason: null,
    notes: null,
    reference: 'ref-1',
    collectedAt: '2026-09-18T06:00:00.000Z',
    latitude: '16.8697000',
    longitude: '81.9342000',
    gpsAccuracyM: '8.50',
    ...overrides,
  };
}

function mount(row: Collection | undefined, scope: 'ALL' | 'LOCATION' | null = 'LOCATION') {
  useCollection.mockReturnValue({ data: row, isPending: false, error: null, refetch: jest.fn() });
  usePermissions.mockReturnValue({
    hasScope: (_key: string, required: string) => scope === 'ALL' && required === 'ALL',
  });

  return render(<ReceiptView id="rcp-1" />);
}

beforeEach(async () => {
  mockReverse.mockReset();
  await i18n.changeLanguage('en');
});

describe('a receipt', () => {
  it('shows what was taken and where it left the balance', () => {
    mount(receipt({ accessoryAmount: '150.00', totalCollected: '650.00' }));

    expect(screen.getByText('₹650.00')).toBeTruthy();
    expect(screen.getByText('Paid in full')).toBeTruthy();
    expect(screen.getByText('ACT9001')).toBeTruthy();
    expect(screen.getByText('₹150.00')).toBeTruthy();
  });

  it('labels an equipment receipt without presenting it as subscription dues', async () => {
    await i18n.changeLanguage('te');
    mount(receipt({
      subscriptionId: null,
      serviceAccountNumber: null,
      customerEquipmentId: 'ce-1',
      equipment: { itemName: 'Set-top box', itemCode: 'STB', serialNumber: 'SN-1', brand: null, model: null },
      duesPaid: '250.00',
      totalCollected: '250.00',
    }));

    expect(screen.getByText('పరికర చెల్లింపు')).toBeTruthy();
    expect(screen.getByText('SN-1')).toBeTruthy();
    expect(screen.queryByText('Balance after')).toBeNull();
  });

  it('offers no way to reverse without a tenant-wide grant', () => {
    mount(receipt(), 'LOCATION');

    expect(screen.queryByText('Reverse this receipt')).toBeNull();
  });

  it('offers a reversal to somebody who holds payments.update everywhere', () => {
    mount(receipt(), 'ALL');

    expect(screen.getByText('Reverse this receipt')).toBeTruthy();
  });

  it('will not reverse one that already has been, even for an admin', () => {
    mount(receipt({ reversedById: 'rcp-2' }), 'ALL');

    expect(screen.getByText('Reversed')).toBeTruthy();
    expect(screen.queryByText('Reverse this receipt')).toBeNull();
  });

  it('will not reverse a reversal', () => {
    mount(receipt({ outcome: 'refund', duesPaid: '-500.00', totalCollected: '-500.00' }), 'ALL');

    expect(screen.queryByText('Reverse this receipt')).toBeNull();
  });

  it('says a visit that collected nothing was exactly that, with its reason', () => {
    mount(receipt({
      outcome: 'none',
      method: null,
      duesPaid: '0.00',
      totalCollected: '0.00',
      balanceAfter: '500.00',
      reason: 'Nobody home',
    }));

    expect(screen.getByText('Nothing collected')).toBeTruthy();
    expect(screen.getByText('Nobody home')).toBeTruthy();
  });

  it('does not claim a receipt exists when the server would not show it', () => {
    useCollection.mockReturnValue({ data: undefined, isPending: false, error: new Error('Not found'), refetch: jest.fn() });
    usePermissions.mockReturnValue({ hasScope: () => false });

    render(<ReceiptView id="rcp-1" />);

    expect(screen.getByText('That receipt is not one you can see.')).toBeTruthy();
  });
});

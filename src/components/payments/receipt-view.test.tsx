import type { Collection } from '@/lib/hooks/api/use-payments';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as React from 'react';
import { dialogs } from '@/components/common/dialogs';
import i18n from '@/lib/i18n';
import { ReceiptView } from './receipt-view';

const mockReverse = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/lib/hooks/api/use-payments', () => ({
  newCollectionReference: () => 'ref',
  useCollection: jest.fn(),
  useReverseCollection: () => ({ mutate: mockReverse, isPending: false }),
}));

jest.mock('@/lib/hooks/api/use-tenant-upi', () => ({
  useTenantUpiAccounts: () => ({ data: [] }),
  chooseUpiAccount: () => null,
}));

jest.mock('react-native-qrcode-svg', () => 'QRCode');

jest.mock('@/lib/hooks/api/use-customers', () => ({
  useCustomer: () => ({ data: undefined }),
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
    planCharge: '0.00',
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
  mockPush.mockReset();
  await i18n.changeLanguage('en');
});

describe('a receipt', () => {
  it('shows what was taken and where it left the balance', () => {
    mount(receipt({ accessoryAmount: '150.00', totalCollected: '650.00' }));

    expect(screen.getByText('₹650.00')).toBeTruthy();
    expect(screen.getByText('Paid')).toBeTruthy();
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

  it('puts Print and Reverse side by side, and a button to the customer under them', () => {
    mount(receipt(), 'ALL');

    expect(screen.getByTestId('receipt-print-open')).toBeTruthy();
    expect(screen.getByTestId('receipt-reverse')).toBeTruthy();
    expect(screen.getByTestId('receipt-view-customer')).toBeTruthy();
  });

  it('explains what a reversal does and asks before reversing, and reverses nothing when it is declined', async () => {
    const prompt = jest.spyOn(dialogs, 'prompt').mockResolvedValue(null);
    mount(receipt({ totalCollected: '250.00' }), 'ALL');

    fireEvent.press(screen.getByTestId('receipt-reverse'));

    await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));
    expect(prompt).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Reverse this receipt?',
      tone: 'danger',
      confirmLabel: 'Reverse receipt',
      message: expect.stringMatching(/₹250\.00 goes back on the customer's account as unpaid[\s\S]*marked Refunded[\s\S]*cannot be undone[\s\S]*ACT is not changed/) as string,
    }));
    expect(mockReverse).not.toHaveBeenCalled();
    prompt.mockRestore();
  });

  it('reverses with the reason that was typed once it is confirmed', async () => {
    const prompt = jest.spyOn(dialogs, 'prompt').mockResolvedValue('Collected twice');
    mount(receipt(), 'ALL');

    fireEvent.press(screen.getByTestId('receipt-reverse'));

    await waitFor(() => expect(mockReverse).toHaveBeenCalledWith({ id: 'rcp-1', reason: 'Collected twice' }, expect.anything() as never));
    prompt.mockRestore();
  });

  it('opens the customer from the receipt, in the admin or the staff area', () => {
    mount(receipt());
    fireEvent.press(screen.getByTestId('receipt-view-customer'));
    expect(mockPush).toHaveBeenCalledWith('/admin/customers/cust-1');

    mockPush.mockReset();
    screen.unmount();
    useCollection.mockReturnValue({ data: receipt(), isPending: false, error: null, refetch: jest.fn() });
    render(<ReceiptView id="rcp-1" basePath="/staff" />);
    fireEvent.press(screen.getByTestId('receipt-view-customer'));
    expect(mockPush).toHaveBeenCalledWith('/staff/customers/cust-1');
  });

  it('will not reverse one that already has been, even for an admin', () => {
    mount(receipt({ reversedById: 'rcp-2' }), 'ALL');

    expect(screen.getByText('Refunded')).toBeTruthy();
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

    expect(screen.getByText('Not paid')).toBeTruthy();
    expect(screen.getByText('Nobody home')).toBeTruthy();
  });

  it('does not claim a receipt exists when the server would not show it', () => {
    useCollection.mockReturnValue({ data: undefined, isPending: false, error: new Error('Not found'), refetch: jest.fn() });
    usePermissions.mockReturnValue({ hasScope: () => false });

    render(<ReceiptView id="rcp-1" />);

    expect(screen.getByText('That receipt is not one you can see.')).toBeTruthy();
  });
});

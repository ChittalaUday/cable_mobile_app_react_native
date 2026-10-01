import type { CustomerDetail } from '@/lib/api/types';
import type { RecordCollectionPayload } from '@/lib/hooks/api/use-payments';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as React from 'react';
import { dialogs } from '@/components/common/dialogs';
import { CollectPaymentScreen } from './collect-payment';

/** What `useRecordCollection().mutate` is handed, so the assertions are typed. */
type RecordArgs = [
  { payload: RecordCollectionPayload },
  { onSuccess: (receipt: { id: string }) => void; onError: (failure: Error) => void },
];

const mockRecord = jest.fn<void, RecordArgs>();
const mockRequestPermission = jest.fn();
const mockGetPosition = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: async () => mockRequestPermission() as Promise<{ granted: boolean }>,
  getCurrentPositionAsync: async () => mockGetPosition() as Promise<{ coords: { latitude: number; longitude: number; accuracy: number | null } }>,
  Accuracy: { Balanced: 3 },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
}));

jest.mock('@/lib/hooks/api/use-customers', () => ({
  useCustomer: jest.fn(),
}));

jest.mock('@/lib/hooks/api/use-inventory', () => ({
  useInventoryStock: () => ({
    data: [{ id: 'cat-1', name: 'Remote Control', defaultSalePrice: '150.00' }],
  }),
}));

jest.mock('@/lib/hooks/api/use-payments', () => ({
  newCollectionReference: () => 'ref-fixed',
  useRecordCollection: () => ({ mutate: mockRecord, isPending: false }),
}));

const { useCustomer } = jest.requireMock<{ useCustomer: jest.Mock }>('@/lib/hooks/api/use-customers');

function line(id: string, account: string, due: string) {
  return {
    id,
    serviceAccountNumber: account,
    status: 'active' as const,
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: null,
    billingCycle: 'monthly' as const,
    price: '350.00',
    outstandingBalance: due,
    installationAddress: null,
    service: { id: 's1', name: account.startsWith('NET') ? 'Broadband' : 'Cable TV', slug: 'svc', icon: null },
    provider: { id: 'p1', name: 'ACT', slug: 'act' },
    package: { id: 'pkg1', name: 'Gold', slug: 'gold', packageType: 'base' },
  };
}

function customer(lines: CustomerDetail['subscriptions']): CustomerDetail {
  return {
    id: 'cust-1',
    customerCode: 'SSCN-1',
    name: 'Kavitha Devi',
    phone: '9848012345',
    alternatePhone: null,
    whatsappNumber: null,
    status: 'active',
    outstandingBalance: '500.00',
    userId: null,
    locationId: 'loc-1',
    locationPath: 'Mandapeta / Main Road',
    address: null,
    notes: null,
    subscriptions: lines,
    equipment: [],
    recentTransactions: [],
    summary: {
      subscriptions: lines.length,
      activeSubscriptions: lines.length,
      services: ['Cable TV'],
      monthlyValue: '350.00',
      outstandingBalance: '500.00',
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

/**
 * Renders and waits for the location lookup to settle. Every test goes through
 * here so none of them assert against a screen that is still mid-fix — which is
 * both what the collector sees and what stops React warning about it.
 */
async function mount(lines = [line('sub-1', 'ACT9001', '500.00')]) {
  useCustomer.mockReturnValue({ data: customer(lines), isPending: false, error: null, refetch: jest.fn() });

  const view = render(<CollectPaymentScreen customerId="cust-1" basePath="/staff" />);
  await screen.findByText(/accurate to|Location off|No location fix/);

  return view;
}

function payloadOf(call = 0): RecordCollectionPayload {
  return mockRecord.mock.calls[call]![0].payload;
}

function handlersOf(call = 0): RecordArgs[1] {
  return mockRecord.mock.calls[call]![1];
}

beforeEach(() => {
  mockRecord.mockReset();
  mockRequestPermission.mockReset().mockResolvedValue({ granted: true });
  mockGetPosition.mockReset().mockResolvedValue({
    coords: { latitude: 16.8697, longitude: 81.9342, accuracy: 8.5 },
  });
  mockPush.mockReset();
  mockReplace.mockReset();
});

describe('collecting a payment', () => {
  it('pre-fills the whole balance and sends it with a method', async () => {
    await mount();

    expect(screen.getByTestId('collect-amount').props.value).toBe('500.00');

    fireEvent.press(screen.getByText('UPI'));
    fireEvent.press(screen.getByTestId('collect-submit'));

    expect(payloadOf()).toMatchObject({
      customerId: 'cust-1',
      subscriptionId: 'sub-1',
      amount: '500.00',
      method: 'upi',
      reference: 'ref-fixed',
    });
  });

  it('lets a part payment be typed and sends exactly that', async () => {
    await mount();

    fireEvent.press(screen.getByText('Part'));
    fireEvent.changeText(screen.getByTestId('collect-amount'), '200');
    fireEvent.press(screen.getByTestId('collect-submit'));

    expect(payloadOf()).toMatchObject({ amount: '200.00', method: 'cash' });
  });

  it('follows the balance of the connection the collector picks', async () => {
    await mount([line('sub-1', 'ACT9001', '500.00'), line('sub-2', 'NET4002', '199.00')]);

    fireEvent.press(screen.getByText('NET4002'));

    expect(screen.getByTestId('collect-amount').props.value).toBe('199.00');

    fireEvent.press(screen.getByTestId('collect-submit'));
    expect(payloadOf()).toMatchObject({ subscriptionId: 'sub-2', amount: '199.00' });
  });

  it('refuses a no-payment visit with no reason, and sends the reason once given', async () => {
    const alert = jest.spyOn(dialogs, 'notify').mockResolvedValue();
    await mount();

    fireEvent.press(screen.getByText('No payment'));
    fireEvent.press(screen.getByTestId('collect-submit'));

    expect(alert).toHaveBeenCalled();
    expect(mockRecord).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByTestId('collect-reason'), 'Nobody home');
    fireEvent.press(screen.getByTestId('collect-submit'));

    const payload = payloadOf();
    expect(payload).toMatchObject({ amount: '0', reason: 'Nobody home' });
    expect(payload.method).toBeUndefined();

    alert.mockRestore();
  });

  it('adds accessories to what has to be handed in, priced from the catalogue', async () => {
    await mount();

    fireEvent.press(screen.getByText('Add'));
    fireEvent.press(screen.getByText('Remote Control'));
    fireEvent.press(screen.getByLabelText('Add one Remote Control'));

    // 500 dues + two remotes at 150.
    expect(screen.getByText('₹800.00')).toBeTruthy();

    fireEvent.press(screen.getByTestId('collect-submit'));
    expect(payloadOf().accessories).toEqual([{ catalogId: 'cat-1', quantity: 2, unitPrice: '150.00' }]);
  });

  it('keeps one reference across a retry, so a failed tap cannot double-charge', async () => {
    await mount();

    fireEvent.press(screen.getByTestId('collect-submit'));
    fireEvent.press(screen.getByTestId('collect-submit'));

    expect(payloadOf(0).reference).toBe(payloadOf(1).reference);
  });

  it('attaches where the collector is standing, with its accuracy', async () => {
    await mount();

    await screen.findByText(/accurate to 9 m/);

    fireEvent.press(screen.getByTestId('collect-submit'));

    expect(payloadOf()).toMatchObject({
      latitude: 16.8697,
      longitude: 81.9342,
      gpsAccuracyM: 8.5,
    });
  });

  it('still records the money when location was refused', async () => {
    mockRequestPermission.mockResolvedValue({ granted: false });
    await mount();

    await screen.findByText(/Location off/);

    fireEvent.press(screen.getByTestId('collect-submit'));

    // Cash that changed hands has to be recordable in a stairwell.
    const payload = payloadOf();
    expect(payload.amount).toBe('500.00');
    expect(payload.latitude).toBeUndefined();
    expect(payload.gpsAccuracyM).toBeUndefined();
  });

  it('does not claim a perfect fix when the handset reports no accuracy', async () => {
    mockGetPosition.mockResolvedValue({
      coords: { latitude: 16.8697, longitude: 81.9342, accuracy: null },
    });
    await mount();

    await screen.findByText(/accurate to 9999 m/);

    fireEvent.press(screen.getByTestId('collect-submit'));
    expect(payloadOf().gpsAccuracyM).toBe(9999);
  });

  it('opens the receipt once the server has it, and never before', async () => {
    await mount();

    fireEvent.press(screen.getByTestId('collect-submit'));
    expect(mockReplace).not.toHaveBeenCalled();

    handlersOf().onSuccess({ id: 'receipt-9' });

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/staff/receipts/receipt-9'));
  });

  it('says plainly that nothing was taken when the write fails', async () => {
    const alert = jest.spyOn(dialogs, 'notify').mockResolvedValue();
    await mount();

    fireEvent.press(screen.getByTestId('collect-submit'));
    handlersOf().onError(new Error('Customer not found'));

    expect(alert).toHaveBeenCalledWith('Not recorded', 'Customer not found');
    expect(mockReplace).not.toHaveBeenCalled();

    alert.mockRestore();
  });
});

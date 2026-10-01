import type { CustomerDetail } from '@/lib/api/types';
import type { RecordCollectionPayload, RecordEquipmentPaymentPayload } from '@/lib/hooks/api/use-payments';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as React from 'react';
import { dialogs } from '@/components/common/dialogs';
import { useRechargeStore } from '@/lib/hooks/stores/use-recharge-store';
import { RechargeFlowScreen } from './index';

type Handlers = { onSuccess: (made: { id: string }) => void; onError: (failure: Error) => void };
type DuesArgs = [{ payload: RecordCollectionPayload }, Handlers];
type KitArgs = [{ payload: RecordEquipmentPaymentPayload }, Handlers];

const mockRecordDues = jest.fn<void, DuesArgs>();
const mockRecordKit = jest.fn<void, KitArgs>();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
}));

jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));

jest.mock('react-native-qrcode-svg', () => 'QRCode');

jest.mock('@/lib/hooks/api/use-customers', () => ({
  useCustomer: jest.fn(),
}));

jest.mock('@/lib/hooks/api/use-inventory', () => ({
  useCustomerEquipment: () => ({
    data: [{ id: 'ce-1', itemName: 'Set-top box', itemCode: 'STB', serialNumber: 'SN-1', status: 'active', ownershipType: 'rental' }],
  }),
  useInventoryStock: () => ({
    data: [{ id: 'cat-1', name: 'Remote Control', defaultSalePrice: '150.00', availableStock: 4 }],
  }),
}));

jest.mock('@/lib/hooks/api/use-tenant-upi', () => {
  const account = {
    id: 'upi-1',
    upiId: 'satyacable@okhdfc',
    payeeName: 'Satya Cable',
    label: 'Counter',
    isDefault: true,
    status: 'active',
    createdAt: '',
  };
  return {
    useTenantUpiAccounts: () => ({ data: [account] }),
    chooseUpiAccount: () => account,
  };
});

jest.mock('@/lib/hooks/api/use-payments', () => ({
  newCollectionReference: () => 'ref-fixed',
  useRecordCollection: () => ({ mutate: mockRecordDues, isPending: false }),
  useRecordEquipmentPayment: () => ({ mutate: mockRecordKit, isPending: false }),
  useCollection: () => ({ data: undefined }),
}));

const { useCustomer } = jest.requireMock<{ useCustomer: jest.Mock }>('@/lib/hooks/api/use-customers');

function line(id: string, packageName: string, due: string) {
  return {
    id,
    serviceAccountNumber: `ACT-${id}`,
    status: 'active' as const,
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: null,
    billingCycle: 'monthly' as const,
    price: '350.00',
    outstandingBalance: due,
    installationAddress: null,
    service: { id: 's1', name: 'Cable TV', slug: 'cable', icon: null },
    provider: { id: 'p1', name: 'ACT', slug: 'act' },
    package: { id: `pkg-${id}`, name: packageName, slug: 'pkg', packageType: 'base' as const },
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

function mount(lines: CustomerDetail['subscriptions'] = [line('sub-1', 'Gold HD', '500.00')], subscriptionId?: string) {
  useCustomer.mockReturnValue({ data: customer(lines), isPending: false, error: null, refetch: jest.fn() });

  return render(<RechargeFlowScreen customerId="cust-1" subscriptionId={subscriptionId} basePath="/admin" />);
}

/** Walks to the amount step, which most cases start from. */
function toAmount(lines?: CustomerDetail['subscriptions'], subscriptionId?: string) {
  const view = mount(lines, subscriptionId);
  fireEvent.press(screen.getByTestId('recharge-next'));
  return view;
}

function duesPayload(call = 0): RecordCollectionPayload {
  return mockRecordDues.mock.calls[call]![0].payload;
}

beforeEach(() => {
  jest.clearAllMocks();
  act(() => useRechargeStore.getState().reset());
});

describe('the recharge flow', () => {
  it('opens on the plan step with the previous balance of the chosen line', () => {
    mount([line('sub-1', 'Gold HD', '500.00'), line('sub-2', 'Fibre', '199.50')], 'sub-2');

    expect(screen.getByTestId('recharge-previous-balance')).toHaveTextContent('₹199.50');
    // The amount field belongs to the next step, not this one.
    expect(screen.queryByTestId('recharge-amount')).toBeNull();
  });

  it('sends the plan change off to its own page rather than listing packs here', () => {
    mount();

    fireEvent.press(screen.getByTestId('recharge-change-plan'));

    expect(mockPush).toHaveBeenCalledWith('/admin/recharge/switch-plan');
  });

  it('shows the connections table once, on the plan step only', () => {
    const lines = [line('sub-1', 'Gold HD', '500.00'), line('sub-2', 'Fibre', '199.50')];
    toAmount(lines);

    // Both account numbers appear on step one; step two restates just the one.
    expect(screen.queryByText('ACT-sub-2')).toBeNull();
    expect(screen.getByText(/ACT-sub-1/)).toBeTruthy();
  });

  it('counts the balance down live on the amount step', () => {
    toAmount();

    fireEvent.changeText(screen.getByTestId('recharge-amount'), '199.50');

    expect(screen.getByTestId('recharge-balance-after')).toHaveTextContent('₹300.50');
  });

  it('shows the excess as advance when more than the balance is paid', () => {
    toAmount();

    fireEvent.changeText(screen.getByTestId('recharge-amount'), '650.25');

    expect(screen.getByText('Advance after recharge')).toBeTruthy();
    expect(screen.getByTestId('recharge-balance-after')).toHaveTextContent('₹150.25');
  });

  it('records the dues against the line picked on step one', () => {
    toAmount([line('sub-1', 'Gold HD', '500.00'), line('sub-2', 'Fibre', '199.00')], 'sub-2');

    fireEvent.changeText(screen.getByTestId('recharge-amount'), '99');
    fireEvent.press(screen.getByText('UPI'));
    fireEvent.press(screen.getByTestId('recharge-submit'));

    expect(duesPayload()).toMatchObject({
      customerId: 'cust-1',
      subscriptionId: 'sub-2',
      amount: '99.00',
      method: 'upi',
      reference: 'ref-fixed',
    });
  });

  it('shows the UPI QR the moment UPI is the method', () => {
    toAmount();

    expect(screen.queryByText('satyacable@okhdfc')).toBeNull();

    fireEvent.press(screen.getByText('UPI'));

    expect(screen.getByText('satyacable@okhdfc')).toBeTruthy();
    expect(screen.getByText('Scan to pay')).toBeTruthy();
  });

  it('offers only cash and UPI as payment methods', () => {
    toAmount();

    expect(screen.getByText('Cash')).toBeTruthy();
    expect(screen.getByText('UPI')).toBeTruthy();
    expect(screen.queryByText('Card')).toBeNull();
    expect(screen.queryByText('Bank')).toBeNull();
    expect(screen.queryByText('Cheque')).toBeNull();
  });

  it('skips the plan step entirely for an equipment charge', () => {
    mount();

    fireEvent.press(screen.getByText('Equipment'));

    // Straight to the amount, with no connection to settle first.
    expect(screen.getByTestId('recharge-amount')).toBeTruthy();
    expect(screen.queryByTestId('recharge-next')).toBeNull();
    expect(screen.queryByTestId('recharge-change-plan')).toBeNull();
  });

  it('books an equipment charge against the customer, not a connection', () => {
    mount();

    fireEvent.press(screen.getByText('Equipment'));
    fireEvent.press(screen.getByText('Set-top box'));
    fireEvent.changeText(screen.getByTestId('recharge-amount'), '250');
    fireEvent.press(screen.getByTestId('recharge-submit'));

    expect('subscriptionId' in mockRecordKit.mock.calls[0]![0].payload).toBe(false);
  });

  it('records an equipment charge against the unit chosen', () => {
    toAmount();

    fireEvent.press(screen.getByText('Equipment'));
    fireEvent.press(screen.getByText('Set-top box'));
    fireEvent.changeText(screen.getByTestId('recharge-amount'), '250');
    fireEvent.press(screen.getByTestId('recharge-submit'));

    expect(mockRecordKit.mock.calls[0]![0].payload).toMatchObject({
      customerEquipmentId: 'ce-1',
      amount: '250.00',
    });
    expect(mockRecordDues).not.toHaveBeenCalled();
  });

  it('assigns another stocked unit and charges the amount actually paid', () => {
    toAmount();

    fireEvent.press(screen.getByText('Equipment'));
    fireEvent.press(screen.getByText('Remote Control'));
    expect(screen.getByTestId('recharge-amount').props.value).toBe('');

    fireEvent.changeText(screen.getByTestId('recharge-amount'), '275');
    fireEvent.press(screen.getByTestId('recharge-submit'));

    expect(mockRecordKit.mock.calls[0]![0].payload).toMatchObject({
      catalogId: 'cat-1',
      amount: '275.00',
    });
  });

  it('refuses to record with nothing typed, and says which thing is missing', async () => {
    const notify = jest.spyOn(dialogs, 'notify').mockResolvedValue();
    toAmount();

    fireEvent.press(screen.getByTestId('recharge-submit'));

    expect(notify).toHaveBeenCalledWith('Enter an amount', expect.any(String));
    expect(mockRecordDues).not.toHaveBeenCalled();

    notify.mockRestore();
  });

  it('refuses an equipment charge with no unit picked', async () => {
    const notify = jest.spyOn(dialogs, 'notify').mockResolvedValue();
    toAmount();

    fireEvent.press(screen.getByText('Equipment'));
    fireEvent.changeText(screen.getByTestId('recharge-amount'), '250');
    fireEvent.press(screen.getByTestId('recharge-submit'));

    expect(notify).toHaveBeenCalledWith('Pick the equipment', expect.any(String));
    expect(mockRecordKit).not.toHaveBeenCalled();

    notify.mockRestore();
  });

  it('steps back to the plan rather than leaving, from the amount step', async () => {
    toAmount();
    fireEvent.changeText(screen.getByTestId('recharge-amount'), '200');

    fireEvent.press(screen.getByLabelText('Back'));

    expect(await screen.findByTestId('recharge-next')).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('asks before leaving with work typed, and clears it on discard', async () => {
    const confirm = jest.spyOn(dialogs, 'confirm').mockResolvedValue(true);
    toAmount();
    fireEvent.changeText(screen.getByTestId('recharge-amount'), '200');

    // Back to the plan step, then out.
    fireEvent.press(screen.getByLabelText('Back'));
    expect(await screen.findByTestId('recharge-next')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Back'));

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ confirmLabel: 'Discard' }));
    expect(useRechargeStore.getState().amount).toBe('');

    confirm.mockRestore();
  });

  it('keeps the flow when leaving is declined', async () => {
    const confirm = jest.spyOn(dialogs, 'confirm').mockResolvedValue(false);
    toAmount();
    fireEvent.changeText(screen.getByTestId('recharge-amount'), '200');
    fireEvent.press(screen.getByLabelText('Back'));
    expect(await screen.findByTestId('recharge-next')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Back'));

    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(mockBack).not.toHaveBeenCalled();
    expect(useRechargeStore.getState().amount).toBe('200');

    confirm.mockRestore();
  });

  it('leaves without asking when nothing has been entered', async () => {
    const confirm = jest.spyOn(dialogs, 'confirm').mockResolvedValue(true);
    mount();

    fireEvent.press(screen.getByLabelText('Back'));

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(confirm).not.toHaveBeenCalled();

    confirm.mockRestore();
  });

  it('moves to the receipt step once the money is recorded', async () => {
    toAmount();
    fireEvent.changeText(screen.getByTestId('recharge-amount'), '500');
    fireEvent.press(screen.getByTestId('recharge-submit'));

    act(() => mockRecordDues.mock.calls[0]![1].onSuccess({ id: 'rcpt-9' }));

    await waitFor(() => expect(useRechargeStore.getState().step).toBe('done'));
    expect(useRechargeStore.getState().receiptId).toBe('rcpt-9');
  });
});

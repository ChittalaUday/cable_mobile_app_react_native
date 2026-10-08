import type { CustomerDetail } from '@/lib/api/types';
import type { RecordCollectionPayload, RecordEquipmentPaymentPayload, ReplaceEquipmentPayload } from '@/lib/hooks/api/use-payments';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as React from 'react';
import { dialogs } from '@/components/common/dialogs';
import { useRechargeStore } from '@/lib/hooks/stores/use-recharge-store';
import { RechargeFlowScreen } from './index';

type Handlers = { onSuccess: (made: { id: string }) => void; onError: (failure: Error) => void };
type DuesArgs = [{ payload: RecordCollectionPayload }, Handlers];
type KitArgs = [{ payload: RecordEquipmentPaymentPayload }, Handlers];
type SwapArgs = [{ payload: ReplaceEquipmentPayload }, Handlers];

const mockRecordDues = jest.fn<void, DuesArgs>();
const mockRecordKit = jest.fn<void, KitArgs>();
const mockReplaceKit = jest.fn<void, SwapArgs>();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
  useFocusEffect: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));

jest.mock('react-native-qrcode-svg', () => 'QRCode');

// A fix is in hand: every payment carries where it was collected.
jest.mock('@/lib/hooks/common/use-collection-fix', () => ({
  useCollectionFix: () => ({ status: 'ready', latitude: 16.8697, longitude: 81.9342, gpsAccuracyM: 12, retry: () => {} }),
  fixPayload: (fix: { latitude: number; longitude: number; gpsAccuracyM: number }) => ({ latitude: fix.latitude, longitude: fix.longitude, gpsAccuracyM: fix.gpsAccuracyM }),
}));

jest.mock('@/lib/hooks/api/use-customers', () => ({
  useCustomer: jest.fn(),
}));

jest.mock('@/lib/hooks/api/use-inventory', () => ({
  useCustomerEquipment: () => ({
    data: [{ id: 'ce-1', itemName: 'HD Set-top Box', serialNumber: 'STB-OLD-1', itemCode: null, status: 'active' }],
  }),
  useInventoryStock: () => ({
    data: [
      { id: 'cat-1', name: 'Remote Control', defaultSalePrice: '150.00', availableStock: 4 },
      { id: 'cat-2', name: 'HDMI Cable', defaultSalePrice: '130.00', availableStock: 9 },
    ],
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
  useReplaceEquipment: () => ({ mutate: mockReplaceKit, isPending: false }),
  useCollection: () => ({ data: mockReceipt }),
  listCollections: (...args: unknown[]) => mockListCollections(...args),
}));

const mockListCollections = jest.fn(async (..._args: unknown[]) => ({ items: [] as object[] }));

let mockReceipt: object | undefined;
const mockPrinter = {
  phase: 'idle',
  devices: [{ address: 'AA:BB', name: 'POS-58', isLikelyPrinter: true }],
  connectedAddress: null as string | null,
  error: null,
  lastAddress: null,
  refresh: jest.fn(async () => {}),
  connect: jest.fn(async () => true),
  print: jest.fn(async () => true),
  disconnect: jest.fn(async () => {}),
};

jest.mock('@/lib/printer/use-printer', () => ({ usePrinter: () => mockPrinter }));

const { useCustomer } = jest.requireMock<{ useCustomer: jest.Mock }>('@/lib/hooks/api/use-customers');

function line(id: string, planName: string, due: string) {
  return {
    id,
    locationId: 'location-1',
    serviceAccountNumber: `ACT-${id}`,
    status: 'active' as const,
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: null,
    billingCycle: 'monthly' as const,
    price: '350.00',
    chargedThrough: null,
    nextPlanCharge: '350.00',
    outstandingBalance: due,
    installationAddress: null,
    service: { id: 's1', name: 'Cable TV', slug: 'cable', icon: null },
    provider: { id: 'p1', name: 'ACT', slug: 'act' },
    plan: { id: `plan-${id}`, name: planName, slug: 'plan', kind: 'base' as const, price: '400.00', discount: '50.00', amount: '350.00', billingCycle: 'monthly' as const },
  };
}

function customer(lines: CustomerDetail['subscriptions']): CustomerDetail {
  return {
    id: 'cust-1',
    customerCode: 'SSCN-1',
    name: 'Kavitha Devi',
    phone: '9848012345',
    alternatePhone: null,
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
  useCustomer.mockReturnValue({ data: customer(lines), dataUpdatedAt: Date.now(), isPending: false, error: null, refetch: jest.fn() });

  return render(<RechargeFlowScreen customerId="cust-1" subscriptionId={subscriptionId} basePath="/admin" />);
}

/** Walks to the amount step, which most cases start from. */
function toAmount(lines?: CustomerDetail['subscriptions'], subscriptionId?: string) {
  const view = mount(lines, subscriptionId);
  fireEvent.press(screen.getByTestId('recharge-next'));
  return view;
}

/** Mounts with the payment already recorded, standing on a post-record step. */
function recordedAt(step: 'printer' | 'preview') {
  mockReceipt = {
    id: 'rcpt-9',
    customerName: 'Kavitha Devi',
    customerCode: 'SSCN-1',
    serviceAccountNumber: 'ACT-sub-1',
    collectorName: 'Ravi',
    method: 'cash',
    duesPaid: '500.00',
    accessoryAmount: '0.00',
    planCharge: '0.00',
    accessories: [],
    totalCollected: '500.00',
    balanceAfter: '0.00',
    notes: null,
    collectedAt: '2026-10-02T06:00:00.000Z',
  };
  mount();
  act(() => {
    useRechargeStore.getState().recorded('rcpt-9');
    useRechargeStore.getState().goTo(step);
  });
}

const REMOTE = { equipmentId: 'eq-1', catalogId: 'cat-1', name: 'Remote Control', serialNumber: 'RC-1', price: '150.00' };
const HDMI = { equipmentId: 'eq-2', catalogId: 'cat-2', name: 'HDMI Cable', serialNumber: null, price: '130.00' };

/** Stands in for the add-equipment page, which hands its picks back through the store. */
function pickUnits(...units: (typeof REMOTE | typeof HDMI)[]) {
  act(() => useRechargeStore.getState().setTarget({ kind: 'issue', units }));
}

function duesPayload(call = 0): RecordCollectionPayload {
  return mockRecordDues.mock.calls[call]![0].payload;
}

function duesHandlers(call = 0): DuesArgs[1] {
  return mockRecordDues.mock.calls[call]![1];
}

beforeEach(() => {
  jest.clearAllMocks();
  mockReceipt = undefined;
  mockPrinter.connectedAddress = null;
  mockPrinter.phase = 'idle';
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

  it('adds the plan to the previous balance and counts the payment off live', () => {
    toAmount();

    // ₹500 owed + ₹350 plan; the amount starts empty for the collector to fill.
    expect(screen.getByTestId('recharge-amount').props.value).toBe('');
    expect(screen.getByTestId('recharge-total-payable')).toHaveTextContent('₹850.00');

    fireEvent.changeText(screen.getByTestId('recharge-amount'), '199.50');

    expect(screen.getByTestId('recharge-balance-after')).toHaveTextContent('₹650.50');
  });

  it('shows the excess as advance when more than the total is paid', () => {
    toAmount();

    fireEvent.changeText(screen.getByTestId('recharge-amount'), '1000.25');

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

  it('retries an unknown result with the same reference', async () => {
    const confirm = jest.spyOn(dialogs, 'confirm').mockResolvedValue(true);
    toAmount();
    fireEvent.changeText(screen.getByTestId('recharge-amount'), '200');
    fireEvent.press(screen.getByTestId('recharge-submit'));
    const firstReference = duesPayload().reference;

    duesHandlers().onError(new Error('Network Error'));

    await waitFor(() => expect(mockRecordDues).toHaveBeenCalledTimes(2));
    expect(duesPayload(1).reference).toBe(firstReference);
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({
      confirmLabel: 'Retry',
      cancelLabel: 'View receipts',
    }));
    confirm.mockRestore();
  });

  it('takes the collector to receipts when they choose to check the result', async () => {
    const confirm = jest.spyOn(dialogs, 'confirm').mockResolvedValue(false);
    toAmount();
    fireEvent.changeText(screen.getByTestId('recharge-amount'), '200');
    fireEvent.press(screen.getByTestId('recharge-submit'));

    duesHandlers().onError(new Error('Network Error'));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/admin/receipts'));
    confirm.mockRestore();
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

  it('ticks past steps and fills the current one in the step indicator', () => {
    toAmount();

    expect(screen.getByTestId('step-plan-past')).toBeTruthy();
    expect(screen.getByTestId('step-amount-current')).toBeTruthy();
    expect(screen.getByTestId('step-printer-next')).toBeTruthy();
  });

  it('shows the subscription and equipment tabs on the select step only', () => {
    mount();
    expect(screen.getByTestId('payment-tab-subscription')).toBeTruthy();
    expect(screen.getByTestId('payment-tab-equipment')).toBeTruthy();

    fireEvent.press(screen.getByTestId('recharge-next'));
    expect(screen.queryByTestId('payment-tab-subscription')).toBeNull();
  });

  it('lists existing equipment to replace and opens stock to add on its own page', () => {
    mount();

    fireEvent.press(screen.getByText('Equipment'));

    expect(screen.getByText('HD Set-top Box')).toBeTruthy();
    expect(screen.queryByTestId('recharge-amount')).toBeNull();
    expect(screen.queryByTestId('recharge-change-plan')).toBeNull();

    fireEvent.press(screen.getByTestId('payment-open-add-equipment'));
    expect(mockPush).toHaveBeenCalledWith('/admin/recharge/add-equipment');
  });

  it('pays for several picked units in one payment, naming each unit', () => {
    mount();
    fireEvent.press(screen.getByText('Equipment'));
    pickUnits(REMOTE, HDMI);
    expect(screen.getByText('Add equipment · 2 selected')).toBeTruthy();
    fireEvent.press(screen.getByTestId('recharge-next'));

    expect(screen.getByText('Remote Control, HDMI Cable')).toBeTruthy();
    expect(screen.getByText('2 items • list price ₹280.00')).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('recharge-amount'), '280');
    fireEvent.press(screen.getByTestId('recharge-submit'));

    expect(mockRecordKit.mock.calls[0]![0].payload).toMatchObject({
      items: [{ catalogId: 'cat-1', equipmentId: 'eq-1' }, { catalogId: 'cat-2', equipmentId: 'eq-2' }],
      amount: '280.00',
    });
  });

  it('removes a picked unit from the equipment tab', () => {
    mount();
    fireEvent.press(screen.getByText('Equipment'));
    pickUnits(REMOTE);
    fireEvent.press(screen.getByTestId('payment-picked-eq-1'));

    expect(useRechargeStore.getState().target).toBeNull();
  });

  it('replaces an existing unit for free when no fee is typed', () => {
    mount();
    fireEvent.press(screen.getByText('Equipment'));
    fireEvent.press(screen.getByTestId('payment-replace-ce-1'));
    fireEvent.press(screen.getByTestId('recharge-next'));

    expect(screen.getByText('Replacing')).toBeTruthy();
    expect(screen.getByTestId('recharge-submit')).toHaveTextContent('Record free swap');
    fireEvent.press(screen.getByTestId('recharge-submit'));

    const payload = mockReplaceKit.mock.calls[0]![0].payload;
    expect(payload).toMatchObject({ customerEquipmentId: 'ce-1', amount: null });
    expect('method' in payload).toBe(false);
    expect(mockRecordKit).not.toHaveBeenCalled();
  });

  it('charges a replacement fee when one is typed', () => {
    mount();
    fireEvent.press(screen.getByText('Equipment'));
    fireEvent.press(screen.getByTestId('payment-replace-ce-1'));
    fireEvent.press(screen.getByTestId('recharge-next'));
    fireEvent.changeText(screen.getByTestId('recharge-amount'), '100');
    fireEvent.press(screen.getByTestId('recharge-submit'));

    expect(mockReplaceKit.mock.calls[0]![0].payload).toMatchObject({ customerEquipmentId: 'ce-1', amount: '100.00', method: 'cash' });
  });

  it('books an equipment charge against the customer, not a connection', () => {
    mount();

    fireEvent.press(screen.getByText('Equipment'));
    pickUnits(REMOTE);
    fireEvent.press(screen.getByTestId('recharge-next'));
    fireEvent.changeText(screen.getByTestId('recharge-amount'), '250');
    fireEvent.press(screen.getByTestId('recharge-submit'));

    expect('subscriptionId' in mockRecordKit.mock.calls[0]![0].payload).toBe(false);
  });

  it('records an equipment charge for new stock only', () => {
    mount();

    fireEvent.press(screen.getByText('Equipment'));
    pickUnits(REMOTE);
    fireEvent.press(screen.getByTestId('recharge-next'));
    fireEvent.changeText(screen.getByTestId('recharge-amount'), '250');
    fireEvent.press(screen.getByTestId('recharge-submit'));

    expect(mockRecordKit.mock.calls[0]![0].payload).toMatchObject({
      items: [{ catalogId: 'cat-1', equipmentId: 'eq-1' }],
      amount: '250.00',
    });
    expect(mockRecordDues).not.toHaveBeenCalled();
  });

  it('assigns another stocked unit and charges the amount actually paid', () => {
    mount();

    fireEvent.press(screen.getByText('Equipment'));
    pickUnits(REMOTE);
    fireEvent.press(screen.getByTestId('recharge-next'));
    expect(screen.getByTestId('recharge-amount').props.value).toBe('');

    fireEvent.changeText(screen.getByTestId('recharge-amount'), '275');
    fireEvent.press(screen.getByTestId('recharge-submit'));

    expect(mockRecordKit.mock.calls[0]![0].payload).toMatchObject({
      items: [{ catalogId: 'cat-1', equipmentId: 'eq-1' }],
      amount: '275.00',
    });
  });

  it('records dues with no amount as a visit that left the balance due', () => {
    toAmount();

    expect(screen.getByTestId('recharge-submit')).toHaveTextContent('Mark as due');
    fireEvent.press(screen.getByTestId('recharge-submit'));

    const payload = duesPayload();
    expect(payload).toMatchObject({ amount: null, reason: 'Not paid — balance left due' });
    expect('method' in payload).toBe(false);
  });

  it('warns before marking a cycle due that is already charged', async () => {
    const confirm = jest.spyOn(dialogs, 'confirm').mockResolvedValue(false);
    mockListCollections.mockResolvedValueOnce({ items: [
      { subscriptionId: 'sub-1', outcome: 'none', collectedAt: '2026-10-02T09:30:00.000Z', collectorName: 'Ravi' },
      { subscriptionId: 'sub-1', outcome: 'due', collectedAt: '2026-10-01T05:00:00.000Z', collectorName: 'Sita' },
      { subscriptionId: 'sub-1', outcome: 'due', collectedAt: '2026-09-01T05:00:00.000Z', collectorName: 'Old' },
    ] });
    toAmount([{ ...line('sub-1', 'Gold HD', '850.00'), nextPlanCharge: '0.00' }]);

    fireEvent.press(screen.getByTestId('recharge-submit'));

    await waitFor(() => expect(confirm).toHaveBeenCalled());
    const { title, message } = confirm.mock.calls[0]![0];
    expect(title).toBe('Already marked due · 2 times');
    expect(message).toMatch(/• Visit logged .* by Ravi/);
    expect(message).toMatch(/• Marked due .* by Sita/);
    expect(message).toContain('Gold HD · ACT-sub-1');
    expect(message).toContain('Plan ₹350.00 already charged');
    expect(message).toContain('Balance due: ₹850.00');
    expect(mockRecordDues).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it('records the repeat visit once the warning is accepted', async () => {
    const confirm = jest.spyOn(dialogs, 'confirm').mockResolvedValue(true);
    toAmount([{ ...line('sub-1', 'Gold HD', '850.00'), nextPlanCharge: '0.00' }]);

    fireEvent.press(screen.getByTestId('recharge-submit'));

    await waitFor(() => expect(mockRecordDues).toHaveBeenCalledTimes(1));
    expect(duesPayload()).toMatchObject({ amount: null });
    confirm.mockRestore();
  });

  it('uses the note as the reason when dues are marked due', () => {
    toAmount();
    fireEvent.changeText(screen.getByPlaceholderText('Anything the office should know'), 'Customer out of town');
    fireEvent.press(screen.getByTestId('recharge-submit'));

    expect(duesPayload()).toMatchObject({ amount: null, reason: 'Customer out of town' });
  });

  it('still asks for an amount on an equipment charge', async () => {
    const notify = jest.spyOn(dialogs, 'notify').mockResolvedValue();
    mount();
    fireEvent.press(screen.getByText('Equipment'));
    pickUnits(REMOTE);
    fireEvent.press(screen.getByTestId('recharge-next'));

    fireEvent.press(screen.getByTestId('recharge-submit'));

    expect(notify).toHaveBeenCalledWith('Enter an amount', expect.any(String));
    expect(mockRecordKit).not.toHaveBeenCalled();
    notify.mockRestore();
  });

  it('refuses an equipment charge with no unit picked', async () => {
    const notify = jest.spyOn(dialogs, 'notify').mockResolvedValue();
    mount();

    fireEvent.press(screen.getByText('Equipment'));
    fireEvent.press(screen.getByTestId('recharge-next'));

    expect(notify).toHaveBeenCalledWith('Pick the equipment', expect.any(String));
    expect(screen.queryByTestId('recharge-amount')).toBeNull();
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

  it('moves to the printer step once the money is recorded', async () => {
    toAmount();
    fireEvent.changeText(screen.getByTestId('recharge-amount'), '500');
    fireEvent.press(screen.getByTestId('recharge-submit'));

    act(() => mockRecordDues.mock.calls[0]![1].onSuccess({ id: 'rcpt-9' }));

    await waitFor(() => expect(useRechargeStore.getState().step).toBe('printer'));
    expect(useRechargeStore.getState().receiptId).toBe('rcpt-9');
  });

  it('holds Next until a printer is connected, and lets printing be skipped', async () => {
    recordedAt('printer');

    expect(screen.getByTestId('recharge-printer-next')).toBeDisabled();

    fireEvent.press(screen.getByTestId('recharge-skip-print'));

    expect(await screen.findByTestId('recharge-finish')).toBeTruthy();
    expect(screen.getByText(/Not printed/)).toBeTruthy();
    expect(mockPrinter.print).not.toHaveBeenCalled();
  });

  it('previews the receipt with the UPI QR, prints it, then confirms', async () => {
    mockPrinter.connectedAddress = 'AA:BB';
    mockPrinter.phase = 'connected';
    recordedAt('printer');

    fireEvent.press(screen.getByTestId('recharge-printer-next'));

    expect(screen.getByTestId('recharge-preview')).toHaveTextContent(/PAID Rs\.500\.00/);
    expect(screen.getByTestId('recharge-preview')).toHaveTextContent(/Plan\s+Gold HD/);
    expect(screen.UNSAFE_getByType('QRCode' as unknown as React.ComponentType)).toBeTruthy();

    fireEvent.press(screen.getByTestId('recharge-print'));

    expect(await screen.findByText('Printed')).toBeTruthy();
    expect(mockPrinter.print).toHaveBeenCalledTimes(1);
  });

  it('stays on the preview when the printer refuses the receipt', async () => {
    const notify = jest.spyOn(dialogs, 'notify').mockResolvedValue();
    mockPrinter.connectedAddress = 'AA:BB';
    mockPrinter.print.mockResolvedValueOnce(false);
    recordedAt('preview');

    fireEvent.press(screen.getByTestId('recharge-print'));

    await waitFor(() => expect(notify).toHaveBeenCalledWith('Not printed', expect.any(String)));
    expect(useRechargeStore.getState().step).toBe('preview');
    notify.mockRestore();
  });

  it('does not step back into the amount once the money is recorded', async () => {
    recordedAt('preview');

    fireEvent.press(screen.getByLabelText('Back'));
    expect(await screen.findByTestId('recharge-printer-next')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Back'));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });
});

it('honors a newly selected connection when reopening the same customer', () => {
  const lines = [line('sub-1', 'Gold HD', '500.00'), line('sub-2', 'Fibre', '199.00')];
  const view = mount(lines, 'sub-1');
  view.unmount();
  toAmount(lines, 'sub-2');
  fireEvent.changeText(screen.getByTestId('recharge-amount'), '100');
  fireEvent.press(screen.getByTestId('recharge-submit'));
  expect(duesPayload().subscriptionId).toBe('sub-2');
});

import type { ActivationStatus } from '@/lib/api/contracts';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as React from 'react';
import { ActivateAtActButton } from './activate-at-act-button';

const BOX = '5f1c0d6e-7a4b-4c1e-9d3a-0b5e8f6a1c42';
const RUN = '2f1c0d6e-7a4b-4c1e-9d3a-0b5e8f6a1c42';
const VISIT = '9a1c0d6e-7a4b-4c1e-9d3a-0b5e8f6a1c42';
const CUSTOMER = '3b1c0d6e-7a4b-4c1e-9d3a-0b5e8f6a1c42';

const mockNotify = jest.fn();
const mockStart = jest.fn();
const mockDecide = jest.fn();
const mockInvalidate = jest.fn();
const mockRecordVisit = jest.fn();
let mockFix: { status: string; latitude?: number; longitude?: number; gpsAccuracyM?: number; retry: () => void } = { status: 'ready', latitude: 16.8697, longitude: 81.73, gpsAccuracyM: 12, retry: () => undefined };
let mockStatus: { data?: ActivationStatus; isError?: boolean } = {};
let mockDeciding = false;

jest.mock('@/components/common/dialogs', () => ({ dialogs: { notify: (...args: unknown[]) => mockNotify(...args) as unknown } }));
jest.mock('@/lib/hooks/api/use-visits', () => ({ recordVisit: (...args: unknown[]) => mockRecordVisit(...args) as unknown }));
jest.mock('@/lib/hooks/api/use-payments', () => ({ newCollectionReference: () => 'visit-ref-1' }));
jest.mock('@/lib/hooks/common/use-collection-fix', () => ({
  useCollectionFix: () => mockFix,
  fixPayload: (fix: typeof mockFix) => ({ latitude: fix.latitude, longitude: fix.longitude, gpsAccuracyM: fix.gpsAccuracyM }),
}));
jest.mock('@/lib/payments/require-fix', () => ({ ensureFix: (fix: typeof mockFix) => fix.status === 'ready' }));
jest.mock('@/lib/api/query-client', () => ({ queryClient: { invalidateQueries: (...args: unknown[]) => mockInvalidate(...args) as unknown } }));
jest.mock('@/lib/hooks/api/use-job-runs', () => ({
  useStartActivation: () => ({ mutate: mockStart, isPending: false }),
  useDecideActivation: () => ({ mutate: mockDecide, isPending: mockDeciding }),
  useActivationStatus: (runId: string | undefined) => ({ data: undefined, isError: false, ...(runId === undefined ? {} : mockStatus) }),
}));

const BILL = { billAmount: 144.84, taxAmount: 26.08, totalPayable: 170.92, networkCapacityFee: 153.4, msoShare: 135.77, outstanding: 0, tax1: 12.22, tax2: 12.22, totalMsoSharePayable: 160.21, availableBalance: 1092.89 };
const NO_BILL = { billAmount: null, taxAmount: null, totalPayable: null, networkCapacityFee: null, msoShare: null, outstanding: null, tax1: null, tax2: null, totalMsoSharePayable: null, availableBalance: null };

function status(overrides: Partial<ActivationStatus> = {}): ActivationStatus {
  return { status: 'running', message: null, action: 'activate', progress: 25, step: 'Finding the set-top box', awaitingConfirmation: false, endDate: null, outcome: null, packages: [], bill: null, ...overrides };
}
const waiting = (overrides: Partial<ActivationStatus> = {}) => status({ progress: 75, step: 'Waiting for your confirmation', awaitingConfirmation: true, packages: ['ACT_BST_PRE_VIZ', 'TV9 TELUGU_FTA_PRE_VIZ'], bill: BILL, ...overrides });

/** The server accepts the request and names its run. */
function accept() {
  mockStart.mockImplementation((_body: unknown, options: { onSuccess: (response: { run: { id: string } }) => void }) => options.onSuccess({ run: { id: RUN } }));
}

/** Part of an element's text; `toHaveTextContent` with a string wants all of it. */
const has = (text: string) => new RegExp(text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`));

const press = (testID = 'activate-at-act') => fireEvent.press(screen.getByTestId(testID));
const rerender = (action?: 'activate' | 'renew') => screen.rerender(<ActivateAtActButton customerEquipmentId={BOX} collectionId="rcpt-9" {...(action === undefined ? {} : { action })} />);

beforeEach(() => {
  [mockNotify, mockStart, mockDecide, mockInvalidate, mockRecordVisit].forEach(mock => mock.mockReset());
  mockFix = { status: 'ready', latitude: 16.8697, longitude: 81.73, gpsAccuracyM: 12, retry: () => undefined };
  mockStatus = {};
  mockDeciding = false;
  mockNotify.mockResolvedValue(undefined);
});

describe('activateAtActButton', () => {
  it('starts the run for this box, locks the screen with a progress window, and disables the button', () => {
    accept();
    mockStatus = { data: status({ progress: 50, step: 'Selecting its packages' }) };
    render(<ActivateAtActButton customerEquipmentId={BOX} collectionId="rcpt-9" />);

    press();

    expect(mockStart).toHaveBeenCalledWith({ customerEquipmentId: BOX, action: 'activate', collectionId: 'rcpt-9' }, expect.any(Object));
    expect(screen.getByTestId('act-modal')).toBeTruthy();
    expect(screen.getByText('Signing in to ACT')).toBeTruthy();
    expect(screen.getByText('Selecting its packages')).toBeTruthy();
    expect(screen.getByText('Extending on ACT')).toBeTruthy();
    expect(screen.getByText(/The screen stays locked/)).toBeTruthy();
    // Nothing to tap while ACT works: no approve, no cancel, no close.
    expect(screen.queryByTestId('act-approve')).toBeNull();
    expect(screen.queryByTestId('act-cancel')).toBeNull();
    expect(screen.queryByTestId('act-close')).toBeNull();
    expect(screen.getByTestId('activate-at-act').props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('names the payment it follows, so the server can check it and tell the admins what triggered the run', () => {
    accept();
    mockStatus = { data: status({ progress: 50 }) };
    render(<ActivateAtActButton customerEquipmentId={BOX} action="renew" collectionId="rcpt-9" />);

    press('renew-at-act');

    expect(mockStart).toHaveBeenCalledWith({ customerEquipmentId: BOX, action: 'renew', collectionId: 'rcpt-9' }, expect.any(Object));
  });

  it('starts by itself once when asked to, however often it renders, and shows the same window as a tap', () => {
    accept();
    mockStatus = { data: status({ progress: 50 }) };
    const view = render(<ActivateAtActButton customerEquipmentId={BOX} collectionId="rcpt-9" autoStart />);
    view.rerender(<ActivateAtActButton customerEquipmentId={BOX} collectionId="rcpt-9" autoStart />);

    expect(mockStart).toHaveBeenCalledTimes(1);
    expect(mockStart).toHaveBeenCalledWith({ customerEquipmentId: BOX, action: 'activate', collectionId: 'rcpt-9' }, expect.any(Object));
    expect(screen.getByTestId('act-modal')).toBeTruthy();
  });

  it('leaves the button for a manual try when the automatic start is refused', () => {
    mockStart.mockImplementation((_body: unknown, options: { onError: (error: Error) => void }) => options.onError(new Error('Another ACT action is running for this provider. Try again in a moment.')));
    render(<ActivateAtActButton customerEquipmentId={BOX} collectionId="rcpt-9" autoStart />);

    expect(mockNotify).toHaveBeenCalledWith('Not activated', 'Another ACT action is running for this provider. Try again in a moment.');
    expect(mockStart).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('act-modal')).toBeNull();
    expect(screen.getByTestId('activate-at-act').props.accessibilityState).toMatchObject({ disabled: false });
  });

  it('shows ACT\'s packages, bill and wallet while it waits, and only an approval carries the amount shown', () => {
    accept();
    mockStatus = { data: waiting() };
    render(<ActivateAtActButton customerEquipmentId={BOX} collectionId="rcpt-9" />);
    press();

    const offer = screen.getByTestId('act-offer');
    expect(offer).toHaveTextContent(has('ACT_BST_PRE_VIZ, TV9 TELUGU_FTA_PRE_VIZ'));
    expect(offer).toHaveTextContent(has('Bill ₹144.84 + tax ₹26.08 = ₹170.92'));
    expect(offer).toHaveTextContent(has('ACT takes ₹160.21 from the LCO wallet (wallet ₹1,092.89 → ₹932.68)'));
    expect(mockDecide).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('act-approve'));

    expect(mockDecide).toHaveBeenCalledWith({ decision: 'approve', approvedTotal: 160.21 }, expect.any(Object));
  });

  it('blocks everything once approved: the buttons go and it says it is activating until ACT is done', () => {
    accept();
    mockDecide.mockImplementation((_body: unknown, options: { onSuccess: () => void }) => options.onSuccess());
    mockStatus = { data: waiting() };
    render(<ActivateAtActButton customerEquipmentId={BOX} collectionId="rcpt-9" />);
    press();

    fireEvent.press(screen.getByTestId('act-approve'));

    expect(screen.getByTestId('act-doing')).toHaveTextContent(has('Activating on ACT…'));
    expect(screen.queryByTestId('act-approve')).toBeNull();
    expect(screen.queryByTestId('act-cancel')).toBeNull();
    expect(screen.queryByTestId('act-close')).toBeNull();
  });

  it('declines for the person who says cancel, and closes the window', () => {
    accept();
    mockDecide.mockImplementation((_body: unknown, options: { onSuccess: () => void }) => options.onSuccess());
    mockStatus = { data: waiting() };
    render(<ActivateAtActButton customerEquipmentId={BOX} collectionId="rcpt-9" />);
    press();

    fireEvent.press(screen.getByTestId('act-cancel'));

    expect(mockDecide).toHaveBeenCalledWith({ decision: 'cancel' }, expect.any(Object));
    expect(screen.queryByTestId('act-modal')).toBeNull();
  });

  it('does not let a person approve when the wallet cannot cover ACT\'s share', () => {
    accept();
    mockStatus = { data: waiting({ bill: { ...BILL, availableBalance: 100 } }) };
    render(<ActivateAtActButton customerEquipmentId={BOX} collectionId="rcpt-9" />);
    press();

    expect(screen.getByTestId('act-wallet-low')).toBeTruthy();
    fireEvent.press(screen.getByTestId('act-approve'));
    expect(mockDecide).not.toHaveBeenCalled();
  });

  it('says nothing was extended when the server stops at ACT\'s final OK', () => {
    accept();
    mockStatus = { data: waiting() };
    render(<ActivateAtActButton customerEquipmentId={BOX} collectionId="rcpt-9" />);
    press();

    mockStatus = { data: status({ status: 'succeeded', progress: 100, outcome: 'previewed', packages: ['A'], bill: NO_BILL }) };
    rerender();
    rerender();

    expect(screen.getByTestId('act-modal-success')).toHaveTextContent(has('so nothing was extended'));
  });

  it('says the box was activated and refreshes the customer, once, when ACT confirms it', async () => {
    accept();
    mockStatus = { data: waiting() };
    render(<ActivateAtActButton customerEquipmentId={BOX} collectionId="rcpt-9" />);
    press();

    mockStatus = { data: status({ status: 'succeeded', progress: 100, step: 'Set-top box activated', outcome: 'activated', packages: ['A'], bill: BILL }) };
    rerender();
    rerender();

    expect(screen.getByTestId('act-modal-success')).toHaveTextContent(has('ACT confirmed it: the set-top box was extended'));
    await waitFor(() => expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['customer'] }));
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['customer-timeline'] });
    expect(mockInvalidate).toHaveBeenCalledTimes(3);

    fireEvent.press(screen.getByTestId('act-close'));
    expect(screen.queryByTestId('act-modal')).toBeNull();
  });

  it('shows the safe message when ACT refuses or the person never answered, and lets the window close', () => {
    accept();
    mockStatus = { data: waiting() };
    render(<ActivateAtActButton customerEquipmentId={BOX} collectionId="rcpt-9" />);
    press();

    mockStatus = { data: status({ status: 'failed', progress: 85, message: 'ACT did not confirm the activation; check the set-top box on ACT before trying again' }) };
    rerender();

    expect(screen.getByTestId('act-modal-failure')).toHaveTextContent(has('ACT did not confirm the activation; check the set-top box on ACT before trying again'));
    expect(mockInvalidate).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('act-close'));
    expect(screen.queryByTestId('act-modal')).toBeNull();
  });

  it('warns not to assume it worked when the status cannot be read', () => {
    accept();
    render(<ActivateAtActButton customerEquipmentId={BOX} collectionId="rcpt-9" />);
    press();

    mockStatus = { isError: true };
    rerender();

    expect(screen.getByTestId('act-modal-failure')).toBeTruthy();
  });

  it('says why when the server refuses to start', () => {
    mockStart.mockImplementation((_body: unknown, options: { onError: (error: Error) => void }) => options.onError(new Error('Only an active customer\'s box is activated again; an inactive one is renewed')));
    render(<ActivateAtActButton customerEquipmentId={BOX} collectionId="rcpt-9" />);

    press();

    expect(mockNotify).toHaveBeenCalledWith('Not activated', 'Only an active customer\'s box is activated again; an inactive one is renewed');
    expect(screen.queryByTestId('act-modal')).toBeNull();
  });
});

describe('activateAtActButton as a renewal', () => {
  it('is a Renew button that starts a renewal and shows the expired packages without a price', () => {
    accept();
    mockStatus = { data: status({ action: 'renew', progress: 60, step: 'Waiting for your confirmation', awaitingConfirmation: true, packages: ['ACT_BST_PRE_VIZ'], bill: NO_BILL }) };
    render(<ActivateAtActButton customerEquipmentId={BOX} action="renew" collectionId="rcpt-9" />);

    expect(screen.getByText('Renew on ACT')).toBeTruthy();
    press('renew-at-act');

    expect(mockStart).toHaveBeenCalledWith({ customerEquipmentId: BOX, action: 'renew', collectionId: 'rcpt-9' }, expect.any(Object));
    expect(screen.getByTestId('act-offer')).toHaveTextContent(has('ACT will renew these expired packages:'));
    expect(screen.getByTestId('act-offer')).toHaveTextContent(has('ACT does not show a price before renewing.'));
    expect(screen.getByText('Renew')).toBeTruthy();

    fireEvent.press(screen.getByTestId('act-approve'));
    expect(mockDecide).toHaveBeenCalledWith({ decision: 'approve' }, expect.any(Object));
  });

  it('says the box was renewed', () => {
    accept();
    mockStatus = { data: status({ action: 'renew', status: 'succeeded', progress: 100, outcome: 'renewed', packages: ['A'], bill: NO_BILL }) };
    render(<ActivateAtActButton customerEquipmentId={BOX} action="renew" collectionId="rcpt-9" />);
    press('renew-at-act');

    expect(screen.getByTestId('act-modal-success')).toHaveTextContent(has('ACT confirmed it: the set-top box was renewed.'));
  });
});

describe('activateAtActButton without a payment: the reason is a visit', () => {
  const source = { customerId: CUSTOMER, customerName: 'M Pushpalatha', subscriptionId: 'sub-1' };
  const mount = (action?: 'activate' | 'renew') => render(<ActivateAtActButton customerEquipmentId={BOX} visit={source} {...(action === undefined ? {} : { action })} />);

  it('asks why in a dialog on tap, and starts nothing until a visit is saved', () => {
    accept();
    mount();

    press();

    expect(screen.getByTestId('act-visit-dialog')).toBeTruthy();
    expect(mockStart).not.toHaveBeenCalled();
    expect(mockRecordVisit).not.toHaveBeenCalled();
  });

  it('starts nothing when the dialog is cancelled', () => {
    mount();
    press();

    fireEvent.press(screen.getByTestId('act-visit-cancel'));

    expect(screen.queryByTestId('act-visit-dialog')).toBeNull();
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('wants a reason, and words for "Other", before it saves anything', () => {
    mount();
    press();

    fireEvent.press(screen.getByTestId('act-visit-save'));
    expect(mockNotify).toHaveBeenLastCalledWith('Pick a reason', expect.any(String));

    fireEvent.press(screen.getByTestId('act-visit-reason-other'));
    fireEvent.press(screen.getByTestId('act-visit-save'));
    expect(mockNotify).toHaveBeenLastCalledWith('Say why', expect.any(String));
    expect(mockRecordVisit).not.toHaveBeenCalled();
  });

  it('saves an activation visit with the reason and the location, then starts the run that follows it', async () => {
    accept();
    mockRecordVisit.mockResolvedValue({ id: VISIT });
    mount();
    press();

    fireEvent.press(screen.getByTestId('act-visit-reason-office'));
    fireEvent.changeText(screen.getByTestId('act-visit-note'), 'Receipt 4471');
    fireEvent.press(screen.getByTestId('act-visit-save'));

    await waitFor(() => expect(mockStart).toHaveBeenCalledWith({ customerEquipmentId: BOX, action: 'activate', visitId: VISIT }, expect.any(Object)));
    expect(mockRecordVisit).toHaveBeenCalledWith(CUSTOMER, expect.objectContaining({
      purpose: 'activation',
      outcome: 'done',
      reference: 'visit-ref-1',
      subscriptionId: 'sub-1',
      latitude: 16.8697,
      notes: 'Paid at the office: Receipt 4471',
    }));
    expect(screen.queryByTestId('act-visit-dialog')).toBeNull();
    expect(screen.getByTestId('act-modal')).toBeTruthy();
  });

  it('records a renewal visit for a renewal, with the typed words as the reason for "Other"', async () => {
    accept();
    mockRecordVisit.mockResolvedValue({ id: VISIT });
    mount('renew');
    press('renew-at-act');

    fireEvent.press(screen.getByTestId('act-visit-reason-other'));
    fireEvent.changeText(screen.getByTestId('act-visit-note'), 'Owner agreed on the phone');
    fireEvent.press(screen.getByTestId('act-visit-save'));

    await waitFor(() => expect(mockStart).toHaveBeenCalledWith({ customerEquipmentId: BOX, action: 'renew', visitId: VISIT }, expect.any(Object)));
    expect(mockRecordVisit).toHaveBeenCalledWith(CUSTOMER, expect.objectContaining({ purpose: 'renewal', notes: 'Owner agreed on the phone' }));
  });

  it('starts nothing and says so when the visit cannot be saved, and keeps the dialog for a retry', async () => {
    mockRecordVisit.mockRejectedValue(new Error('Network down'));
    mount();
    press();
    fireEvent.press(screen.getByTestId('act-visit-reason-upi'));

    fireEvent.press(screen.getByTestId('act-visit-save'));

    await waitFor(() => expect(mockNotify).toHaveBeenCalledWith('Visit not saved', 'Network down'));
    expect(mockStart).not.toHaveBeenCalled();
    expect(screen.getByTestId('act-visit-dialog')).toBeTruthy();
  });

  it('will not save a visit without a location fix', () => {
    mockFix = { status: 'locating', retry: () => undefined };
    mount();
    press();
    fireEvent.press(screen.getByTestId('act-visit-reason-office'));

    fireEvent.press(screen.getByTestId('act-visit-save'));

    expect(mockRecordVisit).not.toHaveBeenCalled();
  });

  it('refuses to start with neither a payment nor a visit to ask about', () => {
    render(<ActivateAtActButton customerEquipmentId={BOX} />);

    press();

    expect(mockStart).not.toHaveBeenCalled();
    expect(mockNotify).toHaveBeenCalledWith('Not activated', expect.stringMatching(/reason on record/));
  });
});

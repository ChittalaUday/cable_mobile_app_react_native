import type { RecordVisitPayload } from '@/lib/hooks/api/use-visits';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as React from 'react';
import { dialogs } from '@/components/common/dialogs';
import i18n from '@/lib/i18n';
import { dayKey } from '@/lib/utils/round-filters';
import { clearVisitFlow, completeVisitAfterPayment, useVisitFlow } from '@/lib/visits/visit-flow';
import { MarkVisitSheet, startVisit } from './mark-visit-sheet';

const mockRecord = jest.fn<Promise<unknown>, [string, RecordVisitPayload]>(() => Promise.resolve({}));
const mockResolve = jest.fn<Promise<unknown>, [unknown]>(() => Promise.resolve({}));
const mockPush = jest.fn();
let mockFix: Record<string, unknown> = { status: 'ready', latitude: 16.8697, longitude: 81.9342, gpsAccuracyM: 8, retry: jest.fn() };

jest.mock('expo-router', () => ({ router: { push: (...args: unknown[]) => void mockPush(...args) } }));
jest.mock('@/lib/hooks/api/use-visits', () => ({
  ...jest.requireActual<Record<string, unknown>>('@/lib/hooks/api/use-visits'),
  recordVisit: (customerId: string, payload: RecordVisitPayload) => mockRecord(customerId, payload),
}));
jest.mock('@/lib/hooks/api/use-tickets', () => ({ useUpdateTicket: () => ({ mutateAsync: mockResolve }) }));
jest.mock('@/lib/hooks/api/use-payments', () => ({ newCollectionReference: () => 'visit-ref-1' }));
jest.mock('@/lib/hooks/common/use-collection-fix', () => ({
  useCollectionFix: () => mockFix,
  fixPayload: (fix: { latitude: number; longitude: number; gpsAccuracyM: number }) => ({ latitude: fix.latitude, longitude: fix.longitude, gpsAccuracyM: fix.gpsAccuracyM }),
}));

const bill = { customerId: 'cust-1', customerName: 'Kavitha Devi', subscriptionId: 'sub-1', purpose: 'payment' as const, action: 'collect_payment' as const };
const complaint = { customerId: 'cust-1', customerName: 'Kavitha Devi', ticketId: 'tkt-1', purpose: 'complaint' as const, action: 'resolve_complaint' as const };

beforeEach(async () => {
  await i18n.changeLanguage('en');
  jest.clearAllMocks();
  clearVisitFlow();
  mockFix = { status: 'ready', latitude: 16.8697, longitude: 81.9342, gpsAccuracyM: 8, retry: jest.fn() };
  jest.spyOn(dialogs, 'notify').mockResolvedValue(undefined as never);
});

function open(target: Parameters<typeof startVisit>[0]) {
  render(<MarkVisitSheet />);
  act(() => startVisit(target));
}

describe('marking a visit', () => {
  it('does not ask why they came: the list already said', () => {
    open(bill);
    expect(screen.queryByText('Came for')).toBeNull();
    expect(screen.getByText('Bill')).toBeTruthy();
    expect(screen.getByTestId('visit-choice-action')).toHaveTextContent('Collect payment');
  });

  it('logs "not available" with an optional note, and offers no come-back dates', () => {
    open(bill);
    fireEvent.press(screen.getByTestId('visit-choice-not_available'));
    expect(screen.queryByTestId('visit-next-tomorrow')).toBeNull();
    fireEvent.changeText(screen.getByTestId('visit-notes'), 'Door locked');
    fireEvent.press(screen.getByTestId('visit-submit'));

    return waitFor(() => {
      expect(mockRecord).toHaveBeenCalledTimes(1);
      const [customerId, payload] = mockRecord.mock.calls[0]!;
      expect(customerId).toBe('cust-1');
      expect(payload).toMatchObject({ purpose: 'payment', outcome: 'not_available', notes: 'Door locked', reference: 'visit-ref-1', subscriptionId: 'sub-1', latitude: 16.8697 });
      expect(payload.collectionId).toBeUndefined();
      expect(payload.nextVisitAt).toBeUndefined();
    });
  });

  it('asks when to come back only for "come later", with tomorrow already picked, and sends the date', async () => {
    open(bill);
    fireEvent.press(screen.getByTestId('visit-choice-come_later'));
    expect(screen.getByTestId('visit-next-tomorrow')).toBeSelected();
    expect(screen.queryByText('No date')).toBeNull();
    fireEvent.press(screen.getByTestId('visit-submit'));

    await waitFor(() => expect(mockRecord).toHaveBeenCalled());
    const payload = mockRecord.mock.calls[0]![1];
    expect(payload.outcome).toBe('come_later');
    expect(new Date(payload.nextVisitAt!).getTime()).toBeGreaterThan(Date.now());
  });

  it('sends the exact future day chosen from the custom date modal', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = dayKey(tomorrow);

    open(bill);
    fireEvent.press(screen.getByTestId('visit-choice-come_later'));
    fireEvent.press(screen.getByTestId('visit-next-custom'));
    expect(screen.getByTestId('date-picker-modal')).toBeTruthy();
    expect(screen.getByTestId(`date-picker-day-${tomorrowKey}`)).toBeEnabled();

    fireEvent.press(screen.getByTestId(`date-picker-day-${tomorrowKey}`));
    fireEvent.press(screen.getByTestId('date-picker-apply'));
    expect(screen.getByTestId('visit-next-custom')).toBeSelected();

    fireEvent.press(screen.getByTestId('visit-submit'));
    await waitFor(() => expect(mockRecord).toHaveBeenCalled());

    const payload = mockRecord.mock.calls[0]![1];
    expect(dayKey(new Date(payload.nextVisitAt!))).toBe(tomorrowKey);
  });

  it('localizes the custom date option in English and Telugu', async () => {
    open(bill);
    fireEvent.press(screen.getByTestId('visit-choice-come_later'));
    expect(screen.getByTestId('visit-next-custom')).toHaveTextContent('Custom date');

    await act(() => i18n.changeLanguage('te'));
    expect(screen.getByTestId('visit-next-custom')).toHaveTextContent('ఇతర తేదీ');
  });

  it('hands a bill to the payment flow, holding the visit until the payment is recorded', async () => {
    open(bill);
    fireEvent.changeText(screen.getByTestId('visit-choice-action'), '');
    fireEvent.press(screen.getByTestId('visit-submit'));

    // The payment screen opens only once the sheet has closed: pushing mid-dismiss crashed Android.
    expect(useVisitFlow.getState().active?.stage).toBe('working');
    expect(mockPush).not.toHaveBeenCalled();
    act(() => (screen.UNSAFE_getByType(BottomSheetModal).props as { onDismiss: () => void }).onDismiss());
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/admin/recharge/[id]', params: { id: 'cust-1', subscriptionId: 'sub-1' } });
    expect(mockRecord).not.toHaveBeenCalled();

    await act(() => completeVisitAfterPayment('cust-1', 'pay-9', 'subscription'));
    expect(mockRecord).toHaveBeenCalledWith('cust-1', expect.objectContaining({ purpose: 'payment', outcome: 'done', collectionId: 'pay-9', reference: 'visit-ref-1' }));
    expect(useVisitFlow.getState().active).toBeNull();
  });

  it('settles an installation with an equipment payment, but not a bill', async () => {
    const fitting = { ...bill, purpose: 'installation' as const };
    open(bill);
    fireEvent.press(screen.getByTestId('visit-submit'));
    await completeVisitAfterPayment('cust-1', 'pay-3', 'equipment');
    expect(mockRecord).not.toHaveBeenCalled();
    act(() => clearVisitFlow());

    act(() => startVisit(fitting));
    fireEvent.press(screen.getByTestId('visit-submit'));
    await act(() => completeVisitAfterPayment('cust-1', 'pay-4', 'equipment'));
    expect(mockRecord).toHaveBeenCalledWith('cust-1', expect.objectContaining({ purpose: 'installation', outcome: 'done', collectionId: 'pay-4', subscriptionId: 'sub-1' }));
  });

  it('ignores a payment for somebody else, or when no visit is waiting', async () => {
    await completeVisitAfterPayment('cust-1', 'pay-1', 'subscription');
    expect(mockRecord).not.toHaveBeenCalled();

    open(bill);
    fireEvent.press(screen.getByTestId('visit-submit'));
    await completeVisitAfterPayment('someone-else', 'pay-2', 'subscription');
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it('resolves the ticket, then marks the complaint visit done', async () => {
    open(complaint);
    fireEvent.press(screen.getByTestId('visit-submit'));
    expect(mockResolve).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByTestId('visit-resolution'), 'Replaced the drop wire');
    fireEvent.press(screen.getByTestId('visit-submit'));
    await waitFor(() => expect(mockRecord).toHaveBeenCalled());

    expect(mockResolve).toHaveBeenCalledWith({ id: 'tkt-1', payload: { status: 'resolved', resolution: 'Replaced the drop wire' } });
    expect(mockRecord).toHaveBeenCalledWith('cust-1', expect.objectContaining({ purpose: 'complaint', outcome: 'done', ticketId: 'tkt-1' }));
    expect(useVisitFlow.getState().active).toBeNull();
  });

  it('drops everything typed when cancelled', () => {
    open(bill);
    fireEvent.press(screen.getByTestId('visit-choice-not_available'));
    fireEvent.changeText(screen.getByTestId('visit-notes'), 'Door locked');
    fireEvent.press(screen.getByTestId('visit-cancel'));

    expect(useVisitFlow.getState().active).toBeNull();
    expect(screen.queryByTestId('visit-submit')).toBeNull();
  });

  it('drops the draft when the sheet close control dismisses it', async () => {
    open(bill);
    fireEvent.press(screen.getByTestId('visit-choice-not_available'));
    fireEvent.changeText(screen.getByTestId('visit-notes'), 'Back after lunch');
    fireEvent.press(screen.getByLabelText('close modal'));

    await waitFor(() => expect(useVisitFlow.getState().active).toBeNull());
    expect(screen.queryByTestId('visit-submit')).toBeNull();
  });

  it('will not save without a location', () => {
    mockFix = { status: 'locating', retry: jest.fn() };
    open(bill);
    fireEvent.press(screen.getByTestId('visit-choice-not_available'));
    fireEvent.press(screen.getByTestId('visit-submit'));
    expect(mockRecord).not.toHaveBeenCalled();
  });
});

import type { RecordVisitPayload } from '@/lib/hooks/api/use-visits';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';
import { dialogs } from '@/components/common/dialogs';
import { MarkVisitSheet } from './mark-visit-sheet';

type RecordArgs = [{ customerId: string; payload: RecordVisitPayload }, unknown];
const mockRecord = jest.fn<void, RecordArgs>();
let mockFix: Record<string, unknown> = { status: 'ready', latitude: 16.8697, longitude: 81.9342, gpsAccuracyM: 8, retry: jest.fn() };

jest.mock('@/lib/hooks/api/use-visits', () => ({
  ...jest.requireActual<Record<string, unknown>>('@/lib/hooks/api/use-visits'),
  useRecordVisit: () => ({ mutate: mockRecord, isPending: false }),
}));
jest.mock('@/lib/hooks/api/use-payments', () => ({ newCollectionReference: () => 'visit-ref-1' }));
jest.mock('@/lib/hooks/common/use-collection-fix', () => ({
  useCollectionFix: () => mockFix,
  fixPayload: (fix: { latitude: number; longitude: number; gpsAccuracyM: number }) => ({ latitude: fix.latitude, longitude: fix.longitude, gpsAccuracyM: fix.gpsAccuracyM }),
}));

const target = { customerId: 'cust-1', customerName: 'Kavitha Devi', subscriptionId: 'sub-1' };

beforeEach(() => {
  jest.clearAllMocks();
  mockFix = { status: 'ready', latitude: 16.8697, longitude: 81.9342, gpsAccuracyM: 8, retry: jest.fn() };
});

describe('marking a visit', () => {
  it('sends who it was for, why, what happened, where and when to come back', () => {
    render(<MarkVisitSheet target={target} onClose={jest.fn()} />);

    fireEvent.press(screen.getByTestId('visit-purpose-complaint'));
    fireEvent.press(screen.getByTestId('visit-outcome-come_later'));
    fireEvent.press(screen.getByTestId('visit-next-tomorrow'));
    fireEvent.changeText(screen.getByTestId('visit-notes'), 'Back after 6pm');
    fireEvent.press(screen.getByTestId('visit-submit'));

    expect(mockRecord).toHaveBeenCalledTimes(1);
    const { customerId, payload } = mockRecord.mock.calls[0]![0];
    expect(customerId).toBe('cust-1');
    expect(payload).toMatchObject({
      purpose: 'complaint',
      outcome: 'come_later',
      subscriptionId: 'sub-1',
      notes: 'Back after 6pm',
      reference: 'visit-ref-1',
      latitude: 16.8697,
      longitude: 81.9342,
      gpsAccuracyM: 8,
    });
    expect(Date.parse(payload.nextVisitAt ?? '')).toBeGreaterThan(Date.now());
  });

  it('keeps one reference for the sheet, so a retry replays rather than logs twice', () => {
    render(<MarkVisitSheet target={target} onClose={jest.fn()} />);

    fireEvent.press(screen.getByTestId('visit-submit'));
    fireEvent.press(screen.getByTestId('visit-submit'));

    expect(mockRecord.mock.calls.map(([args]) => args.payload.reference)).toEqual(['visit-ref-1', 'visit-ref-1']);
  });

  it('will not save without a location', () => {
    mockFix = { status: 'denied', retry: jest.fn() };
    const notify = jest.spyOn(dialogs, 'notify').mockResolvedValue();
    render(<MarkVisitSheet target={target} onClose={jest.fn()} />);

    fireEvent.press(screen.getByTestId('visit-submit'));

    expect(mockRecord).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith('Location needed', expect.any(String));
    notify.mockRestore();
  });
});

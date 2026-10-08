import type { DueVisit } from '@/lib/hooks/api/use-visits';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';
import { TodaysRound } from './todays-round';

const DAY = 86_400_000;
function item(key: string, reason: DueVisit['reason'], offsetDays: number): DueVisit {
  return {
    key,
    reason,
    customerId: `c-${key}`,
    customerName: `Customer ${key}`,
    customerCode: null,
    title: 'Something',
    detail: null,
    dueAt: new Date(Date.now() + offsetDays * DAY).toISOString(),
    ticketId: null,
    subscriptionId: null,
    purpose: reason === 'complaint' ? 'complaint' : 'payment',
    action: reason === 'complaint' ? 'resolve_complaint' : 'collect_payment',
    customerPhone: '9876543210',
    address: '12-4 Main Road',
    locationPath: 'East Godavari / Rajahmundry / North Colony',
    doneAt: null,
    doneByName: null,
  };
}

let mockItems: DueVisit[] = [];
let mockPending = false;
let mockPick: (place: { path: string } | null) => void = () => {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: jest.fn(),
}));
jest.mock('@/lib/storage', () => ({ getItem: () => null, setItem: jest.fn(), storage: { getString: () => undefined, set: jest.fn() } }));
jest.mock('@/components/locations/location-picker-sheet', () => ({
  LocationPickerSheet: ({ onSelect }: { onSelect: typeof mockPick }) => {
    mockPick = onSelect;
    return null;
  },
}));
jest.mock('@/components/visits/mark-visit-sheet', () => ({ startVisit: jest.fn() }));
jest.mock('@/lib/hooks/api/use-visits', () => ({
  useDueVisits: () => ({ data: mockPending ? undefined : mockItems, isPending: mockPending, refetch: jest.fn() }),
}));

describe('today\'s round', () => {
  it('flags what slipped past its day in red and sinks visited doors to the bottom with who went', () => {
    mockItems = [
      item('late', 'follow_up', -3),
      item('soon', 'expiring', 2),
      { ...item('gone', 'complaint', 0), doneAt: new Date().toISOString(), doneByName: 'Ravi' },
    ];
    render(<TodaysRound basePath="/staff" />);

    expect(screen.getByTestId('round-overdue')).toHaveTextContent(/1 overdue/);
    expect(screen.getByText(/Visited by Ravi/)).toBeTruthy();
    expect(screen.getAllByText('12-4 Main Road')).toHaveLength(3);
    expect(screen.getAllByText('East Godavari › Rajahmundry › North Colony')).toHaveLength(3);
    expect(screen.getAllByText('9876543210')).toHaveLength(3);
    expect(screen.getAllByText('Mark visit')).toHaveLength(2);
    expect(screen.getByText('2 to do · 1 done')).toBeTruthy();
  });

  it('keeps the home cut to the to-dos', () => {
    mockItems = [item('late', 'follow_up', -3), { ...item('gone', 'complaint', 0), doneAt: new Date().toISOString(), doneByName: 'Ravi' }];
    render(<TodaysRound basePath="/staff" compact />);

    expect(screen.getByTestId('round-overdue')).toBeTruthy();
    expect(screen.queryByText(/Visited by/)).toBeNull();
  });

  it('narrows the list with search and the type and date pills', () => {
    mockItems = [item('late', 'follow_up', -3), item('soon', 'expiring', 2)];
    render(<TodaysRound basePath="/staff" />);

    fireEvent.press(screen.getByTestId('visit-type-expiring'));
    expect(screen.queryByTestId('round-late')).toBeNull();
    expect(screen.getByTestId('round-soon')).toBeTruthy();

    fireEvent.press(screen.getByTestId('visit-type-all'));
    fireEvent.press(screen.getByTestId('visit-date-overdue'));
    expect(screen.getByTestId('round-late')).toBeTruthy();
    expect(screen.queryByTestId('round-soon')).toBeNull();

    fireEvent.press(screen.getByTestId('visit-date-any'));
    fireEvent.changeText(screen.getByTestId('visit-search'), 'nobody');
    expect(screen.getByText('No visits match these filters.')).toBeTruthy();
  });

  it('shows a loader, not "nothing is due", while the first fetch is under way', () => {
    mockPending = true;
    render(<TodaysRound basePath="/staff" />);
    expect(screen.getByTestId('round-loading')).toBeTruthy();
    expect(screen.queryByText(/Nothing is due/)).toBeNull();
    mockPending = false;
  });

  it('filters by a place chosen in the location picker, and clears from the chip', () => {
    mockItems = [item('late', 'follow_up', -3), { ...item('other', 'expiring', 2), locationPath: 'West Godavari / Eluru / Centre' }];
    render(<TodaysRound basePath="/staff" />);

    act(() => mockPick({ path: 'West Godavari' }));
    expect(screen.queryByTestId('round-late')).toBeNull();
    expect(screen.getByTestId('round-other')).toBeTruthy();
    expect(screen.getByTestId('visit-location-chip')).toHaveTextContent(/West Godavari/);

    fireEvent.press(screen.getByTestId('visit-location-chip'));
    expect(screen.getByTestId('round-late')).toBeTruthy();
  });
});

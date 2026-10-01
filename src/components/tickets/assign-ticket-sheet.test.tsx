import type * as TicketsModule from '@/lib/hooks/api/use-tickets';
import type { Ticket } from '@/lib/hooks/api/use-tickets';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as React from 'react';
import { dialogs } from '@/components/common/dialogs';
import { AssignTicketSheet } from './assign-ticket-sheet';

type Handlers = { onSuccess: () => void; onError: (failure: Error) => void };
const mockAssign = jest.fn<void, [{ id: string; assignedTo: string | null }, Handlers]>();

jest.mock('@/lib/hooks/api/use-tickets', () => ({
  ...jest.requireActual<typeof TicketsModule>('@/lib/hooks/api/use-tickets'),
  useAssignTicket: () => ({ mutate: mockAssign, isPending: false }),
}));

// A membership id that is deliberately NOT the user id: the server keys an
// assignee by user, so sending `id` here would fail validation on a real box
// while looking perfectly fine in the UI.
const STAFF = [
  { id: 'membership-1', userId: 'user-ramesh', name: 'Ramesh K', phone: '9000000001', roleId: 'technician', status: 'active', team: { id: 't1', name: 'North crew', slug: 'north' } },
  { id: 'membership-2', userId: 'user-suresh', name: 'Suresh P', phone: '9000000002', roleId: 'technician', status: 'active', team: null },
];

jest.mock('@/lib/hooks/api/use-staff', () => ({
  useStaff: () => ({ data: { items: STAFF, total: STAFF.length }, isPending: false, error: null, refetch: jest.fn() }),
}));

jest.mock('@/lib/hooks/stores/use-auth-store', () => ({
  useAuthStore: { use: { user: () => ({ uid: 'user-me' }) } },
}));

function ticket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 'ticket-1',
    ticketNo: 'SSCN-T-000042',
    status: 'open',
    assignedTo: null,
    ...overrides,
  } as Ticket;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('handing a complaint over', () => {
  it('shows nothing until a ticket is picked', () => {
    render(<AssignTicketSheet ticket={null} onClose={jest.fn()} />);

    expect(screen.queryByText('Hand this over')).toBeNull();
  });

  it('sends the user id, not the staff membership id', () => {
    render(<AssignTicketSheet ticket={ticket()} onClose={jest.fn()} />);

    fireEvent.press(screen.getByTestId('assign-user-ramesh'));

    expect(mockAssign.mock.calls[0]![0]).toEqual({ id: 'ticket-1', assignedTo: 'user-ramesh' });
  });

  it('claims it for the signed-in user in one tap', () => {
    render(<AssignTicketSheet ticket={ticket()} onClose={jest.fn()} />);

    fireEvent.press(screen.getByTestId('assign-me'));

    expect(mockAssign.mock.calls[0]![0]).toEqual({ id: 'ticket-1', assignedTo: 'user-me' });
  });

  it('offers the pool only once somebody actually holds it', () => {
    const { rerender } = render(<AssignTicketSheet ticket={ticket()} onClose={jest.fn()} />);
    expect(screen.queryByTestId('assign-none')).toBeNull();

    rerender(
      <AssignTicketSheet
        ticket={ticket({ id: 'ticket-2', assignedTo: { id: 'user-ramesh', name: 'Ramesh K' } })}
        onClose={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByTestId('assign-none'));
    expect(mockAssign.mock.calls[0]![0]).toEqual({ id: 'ticket-2', assignedTo: null });
  });

  it('closes without a round trip when the holder is tapped again', () => {
    const onClose = jest.fn();
    render(
      <AssignTicketSheet
        ticket={ticket({ assignedTo: { id: 'user-ramesh', name: 'Ramesh K' } })}
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByTestId('assign-user-ramesh'));

    expect(mockAssign).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('says so and stays open when the server refuses', async () => {
    const notify = jest.spyOn(dialogs, 'notify').mockResolvedValue();
    const onClose = jest.fn();
    render(<AssignTicketSheet ticket={ticket()} onClose={onClose} />);

    fireEvent.press(screen.getByTestId('assign-me'));
    mockAssign.mock.calls[0]![1].onError(new Error('Not a member of this tenant'));

    await waitFor(() => expect(notify).toHaveBeenCalledWith('Not handed over', 'Not a member of this tenant'));
    expect(onClose).not.toHaveBeenCalled();

    notify.mockRestore();
  });
});

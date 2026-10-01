import type * as TicketsModule from '@/lib/hooks/api/use-tickets';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as React from 'react';
import { dialogs } from '@/components/common/dialogs';
import { RaiseTicketSheet } from './raise-ticket-sheet';

type Handlers = { onSuccess: (made: { ticketNo: string }) => void; onError: (failure: Error) => void };
const mockRaise = jest.fn<void, [{ payload: Record<string, unknown> }, Handlers]>();

jest.mock('@/lib/hooks/api/use-tickets', () => ({
  ...jest.requireActual<typeof TicketsModule>('@/lib/hooks/api/use-tickets'),
  useRaiseTicket: () => ({ mutate: mockRaise, isPending: false }),
}));

const TARGET = {
  customerId: 'cust-1',
  customerName: 'Kavitha Devi',
  subscriptionId: 'sub-1',
  accountNumber: 'ACT-001',
};

function payload() {
  return mockRaise.mock.calls[0]![0].payload;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('raising a complaint', () => {
  it('shows nothing until a customer is picked', () => {
    render(<RaiseTicketSheet target={null} onClose={jest.fn()} />);

    expect(screen.queryByText('Raise a complaint')).toBeNull();
  });

  it('defaults the subject to the category, so two taps and Raise is enough', () => {
    render(<RaiseTicketSheet target={TARGET} onClose={jest.fn()} />);

    fireEvent.press(screen.getByTestId('ticket-submit'));

    expect(payload()).toEqual({
      customerId: 'cust-1',
      subscriptionId: 'sub-1',
      category: 'no_signal',
      priority: 'normal',
      subject: 'No signal',
    });
  });

  it('sends what was actually chosen and typed', () => {
    render(<RaiseTicketSheet target={TARGET} onClose={jest.fn()} />);

    fireEvent.press(screen.getByText('Billing query'));
    fireEvent.press(screen.getByText('Urgent'));
    fireEvent.changeText(screen.getByTestId('ticket-subject'), 'Charged twice in March');
    fireEvent.changeText(screen.getByTestId('ticket-description'), 'Two receipts, same week');
    fireEvent.press(screen.getByTestId('ticket-submit'));

    expect(payload()).toMatchObject({
      category: 'billing',
      priority: 'urgent',
      subject: 'Charged twice in March',
      description: 'Two receipts, same week',
    });
  });

  it('leaves the line out when the card carried no real subscription', () => {
    render(<RaiseTicketSheet target={{ customerId: 'cust-1' }} onClose={jest.fn()} />);

    fireEvent.press(screen.getByTestId('ticket-submit'));

    expect(payload().subscriptionId).toBeUndefined();
  });

  it('closes and names the ticket once it is in the queue', async () => {
    const notify = jest.spyOn(dialogs, 'notify').mockResolvedValue();
    const onClose = jest.fn();
    render(<RaiseTicketSheet target={TARGET} onClose={onClose} />);

    fireEvent.press(screen.getByTestId('ticket-submit'));
    mockRaise.mock.calls[0]![1].onSuccess({ ticketNo: 'SSCN-T-000042' });

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(notify).toHaveBeenCalledWith('Complaint raised', expect.stringContaining('SSCN-T-000042'));

    notify.mockRestore();
  });

  it('says so and stays open when the server refuses', async () => {
    const notify = jest.spyOn(dialogs, 'notify').mockResolvedValue();
    const onClose = jest.fn();
    render(<RaiseTicketSheet target={TARGET} onClose={onClose} />);

    fireEvent.press(screen.getByTestId('ticket-submit'));
    mockRaise.mock.calls[0]![1].onError(new Error('Customer not found'));

    await waitFor(() => expect(notify).toHaveBeenCalledWith('Not raised', 'Customer not found'));
    expect(onClose).not.toHaveBeenCalled();

    notify.mockRestore();
  });
});

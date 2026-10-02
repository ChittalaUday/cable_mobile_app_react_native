import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as React from 'react';

import { AddCustomerModal } from './add-customer-modal';

const mockMutateAsync = jest.fn();

/** What `GET /customers?q=<phone>` answers with, for the duplicate check. */
let mockPhoneMatches: { id: string; name: string | null; phone: string | null; customerCode: string | null }[] = [];

jest.mock('@/lib/hooks/api/use-customers', () => ({
  useCreateCustomer: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  useCustomers: () => ({ data: { pages: [{ items: mockPhoneMatches }] } }),
}));

jest.mock('@/lib/hooks/api/use-plans', () => ({
  usePlans: () => ({
    data: [
      { id: 'plan-1', name: 'Gold HD', price: '400.00', discount: '50.00', amount: '350.00', billingCycle: 'monthly', serviceProviderName: 'ACT', status: 'active' },
      { id: 'plan-2', name: 'Retired', price: '99.00', discount: '0.00', amount: '99.00', billingCycle: 'monthly', serviceProviderName: 'ACT', status: 'inactive' },
    ],
    isPending: false,
  }),
}));

jest.mock('@/lib/hooks/api/use-locations', () => ({
  useLocations: () => ({
    data: { items: [{ id: 'loc-1', name: 'Block A', path: 'Mandapeta / Block A' }] },
    isPending: false,
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

function renderWithClient(ui: React.ReactElement) {
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

/** Fills the identity step and moves on, which every connection case starts from. */
function toConnectionStep() {
  fireEvent.changeText(screen.getByPlaceholderText('e.g. Ramesh Kumar'), 'Ramesh Kumar');
  fireEvent.changeText(screen.getByPlaceholderText('e.g. 9876543210'), '9876543210');
  fireEvent.changeText(screen.getByPlaceholderText('e.g. Main Street, Door 4-12'), 'Door 4-12, Station Road');
  fireEvent.press(screen.getByText('Next Step'));
}

describe('addCustomerModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPhoneMatches = [];
  });

  it('warns when the number is already on the book, without blocking', () => {
    mockPhoneMatches = [{ id: 'cust-9', name: 'Ramesh Kumar', phone: '9876543210', customerCode: 'SSCN-0042' }];
    renderWithClient(<AddCustomerModal visible onClose={jest.fn()} />);

    fireEvent.changeText(screen.getByPlaceholderText('e.g. 9876543210'), '9876543210');

    expect(screen.getByTestId('add-customer-duplicate-phone')).toBeTruthy();

    // Still only a warning: the identity step lets the operator carry on.
    toConnectionStep();
    expect(screen.getByText(/Plan/)).toBeTruthy();
  });

  it('opens on the customer details step', () => {
    renderWithClient(<AddCustomerModal visible onClose={jest.fn()} />);

    expect(screen.getByText('Add New Customer')).toBeTruthy();
    expect(screen.getByText(/Full Name/)).toBeTruthy();
    expect(screen.getByText(/Mobile Number/)).toBeTruthy();
    expect(screen.getByText(/Address \/ Line Area/)).toBeTruthy();
  });

  it('names each missing field rather than moving on', () => {
    renderWithClient(<AddCustomerModal visible onClose={jest.fn()} />);

    fireEvent.press(screen.getByText('Next Step'));

    expect(screen.getByText('Full name is required')).toBeTruthy();
    expect(screen.getByText('Valid 10-digit phone number is required')).toBeTruthy();
    expect(screen.getByText('Address / Line Area is required')).toBeTruthy();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('offers only active plans, priced at what a cycle charges', () => {
    renderWithClient(<AddCustomerModal visible onClose={jest.fn()} />);
    toConnectionStep();

    expect(screen.getByText('Gold HD')).toBeTruthy();
    expect(screen.getByText('₹350.00 / monthly')).toBeTruthy();
    expect(screen.queryByText('Retired')).toBeNull();
  });

  it('refuses to save without a plan and an area', () => {
    renderWithClient(<AddCustomerModal visible onClose={jest.fn()} />);
    toConnectionStep();

    fireEvent.press(screen.getByText('Create Customer'));

    expect(screen.getByText('Pick the plan this connection is on')).toBeTruthy();
    expect(screen.getByText('Pick the area the line is fitted in')).toBeTruthy();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('sends the subscriber and their first connection in one payload', async () => {
    mockMutateAsync.mockResolvedValueOnce({ id: 'cust-9' });
    const handleSuccess = jest.fn();

    renderWithClient(<AddCustomerModal visible onClose={jest.fn()} onSuccess={handleSuccess} />);
    toConnectionStep();

    fireEvent.press(screen.getByText('Gold HD'));
    fireEvent.press(screen.getByText('Block A'));
    fireEvent.press(screen.getByText('Create Customer'));

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));

    expect(mockMutateAsync).toHaveBeenCalledWith({
      payload: {
        name: 'Ramesh Kumar',
        phone: '9876543210',
        address: 'Door 4-12, Station Road',
        connection: {
          planId: 'plan-1',
          locationId: 'loc-1',
          installationAddress: 'Door 4-12, Station Road',
        },
      },
    });
  });

  it('shows what the server said when the save is refused', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('That location is outside the areas this account covers'));

    renderWithClient(<AddCustomerModal visible onClose={jest.fn()} />);
    toConnectionStep();

    fireEvent.press(screen.getByText('Gold HD'));
    fireEvent.press(screen.getByText('Block A'));
    fireEvent.press(screen.getByText('Create Customer'));

    expect(await screen.findByText('That location is outside the areas this account covers')).toBeTruthy();
  });
});

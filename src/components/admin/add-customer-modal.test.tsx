import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as React from 'react';

import { AddCustomerModal } from './add-customer-modal';

const mockMutateAsync = jest.fn();

jest.mock('@/lib/hooks/api/use-admin-dashboard', () => ({
  useCreateCustomer: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

jest.mock('@/lib/hooks/api/use-packages', () => ({
  usePackages: () => ({ data: [], isPending: false }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

function renderWithClient(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>,
  );
}

describe('addCustomerModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal step 1 initially when visible', () => {
    renderWithClient(<AddCustomerModal visible onClose={jest.fn()} />);

    expect(screen.getByText('Add New Customer')).toBeTruthy();
    expect(screen.getByText(/Full Name/)).toBeTruthy();
    expect(screen.getByText(/Mobile Number/)).toBeTruthy();
    expect(screen.getByText(/Address \/ Line Area/)).toBeTruthy();
  });

  it('validates step 1 inputs and shows error messages when next step pressed with empty fields', () => {
    renderWithClient(<AddCustomerModal visible onClose={jest.fn()} />);

    fireEvent.press(screen.getByText('Next Step'));

    expect(screen.getByText('Full name is required')).toBeTruthy();
    expect(screen.getByText('Valid 10-digit phone number is required')).toBeTruthy();
    expect(screen.getByText('Address is required')).toBeTruthy();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('navigates to step 2 after filling step 1 details correctly', () => {
    renderWithClient(<AddCustomerModal visible onClose={jest.fn()} />);

    fireEvent.changeText(screen.getByPlaceholderText('e.g. Ramesh Kumar'), 'Ramesh Kumar');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. 9876543210'), '9876543210');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Main Street, Door 4-12'), 'Door 4-12, Station Road');

    fireEvent.press(screen.getByText('Next Step'));

    // Should navigate to Step 2
    expect(screen.getByText('Service Type')).toBeTruthy();
    expect(screen.getByText('Cable TV')).toBeTruthy();
    expect(screen.getByText('Broadband / Fiber')).toBeTruthy();
    expect(screen.getByText(/Plan \/ Package Name/)).toBeTruthy();
  });

  it('navigates to step 3 after filling step 2 and submits customer flow on step 3', async () => {
    mockMutateAsync.mockResolvedValueOnce({ id: 'cust_new_123', name: 'Ramesh Kumar' });
    const handleSuccess = jest.fn();

    renderWithClient(<AddCustomerModal visible onClose={jest.fn()} onSuccess={handleSuccess} />);

    // Step 1
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Ramesh Kumar'), 'Ramesh Kumar');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. 9876543210'), '9876543210');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Main Street, Door 4-12'), 'Door 4-12, Station Road');
    fireEvent.press(screen.getByText('Next Step'));

    // Step 2
    expect(screen.getByText(/Plan \/ Package Name/)).toBeTruthy();
    fireEvent.press(screen.getByText('Next Step'));

    // Step 3
    expect(screen.getByText('STB Serial Number')).toBeTruthy();
    fireEvent.changeText(screen.getByPlaceholderText('e.g. STB987654321'), 'STB_TEST_999');
    fireEvent.press(screen.getByText('Create Customer'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({
      payload: expect.objectContaining({
        name: 'Ramesh Kumar',
        phone: '9876543210',
        address: 'Door 4-12, Station Road',
        stbNumber: 'STB_TEST_999',
      }) as unknown,
    });
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import AddCustomerRoute from '@/app/admin/customers/add/index';
import { CustomerDetailsView } from '@/components/customer/customer-details-view';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
  }),
}));

jest.mock('@/lib/hooks/api/use-admin-dashboard', () => ({
  useCreateCustomer: () => ({
    mutateAsync: jest.fn().mockResolvedValue({ id: 'SSCN00101' }),
    isPending: false,
  }),
  useConsolidatedCustomers: () => ({
    data: [],
    isPending: false,
  }),
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

describe('addCustomerWizardScreen Orchestration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Step 1 and validates required fields on Next press', () => {
    renderWithClient(<AddCustomerRoute />);

    expect(screen.getByText('Customer Details')).toBeTruthy();
    expect(screen.getByText(/Full Name/)).toBeTruthy();

    fireEvent.press(screen.getByText('Next →'));
    expect(screen.getByText('Subscriber full name is required')).toBeTruthy();
  });

  it('navigates seamlessly through steps on single page orchestrator', () => {
    renderWithClient(<AddCustomerRoute />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter customer name'), 'Ramesh Kumar');
    fireEvent.changeText(screen.getByPlaceholderText('10 digit mobile number'), '9876543210');
    fireEvent.changeText(screen.getByPlaceholderText('House no, Street, Area Landmark (optional)'), 'Plot 45, MG Road');

    fireEvent.press(screen.getByText('Next →'));
    expect(screen.getByText('Select Services')).toBeTruthy();

    fireEvent.press(screen.getByText('Next →'));
    expect(screen.getByText('Package Details')).toBeTruthy();

    fireEvent.press(screen.getByText('Next →'));
    expect(screen.getByText('Device / Box Details')).toBeTruthy();

    fireEvent.press(screen.getByText('Next →'));
    expect(screen.getByText('Additional Information')).toBeTruthy();

    fireEvent.press(screen.getByText('Next →'));
    expect(screen.getByText('Review & Confirm')).toBeTruthy();
  });

  it('renders reusable CustomerDetailsView component for Admin and Staff', () => {
    renderWithClient(<CustomerDetailsView role="admin" />);
    expect(screen.getByText('Ramesh Kumar')).toBeTruthy();
    expect(screen.getByText('SSCN00101')).toBeTruthy();
    expect(screen.getByText(/Quick Actions \(ADMIN\)/)).toBeTruthy();
  });
});

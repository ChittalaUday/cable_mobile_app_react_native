import type { ConsolidatedCustomer } from '@/types/customer-connection';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { CustomersView } from './customers-view';

const mockCustomers: ConsolidatedCustomer[] = [
  {
    id: 'c1',
    name: 'Anil Reddy',
    phone: '9888877777',
    address: 'Governorpet',
    status: 'active',
    connections: [
      {
        id: 'conn1',
        customerId: 'c1',
        serviceType: 'cable',
        serviceTypeName: 'Cable TV',
        provider: 'satya',
        providerName: 'Satya Cable',
        stbNumber: 'STB_ANIL_1',
        packageName: 'HD Cable',
        monthlyPrice: 350,
        status: 'active',
      },
    ],
  },
  {
    id: 'c2',
    name: 'Bhavani Prasad',
    phone: '9777766666',
    address: 'Labbipet',
    status: 'pending',
    connections: [
      {
        id: 'conn2',
        customerId: 'c2',
        serviceType: 'internet',
        serviceTypeName: 'Broadband',
        provider: 'satya',
        providerName: 'Satya Broadband',
        packageName: '100Mbps Unlimited',
        monthlyPrice: 699,
        status: 'expired',
      },
    ],
  },
];

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
}));

jest.mock('@/lib/hooks/use-admin-dashboard', () => ({
  useConsolidatedCustomers: () => ({
    data: mockCustomers,
    isPending: false,
    refetch: jest.fn(),
  }),
  useCreateCustomer: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
}));

jest.mock('@/lib/hooks/use-packages', () => ({
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

describe('customersView', () => {
  it('renders Customers & Lines header, search bar, and customer records', () => {
    renderWithClient(<CustomersView />);

    expect(screen.getByText('Customers & Lines')).toBeTruthy();
    expect(screen.getByText('Add')).toBeTruthy();
    expect(screen.getByText('Anil Reddy')).toBeTruthy();
    expect(screen.getByText('Bhavani Prasad')).toBeTruthy();
  });

  it('filters customers list by search query input', () => {
    renderWithClient(<CustomersView />);

    const searchInput = screen.getByPlaceholderText('Search customer name, phone, STB serial, VC card...');
    fireEvent.changeText(searchInput, 'Anil');

    expect(screen.getByText('Anil Reddy')).toBeTruthy();
    expect(screen.queryByText('Bhavani Prasad')).toBeNull();
  });

  it('filters customers by Active status chip', () => {
    renderWithClient(<CustomersView />);

    fireEvent.press(screen.getAllByText('Active')[0]);

    expect(screen.getByText('Anil Reddy')).toBeTruthy();
    expect(screen.queryByText('Bhavani Prasad')).toBeNull();
  });

  it('navigates to /add-customer page route when + Add Customer button is pressed', () => {
    renderWithClient(<CustomersView />);

    fireEvent.press(screen.getByText('Add'));

    expect(mockPush).toHaveBeenCalledWith('/add-customer');
  });
});

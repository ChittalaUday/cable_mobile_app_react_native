import type { CustomerListItem } from '@/lib/api/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import i18n from '@/lib/i18n';
import { CustomersView } from './customers-view';

const mockCustomerItems: CustomerListItem[] = [
  {
    id: 'c1',
    customerCode: 'SSCN-000001',
    name: 'Anil Reddy',
    phone: '9888877777',
    status: 'active',
    outstandingBalance: '350.00',
    locationId: 'loc-1',
    locationPath: 'Governorpet',
    subscriptions: 1,
    activeSubscriptions: 1,
    services: ['Cable TV'],
    createdAt: '2026-09-01T00:00:00.000Z',
    alternatePhone: null,
    whatsappNumber: null,
    address: null,
    locations: [{ locationId: 'loc-1', path: 'Governorpet', codes: ['GOV'], source: 'customer' }],
    serviceAccounts: [],
    equipment: [],
  },
  {
    id: 'c2',
    customerCode: 'SSCN-000002',
    name: 'Bhavani Prasad',
    phone: '9777766666',
    status: 'pending',
    outstandingBalance: '699.00',
    locationId: 'loc-2',
    locationPath: 'Labbipet',
    subscriptions: 1,
    activeSubscriptions: 0,
    services: ['Broadband'],
    createdAt: '2026-09-02T00:00:00.000Z',
    alternatePhone: null,
    whatsappNumber: null,
    address: null,
    locations: [{ locationId: 'loc-2', path: 'Labbipet', codes: ['LAB'], source: 'customer' }],
    serviceAccounts: [],
    equipment: [],
  },
  {
    id: 'c3',
    customerCode: 'SSCN-000003',
    name: 'Chandra Sekhar',
    phone: '9666655555',
    status: 'active',
    outstandingBalance: '700.00',
    locationId: 'loc-1',
    locationPath: 'Governorpet',
    subscriptions: 2,
    activeSubscriptions: 2,
    services: ['Cable TV'],
    createdAt: '2026-09-03T00:00:00.000Z',
    alternatePhone: null,
    whatsappNumber: null,
    address: null,
    locations: [{ locationId: 'loc-1', path: 'Governorpet', codes: ['GOV'], source: 'customer' }],
    serviceAccounts: [
      {
        subscriptionId: 'sub-1',
        accountNumber: 'ACC-001',
        installationAddress: null,
        locationId: 'loc-1',
        locationPath: 'Governorpet',
      },
      {
        subscriptionId: 'sub-2',
        accountNumber: 'ACC-002',
        installationAddress: null,
        locationId: 'loc-1',
        locationPath: 'Governorpet',
      },
    ],
    equipment: [],
  },
];

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
}));

jest.mock('@/lib/hooks/api/use-customers', () => ({
  useCustomers: (options?: {
    variables?: {
      q?: string;
      status?: string;
      locationId?: string;
      serviceProviderId?: string;
      createdFrom?: string;
      createdTo?: string;
      multiBox?: boolean;
    };
  }) => {
    let items = mockCustomerItems;
    const q = options?.variables?.q?.toLowerCase();
    const status = options?.variables?.status;
    const locationId = options?.variables?.locationId;
    const multiBox = options?.variables?.multiBox;
    if (q) {
      items = items.filter(item => item.name?.toLowerCase().includes(q));
    }
    if (status) {
      items = items.filter(i => i.status === status);
    }
    if (locationId) {
      items = items.filter(i => i.locationId === locationId);
    }
    if (multiBox) {
      items = items.filter(i => i.subscriptions >= 2 || (i.equipment?.length ?? 0) >= 2);
    }
    return {
      data: { pages: [{ items, total: items.length, limit: 30, nextCursor: null }] },
      isPending: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: jest.fn(),
      refetch: jest.fn(),
      isRefetching: false,
      isError: false,
    };
  },
  customerItemToConsolidated: jest.requireActual('@/lib/hooks/api/use-customers').customerItemToConsolidated,
}));

jest.mock('@/lib/hooks/api/use-locations', () => ({
  useLocations: () => ({
    data: {
      items: [
        { id: 'loc-1', name: 'Governorpet', code: 'GOV' },
        { id: 'loc-2', name: 'Labbipet', code: 'LAB' },
      ],
    },
    isPending: false,
  }),
  useLocationCategories: () => ({
    data: [
      { id: 'cat-1', name: 'Area', slug: 'area' },
    ],
    isPending: false,
  }),
  useLocationLevel: () => ({
    data: {
      pages: [
        {
          items: [
            { id: 'loc-1', name: 'Governorpet', code: 'GOV' },
            { id: 'loc-2', name: 'Labbipet', code: 'LAB' },
          ],
        },
      ],
    },
    isLoading: false,
  }),
}));

jest.mock('@/lib/hooks/api/use-service-providers', () => ({
  useServiceProviders: () => ({
    data: [
      { id: 'prov-1', name: 'Satya Cable', code: 'SC' },
      { id: 'prov-2', name: 'ACT Digital', code: 'ACT' },
    ],
    isPending: false,
  }),
}));

jest.mock('@/lib/hooks/api/use-admin-dashboard', () => ({
  useCreateCustomer: () => ({
    mutateAsync: jest.fn(),
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

// eslint-disable-next-line max-lines-per-function
describe('customersView', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders Customers & Lines header, search bar, and customer records', () => {
    renderWithClient(<CustomersView />);

    expect(screen.getByText('Customers & Lines')).toBeTruthy();
    expect(screen.getByText('Add')).toBeTruthy();
    expect(screen.getByText('Anil Reddy')).toBeTruthy();
    expect(screen.getByText('Bhavani Prasad')).toBeTruthy();
  });

  it('filters customers list by search query input', () => {
    renderWithClient(<CustomersView />);

    const searchInput = screen.getByPlaceholderText('Search customer, account, location or equipment...');
    fireEvent.changeText(searchInput, 'Anil');

    act(() => {
      jest.advanceTimersByTime(350);
    });

    expect(screen.getByText('Anil Reddy')).toBeTruthy();
    expect(screen.queryByText('Bhavani Prasad')).toBeNull();
  });

  it('filters customers by Active status chip', () => {
    renderWithClient(<CustomersView />);

    fireEvent.press(screen.getAllByText('Active')[0]);

    expect(screen.getByText('Anil Reddy')).toBeTruthy();
    expect(screen.queryByText('Bhavani Prasad')).toBeNull();
  });

  it('filters customers by Multi-Box (2+) chip', () => {
    renderWithClient(<CustomersView />);

    fireEvent.press(screen.getByText('Multi-Box (2+)'));

    expect(screen.getByText('Chandra Sekhar')).toBeTruthy();
    expect(screen.queryByText('Anil Reddy')).toBeNull();
    expect(screen.queryByText('Bhavani Prasad')).toBeNull();
  });

  it('navigates to /add-customer page route when + Add Customer button is pressed', () => {
    renderWithClient(<CustomersView />);

    fireEvent.press(screen.getByText('Add'));

    expect(mockPush).toHaveBeenCalledWith('/admin/customers/add');
  });

  it('localizes the expanded search prompt in Telugu', async () => {
    await i18n.changeLanguage('te');
    renderWithClient(<CustomersView />);

    expect(screen.getByPlaceholderText('కస్టమర్, ఖాతా, ప్రదేశం లేదా పరికరాన్ని శోధించండి...')).toBeTruthy();
  });

  it('opens filter modal when filter button beside search bar is pressed', () => {
    renderWithClient(<CustomersView />);

    const filterBtn = screen.getByLabelText('Open filters');
    expect(filterBtn).toBeTruthy();

    fireEvent.press(filterBtn);

    expect(screen.getByText('Filter Customers')).toBeTruthy();
    expect(screen.getByText('Status')).toBeTruthy();
    expect(screen.getByText('Location')).toBeTruthy();
    expect(screen.getByText('Created Date')).toBeTruthy();
    expect(screen.getByText('Service Provider')).toBeTruthy();
  });

  it('selects location filter from modal and applies it', () => {
    renderWithClient(<CustomersView />);

    fireEvent.press(screen.getByLabelText('Open filters'));
    fireEvent.press(screen.getByLabelText('Select Location'));
    fireEvent.press(screen.getByLabelText('Location Option: Governorpet'));
    fireEvent.press(screen.getByText('Apply Filters'));

    expect(screen.getByText('Anil Reddy')).toBeTruthy();
    expect(screen.queryByText('Bhavani Prasad')).toBeNull();
  });

  it('resets filters when Clear All is pressed', () => {
    renderWithClient(<CustomersView />);

    fireEvent.press(screen.getByLabelText('Open filters'));
    fireEvent.press(screen.getByLabelText('Select Location'));
    fireEvent.press(screen.getByLabelText('Location Option: Governorpet'));
    fireEvent.press(screen.getByText('Apply Filters'));

    expect(screen.queryByText('Bhavani Prasad')).toBeNull();

    fireEvent.press(screen.getByLabelText('Open filters'));
    fireEvent.press(screen.getByText('Clear All'));

    expect(screen.getByText('Anil Reddy')).toBeTruthy();
    expect(screen.getByText('Bhavani Prasad')).toBeTruthy();
  });
});

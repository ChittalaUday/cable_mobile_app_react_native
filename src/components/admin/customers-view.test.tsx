import type { CustomerListItem } from '@/lib/api/types';
import type * as UseCustomersModule from '@/lib/hooks/api/use-customers';
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
    address: null,
    locations: [{ locationId: 'loc-1', path: 'Governorpet', codes: ['GOV'], source: 'customer' }],
    serviceAccounts: [
      {
        subscriptionId: 'sub-1',
        accountNumber: 'ACC-001',
        installationAddress: null,
        outstandingBalance: '0.00',
        providerName: 'ACT Fibernet',
        providerLogoUrl: null,
        providerWebsiteUrl: null,
        locationId: 'loc-1',
        locationPath: 'Governorpet',
      },
      {
        subscriptionId: 'sub-2',
        accountNumber: 'ACC-002',
        installationAddress: null,
        outstandingBalance: '0.00',
        providerName: 'ACT Fibernet',
        providerLogoUrl: null,
        providerWebsiteUrl: null,
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

let mockLastVariables: { balance?: string } | undefined;

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
      balance?: string;
    };
  }) => {
    // Only the list's own query carries `balance`; other callers (e.g. the add sheet) do not.
    if (options?.variables && 'balance' in options.variables)
      mockLastVariables = options.variables;
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
  customerItemToConsolidated: jest.requireActual<typeof UseCustomersModule>('@/lib/hooks/api/use-customers').customerItemToConsolidated,
  useCreateCustomer: () => ({ mutateAsync: jest.fn(), isPending: false }),
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

describe('customersView', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders Customers & Lines header, search bar, and customer records', () => {
    renderWithClient(<CustomersView basePath="/admin" />);

    expect(screen.getByText('Customers & Lines')).toBeTruthy();
    expect(screen.getByLabelText('Add customer')).toBeTruthy();
    expect(screen.getByText('Anil Reddy')).toBeTruthy();
    expect(screen.getByText('Bhavani Prasad')).toBeTruthy();
  });

  it('filters customers list by search query input', () => {
    renderWithClient(<CustomersView basePath="/admin" />);

    const searchInput = screen.getByPlaceholderText('Search customer, account, location or equipment...');
    fireEvent.changeText(searchInput, 'Anil');

    act(() => {
      jest.advanceTimersByTime(350);
    });

    expect(screen.getByText('Anil Reddy')).toBeTruthy();
    expect(screen.queryByText('Bhavani Prasad')).toBeNull();
  });

  it('filters customers by Active status chip', () => {
    renderWithClient(<CustomersView basePath="/admin" />);

    fireEvent.press(screen.getAllByText('Active')[0]);

    expect(screen.getByText('Anil Reddy')).toBeTruthy();
    expect(screen.queryByText('Bhavani Prasad')).toBeNull();
  });

  it('counts each status tab from the server total', () => {
    renderWithClient(<CustomersView basePath="/admin" />);

    expect(screen.getByTestId('segment-all')).toHaveTextContent('All3');
    expect(screen.getByTestId('segment-active')).toHaveTextContent('Active2');
    expect(screen.getByTestId('segment-inactive')).toHaveTextContent('Inactive0');
  });

  it('asks the server for due, advance or all-clear customers from the balance chips', () => {
    renderWithClient(<CustomersView basePath="/admin" />);

    fireEvent.press(screen.getByTestId('customers-balance-due'));
    expect(mockLastVariables?.balance).toBe('due');

    fireEvent.press(screen.getByTestId('customers-balance-advance'));
    expect(mockLastVariables?.balance).toBe('advance');

    fireEvent.press(screen.getByTestId('customers-balance-clear'));
    expect(mockLastVariables?.balance).toBe('clear');

    fireEvent.press(screen.getByTestId('customers-balance-any'));
    expect(mockLastVariables?.balance).toBeUndefined();
  });

  it('opens the add-customer sheet in place when + Add is pressed', () => {
    renderWithClient(<CustomersView basePath="/admin" />);

    fireEvent.press(screen.getByLabelText('Add customer'));

    expect(screen.getByText('Register the subscriber and their first connection')).toBeTruthy();
  });

  it('opens a row on the customer page for the role that is looking', () => {
    renderWithClient(<CustomersView basePath="/staff" />);

    fireEvent.press(screen.getByText('Anil Reddy'));

    expect(mockPush).toHaveBeenCalledWith(expect.stringMatching(/^\/staff\/customers\//));
  });

  it('localizes the expanded search prompt in Telugu', async () => {
    await i18n.changeLanguage('te');
    renderWithClient(<CustomersView basePath="/admin" />);

    expect(screen.getByPlaceholderText('కస్టమర్, ఖాతా, ప్రదేశం లేదా పరికరాన్ని శోధించండి...')).toBeTruthy();
  });

  it('opens filter modal when filter button beside search bar is pressed', () => {
    renderWithClient(<CustomersView basePath="/admin" />);

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
    renderWithClient(<CustomersView basePath="/admin" />);

    fireEvent.press(screen.getByLabelText('Open filters'));
    fireEvent.press(screen.getByLabelText('Select Location'));
    fireEvent.press(screen.getByLabelText('Location Option: Governorpet'));
    fireEvent.press(screen.getByText('Apply Filters'));

    expect(screen.getByText('Anil Reddy')).toBeTruthy();
    expect(screen.queryByText('Bhavani Prasad')).toBeNull();
  });

  it('resets filters when Clear All is pressed', () => {
    renderWithClient(<CustomersView basePath="/admin" />);

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

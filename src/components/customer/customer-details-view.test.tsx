import type * as ReactNativeModule from 'react-native';
import type { CustomerDetail } from '@/lib/api/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react-native';

import * as React from 'react';
import { CustomerDetailsView } from '@/components/customer/customer-details-view';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockPermissions = new Set<string>();

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/lib/hooks/common/use-permissions', () => ({ usePermissions: () => ({ can: (key: string) => mockPermissions.has(key) }) }));
jest.mock('@/lib/hooks/api/use-visits', () => ({
  useCustomerTimeline: () => ({
    data: { pages: [{ items: [] }] },
    isPending: false,
    error: null,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    refetch: jest.fn(),
  }),
}));
jest.mock('@/components/customer/activate-at-act-button', () => {
  const { Text } = jest.requireActual<typeof ReactNativeModule>('react-native');
  return { ActivateAtActButton: ({ customerEquipmentId, action = 'activate' }: { customerEquipmentId: string; action?: string }) => <Text>{`${action}-${customerEquipmentId}`}</Text> };
});
jest.mock('@/components/customer/refresh-box-button', () => {
  const { Text } = jest.requireActual<typeof ReactNativeModule>('react-native');
  return { RefreshBoxButton: ({ customerEquipmentId }: { customerEquipmentId: string }) => <Text>{`refresh-${customerEquipmentId}`}</Text> };
});
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

function customerEndingOn(endDate: string | null): CustomerDetail {
  return {
    id: 'cust-1',
    customerCode: 'SSCN-000001',
    name: 'Achnata Ramu',
    phone: '9490712587',
    alternatePhone: null,
    status: 'active',
    outstandingBalance: '0.00',
    userId: null,
    locationId: null,
    locationPath: 'Mandapeta',
    address: null,
    notes: null,
    subscriptions: [{
      id: 'sub-1',
      locationId: 'location-1',
      serviceAccountNumber: 'C2602498',
      status: 'active',
      startDate: '2026-01-01T00:00:00.000Z',
      endDate,
      billingCycle: 'monthly',
      price: '250.00',
      chargedThrough: null,
      nextPlanCharge: '250.00',
      outstandingBalance: '0.00',
      installationAddress: null,
      service: { id: 'srv-1', name: 'Cable TV', slug: 'cable-tv', icon: 'tv' },
      provider: { id: 'prov-1', name: 'ACT Digital', slug: 'act-digital' },
      plan: { id: 'plan-1', name: 'Satya Basic', slug: 'satya-basic', kind: 'base', price: '300.00', discount: '50.00', amount: '250.00', billingCycle: 'monthly' },
    }],
    equipment: [],
    providerActivations: [],
    recentTransactions: [],
    summary: { subscriptions: 1, activeSubscriptions: 1, services: ['Cable TV'], monthlyValue: '250.00', outstandingBalance: '0.00' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function withBox(canInstantRefresh: boolean, canActivateAtAct = false, canRenewAtAct = false): CustomerDetail {
  return { ...customerEndingOn('2026-12-01T00:00:00.000Z'), equipment: [{ id: 'link-1', subscriptionId: 'sub-1', name: 'HD Set-Top Box', serialNumber: 'STB1', status: 'active', assignedAt: '2026-01-01T00:00:00.000Z', returnedAt: null, canInstantRefresh, canActivateAtAct, canRenewAtAct }] };
}

describe('the Instant Refresh on a box', () => {
  beforeEach(() => mockPermissions.clear());

  it('is on the customer\'s main details, whichever tab is open, for someone who may act on equipment and a box ACT can refresh', () => {
    mockPermissions.add('inventory.update');
    renderWithClient(<CustomerDetailsView role="staff" customer={withBox(true)} />);

    expect(within(screen.getByTestId('customer-refresh-boxes')).getByText('HD Set-Top Box')).toBeTruthy();
    expect(within(screen.getByTestId('customer-refresh-boxes')).getByText('STB1')).toBeTruthy();
    expect(screen.getByText('refresh-link-1')).toBeTruthy();

    fireEvent.press(screen.getByText('Services'));
    expect(screen.getByText('refresh-link-1')).toBeTruthy();
  });

  it.each([
    ['a box ACT cannot refresh', 'inventory.update', false],
    ['someone without the equipment permission', 'visits.create', true],
  ])('is not offered for %s', (_label, permission, canInstantRefresh) => {
    mockPermissions.add(permission);
    renderWithClient(<CustomerDetailsView role="staff" customer={withBox(canInstantRefresh)} />);

    expect(screen.queryByTestId('customer-refresh-boxes')).toBeNull();
    expect(screen.queryByText('refresh-link-1')).toBeNull();
  });

  it('is also on the box itself in the services tab, not repeated above it', () => {
    mockPermissions.add('payments.collect');
    renderWithClient(<CustomerDetailsView role="staff" customer={withBox(false, true)} />);
    fireEvent.press(screen.getByText('Services'));

    expect(within(screen.getByTestId('equipment-actions-link-1')).getByText('activate-link-1')).toBeTruthy();
    expect(screen.getAllByText('activate-link-1')).toHaveLength(1);
  });

  it('is never offered to a subscriber on their own record', () => {
    mockPermissions.add('inventory.update');
    renderWithClient(<CustomerDetailsView role="customer" customer={withBox(true)} />);

    expect(screen.queryByTestId('customer-refresh-boxes')).toBeNull();
  });
});

describe('the ACT reactivation on a box', () => {
  beforeEach(() => mockPermissions.clear());

  it('offers activation, with the refresh, for an active customer\'s ACT box, and renewal instead for an inactive one', () => {
    mockPermissions.add('payments.collect');
    mockPermissions.add('inventory.update');
    const view = renderWithClient(<CustomerDetailsView role="staff" customer={withBox(true, true, false)} />);

    expect(screen.getByText('activate-link-1')).toBeTruthy();
    expect(screen.getByText('refresh-link-1')).toBeTruthy();
    expect(screen.queryByText('renew-link-1')).toBeNull();
    view.unmount();

    renderWithClient(<CustomerDetailsView role="staff" customer={withBox(true, false, true)} />);

    expect(screen.getByText('renew-link-1')).toBeTruthy();
    expect(screen.queryByText('activate-link-1')).toBeNull();
  });

  it.each([
    ['a box that cannot be activated or renewed', 'payments.collect', false],
    ['someone who may not collect payments', 'inventory.update', true],
  ])('is not offered for %s', (_label, permission, can) => {
    mockPermissions.add(permission);
    renderWithClient(<CustomerDetailsView role="staff" customer={withBox(false, can, can)} />);

    expect(screen.queryByText('activate-link-1')).toBeNull();
    expect(screen.queryByText('renew-link-1')).toBeNull();
  });

  it('is never offered to a subscriber on their own record', () => {
    mockPermissions.add('payments.collect');
    renderWithClient(<CustomerDetailsView role="customer" customer={withBox(true, true, true)} />);

    expect(screen.queryByText('activate-link-1')).toBeNull();
    expect(screen.queryByText('renew-link-1')).toBeNull();
  });

  it('shows the reactivations ACT confirmed on the customer\'s overview: when, the packages and what was charged', () => {
    const customer: CustomerDetail = { ...withBox(false), providerActivations: [{ id: 'act-1', status: 'activated' as const, createdAt: '2026-10-09T10:00:00.000Z', packages: ['ACT_BST_PRE_VIZ', 'TV9 TELUGU_FTA_PRE_VIZ'], bill: { billAmount: 144.84, taxAmount: 26.08, totalPayable: 170.92, totalMsoSharePayable: 160.21, availableBalance: 1092.89 } }] };
    renderWithClient(<CustomerDetailsView role="admin" customer={customer} />);

    const panel = screen.getByTestId('customer-activations');
    expect(within(panel).getByText('Activated or renewed on ACT')).toBeTruthy();
    expect(within(panel).getByText(/^Activated · .*₹160\.21 to ACT/)).toBeTruthy();
    expect(within(panel).getByText(/Bill ₹144\.84 \+ tax ₹26\.08 = ₹170\.92 · wallet ₹1,092\.89 → ₹932\.68/)).toBeTruthy();
    expect(within(panel).getByText('2 packages: ACT_BST_PRE_VIZ, TV9 TELUGU_FTA_PRE_VIZ')).toBeTruthy();
  });

  it('shows no activations panel when there are none', () => {
    renderWithClient(<CustomerDetailsView role="admin" customer={withBox(false)} />);

    expect(screen.queryByTestId('customer-activations')).toBeNull();
  });
});

describe('the reusable customer details view', () => {
  it('opens directly on the timeline when a notification links to that tab', () => {
    renderWithClient(<CustomerDetailsView role="admin" initialTab="timeline" />);

    expect(screen.getByTestId('segment-timeline').props.accessibilityState).toEqual({ selected: true });
  });

  it('draws the same screen for admin and staff, with the operator actions', () => {
    renderWithClient(<CustomerDetailsView role="admin" />);
    expect(screen.getAllByText('Ramesh Kumar').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SSCN00101').length).toBeGreaterThan(0);
    // The demo customer owes nothing and its plan cycle is paid.
    expect(screen.getByTestId('customer-outstanding')).toHaveTextContent('All clear');

    // Collecting a payment is a visit now (Mark visit): the bottom button raises a complaint instead.
    expect(screen.queryByText('Collect Payment')).toBeNull();
    fireEvent.press(screen.getByTestId('customer-raise-complaint'));
    expect(screen.getByText('Raise a complaint')).toBeTruthy();
    expect(screen.getByTestId('ticket-subject')).toBeTruthy();
    // The buttons sit clear of the system navigation: at least the bottom inset (20 here) below them.
    expect(screen.getByTestId('ticket-footer')).toHaveStyle({ paddingBottom: 20 });

    fireEvent.press(screen.getByLabelText('More actions'));
    expect(screen.getByText('Raise Ticket')).toBeTruthy();

    fireEvent.press(screen.getByText('Edit'));
    expect(screen.getByText('Edit customer')).toBeTruthy();
  });

  it('keeps services and equipment behind their own tabs', () => {
    renderWithClient(<CustomerDetailsView role="staff" />);
    expect(screen.queryByText('STB123456789')).toBeNull();

    fireEvent.press(screen.getByText('Services'));
    expect(screen.getByText('ACT9001')).toBeTruthy();

    // Equipment sits under its connections in the same tab.
    expect(screen.getByText('STB123456789')).toBeTruthy();
    fireEvent.press(screen.getByText('Add Equipment'));
    expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/staff/inventory/issue' }));
  });

  it('offers a subscriber nothing to do on their own record', () => {
    // Raising a complaint here is a staff act, and fitting a box moves stock: neither is theirs.
    renderWithClient(<CustomerDetailsView role="customer" />);
    expect(screen.queryByTestId('customer-raise-complaint')).toBeNull();
    expect(screen.queryByLabelText('More actions')).toBeNull();
    expect(screen.queryByText('Edit')).toBeNull();
  });
  it('shows when the service expires, in red once it has', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-20T06:00:00.000Z'));

    const { unmount } = renderWithClient(<CustomerDetailsView role="admin" customer={customerEndingOn('2026-10-24T06:30:00.000Z')} />);
    fireEvent.press(screen.getByText('Services'));
    expect(screen.getByText('Expires')).toBeTruthy();
    expect(screen.getByText('24 Oct 2026').props.className).not.toContain('text-red-600');
    unmount();

    renderWithClient(<CustomerDetailsView role="admin" customer={customerEndingOn('2026-10-18T06:30:00.000Z')} />);
    fireEvent.press(screen.getByText('Services'));
    expect(screen.getByText('18 Oct 2026').props.className).toContain('text-red-600');
    jest.useRealTimers();
  });
});

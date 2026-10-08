import type { CustomerDetail } from '@/lib/api/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';

import * as React from 'react';
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
    recentTransactions: [],
    summary: { subscriptions: 1, activeSubscriptions: 1, services: ['Cable TV'], monthlyValue: '250.00', outstandingBalance: '0.00' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('the reusable customer details view', () => {
  it('draws the same screen for admin and staff, with the operator actions', () => {
    renderWithClient(<CustomerDetailsView role="admin" />);
    expect(screen.getAllByText('Ramesh Kumar').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SSCN00101').length).toBeGreaterThan(0);
    // The demo customer owes nothing and its plan cycle is paid.
    expect(screen.getByTestId('customer-outstanding')).toHaveTextContent('All clear');

    fireEvent.press(screen.getByText('Collect Payment'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/admin/recharge/[id]', params: { id: 'cust-demo-101', subscriptionId: 'sub-1' } });

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
    // Collecting is a round, fitting a box moves stock: neither is theirs.
    renderWithClient(<CustomerDetailsView role="customer" />);
    expect(screen.queryByText('Collect Payment')).toBeNull();
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

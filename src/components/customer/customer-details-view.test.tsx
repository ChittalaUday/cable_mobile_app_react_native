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
});

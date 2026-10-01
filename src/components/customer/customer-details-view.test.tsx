import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
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
    expect(screen.getByText('Ramesh Kumar')).toBeTruthy();
    expect(screen.getByText('SSCN00101')).toBeTruthy();
    expect(screen.getByText('Collect Payment')).toBeTruthy();
    expect(screen.getByText('Issue Equipment')).toBeTruthy();
  });

  it('offers a subscriber nothing to do on their own record', () => {
    // Collecting is a round, fitting a box moves stock: neither is theirs.
    renderWithClient(<CustomerDetailsView role="customer" />);
    expect(screen.queryByText('Collect Payment')).toBeNull();
    expect(screen.queryByText('Quick Actions')).toBeNull();
  });
});

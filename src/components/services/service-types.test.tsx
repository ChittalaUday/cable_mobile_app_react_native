import type { Service } from '@/lib/api/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { ServiceTypesScreen } from '@/app/admin/services/types';

const mockServices = [
  { id: 'svc_cable', name: 'Cable TV', icon: 'tv', providerCount: 1 },
  { id: 'svc_iptv', name: 'Internet + IPTV', icon: 'wifi', providerCount: 0 },
] as unknown as Service[];

const mockPush = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual<object>('@react-navigation/native'),
  useIsFocused: () => true,
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('@/lib/hooks/api/use-services', () => ({
  useServices: () => ({
    data: mockServices,
    isPending: false,
    isRefetching: false,
    refetch: jest.fn(),
  }),
  useDeleteService: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('@/components/services/service-form-sheet', () => ({
  ServiceFormSheet: () => null,
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

function renderScreen() {
  return render(
    <QueryClientProvider client={queryClient}>
      <ServiceTypesScreen />
    </QueryClientProvider>,
  );
}

afterEach(() => mockPush.mockClear());

/**
 * The screen exists to keep services off the provider list, so what it must do
 * is show services — and only services — and get to their coverage.
 */
describe('serviceTypesScreen', () => {
  it('lists the service types with how many providers supply each', () => {
    renderScreen();

    expect(screen.getByText('Cable TV')).toBeOnTheScreen();
    expect(screen.getByText(/1 provider ·/)).toBeOnTheScreen();
    // A service nobody supplies yet reads as that, not as "0 providers".
    expect(screen.getByText(/No providers yet ·/)).toBeOnTheScreen();
  });

  it('shows no providers, because those are a screen of their own now', () => {
    renderScreen();

    expect(screen.queryByText('ACT Digital')).toBeNull();
    expect(screen.queryByText('Packages')).toBeNull();
  });

  it('opens the coverage picker for the service that was tapped', () => {
    renderScreen();

    fireEvent.press(screen.getByLabelText('Set where Cable TV is sold'));

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('scope=service&id=svc_cable'));
  });

  it('says why a service with providers on it cannot be deleted', () => {
    renderScreen();

    fireEvent.press(screen.getByLabelText('Delete Cable TV'));
    expect(screen.getByText(/has providers supplying it/)).toBeOnTheScreen();
  });

  it('offers a plain delete for one nothing supplies', () => {
    renderScreen();

    fireEvent.press(screen.getByLabelText('Delete Internet + IPTV'));
    expect(screen.getByText(/Nothing supplies it/)).toBeOnTheScreen();
  });
});

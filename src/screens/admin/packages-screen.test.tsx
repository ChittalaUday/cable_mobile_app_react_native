import type { NormalizedPackage } from '@/lib/hooks/api/use-packages';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { PackagesScreen } from './packages-screen';

const mockPackages = [
  {
    id: 'pkg_hd',
    name: 'HD Starter Pack',
    serviceName: 'Cable TV',
    serviceIcon: 'tv',
    monthlyPrice: 350,
    durationMonths: 1,
    channelCount: 250,
    active: true,
  },
  {
    id: 'pkg_fiber',
    name: 'Fiber 100Mbps',
    serviceName: 'Internet',
    serviceIcon: 'wifi',
    monthlyPrice: 699,
    durationMonths: 1,
    speedMbps: 100,
    active: true,
  },
  {
    id: 'pkg_hd_new_blocks',
    name: 'HD Starter Pack',
    serviceName: 'Cable TV',
    serviceIcon: 'tv',
    monthlyPrice: 420,
    durationMonths: 1,
    channelCount: 250,
    coverageAreas: ['Mandapeta / New Blocks'],
    active: true,
  },
  {
    id: 'pkg_old',
    name: 'Legacy Analog Pack',
    serviceName: 'Cable TV',
    serviceIcon: 'tv',
    monthlyPrice: 180,
    durationMonths: 1,
    active: false,
  },
] as unknown as NormalizedPackage[];

const mockGrantedPermissions = new Set<string>();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useIsFocused: () => true,
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('@/lib/hooks/api/use-packages', () => ({
  // `coverageLabel` is a pure helper, not a hook — the row renders it, so the
  // real one has to survive the mock.
  ...jest.requireActual('@/lib/hooks/api/use-packages'),
  usePackages: () => ({
    data: mockPackages,
    isPending: false,
    isRefetching: false,
    error: null,
    refetch: jest.fn(),
  }),
  useCreatePackage: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdatePackage: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeletePackage: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('@/lib/hooks/common/use-permissions', () => ({
  usePermissions: () => ({ can: (key: string) => mockGrantedPermissions.has(key) }),
}));

function grant(...keys: string[]) {
  mockGrantedPermissions.clear();
  keys.forEach(key => mockGrantedPermissions.add(key));
}

afterEach(() => mockGrantedPermissions.clear());

describe('packagesScreen', () => {
  it('blocks the screen without packages.view', () => {
    grant();
    render(<PackagesScreen />);
    expect(screen.getByText('No access to packages')).toBeOnTheScreen();
  });

  it('lists the catalogue for a viewer but hides every write action', () => {
    grant('packages.view');
    render(<PackagesScreen />);

    // Two of them share a name on purpose: one provider sells the same package
    // in two areas at two prices, and the area is what separates the rows.
    expect(screen.getAllByText('HD Starter Pack')).toHaveLength(2);
    expect(screen.getByText('New Blocks')).toBeOnTheScreen();
    expect(screen.getByText('Fiber 100Mbps')).toBeOnTheScreen();
    expect(screen.queryByText('Add Package')).toBeNull();
    expect(screen.queryByText('Edit')).toBeNull();
    expect(screen.queryByText('Delete')).toBeNull();
  });

  it('shows create, edit and delete affordances for a full-CRUD admin', () => {
    grant('packages.view', 'packages.create', 'packages.update', 'packages.delete');
    render(<PackagesScreen />);

    expect(screen.getByText('Add Package')).toBeOnTheScreen();
    expect(screen.getAllByText('Edit')).toHaveLength(mockPackages.length);
    expect(screen.getAllByText('Delete')).toHaveLength(mockPackages.length);
  });

  it('filters by active state', () => {
    grant('packages.view');
    render(<PackagesScreen />);

    fireEvent.press(screen.getByLabelText('Filter: Inactive'));
    expect(screen.getByText('Legacy Analog Pack')).toBeOnTheScreen();
    expect(screen.queryByText('Fiber 100Mbps')).toBeNull();

    fireEvent.press(screen.getByLabelText('Filter: Active'));
    expect(screen.getByText('Fiber 100Mbps')).toBeOnTheScreen();
    expect(screen.queryByText('Legacy Analog Pack')).toBeNull();
  });

  it('searches on the service a plan belongs to', () => {
    grant('packages.view');
    render(<PackagesScreen />);

    // Services are the tenant's own, so the searchable label is the name.
    fireEvent.changeText(screen.getByPlaceholderText('Search plan name, service, provider…'), 'internet');
    expect(screen.getByText('Fiber 100Mbps')).toBeOnTheScreen();
    expect(screen.queryByText('HD Starter Pack')).toBeNull();
  });

  it('searches across plan name and service label', () => {
    grant('packages.view');
    render(<PackagesScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Search plan name, service, provider…'), 'fiber');
    expect(screen.getByText('Fiber 100Mbps')).toBeOnTheScreen();
    expect(screen.queryByText('HD Starter Pack')).toBeNull();
  });
});

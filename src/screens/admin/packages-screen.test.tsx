import type { PackageDoc } from '@/types/service';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { PackagesScreen } from './packages-screen';

const mockPackages: PackageDoc[] = [
  {
    id: 'pkg_hd',
    name: 'HD Starter Pack',
    serviceType: 'cable_tv',
    monthlyPrice: 350,
    durationMonths: 1,
    channelCount: 250,
    active: true,
  },
  {
    id: 'pkg_fiber',
    name: 'Fiber 100Mbps',
    serviceType: 'internet',
    monthlyPrice: 699,
    durationMonths: 1,
    speedMbps: 100,
    active: true,
  },
  {
    id: 'pkg_old',
    name: 'Legacy Analog Pack',
    serviceType: 'cable_tv',
    monthlyPrice: 180,
    durationMonths: 1,
    active: false,
  },
];

const mockGrantedPermissions = new Set<string>();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useIsFocused: () => true,
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('@/lib/hooks/use-packages', () => ({
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

jest.mock('@/lib/hooks/use-permissions', () => ({
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

    expect(screen.getByText('HD Starter Pack')).toBeOnTheScreen();
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

  it('filters by service type and active state', () => {
    grant('packages.view');
    render(<PackagesScreen />);

    fireEvent.press(screen.getByLabelText('Filter: Broadband'));
    expect(screen.getByText('Fiber 100Mbps')).toBeOnTheScreen();
    expect(screen.queryByText('HD Starter Pack')).toBeNull();

    fireEvent.press(screen.getByLabelText('Filter: Inactive'));
    expect(screen.getByText('Legacy Analog Pack')).toBeOnTheScreen();
    expect(screen.queryByText('Fiber 100Mbps')).toBeNull();
  });

  it('searches across plan name and service label', () => {
    grant('packages.view');
    render(<PackagesScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Search plan name, service, provider…'), 'fiber');
    expect(screen.getByText('Fiber 100Mbps')).toBeOnTheScreen();
    expect(screen.queryByText('HD Starter Pack')).toBeNull();
  });
});

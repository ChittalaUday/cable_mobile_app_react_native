import type * as ReactNativeModule from 'react-native';
import type { ViewProps } from 'react-native';
import type * as InventoryCustomerEquipmentModule from './inventory-customer-equipment';
import type * as InventoryLocationModalModule from './inventory-location-modal';
import type * as InventoryReceiveModule from './inventory-receive';
import type * as InventoryTransferModule from './inventory-transfer';
import type * as IssueScanSearchModule from './issue-scan-search';
import type * as IssueSelectCustomerModule from './issue-select-customer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';
import { InventoryMenu } from './inventory-menu';
import { IssueSuccessScreen } from './issue-success';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const mockPush = jest.fn();
const mockLookupInventory = jest.fn();

function renderWithQueryClient(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>,
  );
}

// Mock expo-camera
jest.mock('expo-camera', () => {
  const { View } = require<typeof ReactNativeModule>('react-native');
  return {
    CameraView: (props: ViewProps) => <View testID="mock-camera-view" {...props} />,
    useCameraPermissions: () => [{ granted: true, canAskAgain: true, status: 'granted' }, jest.fn()],
  };
});

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));

// Mock useAuthStore
jest.mock('@/lib/hooks/stores/use-auth-store', () => ({
  useAuthStore: {
    use: {
      role: () => 'admin',
      user: () => ({ displayName: 'Admin User', email: 'admin@satya.com' }),
    },
  },
}));

// Mock useInventoryLocations
jest.mock('@/lib/hooks/api/use-inventory', () => ({
  ...jest.requireActual<object>('@/lib/hooks/api/use-inventory'),
  useInventoryLocations: () => ({
    data: [
      { id: 'loc-wh', name: 'Central Warehouse', code: 'WH-CENTRAL', itemCount: 120 },
      { id: 'loc-branch', name: 'KPHB Branch', code: 'BR-KPHB', itemCount: 45 },
    ],
    isLoading: false,
  }),
  useInventoryStock: () => ({
    data: [
      { id: 'cat-1', name: 'Dual Band Router', code: 'RTR-DB', availableStock: 10 },
      { id: 'cat-2', name: 'Fiber Patch Cord', code: 'FPC-1M', availableStock: 150 },
    ],
    isLoading: false,
  }),
  lookupInventory: mockLookupInventory,
  useCustomerEquipment: () => ({
    data: [
      {
        id: 'eq-1',
        customerId: 'cust-1',
        customerName: 'Anil Rao',
        customerCode: 'CUST-1001',
        itemName: 'Dual Band Router',
        serialNumber: 'RTR123456',
        status: 'active',
        ownershipType: 'tenant_provided',
        depositAmount: '500',
        assignedAt: '2026-09-14T10:00:00Z',
      },
    ],
    isLoading: false,
    refetch: jest.fn(),
    isRefetching: false,
  }),
  useInwardStock: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
  useTransferStock: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
}));

// Mock useStaff
jest.mock('@/lib/hooks/common/use-permissions', () => ({ usePermissions: () => ({ can: () => true }) }));

jest.mock('@/lib/hooks/api/use-staff', () => ({
  useStaff: () => ({
    data: {
      items: [
        { id: 'staff-1', name: 'Ravi Teja', roleId: 'technician', phone: '9876543210' },
      ],
    },
    isLoading: false,
  }),
}));

// Mock useCustomers
jest.mock('@/lib/hooks/api/use-customers', () => ({
  ...jest.requireActual<object>('@/lib/hooks/api/use-customers'),
  useCustomers: () => ({
    data: {
      pages: [
        {
          items: [
            { id: 'cust-1', name: 'Anil Rao', customerCode: 'CUST-1001', phone: '9876543210' },
            { id: 'cust-2', name: 'Sujatha P', customerCode: 'CUST-1002', phone: '9123456780' },
          ],
        },
      ],
    },
    isLoading: false,
  }),
}));

// Mock useLocationLevel from use-locations
jest.mock('@/lib/hooks/api/use-locations', () => ({
  ...jest.requireActual<object>('@/lib/hooks/api/use-locations'),
  useLocationLevel: () => ({
    data: {
      pages: [
        {
          page: 1,
          limit: 50,
          total: 2,
          items: [
            {
              id: 'loc-wh',
              schemaId: 'sch-1',
              categoryId: 'cat-1',
              parentId: null,
              name: 'Central Warehouse',
              code: 'WH-CENTRAL',
              source: 'admin',
              status: 'approved',
              isActive: true,
              latitude: null,
              longitude: null,
              metadata: null,
              aliases: [],
              depth: 0,
              path: 'Central Warehouse',
              pathIds: ['loc-wh'],
              childCount: 0,
              createdAt: '2026-09-14T00:00:00Z',
              updatedAt: '2026-09-14T00:00:00Z',
            },
            {
              id: 'loc-branch',
              schemaId: 'sch-1',
              categoryId: 'cat-1',
              parentId: null,
              name: 'KPHB Branch',
              code: 'BR-KPHB',
              source: 'admin',
              status: 'approved',
              isActive: true,
              latitude: null,
              longitude: null,
              metadata: null,
              aliases: [],
              depth: 0,
              path: 'KPHB Branch',
              pathIds: ['loc-branch'],
              childCount: 0,
              createdAt: '2026-09-14T00:00:00Z',
              updatedAt: '2026-09-14T00:00:00Z',
            },
          ],
        },
      ],
    },
    isLoading: false,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  }),
}));

describe('inventory Screens', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockLookupInventory.mockReset();
  });
  it('renders InventoryMenu with all primary actions', () => {
    renderWithQueryClient(<InventoryMenu basePath="/admin/inventory" />);

    expect(screen.getByText('Inventory')).toBeTruthy();
    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.getByText('Stock & Locations')).toBeTruthy();
    expect(screen.getByText('Scan / Lookup')).toBeTruthy();
    expect(screen.getByText('Issue to Customer')).toBeTruthy();
    expect(screen.getByText('Receive Stock')).toBeTruthy();
    expect(screen.getByText('Transfer Stock')).toBeTruthy();
    expect(screen.getByText('Customer Equipment')).toBeTruthy();
    expect(screen.getByText('Stock Movements')).toBeTruthy();
    expect(screen.getByText('Item Catalog')).toBeTruthy();
  });

  it('renders IssueSuccessScreen with assignment details', () => {
    render(
      <IssueSuccessScreen
        itemName="ACT HD STB"
        serialNumber="ACT123456789"
        customerName="Rajesh Kumar"
        basePath="/admin/inventory"
      />,
    );

    expect(screen.getByText('Equipment Issued Successfully')).toBeTruthy();
    expect(screen.getAllByText('ACT HD STB').length).toBeGreaterThan(0);
    expect(screen.getByText('ACT123456789')).toBeTruthy();
    expect(screen.getAllByText('Rajesh Kumar').length).toBeGreaterThan(0);
    expect(screen.getByText('Issue Another')).toBeTruthy();
    expect(screen.getByText('View Assignment')).toBeTruthy();
  });

  it('renders InventoryLocationModal with locations wired from locations table', () => {
    const { InventoryLocationModal } = require<typeof InventoryLocationModalModule>('./inventory-location-modal');
    const onSelect = jest.fn();
    const onClose = jest.fn();

    render(
      <InventoryLocationModal
        visible={true}
        selectedLocationId="loc-1"
        onSelect={onSelect}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('All Locations')).toBeTruthy();
    expect(screen.getAllByText('Central Warehouse').length).toBeGreaterThan(0);
    expect(screen.getAllByText('KPHB Branch').length).toBeGreaterThan(0);
  });

  it('renders IssueScanSearchScreen with camera scan UI and search toggle', () => {
    const { IssueScanSearchScreen } = require<typeof IssueScanSearchModule>('./issue-scan-search');
    renderWithQueryClient(<IssueScanSearchScreen basePath="/admin/inventory" />);

    expect(screen.getByText('Issue to Customer')).toBeTruthy();
    expect(screen.getByText('Scan Serial Code')).toBeTruthy();
    expect(screen.getByText('Search Catalog')).toBeTruthy();
    expect(screen.getByText('Manual Serial Code Lookup')).toBeTruthy();
  });

  it('does not let an assigned unit continue through the issue flow', async () => {
    mockLookupInventory.mockResolvedValue([{
      type: 'equipment',
      id: 'unit-1',
      catalogId: 'cat-1',
      itemName: 'Set Top Box',
      itemCode: 'STB',
      serialNumber: 'STB-ASSIGNED',
      barcode: null,
      vcNumber: null,
      macAddress: null,
      inventoryStatus: 'allocated',
      locationId: 'loc-1',
      locationName: 'Customer home',
      defaultSalePrice: '0.00',
      defaultDepositAmount: '0.00',
      availableStock: 0,
    }]);

    const { IssueScanSearchScreen } = require<typeof IssueScanSearchModule>('./issue-scan-search');
    renderWithQueryClient(<IssueScanSearchScreen basePath="/admin/inventory" />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter serial code (or barcode)...'), 'STB-ASSIGNED');
    fireEvent.press(screen.getByText('Lookup Serial'));

    expect(await screen.findByText(/already assigned/i)).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('renders IssueSelectCustomerScreen and shows customer list or empty state', () => {
    const { IssueSelectCustomerScreen } = require<typeof IssueSelectCustomerModule>('./issue-select-customer');
    renderWithQueryClient(
      <IssueSelectCustomerScreen
        catalogId="cat-1"
        itemName="Router AX3000"
        itemCode="SKU-R3000"
        basePath="/admin/inventory"
      />,
    );

    expect(screen.getByText('Select Customer')).toBeTruthy();
  });

  it('renders InventoryCustomerEquipmentScreen with active hardware assignments', () => {
    const { InventoryCustomerEquipmentScreen } = require<typeof InventoryCustomerEquipmentModule>('./inventory-customer-equipment');
    renderWithQueryClient(<InventoryCustomerEquipmentScreen />);

    expect(screen.getByText('Customer Equipment')).toBeTruthy();
    expect(screen.getByText('Anil Rao')).toBeTruthy();
    expect(screen.getByText('Dual Band Router')).toBeTruthy();
    expect(screen.getByText(/RTR123456/)).toBeTruthy();
  });

  it('renders InventoryReceiveScreen with item and location inputs', () => {
    const { InventoryReceiveScreen } = require<typeof InventoryReceiveModule>('./inventory-receive');
    renderWithQueryClient(<InventoryReceiveScreen basePath="/admin/inventory" />);

    expect(screen.getByText('Receive Stock')).toBeTruthy();
    expect(screen.getByText('Product / Item *')).toBeTruthy();
    expect(screen.getByText('Receiving Location')).toBeTruthy();
    expect(screen.getByText('Confirm Stock Receipt')).toBeTruthy();
  });

  it('renders InventoryTransferScreen with destination options', () => {
    const { InventoryTransferScreen } = require<typeof InventoryTransferModule>('./inventory-transfer');
    renderWithQueryClient(<InventoryTransferScreen basePath="/admin/inventory" />);

    expect(screen.getByText('Transfer Stock')).toBeTruthy();
    expect(screen.getByText('From Location')).toBeTruthy();
    expect(screen.getByText('Warehouse / Sub-Store')).toBeTruthy();
    expect(screen.getByText('Technician / Staff Van')).toBeTruthy();
    expect(screen.getByText('Execute Stock Transfer')).toBeTruthy();
  });
});

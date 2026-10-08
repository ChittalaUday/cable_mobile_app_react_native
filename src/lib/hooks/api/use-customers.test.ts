import type { CustomerListItem } from '@/lib/api/types';
import { customerItemToConsolidated } from '@/lib/hooks/api/use-customers';

function account(subscriptionId: string, endDate: string | null) {
  return {
    subscriptionId,
    accountNumber: `C-${subscriptionId}`,
    installationAddress: null,
    outstandingBalance: '0.00',
    endDate,
    locationId: 'loc-1',
    locationPath: 'Mandapeta / TIDCO Apartments',
    service: 'Cable TV',
    providerName: 'ACT Digital',
    providerLogoUrl: null,
    providerWebsiteUrl: null,
  };
}

function item(overrides: Partial<CustomerListItem>) {
  return ({
    id: 'cust-1',
    customerCode: 'SSCN-000001',
    name: 'Achnata Ramu',
    phone: '9490712587',
    alternatePhone: null,
    status: 'active',
    address: null,
    outstandingBalance: '0.00',
    locationPath: 'Mandapeta',
    services: ['Cable TV'],
    serviceAccounts: [],
    equipment: [],
    locations: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }) as CustomerListItem;
}

describe('customerItemToConsolidated', () => {
  it('carries each line\'s expiry onto its connection, and none where the MSO has not dated it', () => {
    const customer = customerItemToConsolidated(item({
      serviceAccounts: [account('sub-1', '2026-10-24T04:40:28.000Z'), account('sub-2', null)],
    }));

    expect(customer.connections.map(connection => connection.expiryDate)).toEqual(['2026-10-24T04:40:28.000Z', undefined]);
  });

  it('puts the same expiry on every box of a multi-box line', () => {
    const box = (id: string) => ({ id, subscriptionId: 'sub-1', type: 'stb', brand: null, model: null, serialNumber: id, vcNumber: null, macAddress: null, barcode: null, status: 'active' });
    const customer = customerItemToConsolidated(item({
      serviceAccounts: [account('sub-1', '2026-10-24T04:40:28.000Z')],
      equipment: [box('stb-1'), box('stb-2')] as CustomerListItem['equipment'],
    }));

    expect(customer.connections).toHaveLength(2);
    expect(customer.connections.map(connection => connection.expiryDate)).toEqual(['2026-10-24T04:40:28.000Z', '2026-10-24T04:40:28.000Z']);
  });
});

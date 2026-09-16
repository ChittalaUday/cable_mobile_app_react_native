import type { CustomerDetail } from '@/lib/api/types';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';
import { Linking } from 'react-native';

import i18n from '@/lib/i18n';
import { CustomerDetailsView } from './customer-details-view';

const mockDetail: CustomerDetail = {
  id: 'cust-123',
  customerCode: 'SSCN-000088',
  name: 'Kavitha Devi',
  phone: '9848012345',
  alternatePhone: '9848099999',
  whatsappNumber: '9848012345',
  status: 'active',
  outstandingBalance: '150.00',
  userId: null,
  locationId: 'loc-1',
  locationPath: 'Mandapeta / Main Road / Block A / 101',
  address: 'Opp. Old Bus Stand',
  notes: 'VIP customer',
  subscriptions: [
    {
      id: 'sub-1',
      serviceAccountNumber: 'ACT9001',
      status: 'active',
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: null,
      billingCycle: 'monthly',
      price: '350.00',
      installationAddress: 'Opp. Old Bus Stand, Flat 101',
      service: { id: 's1', name: 'Cable TV', slug: 'cable-tv', icon: 'tv' },
      provider: { id: 'p1', name: 'ACT Digital', slug: 'act-digital' },
      package: { id: 'pkg-1', name: 'ACT Gold HD', slug: 'act-gold-hd', packageType: 'base' },
    },
  ],
  equipment: [
    {
      id: 'eq-1',
      subscriptionId: 'sub-1',
      name: 'HD Set-Top Box',
      serialNumber: 'STB778899',
      status: 'active',
      assignedAt: '2026-01-01T00:00:00.000Z',
      returnedAt: null,
    },
  ],
  recentTransactions: [
    {
      id: 'tx-1',
      transactionNo: 'TXN-9090',
      transactionDate: '2026-09-01T10:00:00.000Z',
      transactionType: 'deduction',
      serviceAccountNumber: 'ACT9001',
      debit: '350.00',
      credit: '0.00',
      closingBalance: '150.00',
      remarks: 'Monthly renewal deduction',
    },
  ],
  summary: {
    subscriptions: 1,
    activeSubscriptions: 1,
    services: ['Cable TV'],
    monthlyValue: '350.00',
    outstandingBalance: '150.00',
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual<object>('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

describe('customerDetailsView', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders customer profile information and badges', () => {
    render(<CustomerDetailsView customer={mockDetail} />);

    expect(screen.getAllByText('Kavitha Devi').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SSCN-000088').length).toBeGreaterThan(0);
    expect(screen.getByText('+91 9848012345')).toBeTruthy();
    expect(screen.getByText('Alt: 9848099999')).toBeTruthy();
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
  });

  it('renders financial metrics and location details', () => {
    render(<CustomerDetailsView customer={mockDetail} />);

    expect(screen.getByText('₹150.00')).toBeTruthy();
    expect(screen.getByText('₹350.00')).toBeTruthy();
    expect(screen.getByText('1 / 1')).toBeTruthy();
    expect(screen.getByText('Mandapeta / Main Road / Block A / 101')).toBeTruthy();
    expect(screen.getByText('Opp. Old Bus Stand')).toBeTruthy();
    expect(screen.getByText('Note: VIP customer')).toBeTruthy();
  });

  it('renders subscriptions, equipment, and recent ledger entries', () => {
    render(<CustomerDetailsView customer={mockDetail} />);

    expect(screen.getByText('Cable TV')).toBeTruthy();
    expect(screen.getByText('ACT Digital • ACT Gold HD')).toBeTruthy();
    expect(screen.getByText('ACT9001')).toBeTruthy();
    expect(screen.getByText('₹350.00 / monthly')).toBeTruthy();

    expect(screen.getByText('HD Set-Top Box')).toBeTruthy();
    expect(screen.getByText('S/N: STB778899')).toBeTruthy();

    expect(screen.getByText('TXN-9090')).toBeTruthy();
    expect(screen.getByText('-₹350.00')).toBeTruthy();
    expect(screen.getByText('Bal: ₹150.00')).toBeTruthy();
  });

  it('triggers phone call and whatsapp when quick action buttons are pressed', () => {
    render(<CustomerDetailsView customer={mockDetail} />);

    const callBtn = screen.getByText('Call');
    fireEvent.press(callBtn);
    expect(Linking.openURL).toHaveBeenCalledWith('tel:9848012345');

    const waBtn = screen.getByText('WhatsApp');
    fireEvent.press(waBtn);
    expect(Linking.openURL).toHaveBeenCalledWith('https://wa.me/9848012345');
  });

  it('verifies Telugu localized text when language switches', async () => {
    await i18n.changeLanguage('te');
    render(<CustomerDetailsView customer={mockDetail} />);

    expect(screen.getByText('చెల్లించాల్సిన బకాయి')).toBeTruthy();
    expect(screen.getByText('నెలవారీ విలువ')).toBeTruthy();
    expect(screen.getByText('కాల్')).toBeTruthy();
    expect(screen.getByText('వాట్సాప్')).toBeTruthy();
  });
});

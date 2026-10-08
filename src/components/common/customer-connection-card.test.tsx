import type { ConsolidatedCustomer } from '@/types/customer-connection';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';
import { Linking } from 'react-native';

import { CustomerConnectionCard } from './customer-connection-card';

const singleConnectionCustomer: ConsolidatedCustomer = {
  id: 'cust_101',
  name: 'Ramesh Kumar',
  phone: '9876543210',
  address: 'Vijayawada',
  status: 'active',
  connections: [
    {
      id: 'conn_01',
      customerId: 'cust_101',
      serviceType: 'cable',
      serviceTypeName: 'Cable TV',
      provider: 'act',
      providerName: 'ACT Cable',
      stbNumber: 'STB10001',
      vcNumber: 'VC50001',
      packageName: 'ACT Family HD',
      balance: 650,
      status: 'active',
      locationLabel: 'Living Room',
    },
  ],
};

const multiConnectionCustomer: ConsolidatedCustomer = {
  id: 'cust_102',
  name: 'Suresh Verma',
  phone: '9123456789',
  address: 'Guntur',
  status: 'active',
  connections: [
    {
      id: 'conn_10',
      customerId: 'cust_102',
      serviceType: 'cable',
      serviceTypeName: 'Cable TV',
      provider: 'act',
      providerName: 'ACT Cable',
      stbNumber: 'STB_HALL_99',
      vcNumber: 'VC_HALL_99',
      packageName: 'ACT Gold HD',
      balance: 500,
      status: 'active',
      locationLabel: 'Living Room TV',
    },
    {
      id: 'conn_11',
      customerId: 'cust_102',
      serviceType: 'broadband',
      serviceTypeName: 'Broadband',
      provider: 'vbc',
      providerName: 'VBC Fiber',
      speedMbps: 100,
      packageName: 'Fiber 100Mbps Unlimited',
      balance: 799,
      status: 'active',
      locationLabel: 'Home Fiber',
    },
  ],
};

describe('customerConnectionCard', () => {
  it('renders single connection customer details correctly', () => {
    render(<CustomerConnectionCard customer={singleConnectionCustomer} />);

    expect(screen.getByText('Ramesh Kumar')).toBeTruthy();
    expect(screen.getByText('9876543210')).toBeTruthy();
    expect(screen.getByText('ACT Cable · Cable TV')).toBeTruthy();
    expect(screen.getByText('STB10001')).toBeTruthy();
    expect(screen.getByText('₹650.00')).toBeTruthy();
  });

  it('shows a negative balance as advance, not as due', () => {
    const inAdvance = { ...singleConnectionCustomer, connections: [{ ...singleConnectionCustomer.connections[0]!, balance: -280 }] };
    render(<CustomerConnectionCard customer={inAdvance} />);

    expect(screen.getByText('Advance')).toBeTruthy();
    expect(screen.getByText('₹280.00')).toBeTruthy();
    expect(screen.queryByText('Due Amount')).toBeNull();
  });

  it('shows the provider logo, name and website when the provider has them', () => {
    const withProvider = {
      ...singleConnectionCustomer,
      connections: [{
        ...singleConnectionCustomer.connections[0]!,
        providerName: 'ACT Fibernet',
        providerLogoUrl: 'https://cdn.example.com/act.png',
        providerWebsiteUrl: 'https://www.actcorp.in/plans',
      }],
    };
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    render(<CustomerConnectionCard customer={withProvider} />);

    expect(screen.getByTestId('provider-logo')).toBeTruthy();
    expect(screen.getByText('ACT Fibernet · Cable TV')).toBeTruthy();
    fireEvent.press(screen.getByText('actcorp.in'));
    expect(open).toHaveBeenCalledWith('https://www.actcorp.in/plans');
    open.mockRestore();
  });

  it('shows when service expires, and flags it once it has', () => {
    const expiring = (expiryDate?: string) => ({ ...singleConnectionCustomer, connections: [{ ...singleConnectionCustomer.connections[0]!, expiryDate }] });
    jest.useFakeTimers().setSystemTime(new Date('2026-10-20T06:00:00.000Z'));

    const { rerender } = render(<CustomerConnectionCard customer={expiring('2026-10-24T06:30:00.000Z')} />);
    expect(screen.getByText('Expiry Date')).toBeTruthy();
    expect(screen.getByText('24 Oct 2026').props.className).not.toContain('text-red-600');

    rerender(<CustomerConnectionCard customer={expiring('2026-10-18T06:30:00.000Z')} />);
    expect(screen.getByText('18 Oct 2026').props.className).toContain('text-red-600');

    // A line the MSO has not dated shows no tile rather than an empty one.
    rerender(<CustomerConnectionCard customer={expiring(undefined)} />);
    expect(screen.queryByText('Expiry Date')).toBeNull();
    jest.useRealTimers();
  });

  it('renders multi-connection customer with connection count badge', () => {
    render(<CustomerConnectionCard customer={multiConnectionCustomer} />);

    expect(screen.getByText('Suresh Verma')).toBeTruthy();
    expect(screen.getByText(/2 Connections/)).toBeTruthy();
    expect(screen.getAllByText('Living Room TV').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Home Fiber').length).toBeGreaterThan(0);
  });

  it('switches active connection hardware specs when connection pill is pressed', () => {
    render(<CustomerConnectionCard customer={multiConnectionCustomer} />);

    // Initially shows connection 0 (Living Room TV)
    expect(screen.getByText('STB_HALL_99')).toBeTruthy();

    // Press 'Home Fiber' pill
    fireEvent.press(screen.getAllByText('Home Fiber')[0]);

    // Should now show connection 1 details (100 Mbps, ₹799)
    expect(screen.getByText(/100 Mbps/)).toBeTruthy();
    expect(screen.getByText('₹799.00')).toBeTruthy();
  });

  it('invokes onRecharge callback with active connection when Payment button is pressed', () => {
    const handleRecharge = jest.fn();
    render(
      <CustomerConnectionCard
        customer={singleConnectionCustomer}
        onRecharge={handleRecharge}
      />,
    );

    fireEvent.press(screen.getByText('Payment'));

    expect(handleRecharge).toHaveBeenCalledTimes(1);
    expect(handleRecharge).toHaveBeenCalledWith(singleConnectionCustomer.connections[0]);
  });
});

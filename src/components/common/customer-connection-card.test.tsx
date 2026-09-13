import type { ConsolidatedCustomer } from '@/types/customer-connection';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

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
      monthlyPrice: 650,
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
      monthlyPrice: 500,
      status: 'active',
      locationLabel: 'Living Room TV',
    },
    {
      id: 'conn_11',
      customerId: 'cust_102',
      serviceType: 'internet',
      serviceTypeName: 'Broadband',
      provider: 'vbc',
      providerName: 'VBC Fiber',
      speedMbps: 100,
      packageName: 'Fiber 100Mbps Unlimited',
      monthlyPrice: 799,
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
    expect(screen.getByText('Cable TV')).toBeTruthy();
    expect(screen.getByText('STB10001')).toBeTruthy();
    expect(screen.getByText('₹650/mo')).toBeTruthy();
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

    // Should now show connection 1 details (100 Mbps, ₹799/mo)
    expect(screen.getByText(/100 Mbps/)).toBeTruthy();
    expect(screen.getByText('₹799/mo')).toBeTruthy();
  });

  it('invokes onRecharge callback with active connection when Recharge button is pressed', () => {
    const handleRecharge = jest.fn();
    render(
      <CustomerConnectionCard
        customer={singleConnectionCustomer}
        onRecharge={handleRecharge}
      />,
    );

    fireEvent.press(screen.getByText('Recharge'));

    expect(handleRecharge).toHaveBeenCalledTimes(1);
    expect(handleRecharge).toHaveBeenCalledWith(singleConnectionCustomer.connections[0]);
  });
});

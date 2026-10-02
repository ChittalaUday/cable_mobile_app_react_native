import type { CustomerDetail } from '@/lib/api/types';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { EditCustomerSheet } from './edit-customer-sheet';

const mockUpdate = jest.fn();

jest.mock('@/lib/hooks/api/use-customers', () => ({
  useUpdateCustomer: () => ({ mutate: mockUpdate, isPending: false }),
}));

jest.mock('react-native-keyboard-controller', () => ({
  KeyboardAwareScrollView: ({ children }: { children: React.ReactNode }) => children,
}));

const customer = {
  id: 'cust-1',
  customerCode: 'SSCN-000066',
  name: 'Bhadakar Rao',
  phone: '9603078128',
  alternatePhone: '9000000001',
  status: 'active',
  address: 'TIDCO C59',
  notes: null,
  updatedAt: '2026-10-02T00:00:00Z',
} as unknown as CustomerDetail;

describe('editing a customer', () => {
  beforeEach(() => mockUpdate.mockReset());

  it('sends only what changed, and clears an emptied optional field with null', () => {
    render(<EditCustomerSheet customer={customer} onClose={jest.fn()} />);

    fireEvent.changeText(screen.getByTestId('edit-alternate-phone'), '');
    fireEvent.changeText(screen.getByTestId('edit-notes'), 'Gate code 42');
    fireEvent.press(screen.getByTestId('edit-submit'));

    expect(mockUpdate).toHaveBeenCalledWith(
      { id: 'cust-1', payload: { alternatePhone: null, notes: 'Gate code 42' } },
      expect.anything(),
    );
  });

  it('refuses a short phone before calling the server', () => {
    render(<EditCustomerSheet customer={customer} onClose={jest.fn()} />);

    fireEvent.changeText(screen.getByTestId('edit-phone'), '12345');
    fireEvent.press(screen.getByTestId('edit-submit'));

    expect(screen.getByText('Enter a 10-digit number')).toBeTruthy();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('closes without a request when nothing changed', () => {
    const onClose = jest.fn();
    render(<EditCustomerSheet customer={customer} onClose={onClose} />);

    fireEvent.press(screen.getByTestId('edit-submit'));

    expect(onClose).toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

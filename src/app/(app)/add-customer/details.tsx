import { useRouter } from 'expo-router';
import * as React from 'react';

import { useAddCustomerStore } from '@/screens/add-customer/use-add-customer-store';
import { CustomerDetailsView } from '@/screens/customer/components/customer-details-view';

export default function AddCustomerDetailsScreen() {
  const router = useRouter();
  const createdCustomerId = useAddCustomerStore(state => state.createdCustomerId);
  const step1 = useAddCustomerStore(state => state.step1);

  return (
    <CustomerDetailsView
      customer={{
        id: createdCustomerId || 'SSCN00101',
        name: step1.name || 'Ramesh Kumar',
        phone: step1.phone || '9876543210',
        address: step1.address || 'Mandapeta',
        area: step1.area || 'Mandapeta',
        status: 'ACTIVE',
      }}
      onBack={() => router.replace('/')}
    />
  );
}

import { useRouter } from 'expo-router';
import * as React from 'react';

import { CustomerDetailsView } from '@/components/customer/customer-details-view';
import { useAddCustomerStore } from '@/lib/hooks/stores/use-add-customer-store';

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
      onBack={() => router.replace('/admin')}
    />
  );
}

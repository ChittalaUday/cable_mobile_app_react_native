import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';

import { CustomerDetailsView } from '@/screens/customer/components/customer-details-view';

export default function CustomerDetailsDynamicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <CustomerDetailsView
      customer={{
        id: id || 'SSCN00101',
        name: 'Ramesh Kumar',
        phone: '9876543210',
        address: '12-3-45, Main Road, Mandapeta',
        area: 'Mandapeta',
        status: 'ACTIVE',
      }}
      onBack={() => router.back()}
    />
  );
}

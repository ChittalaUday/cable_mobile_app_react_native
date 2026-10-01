import { useLocalSearchParams } from 'expo-router';
import * as React from 'react';

import { CustomerDetailScreen } from '@/components/customer/customer-detail-screen';

export default function StaffCustomerDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <CustomerDetailScreen customerId={id} role="staff" />;
}

import { useLocalSearchParams } from 'expo-router';
import * as React from 'react';

import { CustomerDetailScreen } from '@/components/customer/customer-detail-screen';

export default function AdminCustomerDetailsRoute() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();

  return <CustomerDetailScreen customerId={id} role="admin" initialTab={tab === 'timeline' ? 'timeline' : undefined} />;
}

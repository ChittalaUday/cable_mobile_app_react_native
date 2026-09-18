import { useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { CollectPaymentScreen } from '@/components/payments/collect-payment';

export default function StaffCollectPaymentRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <CollectPaymentScreen customerId={id} basePath="/staff" />;
}

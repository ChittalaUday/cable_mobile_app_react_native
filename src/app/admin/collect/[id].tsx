import { useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { CollectPaymentScreen } from '@/components/payments/collect-payment';

export default function AdminCollectPaymentRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <CollectPaymentScreen customerId={id} basePath="/admin" />;
}

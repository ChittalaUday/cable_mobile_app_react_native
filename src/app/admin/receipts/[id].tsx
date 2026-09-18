import { useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { ReceiptView } from '@/components/payments/receipt-view';

export default function AdminReceiptRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <ReceiptView id={id} />;
}

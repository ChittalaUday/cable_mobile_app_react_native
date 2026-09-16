import { useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { InventoryItemDetailsScreen } from '@/components/inventory/inventory-item-details';

export default function AdminInventoryItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <InventoryItemDetailsScreen id={id} basePath="/admin/inventory" />;
}

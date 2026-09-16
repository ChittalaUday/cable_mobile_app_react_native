import * as React from 'react';
import { InventoryStockListScreen } from '@/components/inventory/inventory-stock-list';

export default function AdminInventoryStockScreen() {
  return <InventoryStockListScreen basePath="/admin/inventory" />;
}

import { useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { IssueSuccessScreen } from '@/components/inventory/issue-success';

export default function AdminIssueSuccessScreen() {
  const params = useLocalSearchParams<{
    itemName: string;
    serialNumber: string;
    customerName: string;
  }>();
  return (
    <IssueSuccessScreen
      itemName={params.itemName ?? 'Item'}
      serialNumber={params.serialNumber ?? 'SN-000'}
      customerName={params.customerName ?? 'Customer'}
      basePath="/admin/inventory"
    />
  );
}

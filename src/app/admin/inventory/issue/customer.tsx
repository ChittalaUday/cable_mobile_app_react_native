import { useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { IssueSelectCustomerScreen } from '@/components/inventory/issue-select-customer';

export default function AdminIssueCustomerScreen() {
  const params = useLocalSearchParams<{
    catalogId: string;
    itemName: string;
    itemCode: string;
    serialNumber?: string;
  }>();
  return (
    <IssueSelectCustomerScreen
      catalogId={params.catalogId}
      itemName={params.itemName}
      itemCode={params.itemCode}
      serialNumber={params.serialNumber}
      basePath="/admin/inventory"
    />
  );
}

import { useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { IssueConfirmScreen } from '@/components/inventory/issue-confirm';

export default function StaffIssueConfirmScreen() {
  const params = useLocalSearchParams<{
    catalogId: string;
    itemName: string;
    itemCode: string;
    serialNumber?: string;
    equipmentId?: string;
    customerId: string;
    customerName: string;
    customerCode: string;
  }>();
  return (
    <IssueConfirmScreen
      catalogId={params.catalogId}
      itemName={params.itemName}
      itemCode={params.itemCode}
      serialNumber={params.serialNumber}
      equipmentId={params.equipmentId}
      customerId={params.customerId}
      customerName={params.customerName}
      customerCode={params.customerCode}
      basePath="/staff/inventory"
    />
  );
}

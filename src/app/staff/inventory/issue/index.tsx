import { useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { IssueScanSearchScreen } from '@/components/inventory/issue-scan-search';

export default function StaffIssueScanSearchScreen() {
  // Set when a customer's page started the flow, so the customer step is skipped.
  const { customerId, customerName, customerCode } = useLocalSearchParams<{
    customerId?: string;
    customerName?: string;
    customerCode?: string;
  }>();

  return (
    <IssueScanSearchScreen
      basePath="/staff/inventory"
      customer={customerId === undefined
        ? undefined
        : { id: customerId, name: customerName ?? 'Customer', code: customerCode ?? '' }}
    />
  );
}

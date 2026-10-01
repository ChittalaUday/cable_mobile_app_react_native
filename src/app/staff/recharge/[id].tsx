import { useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { RechargeFlowScreen } from '@/components/payments/recharge';

export default function StaffRechargeRoute() {
  const { id, subscriptionId } = useLocalSearchParams<{ id: string; subscriptionId?: string }>();

  return <RechargeFlowScreen customerId={id} subscriptionId={subscriptionId} basePath="/staff" />;
}

import type { RaiseTicketTarget } from '@/components/tickets/raise-ticket-sheet';
import { useRouter } from 'expo-router';
import * as React from 'react';

import { CustomersView } from '@/components/admin/customers-view';
import { RaiseTicketSheet } from '@/components/tickets/raise-ticket-sheet';
import { FocusAwareStatusBar, SafeAreaView, View } from '@/components/ui';

export function AdminCustomersTab() {
  const router = useRouter();
  const [ticketFor, setTicketFor] = React.useState<RaiseTicketTarget | null>(null);

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <SafeAreaView edges={['top']} className="bg-surface" />
      <CustomersView
        basePath="/admin"
        onRecharge={conn => router.push({
          pathname: '/admin/recharge/[id]',
          params: { id: conn.customerId, ...(conn.subscriptionId ? { subscriptionId: conn.subscriptionId } : {}) },
        })}
        onRaiseTicket={(cust, conn) => setTicketFor({
          customerId: conn.customerId,
          customerName: cust.name,
          ...(conn.subscriptionId === undefined ? {} : { subscriptionId: conn.subscriptionId }),
          accountNumber: conn.stbNumber ?? conn.serviceTypeName,
        })}
      />

      <RaiseTicketSheet target={ticketFor} onClose={() => setTicketFor(null)} />
    </View>
  );
}

export default AdminCustomersTab;

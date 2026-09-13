import type { ConsolidatedCustomer } from '@/types/customer-connection';
import { MotiView } from 'moti';
import * as React from 'react';
import { CustomerConnectionCard } from '@/components/common/customer-connection-card';
import { Button, Pressable, ScrollView, Text, View } from '@/components/ui';
import { useAuthStore } from '@/lib/hooks/use-auth-store';

const demoCustomer: ConsolidatedCustomer = {
  id: 'cust_demo',
  name: 'Subscriber Account',
  phone: '+91 98765 43210',
  address: 'Satya Cable Network, AP',
  status: 'active',
  connections: [
    {
      id: 'conn_cable',
      customerId: 'cust_demo',
      serviceType: 'cable',
      serviceTypeName: 'Digital Cable TV',
      provider: 'act',
      providerName: 'ACT Cable Network',
      stbNumber: 'STB89741203',
      vcNumber: 'VC99812401',
      packageName: 'ACT Family HD Pack',
      monthlyPrice: 450,
      status: 'active',
      locationLabel: 'Living Room TV',
      expiryDate: '30-Sep-2026',
    },
    {
      id: 'conn_fiber',
      customerId: 'cust_demo',
      serviceType: 'internet',
      serviceTypeName: 'High-Speed Broadband',
      provider: 'vbc',
      providerName: 'VBC Fiber Broadband',
      speedMbps: 100,
      packageName: 'Fiber 100Mbps Unlimited',
      monthlyPrice: 650,
      status: 'active',
      locationLabel: 'Home Wifi',
      expiryDate: '15-Oct-2026',
    },
  ],
};

const customerContent = {
  title: 'My Subscriptions',
  tabs: ['Home', 'Bills', 'Account'],
} as const;

export function CustomerDashboardScreen() {
  const user = useAuthStore.use.user();
  const signOut = useAuthStore.use.signOut();
  const [tab, setTab] = React.useState(0);

  const activeUserCustomer: ConsolidatedCustomer = {
    ...demoCustomer,
    name: user?.displayName ?? user?.email?.split('@')[0] ?? 'Subscriber Account',
    phone: user?.phoneNumber ?? demoCustomer.phone,
    email: user?.email ?? undefined,
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-5 px-4 pb-28 pt-5">
        <MotiView from={{ opacity: 0, translateY: -12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300 }}>
          <View className="gap-1">
            <Text className="text-sm font-semibold tracking-widest text-primary-500 uppercase">Satya Cable & Broadband</Text>
            <Text selectable className="text-3xl font-bold text-foreground">{customerContent.title}</Text>
            <Text selectable className="text-muted-foreground">{user?.email ?? 'Customer account'}</Text>
          </View>
        </MotiView>

        <MotiView key={tab} from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 250 }}>
          {tab === 0
            ? (
                <CustomerConnectionCard
                  customer={activeUserCustomer}
                  onRecharge={conn => console.log('Recharge requested for connection', conn.id)}
                  onRaiseTicket={(_cust, conn) => console.log('Ticket requested for connection', conn.id)}
                />
              )
            : (
                <View className="min-h-72 items-center justify-center gap-2 rounded-2xl border border-border bg-card p-6">
                  <Text className="text-xl font-bold text-foreground">{customerContent.tabs[tab]}</Text>
                  <Text className="text-center text-muted-foreground">Live records will appear here when your account has synced data.</Text>
                </View>
              )}
        </MotiView>

        <Button label="Sign out" variant="outline" onPress={signOut} />
      </ScrollView>

      <View className="absolute inset-x-3 bottom-3 flex-row rounded-2xl border border-border bg-card p-2">
        {customerContent.tabs.map((label, index) => (
          <Pressable key={label} accessibilityRole="tab" accessibilityState={{ selected: tab === index }} onPress={() => setTab(index)} className={`flex-1 items-center rounded-xl px-1 py-3 ${tab === index ? 'bg-primary-500' : ''}`}>
            <Text className={`text-xs font-semibold ${tab === index ? 'text-white' : 'text-muted-foreground'}`}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

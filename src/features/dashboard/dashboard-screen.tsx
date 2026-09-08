import { MotiView } from 'moti';
import * as React from 'react';

import { Button, Pressable, ScrollView, Text, View } from '@/components/ui';
import { useAuthStore } from '@/features/auth/use-auth-store';

const dashboards = {
  admin: {
    title: 'Admin Dashboard',
    tabs: ['Home', 'Subscribers', 'Collections', 'More'],
    hero: ['Total Collections', '₹1,84,160', 'This month'],
    metrics: [['Active Subscribers', '1,248'], ['Monthly Avg', '₹2,80,800'], ['Overdue', '156'], ['Collected', '₹38,45,000']],
  },
  staff: {
    title: 'Staff Collections',
    tabs: ['Today', 'My Route', 'Receipts', 'More'],
    hero: ['Assigned Collections', '₹42,500', 'Today'],
    metrics: [['Assigned Customers', '48'], ['Completed', '31'], ['Pending', '17'], ['Receipts', '31']],
  },
  subscriber: {
    title: 'My Connection',
    tabs: ['Home', 'Bills', 'Account'],
    hero: ['Current Bill', '₹650', 'Due in 8 days'],
    metrics: [['Plan', 'Fiber 100'], ['Speed', '100 Mbps'], ['Status', 'Active'], ['Last paid', '₹650']],
  },
} as const;

export function DashboardScreen() {
  const role = useAuthStore.use.role() ?? 'subscriber';
  const user = useAuthStore.use.user();
  const signOut = useAuthStore.use.signOut();
  const content = dashboards[role];
  const [tab, setTab] = React.useState(0);

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-5 px-4 pb-28 pt-5">
        <MotiView from={{ opacity: 0, translateY: -12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300 }}>
          <View className="gap-1">
            <Text className="text-sm font-semibold tracking-widest text-primary-500 uppercase">Satya Cable & Broadband</Text>
            <Text selectable className="text-3xl font-bold text-foreground">{content.title}</Text>
            <Text selectable className="text-muted-foreground">{user?.email ?? 'Guest account'}</Text>
          </View>
        </MotiView>

        <MotiView key={tab} from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 250 }}>
          {tab === 0
            ? <Overview content={content} />
            : (
                <View className="min-h-72 items-center justify-center gap-2 rounded-3xl border border-border bg-card p-6">
                  <Text className="text-xl font-bold text-foreground">{content.tabs[tab]}</Text>
                  <Text className="text-center text-muted-foreground">Live records will appear here when this account has synced data.</Text>
                </View>
              )}
        </MotiView>

        <Button label="Sign out" variant="outline" onPress={signOut} />
      </ScrollView>

      <View className="absolute inset-x-3 bottom-3 flex-row rounded-2xl border border-border bg-card p-2">
        {content.tabs.map((label, index) => (
          <Pressable key={label} accessibilityRole="tab" accessibilityState={{ selected: tab === index }} onPress={() => setTab(index)} className={`flex-1 items-center rounded-xl px-1 py-3 ${tab === index ? 'bg-primary-500' : ''}`}>
            <Text className={`text-xs font-semibold ${tab === index ? 'text-white' : 'text-muted-foreground'}`}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Overview({ content }: { content: (typeof dashboards)[keyof typeof dashboards] }) {
  return (
    <View className="gap-4">
      <View className="gap-2 rounded-3xl bg-charcoal-900 p-5">
        <Text className="text-sm font-semibold text-primary-300">{content.hero[0]}</Text>
        <Text selectable className="text-4xl font-bold text-white">{content.hero[1]}</Text>
        <Text className="text-charcoal-300">{content.hero[2]}</Text>
      </View>
      <View className="flex-row flex-wrap gap-3">
        {content.metrics.map(([label, value]) => (
          <View key={label} className="min-w-[46%] flex-1 gap-1 rounded-2xl border border-border bg-card p-4">
            <Text className="text-sm text-muted-foreground">{label}</Text>
            <Text selectable className="text-xl font-bold text-foreground">{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

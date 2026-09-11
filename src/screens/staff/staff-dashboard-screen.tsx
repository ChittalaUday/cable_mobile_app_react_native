import { MotiView } from 'moti';
import * as React from 'react';

import { Button, Pressable, ScrollView, Text, View } from '@/components/ui';
import { useAuthStore } from '@/lib/hooks/use-auth-store';
import { StaffCollectionsCard } from './components/staff-collections-card';

const staffContent = {
  title: 'Staff Collections',
  tabs: ['Today', 'My Route', 'Receipts', 'More'],
  hero: ['Assigned Collections', '₹42,500', 'Today'],
  metrics: [['Assigned Customers', '48'], ['Completed', '31'], ['Pending', '17'], ['Receipts', '31']],
} as const;

export function StaffDashboardScreen() {
  const user = useAuthStore.use.user();
  const signOut = useAuthStore.use.signOut();
  const [tab, setTab] = React.useState(0);

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-5 px-4 pb-28 pt-5">
        <MotiView from={{ opacity: 0, translateY: -12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300 }}>
          <View className="gap-1">
            <Text className="text-sm font-semibold tracking-widest text-primary-500 uppercase">Satya Cable & Broadband</Text>
            <Text selectable className="text-3xl font-bold text-foreground">{staffContent.title}</Text>
            <Text selectable className="text-muted-foreground">{user?.email ?? 'Field Officer'}</Text>
          </View>
        </MotiView>

        <MotiView key={tab} from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 250 }}>
          {tab === 0
            ? <StaffCollectionsCard content={staffContent} />
            : (
                <View className="min-h-72 items-center justify-center gap-2 rounded-2xl border border-border bg-card p-6">
                  <Text className="text-xl font-bold text-foreground">{staffContent.tabs[tab]}</Text>
                  <Text className="text-center text-muted-foreground">Live records will appear here when route data has synced.</Text>
                </View>
              )}
        </MotiView>

        <Button label="Sign out" variant="outline" onPress={signOut} />
      </ScrollView>

      <View className="absolute inset-x-3 bottom-3 flex-row rounded-2xl border border-border bg-card p-2">
        {staffContent.tabs.map((label, index) => (
          <Pressable key={label} accessibilityRole="tab" accessibilityState={{ selected: tab === index }} onPress={() => setTab(index)} className={`flex-1 items-center rounded-xl px-1 py-3 ${tab === index ? 'bg-primary-500' : ''}`}>
            <Text className={`text-xs font-semibold ${tab === index ? 'text-white' : 'text-muted-foreground'}`}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

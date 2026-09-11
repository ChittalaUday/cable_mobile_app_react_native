import { MotiView } from 'moti';
import * as React from 'react';

import { Button, Pressable, ScrollView, Text, View } from '@/components/ui';
import { useAuthStore } from '@/lib/hooks/use-auth-store';
import { SubscriberPlanCard } from './components/subscriber-plan-card';

const subscriberContent = {
  title: 'My Connection',
  tabs: ['Home', 'Bills', 'Account'],
  hero: ['Current Bill', '₹650', 'Due in 8 days'],
  metrics: [['Plan', 'Fiber 100'], ['Speed', '100 Mbps'], ['Status', 'Active'], ['Last paid', '₹650']],
} as const;

export function SubscriberDashboardScreen() {
  const user = useAuthStore.use.user();
  const signOut = useAuthStore.use.signOut();
  const [tab, setTab] = React.useState(0);

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-5 px-4 pb-28 pt-5">
        <MotiView from={{ opacity: 0, translateY: -12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300 }}>
          <View className="gap-1">
            <Text className="text-sm font-semibold tracking-widest text-primary-500 uppercase">Satya Cable & Broadband</Text>
            <Text selectable className="text-3xl font-bold text-foreground">{subscriberContent.title}</Text>
            <Text selectable className="text-muted-foreground">{user?.email ?? 'Subscriber account'}</Text>
          </View>
        </MotiView>

        <MotiView key={tab} from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 250 }}>
          {tab === 0
            ? <SubscriberPlanCard content={subscriberContent} />
            : (
                <View className="min-h-72 items-center justify-center gap-2 rounded-2xl border border-border bg-card p-6">
                  <Text className="text-xl font-bold text-foreground">{subscriberContent.tabs[tab]}</Text>
                  <Text className="text-center text-muted-foreground">Live records will appear here when your account has synced data.</Text>
                </View>
              )}
        </MotiView>

        <Button label="Sign out" variant="outline" onPress={signOut} />
      </ScrollView>

      <View className="absolute inset-x-3 bottom-3 flex-row rounded-2xl border border-border bg-card p-2">
        {subscriberContent.tabs.map((label, index) => (
          <Pressable key={label} accessibilityRole="tab" accessibilityState={{ selected: tab === index }} onPress={() => setTab(index)} className={`flex-1 items-center rounded-xl px-1 py-3 ${tab === index ? 'bg-primary-500' : ''}`}>
            <Text className={`text-xs font-semibold ${tab === index ? 'text-white' : 'text-muted-foreground'}`}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

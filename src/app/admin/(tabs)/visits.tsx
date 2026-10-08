import { HistoryIcon } from '@hugeicons/core-free-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';

import { TodaysRound } from '@/components/staff/todays-round';
import { FocusAwareStatusBar, Pressable, SafeAreaView, Text, ThemedIcon, View } from '@/components/ui';

/** The visits tab is the to-do list; what was already done is the clock icon in the header. */
export default function AdminVisitsTab() {
  const router = useRouter();
  const { show, at } = useLocalSearchParams<{ show?: string; at?: string }>();

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <SafeAreaView edges={['top']} className="bg-surface" />
      <View className="flex-row items-center px-3 pt-2 pb-1">
        <Text className="flex-1 text-2xl font-extrabold text-foreground">Visits</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Visit history"
          testID="visit-history"
          hitSlop={8}
          onPress={() => router.push('/admin/visit-history')}
          className="size-9 items-center justify-center rounded-full border border-border bg-card active:bg-muted"
        >
          <ThemedIcon icon={HistoryIcon} size={18} colorClassName="text-foreground" />
        </Pressable>
      </View>
      <TodaysRound basePath="/admin" preset={show === 'overdue' ? at ?? '1' : undefined} />
    </View>
  );
}

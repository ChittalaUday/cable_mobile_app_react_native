import * as React from 'react';
import { RefreshControl } from 'react-native';

import { LoadError, Loading, ScreenHeader } from '@/components/common/shell';
import { StaffCollectionsCard } from '@/components/staff/staff-collections-card';
import { colors, FocusAwareStatusBar, ScrollView, View } from '@/components/ui';
import { useStaffDashboard } from '@/lib/hooks/api/use-staff-dashboard';

/** Everything behind the day's number: week, month, workload and recent receipts. */
export default function StaffCollectionsScreen() {
  const { data, isPending, isRefetching, error, refetch } = useStaffDashboard();

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <ScreenHeader title="Collections" subtitle="Your round in detail" showBack withSafeArea />
      {isPending
        ? <Loading />
        : data === undefined
          ? <LoadError message={error?.message} onRetry={refetch} />
          : (
              <ScrollView
                className="flex-1"
                contentContainerClassName="px-3 pb-8"
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[600]} />}
              >
                <StaffCollectionsCard dashboard={data} />
              </ScrollView>
            )}
    </View>
  );
}

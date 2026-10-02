import type { IconSvgElement } from '@hugeicons/react-native';
import type { TintKey } from '@/components/common/shell';
import type { TimelineItem } from '@/lib/hooks/api/use-visits';
import { HeadsetIcon, Location01Icon, MoneyReceive01Icon, Package01Icon, Tv01Icon, UserIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { ActivityIndicator } from 'react-native';
import { TINT } from '@/components/common/shell';
import { Button, colors, Text, View } from '@/components/ui';
import { useCustomerTimeline } from '@/lib/hooks/api/use-visits';
import { dateTime } from '@/lib/utils/admin-format';

const LOOK: Record<TimelineItem['kind'], { icon: IconSvgElement; tint: TintKey }> = {
  customer: { icon: UserIcon, tint: 'purple' },
  line: { icon: Tv01Icon, tint: 'blue' },
  payment: { icon: MoneyReceive01Icon, tint: 'green' },
  visit: { icon: Location01Icon, tint: 'orange' },
  ticket: { icon: HeadsetIcon, tint: 'red' },
  equipment: { icon: Package01Icon, tint: 'blue' },
};

/**
 * Everything that happened to this customer, newest first: registration and
 * every edit with who made it, plan changes, receipts, visits (answered or
 * not), complaints, and boxes fitted or returned.
 */
export function CustomerTimeline({ customerId }: { customerId: string }) {
  const { data, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useCustomerTimeline({ variables: { customerId } });
  const items = data?.pages.flatMap(page => page.items) ?? [];

  if (isPending)
    return <View className="items-center py-10"><ActivityIndicator color={colors.primary[500]} /></View>;

  if (error) {
    return (
      <View className="items-center gap-2 py-10">
        <Text className="text-sm text-muted-foreground">Could not load the timeline.</Text>
        <Button label="Retry" variant="outline" size="sm" onPress={() => void refetch()} />
      </View>
    );
  }

  if (items.length === 0)
    return <Text className="py-10 text-center text-sm text-muted-foreground">Nothing has happened yet.</Text>;

  return (
    <View className="mt-4" testID="customer-timeline">
      {items.map((item, index) => {
        const look = LOOK[item.kind];
        const tint = TINT[look.tint];
        const last = index === items.length - 1;
        return (
          <View key={item.id} className="flex-row gap-3">
            <View className="items-center">
              <View className="size-9 items-center justify-center rounded-full" style={{ backgroundColor: tint.bg }}>
                <HugeiconsIcon icon={look.icon} size={18} color={tint.fg} />
              </View>
              {last ? null : <View className="w-px flex-1 bg-border" />}
            </View>
            <View className={`flex-1 gap-0.5 ${last ? '' : 'pb-4'}`}>
              <Text className="text-sm font-bold text-foreground">{item.title}</Text>
              {item.detail === null ? null : <Text className="text-xs text-muted-foreground">{item.detail}</Text>}
              <Text className="text-[11px] text-muted-foreground">
                {[dateTime(item.at), item.actorName].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </View>
        );
      })}
      {hasNextPage
        ? (
            <Button
              label={isFetchingNextPage ? 'Loading…' : 'Show older'}
              variant="outline"
              size="sm"
              disabled={isFetchingNextPage}
              onPress={() => void fetchNextPage()}
              testID="timeline-older"
            />
          )
        : null}
    </View>
  );
}

import type { IconSvgElement } from '@hugeicons/react-native';
import type { ActivityKind, ActivityRow } from '@/lib/utils/admin-stats';
import {
  Clock01Icon,
  CreditCardIcon,
  HeadsetIcon,
  PlusSignIcon,
  Wifi01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';

import { Card, Divider, SectionHeader, TINT } from '@/components/common/shell';
import { Text, View } from '@/components/ui';

const ACTIVITY_STYLE: Record<ActivityKind, { icon: IconSvgElement; tint: keyof typeof TINT }> = {
  customer: { icon: PlusSignIcon, tint: 'green' },
  connection: { icon: Wifi01Icon, tint: 'blue' },
  payment: { icon: CreditCardIcon, tint: 'orange' },
  ticket: { icon: HeadsetIcon, tint: 'purple' },
};

export function RecentActivity({ rows, onSeeAll }: { rows: ActivityRow[]; onSeeAll: () => void }) {
  return (
    <Card className="p-3.5">
      <SectionHeader icon={Clock01Icon} tint="blue" title="Recent Activity" action="See All" onAction={onSeeAll} />
      {rows.length === 0
        ? <Text className="mt-4 text-xs text-muted-foreground">No customer, connection or payment records yet.</Text>
        : rows.map((row, index) => (
            <View key={row.id}>
              {index > 0 && <Divider />}
              <View className="flex-row items-center gap-3 py-3">
                <View className="size-9 items-center justify-center rounded-full" style={{ backgroundColor: TINT[ACTIVITY_STYLE[row.kind].tint].bg }}>
                  <HugeiconsIcon icon={ACTIVITY_STYLE[row.kind].icon} size={17} color={TINT[ACTIVITY_STYLE[row.kind].tint].fg} strokeWidth={2.4} />
                </View>
                <View className="flex-1">
                  <Text className="text-[13px] font-semibold text-foreground" numberOfLines={1}>{row.title}</Text>
                  <Text className="text-xs text-muted-foreground" numberOfLines={1}>{row.subtitle}</Text>
                </View>
                <Text className="text-[11px] text-muted-foreground">{row.ago}</Text>
              </View>
            </View>
          ))}
    </Card>
  );
}

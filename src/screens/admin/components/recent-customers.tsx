import type { CustomerRow } from '@/lib/utils/admin-stats';
import { UserIcon } from '@hugeicons/core-free-icons';
import * as React from 'react';

import { Card, Divider, SectionHeader, StatusPill, TINT } from '@/components/common/shell';
import { Pressable, Text, View } from '@/components/ui';
import { initials } from '@/lib/utils/admin-format';

const AVATAR_TINTS = [TINT.orange, TINT.blue, TINT.purple, TINT.green] as const;

export function RecentCustomers({ rows, onViewAll, onPress }: {
  rows: CustomerRow[];
  onViewAll: () => void;
  onPress: (row: CustomerRow) => void;
}) {
  return (
    <Card className="p-4">
      <SectionHeader icon={UserIcon} tint="blue" title="Recent Customers" action="View All" onAction={onViewAll} />
      {rows.length === 0
        ? <Text className="mt-4 text-xs text-muted-foreground">No customers have been created yet.</Text>
        : rows.map((row, index) => {
            const tint = AVATAR_TINTS[index % AVATAR_TINTS.length];
            return (
              <View key={row.id}>
                {index > 0 && <Divider />}
                <Pressable accessibilityRole="button" onPress={() => onPress(row)} className="flex-row items-center gap-3.5 py-3.5">
                  <View className="size-11 items-center justify-center rounded-full" style={{ backgroundColor: tint.bg }}>
                    <Text className="text-sm font-extrabold" style={{ color: tint.fg }}>{initials(row.name)}</Text>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-base font-extrabold text-foreground" numberOfLines={1}>{row.name}</Text>
                      {row.connectionCount && row.connectionCount > 1
                        ? (
                            <View className="rounded-full bg-primary-100 px-2 py-0.5 dark:bg-neutral-800">
                              <Text className="text-[10px] font-bold text-primary-600 dark:text-primary-400">
                                {row.connectionCount}
                                {' '}
                                Boxes
                              </Text>
                            </View>
                          )
                        : null}
                    </View>
                    <Text className="text-xs font-medium text-muted-foreground" numberOfLines={1}>{row.phone}</Text>
                  </View>
                  <StatusPill status={row.status} />
                  <Text className="w-[62px] text-right text-xs font-medium text-muted-foreground">{row.ago}</Text>
                </Pressable>
              </View>
            );
          })}
    </Card>
  );
}

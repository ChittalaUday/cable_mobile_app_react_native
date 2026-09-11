import type { StaffRow } from '@/lib/utils/admin-stats';
import { UserGroup03Icon } from '@hugeicons/core-free-icons';
import * as React from 'react';

import { Card, Divider, SectionHeader, TINT } from '@/components/common/shell';
import { Text, View } from '@/components/ui';
import { grouped, initials, rupees } from '@/lib/utils/admin-format';

const AVATAR_TINTS = [TINT.orange, TINT.blue, TINT.purple, TINT.green] as const;

export function StaffActivity({ rows, onViewAll }: { rows: StaffRow[]; onViewAll: () => void }) {
  return (
    <Card className="p-3.5">
      <SectionHeader icon={UserGroup03Icon} tint="purple" title="Staff Activity" action="View All" onAction={onViewAll} />
      {rows.length === 0
        ? <Text className="mt-4 text-xs text-muted-foreground">No staff accounts have been provisioned yet.</Text>
        : rows.map((row, index) => {
            const tint = AVATAR_TINTS[index % AVATAR_TINTS.length];
            return (
              <View key={row.id}>
                {index > 0 && <Divider />}
                <View className="flex-row items-start gap-3 py-3">
                  <View className="size-9 items-center justify-center rounded-full" style={{ backgroundColor: tint.bg }}>
                    <Text className="text-xs font-bold" style={{ color: tint.fg }}>{initials(row.name)}</Text>
                  </View>
                  <View className="flex-1 gap-0.5">
                    <View className="flex-row items-center gap-2">
                      <Text className="flex-1 text-[13px] font-semibold text-foreground" numberOfLines={1}>{row.name}</Text>
                      <Text className="text-[11px] text-muted-foreground">{row.ago ?? 'idle'}</Text>
                    </View>
                    <Text className="text-xs text-charcoal-600" numberOfLines={1}>{row.lastAction}</Text>
                    <View className="mt-1 flex-row gap-3">
                      <Metric label="collected" value={rupees(row.collected)} />
                      <Metric label={row.bills === 1 ? 'bill' : 'bills'} value={grouped(row.bills)} />
                      <Metric label="tickets closed" value={grouped(row.ticketsClosed)} />
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-baseline gap-1">
      <Text className="text-[11px] font-bold text-charcoal-900">{value}</Text>
      <Text className="text-[10px] text-muted-foreground">{label}</Text>
    </View>
  );
}

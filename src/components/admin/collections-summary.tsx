import type { AdminDashboard } from '@/lib/utils/admin-stats';
import { WalletAdd01Icon } from '@hugeicons/core-free-icons';
import * as React from 'react';

import { Card, SectionHeader } from '@/components/common/shell';
import { Text, View } from '@/components/ui';
import { grouped, rupees } from '@/lib/utils/admin-format';

const COLLECTION_TILES = [
  { key: 'today', label: 'Collected Today', pick: (data: AdminDashboard) => rupees(data.collectedToday), hint: 'Recorded payments' },
  { key: 'week', label: 'Collected This Week', pick: (data: AdminDashboard) => rupees(data.collectedWeek), hint: 'Since Sunday' },
  { key: 'dues', label: 'Outstanding Dues', pick: (data: AdminDashboard) => rupees(data.outstandingDues), hint: 'accounts pending' },
  { key: 'arpu', label: 'Revenue / Connection', pick: (data: AdminDashboard) => rupees(data.arpu), hint: 'This month, active only' },
] as const;

export function CollectionsSummary({ data }: { data: AdminDashboard }) {
  return (
    <Card className="p-3.5">
      <SectionHeader icon={WalletAdd01Icon} tint="green" title="Collections" />
      <View className="mt-3 flex-row flex-wrap">
        {COLLECTION_TILES.map((tile, index) => (
          <View
            key={tile.key}
            className={`w-1/2 gap-0.5 py-2.5 ${index % 2 === 1 ? 'border-l border-border pl-3' : 'pr-3'}`}
          >
            <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>{tile.label}</Text>
            <Text adjustsFontSizeToFit numberOfLines={1} className="text-lg font-bold text-foreground">{tile.pick(data)}</Text>
            <Text className="text-[10px] text-charcoal-300" numberOfLines={1}>
              {tile.key === 'dues' ? `${grouped(data.dueAccounts)} ${tile.hint}` : tile.hint}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

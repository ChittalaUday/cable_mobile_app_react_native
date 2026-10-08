import type { AreaRow } from '@/lib/utils/admin-stats';
import { ArrowRight01Icon, Location01Icon } from '@hugeicons/core-free-icons';

import { shareLabel } from '@/components/common/charts';
import { Card, SectionHeader } from '@/components/common/shell';
import { Accordion, Pressable, Text, ThemedIcon, View } from '@/components/ui';
import { grouped } from '@/lib/utils/admin-format';

/** "Mandapeta / TIDCO / Group C / C5" reads as "C5"; the rest is a tap away. */
function leafName(path: string): string {
  return path.split(' / ').at(-1)?.trim() || path;
}

function AreaItem({ rank, area, peak, onOpen }: { rank: number; area: AreaRow; peak: number; onOpen: () => void }) {
  const leaf = leafName(area.name);

  return (
    <View className="py-1.5">
      <Accordion
        accessibilityLabel={`${area.name}, ${area.count} customers`}
        header={(
          <View className="flex-row items-center gap-3">
            <View className="size-7 items-center justify-center rounded-full bg-muted">
              <Text className="text-xs font-bold text-foreground">{rank}</Text>
            </View>
            <Text className="w-24 text-sm font-bold text-foreground" numberOfLines={1}>{leaf}</Text>
            <View className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <View className="h-full rounded-full bg-primary-600" style={{ width: `${Math.max((area.count / peak) * 100, 6)}%` }} />
            </View>
            <Text className="w-10 text-right text-sm font-extrabold text-foreground" numberOfLines={1}>{grouped(area.count)}</Text>
            <Text className="w-12 text-right text-xs font-semibold text-muted-foreground" numberOfLines={1}>{shareLabel(area.share)}</Text>
          </View>
        )}
      >
        <View className="ml-10 gap-2 pb-1">
          <Text selectable className="text-xs text-muted-foreground">{area.name}</Text>
          <Pressable accessibilityRole="link" onPress={onOpen} className="flex-row items-center gap-1 self-start">
            <Text className="text-xs font-bold text-primary-600">View customers</Text>
            <ThemedIcon icon={ArrowRight01Icon} size={14} strokeWidth={2.2} colorClassName="text-primary-600" />
          </Pressable>
        </View>
      </Accordion>
    </View>
  );
}

export function TopAreas({ areas, onPress }: { areas: AreaRow[]; onPress: (area: AreaRow) => void }) {
  const peak = Math.max(...areas.map(area => area.count), 1);
  return (
    <Card className="p-4">
      <SectionHeader icon={Location01Icon} tint="orange" title="Top Areas by Customers" />
      {areas.length === 0
        ? <Text className="mt-4 text-xs text-muted-foreground">No customer addresses on file yet.</Text>
        : (
            <View className="mt-3 gap-1">
              {areas.map((area, index) => (
                <AreaItem key={area.id} rank={index + 1} area={area} peak={peak} onOpen={() => onPress(area)} />
              ))}
            </View>
          )}
    </Card>
  );
}

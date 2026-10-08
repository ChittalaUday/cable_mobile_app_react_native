import type { IconSvgElement } from '@hugeicons/react-native';
import type { TintKey } from '@/components/common/shell';
import type { Visit, VisitOutcome } from '@/lib/hooks/api/use-visits';
import { Cancel01Icon, CheckmarkCircle02Icon, Clock01Icon, Location01Icon, UserBlock01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { LoadError, ScreenHeader, TINT } from '@/components/common/shell';
import { colors, List, Pill, Pressable, Text, View } from '@/components/ui';
import { useVisits, VISIT_OUTCOME_LABELS, VISIT_PURPOSE_LABELS } from '@/lib/hooks/api/use-visits';
import { dateTime } from '@/lib/utils/admin-format';

const OUTCOME_LOOK: Record<VisitOutcome, { icon: IconSvgElement; tint: TintKey }> = {
  not_available: { icon: UserBlock01Icon, tint: 'red' },
  refused: { icon: Cancel01Icon, tint: 'red' },
  come_later: { icon: Clock01Icon, tint: 'orange' },
  done: { icon: CheckmarkCircle02Icon, tint: 'green' },
  other: { icon: Location01Icon, tint: 'blue' },
};

type Who = 'me' | 'all';

/**
 * Who went to which door, why, and what happened — the round as walked. Staff
 * see their own visits and those in their areas; an admin sees every visit.
 */
export function VisitsList({ basePath }: { basePath: '/admin' | '/staff' }) {
  const router = useRouter();
  const [who, setWho] = React.useState<Who>(basePath === '/staff' ? 'me' : 'all');
  const [outcome, setOutcome] = React.useState<VisitOutcome | 'any'>('any');

  const { data, isPending, isRefetching, error, refetch } = useVisits({
    variables: {
      ...(who === 'me' ? { visitedBy: 'me' as const } : {}),
      ...(outcome === 'any' ? {} : { outcome }),
    },
  });
  const items = data?.items ?? [];

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader title="Visit history" subtitle={data === undefined ? 'Doors visited, paid or not' : `${data.total} visits`} showBack withSafeArea>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-1.5">
          {(['me', 'all'] as const).map(key => (
            <Pill key={key} label={key === 'me' ? 'Mine' : 'Everyone I can see'} selected={who === key} size="sm" onPress={() => setWho(key)} testID={`visits-who-${key}`} />
          ))}
          <View className="w-px bg-border" />
          <Pill label="Any" selected={outcome === 'any'} size="sm" onPress={() => setOutcome('any')} testID="visits-outcome-any" />
          {(Object.keys(VISIT_OUTCOME_LABELS) as VisitOutcome[]).map(key => (
            <Pill key={key} label={VISIT_OUTCOME_LABELS[key]} selected={outcome === key} size="sm" onPress={() => setOutcome(key)} testID={`visits-outcome-${key}`} />
          ))}
        </ScrollView>
      </ScreenHeader>

      {error
        ? <LoadError message={error.message} onRetry={refetch} />
        : (
            <List
              data={items}
              keyExtractor={item => item.id}
              renderItem={({ item }) => <VisitRow visit={item} onPress={() => router.push(`${basePath}/customers/${item.customerId}`)} />}
              contentContainerStyle={{ paddingBottom: 24 }}
              refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[500]} />}
              ListEmptyComponent={isPending
                ? <View className="items-center py-14"><ActivityIndicator color={colors.primary[500]} /></View>
                : <Text className="py-14 text-center text-sm text-muted-foreground">No visits yet.</Text>}
            />
          )}
    </View>
  );
}

function VisitRow({ visit, onPress }: { visit: Visit; onPress: () => void }) {
  const look = OUTCOME_LOOK[visit.outcome];
  const tint = TINT[look.tint];
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className="mx-4 flex-row items-center gap-3 border-b border-border/60 py-3 active:opacity-70" testID={`visit-row-${visit.id}`}>
      <View className="size-11 items-center justify-center rounded-full" style={{ backgroundColor: tint.bg }}>
        <HugeiconsIcon icon={look.icon} size={22} color={tint.fg} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-[15px] font-bold text-foreground" numberOfLines={1}>{visit.customerName ?? visit.customerCode ?? 'Customer'}</Text>
        <Text className="text-[13px] text-muted-foreground" numberOfLines={1}>
          {`${VISIT_OUTCOME_LABELS[visit.outcome]} · ${VISIT_PURPOSE_LABELS[visit.purpose]}${visit.notes === null ? '' : ` · ${visit.notes}`}`}
        </Text>
        <Text className="text-xs text-muted-foreground">{[dateTime(visit.visitedAt), visit.visitorName].filter(Boolean).join(' · ')}</Text>
      </View>
    </Pressable>
  );
}

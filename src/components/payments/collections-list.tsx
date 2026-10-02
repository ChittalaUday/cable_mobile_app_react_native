import type { Collection } from '@/lib/hooks/api/use-payments';
import { ArrowDown01Icon, Calendar03Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, RefreshControl } from 'react-native';
import { Avatar, LoadError, Loading, Segmented, TINT } from '@/components/common/shell';
import { colors, List, Pressable, Text, View } from '@/components/ui';
import { useCollections } from '@/lib/hooks/api/use-payments';
import { dateTime, dayMonthYear, lakhs, rupees as wholeRupees } from '@/lib/utils/admin-format';

const rupees = (value: string | number) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const compact = (value: number) => (Math.abs(value) < 1000 ? wholeRupees(value) : `₹${lakhs(value)}`);

const day = dayMonthYear;

type Outcome = 'all' | 'full' | 'due' | 'none';
const OUTCOME_TABS = [
  { key: 'all', label: 'All' },
  { key: 'full', label: 'Collected' },
  { key: 'due', label: 'Pending' },
  { key: 'none', label: 'Failed' },
] as const;

const BADGE: Record<Collection['outcome'], { label: string; tint: { bg: string; fg: string } }> = {
  full: { label: 'Success', tint: TINT.green },
  partial: { label: 'Partial', tint: TINT.orange },
  due: { label: 'Pending', tint: TINT.orange },
  none: { label: 'Failed', tint: TINT.red },
  refund: { label: 'Reversed', tint: TINT.red },
  others: { label: 'Other', tint: TINT.blue },
};

const METHOD: Record<NonNullable<Collection['method']>, string> = {
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
  bank_transfer: 'Bank',
  cheque: 'Cheque',
};

type Range = 'month' | 'last_month' | '7d' | 'today' | 'all';
const RANGE_LABEL: Record<Range, string> = {
  'month': 'This month',
  'last_month': 'Last month',
  '7d': 'Last 7 days',
  'today': 'Today',
  'all': 'All time',
};

function rangeDates(range: Range, now = new Date()): { from: Date; to: Date } | null {
  const y = now.getFullYear();
  const m = now.getMonth();
  const startOfToday = new Date(y, m, now.getDate());
  switch (range) {
    case 'month': return { from: new Date(y, m, 1), to: new Date(y, m + 1, 0, 23, 59, 59, 999) };
    case 'last_month': return { from: new Date(y, m - 1, 1), to: new Date(y, m, 0, 23, 59, 59, 999) };
    case '7d': return { from: new Date(y, m, now.getDate() - 6), to: new Date(y, m, now.getDate(), 23, 59, 59, 999) };
    case 'today': return { from: startOfToday, to: new Date(y, m, now.getDate(), 23, 59, 59, 999) };
    case 'all': return null;
  }
}

function ReceiptRow({ receipt, onPress }: { receipt: Collection; onPress: () => void }) {
  const badge = receipt.reversedById === null ? BADGE[receipt.outcome] : BADGE.refund;
  const sub = [receipt.customerCode, receipt.method ? METHOD[receipt.method] : null].filter(Boolean).join(' • ');
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="mx-4 flex-row items-center gap-3 border-b border-border/60 py-3 active:opacity-70"
    >
      <Avatar name={receipt.customerName ?? receipt.customerCode} />
      <View className="flex-1 gap-0.5">
        <Text className="text-[15px] font-bold text-foreground" numberOfLines={1}>
          {receipt.customerName ?? receipt.customerCode ?? 'Customer'}
        </Text>
        {sub ? <Text className="text-[13px] text-muted-foreground" numberOfLines={1}>{sub}</Text> : null}
        <Text className="text-xs text-muted-foreground">{dateTime(receipt.collectedAt)}</Text>
      </View>
      <View className="items-end gap-1">
        <Text className="text-[15px] font-bold text-foreground">{rupees(receipt.totalCollected)}</Text>
        <View className="rounded-md px-2 py-0.5" style={{ backgroundColor: badge.tint.bg }}>
          <Text className="text-[11px] font-semibold" style={{ color: badge.tint.fg }}>{badge.label}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function StatTile({ value, label, tint }: { value: string; label: string; tint?: { bg: string; fg: string } }) {
  return (
    <View className={`flex-1 items-center rounded-xl py-3 ${tint ? '' : 'border border-border bg-card'}`} style={tint ? { backgroundColor: tint.bg } : undefined}>
      <Text adjustsFontSizeToFit numberOfLines={1} className="text-xl font-bold" style={{ color: tint?.fg }}>
        {value}
      </Text>
      <Text className="text-xs" style={{ color: tint?.fg }}>{label}</Text>
    </View>
  );
}

/**
 * The receipts this caller may see. Which ones that is comes from the server —
 * an admin's whole tenant, a collector's assigned areas, a subscriber's own —
 * so this list never filters anything itself; the tabs and the range are query
 * parameters.
 */
export function CollectionsList({ basePath, customerId, mineOnly = false, header, pending }: {
  basePath: '/admin' | '/staff';
  customerId?: string;
  mineOnly?: boolean;
  /** Rendered above the filters, inside the same scroll — a title, usually. */
  header?: React.ReactNode;
  /** Outstanding dues, for the third tile. Left out when the caller has no such figure. */
  pending?: number;
}) {
  const router = useRouter();
  const [outcome, setOutcome] = React.useState<Outcome>('all');
  const [range, setRange] = React.useState<Range>('month');
  const [pickingRange, setPickingRange] = React.useState(false);
  const dates = rangeDates(range);

  const variables = {
    ...(customerId === undefined ? {} : { customerId }),
    ...(mineOnly ? { collectedBy: 'me' as const } : {}),
    ...(outcome === 'all' ? {} : { outcome }),
    ...(dates ? { from: dates.from.toISOString(), to: dates.to.toISOString() } : {}),
  };

  const {
    data,
    isPending,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCollections({ variables: Object.keys(variables).length === 0 ? undefined : variables });

  const items = React.useMemo(() => data?.pages.flatMap(page => page.items) ?? [], [data]);
  const totals = data?.pages[0]?.totals;

  const filters = (
    <View className="gap-3 px-4 pb-2">
      <Segmented<Outcome> options={OUTCOME_TABS} value={outcome} onChange={setOutcome} />

      <View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose date range"
          onPress={() => setPickingRange(open => !open)}
          className="flex-row items-center gap-2 rounded-xl border border-border bg-card p-3"
        >
          <HugeiconsIcon icon={Calendar03Icon} size={18} color={colors.neutral[500]} />
          <Text className="flex-1 text-[13px] font-medium text-foreground">
            {dates ? `${day(dates.from)} - ${day(dates.to)}` : RANGE_LABEL.all}
          </Text>
          <HugeiconsIcon icon={ArrowDown01Icon} size={18} color={colors.neutral[500]} />
        </Pressable>
        {pickingRange
          ? (
              <View className="mt-1.5 overflow-hidden rounded-xl border border-border bg-card">
                {(Object.keys(RANGE_LABEL) as Range[]).map(key => (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: key === range }}
                    onPress={() => {
                      setRange(key);
                      setPickingRange(false);
                    }}
                    className="px-4 py-3 active:bg-muted/40"
                  >
                    <Text className={`text-[13px] ${key === range ? 'font-bold text-primary-600' : 'text-foreground'}`}>{RANGE_LABEL[key]}</Text>
                  </Pressable>
                ))}
              </View>
            )
          : null}
      </View>

      {totals === undefined
        ? null
        : (
            <View className="flex-row gap-2">
              <StatTile value={compact(Number(totals.totalCollected))} label="Collected" tint={TINT.green} />
              <StatTile value={String(totals.receipts)} label="Transactions" />
              {pending === undefined ? null : <StatTile value={compact(pending)} label="Pending" tint={TINT.red} />}
            </View>
          )}
    </View>
  );

  return (
    <View className="flex-1">
      <List
        data={isPending || error ? [] : items}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <ReceiptRow receipt={item} onPress={() => router.push(`${basePath}/receipts/${item.id}`)} />
        )}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage)
            fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={(
          <View className="pb-1">
            {header}
            {filters}
          </View>
        )}
        refreshControl={(
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[600]} />
        )}
        ListEmptyComponent={
          isPending
            ? <View className="p-10"><Loading /></View>
            : error
              ? <LoadError message={error.message} onRetry={refetch} />
              : (
                  <View className="items-center p-10">
                    <Text className="text-sm text-muted-foreground">No receipts yet.</Text>
                  </View>
                )
        }
        ListFooterComponent={isFetchingNextPage
          ? <View className="p-4"><ActivityIndicator size="small" color={colors.primary[600]} /></View>
          : null}
      />
    </View>
  );
}

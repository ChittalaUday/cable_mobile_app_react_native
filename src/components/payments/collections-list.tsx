import type { Collection } from '@/lib/hooks/api/use-payments';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, RefreshControl } from 'react-native';
import { Card, LoadError, Loading } from '@/components/common/shell';
import { colors, List, Pressable, Text, View } from '@/components/ui';
import { useCollections } from '@/lib/hooks/api/use-payments';

const rupees = (value: string | number) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const OUTCOME_TINT: Record<Collection['outcome'], string> = {
  full: 'text-success-600',
  partial: 'text-warning-600',
  none: 'text-muted-foreground',
  refund: 'text-danger-600',
  others: 'text-muted-foreground',
};

const OUTCOME_LABEL: Record<Collection['outcome'], string> = {
  full: 'Full',
  partial: 'Part',
  none: 'No payment',
  refund: 'Reversed',
  others: 'Other',
};

function ReceiptRow({ receipt, onPress }: { receipt: Collection; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center justify-between border-b border-border/60 px-4 py-3 active:bg-muted/40"
    >
      <View className="flex-1 pr-3">
        <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
          {receipt.customerName ?? receipt.customerCode ?? 'Customer'}
        </Text>
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          {`${OUTCOME_LABEL[receipt.outcome]} · ${receipt.collectorName ?? 'Collector'} · ${new Date(receipt.collectedAt).toLocaleDateString('en-IN')}`}
        </Text>
      </View>
      <View className="items-end">
        <Text className={`text-sm font-black ${OUTCOME_TINT[receipt.outcome]}`}>
          {rupees(receipt.totalCollected)}
        </Text>
        {receipt.reversedById !== null && (
          <Text className="text-[10px] font-bold text-danger-600">reversed</Text>
        )}
      </View>
    </Pressable>
  );
}

/**
 * The receipts this caller may see. Which ones that is comes from the server —
 * an admin's whole tenant, a collector's assigned areas, a subscriber's own —
 * so this list never filters anything itself.
 */
export function CollectionsList({ basePath, customerId, mineOnly = false, header }: {
  basePath: '/admin' | '/staff';
  customerId?: string;
  mineOnly?: boolean;
  /** Rendered above the takings, inside the same scroll — a dashboard, usually. */
  header?: React.ReactNode;
}) {
  const router = useRouter();
  const variables = {
    ...(customerId === undefined ? {} : { customerId }),
    ...(mineOnly ? { collectedBy: 'me' as const } : {}),
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

  if (isPending)
    return <Loading />;

  if (error)
    return <LoadError message={error.message} onRetry={refetch} />;

  const takings = totals === undefined
    ? null
    : (
        <Card className="mx-4 flex-row items-center justify-between border border-border p-4">
          <View>
            <Text className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Collected</Text>
            <Text className="text-2xl font-black text-foreground">{rupees(totals.totalCollected)}</Text>
          </View>
          <View className="items-end">
            <Text className="text-xs text-muted-foreground">{`${totals.receipts} receipts`}</Text>
            {Number(totals.accessoryAmount) !== 0 && (
              <Text className="text-xs text-muted-foreground">{`${rupees(totals.accessoryAmount)} accessories`}</Text>
            )}
          </View>
        </Card>
      );

  return (
    <View className="flex-1">
      <List
        data={items}
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
          <View className="gap-3 pb-3">
            {header}
            {takings}
          </View>
        )}
        refreshControl={(
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[600]} />
        )}
        ListEmptyComponent={(
          <View className="items-center p-10">
            <Text className="text-sm text-muted-foreground">No receipts yet.</Text>
          </View>
        )}
        ListFooterComponent={isFetchingNextPage
          ? <View className="p-4"><ActivityIndicator size="small" color={colors.primary[600]} /></View>
          : null}
      />
    </View>
  );
}

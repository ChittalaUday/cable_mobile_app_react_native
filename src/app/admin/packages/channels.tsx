import type { Channel, ChannelResolution } from '@/lib/api/types';
import { ArrowLeft01Icon, CheckmarkCircle02Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { TextInput } from 'react-native';

import { ResolutionBadge } from '@/components/common/resolution-badge';
import { SaveBar } from '@/components/common/save-bar';
import { Card, Loading } from '@/components/common/shell';
import { getChannelBrand } from '@/components/services/provider-brand-utils';
import {
  ActivityIndicator,
  colors,
  FocusAwareStatusBar,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { useChannels } from '@/lib/hooks/api/use-channels';
import { useDebounced } from '@/lib/hooks/common/use-debounced';
import { usePackageFormStore } from '@/lib/hooks/stores/use-package-form-store';

type FilterType = 'all' | 'selected' | ChannelResolution;

const RESOLUTIONS: ChannelResolution[] = ['SD', 'HD', '4K'];

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <View className="mt-8 items-center justify-center rounded-2xl border border-border bg-card px-4 py-12">
      <Text className="text-sm font-semibold text-foreground">{title}</Text>
      <Text className="mt-1 text-center text-xs text-muted-foreground">{message}</Text>
    </View>
  );
}

function ChannelRowItem({
  channel,
  isSelected,
  onToggle,
}: {
  channel: Channel;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const brand = getChannelBrand(channel.name);

  return (
    <Card className="border border-border p-3">
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected }}
        accessibilityLabel={channel.name}
        onPress={onToggle}
        className="flex-row items-center justify-between"
      >
        <View className="flex-1 flex-row items-center gap-3 pr-2">
          <View
            className={`size-5 items-center justify-center rounded-sm border ${
              isSelected ? 'border-primary-600 bg-primary-600' : 'border-border bg-card'
            }`}
          >
            {isSelected
              ? <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} color="#ffffff" strokeWidth={2.8} />
              : null}
          </View>

          {channel.logoUrl
            ? (
                <Image
                  source={{ uri: channel.logoUrl }}
                  className="size-10 rounded-md bg-card"
                  resizeMode="contain"
                />
              )
            : (
                <View
                  className="size-10 items-center justify-center rounded-md px-1"
                  style={{ backgroundColor: brand.bg }}
                >
                  <Text
                    className="text-center text-[10px] font-black"
                    style={{ color: brand.color }}
                    numberOfLines={1}
                  >
                    {brand.text}
                  </Text>
                </View>
              )}

          <View className="flex-1">
            <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
              {channel.name}
            </Text>
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {`#${channel.channelNumber} · ${channel.genre || 'General'}`}
            </Text>
          </View>
        </View>

        <ResolutionBadge resolution={channel.resolution} />
      </Pressable>
    </Card>
  );
}

// eslint-disable-next-line max-lines-per-function
export function PackageChannelsScreen() {
  const router = useRouter();
  const providerId = usePackageFormStore(s => s.providerId);
  const providerName = usePackageFormStore(s => s.providerName);
  const packageName = usePackageFormStore(s => s.packageName);
  const editingPackageId = usePackageFormStore(s => s.editingPackageId);
  const selectedChannelIds = usePackageFormStore(s => s.selectedChannelIds);
  const toggleChannel = usePackageFormStore(s => s.toggleChannel);

  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState<FilterType>('all');
  const debouncedSearch = useDebounced(search.trim());

  const hasProvider = Boolean(providerId);
  const isSelectedTab = filter === 'selected';

  /*
   * Every tab is a server-side query, paginated.
   *
   * "Selected" is `?packageId=…&inPackage=true`, so a bouquet of 800 channels
   * arrives a page at a time like any other list. This screen used to walk the
   * provider's whole lineup on mount, page by page, purely so it could filter
   * the result in memory.
   */
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useChannels({
    variables: {
      serviceProviderId: providerId,
      q: debouncedSearch || undefined,
      resolution: filter === 'all' || isSelectedTab ? undefined : filter,
      ...(isSelectedTab && editingPackageId
        ? { packageId: editingPackageId, inPackage: true }
        : {}),
    },
    // A package that was never saved has no server-side lineup to page through;
    // its selection is whatever has been ticked in this session.
    enabled: hasProvider && (!isSelectedTab || Boolean(editingPackageId)),
  });

  const loaded = React.useMemo(() => data?.pages.flatMap(page => page.items) ?? [], [data]);
  const total = data?.pages[0]?.total ?? 0;

  // Ticks made since the screen opened are not in the server's answer yet, so
  // the Selected tab drops anything unticked in the meantime.
  const channels = React.useMemo(
    () => (isSelectedTab ? loaded.filter(c => selectedChannelIds.includes(c.id)) : loaded),
    [loaded, isSelectedTab, selectedChannelIds],
  );

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <SafeAreaView edges={['top']} className="bg-surface">
        <View className="flex-row items-center gap-3 px-3 pt-1 pb-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            className="size-9 items-center justify-center rounded-lg border border-border bg-card"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={20} color={colors.charcoal[900]} strokeWidth={2.2} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-xl font-bold text-foreground">Package Channels</Text>
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {[providerName, packageName].filter(Boolean).join(' - ') || 'Select channels'}
            </Text>
          </View>
        </View>

        <View className="px-3 pb-3">
          <View className="flex-row items-center rounded-2xl border border-border bg-card px-3.5 py-2.5">
            <HugeiconsIcon icon={Search01Icon} size={18} color={colors.neutral[400]} strokeWidth={2} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search channels..."
              placeholderTextColor={colors.neutral[400]}
              className="ml-2.5 flex-1 py-0 text-sm text-foreground"
            />
            {search.length > 0
              ? (
                  <Pressable onPress={() => setSearch('')}>
                    <Text className="text-xs font-semibold text-primary-600">Clear</Text>
                  </Pressable>
                )
              : null}
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="pb-3"
          contentContainerClassName="px-3 gap-2"
        >
          {([
            { key: 'all' as const, label: filter === 'all' ? `All (${total})` : 'All' },
            { key: 'selected' as const, label: `Selected (${selectedChannelIds.length})` },
            ...RESOLUTIONS.map(resolution => ({ key: resolution, label: resolution })),
          ]).map(pill => (
            <Pressable
              key={pill.key}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === pill.key }}
              onPress={() => setFilter(pill.key)}
              className={`rounded-full px-4 py-1.5 ${
                filter === pill.key ? 'bg-primary-600' : 'border border-border bg-card'
              }`}
            >
              <Text className={`text-xs font-semibold ${filter === pill.key ? 'text-white' : 'text-foreground'}`}>
                {pill.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>

      <View className="flex-1 px-3">
        {!hasProvider
          ? (
              <EmptyState
                title="No provider chosen"
                message="Pick the provider on the package form first — a bouquet can only carry that provider's channels."
              />
            )
          : isLoading
            ? <Loading />
            : (
                <FlashList
                  data={channels}
                  keyExtractor={item => item.id}
                  // Selection lives outside `data`, so without this a recycled
                  // row keeps the checkbox of whatever channel it used to show.
                  extraData={selectedChannelIds}
                  renderItem={({ item }) => (
                    <ChannelRowItem
                      channel={item}
                      isSelected={selectedChannelIds.includes(item.id)}
                      onToggle={() => toggleChannel(item.id)}
                    />
                  )}
                  ItemSeparatorComponent={() => <View className="h-2.5" />}
                  contentContainerStyle={{ paddingTop: 4, paddingBottom: 24 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  onEndReachedThreshold={0.6}
                  onEndReached={() => {
                    if (hasNextPage && !isFetchingNextPage)
                      fetchNextPage();
                  }}
                  ListFooterComponent={
                    isFetchingNextPage
                      ? <ActivityIndicator className="py-4" color={colors.primary[500]} />
                      : null
                  }
                  ListEmptyComponent={(
                    <EmptyState
                      title={isSelectedTab ? 'Nothing selected yet' : 'No channels found'}
                      message={
                        isSelectedTab
                          ? 'Tap a channel on the All tab to add it to this package.'
                          : debouncedSearch
                            ? 'No channels match your search.'
                            : `This provider has no ${filter === 'all' ? '' : `${filter} `}channels.`
                      }
                    />
                  )}
                />
              )}
      </View>

      <SaveBar
        label={`Save Channels (${selectedChannelIds.length})`}
        onPress={() => router.back()}
      />
    </View>
  );
}

export default PackageChannelsScreen;

import {
  ArrowLeft01Icon,
  RefreshIcon,
  Search01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { RefreshControl, TextInput } from 'react-native';

import { ResolutionBadge } from '@/components/common/resolution-badge';
import { Card, Loading } from '@/components/common/shell';
import {
  ActivityIndicator,
  colors,
  FocusAwareStatusBar,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { useChannels } from '@/lib/hooks/api/use-channels';
import { useDebounced } from '@/lib/hooks/common/use-debounced';

/** Adds anything new to a sorted option list, or returns it untouched. */
function merge(current: string[], incoming: string[]): string[] {
  const next = new Set(current);
  for (const value of incoming) {
    if (value)
      next.add(value);
  }
  return next.size === current.length ? current : [...next].sort();
}

// eslint-disable-next-line max-lines-per-function
export function ChannelsScreen() {
  const router = useRouter();
  const [search, setSearch] = React.useState('');
  const [selectedGenre, setSelectedGenre] = React.useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = React.useState<string | null>(null);

  // Search runs on the server: the lineup is paged, so filtering only what is
  // already loaded would quietly miss every channel past the first page.
  // Debounced, because the term is part of the query key.
  const debouncedSearch = useDebounced(search.trim());

  const {
    data: channelsData,
    isPending: channelsLoading,
    refetch: refetchChannels,
    isRefetching: channelsRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useChannels({
    variables: {
      q: debouncedSearch || undefined,
      genre: selectedGenre ?? undefined,
    },
  });

  const allChannels = React.useMemo(
    () => channelsData?.pages.flatMap(p => p.items) ?? [],
    [channelsData],
  );

  const totalChannels = channelsData?.pages[channelsData.pages.length - 1]?.total ?? allChannels.length;

  // The filter pills are built from what has been loaded, and the API now
  // returns only the chosen genre — so the options are accumulated rather than
  // recomputed, or picking a genre would leave a single pill to pick from.
  const [genres, setGenres] = React.useState<string[]>([]);
  const [languages, setLanguages] = React.useState<string[]>([]);

  React.useEffect(() => {
    setGenres(prev => merge(prev, allChannels.map(c => c.genre)));
    setLanguages(prev => merge(prev, allChannels.flatMap(c => c.languages ?? [])));
  }, [allChannels]);

  // `q` and `genre` are already applied by the API; language is not a server
  // filter, so it is the only one left to apply here.
  const filteredChannels = React.useMemo(() => {
    if (!selectedLanguage)
      return allChannels;
    return allChannels.filter(c =>
      c.languages?.some(l => l.toLowerCase() === selectedLanguage.toLowerCase()),
    );
  }, [allChannels, selectedLanguage]);

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <SafeAreaView edges={['top']} className="bg-surface">
        <View className="flex-row items-center justify-between px-3 pt-1 pb-2">
          <View className="flex-row items-center gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={() => router.back()}
              className="size-9 items-center justify-center rounded-lg border border-border bg-card"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={20} color={colors.charcoal[900]} strokeWidth={2.2} />
            </Pressable>
            <View>
              <Text className="text-[17px] font-bold text-foreground">Channel Lineup</Text>
              <Text className="text-[11px] text-muted-foreground">
                {totalChannels}
                {' '}
                Available Channels
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh"
            onPress={() => refetchChannels()}
            className="size-9 items-center justify-center rounded-lg border border-border bg-card"
          >
            <HugeiconsIcon icon={RefreshIcon} size={18} color={colors.neutral[600]} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Search Input */}
        <View className="px-3 pb-2">
          <View className="flex-row items-center rounded-xl border border-border bg-card px-3 py-2">
            <HugeiconsIcon icon={Search01Icon} size={16} color={colors.neutral[400]} strokeWidth={2} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search channels by name, number, broadcaster..."
              placeholderTextColor={colors.neutral[400]}
              className="ml-2 flex-1 py-0 text-sm text-foreground"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <Text className="text-xs font-semibold text-primary-600">Clear</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Genre Filter Chips */}
        {genres.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="pb-1.5"
            contentContainerClassName="px-3 gap-1.5"
          >
            <Pressable
              onPress={() => setSelectedGenre(null)}
              className={`rounded-full px-2.5 py-1 ${
                selectedGenre === null ? 'bg-primary-600' : 'border border-border bg-card'
              }`}
            >
              <Text className={`text-[11px] font-semibold ${selectedGenre === null ? 'text-white' : 'text-foreground'}`}>
                All Genres
              </Text>
            </Pressable>
            {genres.map(g => (
              <Pressable
                key={g}
                onPress={() => setSelectedGenre(selectedGenre === g ? null : g)}
                className={`rounded-full px-2.5 py-1 ${
                  selectedGenre === g ? 'bg-primary-600' : 'border border-border bg-card'
                }`}
              >
                <Text className={`text-[11px] font-semibold ${selectedGenre === g ? 'text-white' : 'text-foreground'}`}>
                  {g}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Language Filter Chips */}
        {languages.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="pb-2.5"
            contentContainerClassName="px-3 gap-1.5"
          >
            <Pressable
              onPress={() => setSelectedLanguage(null)}
              className={`rounded-full px-2.5 py-1 ${
                selectedLanguage === null ? 'bg-neutral-800 dark:bg-neutral-200' : 'border border-border bg-card'
              }`}
            >
              <Text
                className={`text-[11px] font-semibold ${
                  selectedLanguage === null ? 'text-white dark:text-neutral-900' : 'text-foreground'
                }`}
              >
                All Languages
              </Text>
            </Pressable>
            {languages.map(l => (
              <Pressable
                key={l}
                onPress={() => setSelectedLanguage(selectedLanguage === l ? null : l)}
                className={`rounded-full px-2.5 py-1 ${
                  selectedLanguage === l ? 'bg-neutral-800 dark:bg-neutral-200' : 'border border-border bg-card'
                }`}
              >
                <Text
                  className={`text-[11px] font-semibold ${
                    selectedLanguage === l ? 'text-white dark:text-neutral-900' : 'text-foreground'
                  }`}
                >
                  {l}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View className="flex-row items-center justify-between border-b border-border px-3 pb-2">
          <Text className="text-xs font-semibold text-muted-foreground">
            Showing
            {' '}
            {filteredChannels.length}
            {' '}
            of
            {' '}
            {totalChannels}
            {' '}
            channels
          </Text>
        </View>
      </SafeAreaView>

      {channelsLoading
        ? (
            <Loading />
          )
        : filteredChannels.length === 0
          ? (
              <View className="flex-1 items-center justify-center px-4">
                <Text className="text-sm font-semibold text-foreground">No Channels Found</Text>
                <Text className="mt-1 text-center text-xs text-muted-foreground">
                  No channels match your current search and filter settings.
                </Text>
              </View>
            )
          : (
              <FlashList
                data={filteredChannels}
                keyExtractor={c => c.id}
                contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 40 }}
                ItemSeparatorComponent={() => <View className="h-2.5" />}
                showsVerticalScrollIndicator={false}
                refreshControl={(
                  <RefreshControl
                    refreshing={channelsRefetching}
                    onRefresh={() => refetchChannels()}
                    tintColor={colors.primary[600]}
                  />
                )}
                onEndReached={() => {
                  if (hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                  }
                }}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                  isFetchingNextPage
                    ? (
                        <ActivityIndicator className="py-4" />
                      )
                    : hasNextPage
                      ? (
                          <Pressable onPress={() => fetchNextPage()} className="items-center py-4">
                            <Text className="text-xs font-semibold text-primary-600">Load more channels</Text>
                          </Pressable>
                        )
                      : null
                }
                renderItem={({ item: c }) => (
                  <Card className="border border-border p-3">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 flex-row items-center gap-2.5 pr-2">
                        <View className="size-9 items-center justify-center rounded-lg border border-border bg-surface">
                          <Text className="text-xs font-bold text-primary-600">
                            #
                            {c.channelNumber}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
                            {c.name}
                          </Text>
                          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                            {c.genre}
                            {c.languages && c.languages.length > 0 ? ` • ${c.languages.join(', ')}` : ''}
                          </Text>
                        </View>
                      </View>
                      <View className="items-end gap-1">
                        <ResolutionBadge resolution={c.resolution} size="sm" />
                        <Text className="text-xs font-bold text-foreground">
                          {c.isFta ? 'FTA' : `₹${c.price}`}
                        </Text>
                      </View>
                    </View>
                  </Card>
                )}
              />
            )}
    </View>
  );
}

export default ChannelsScreen;

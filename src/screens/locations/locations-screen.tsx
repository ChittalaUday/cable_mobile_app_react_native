import type { FlashListRef } from '@shopify/flash-list';
import type { LocationAction } from './location-actions-sheet';
import type { Location } from '@/lib/api/types';
import {
  Add01Icon,
  ArrowLeft01Icon,
  FolderMinusIcon,
  Search01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Alert, RefreshControl, TextInput } from 'react-native';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Card, Loading } from '@/components/common/shell';
import {
  colors,
  FocusAwareStatusBar,
  Pressable,
  SafeAreaView,
  Text,
  useModal,
  View,
} from '@/components/ui';
import { MAX_PAGE_SIZE } from '@/lib/api/types';
import {
  useDeleteLocation,
  useLocationCategories,
  useLocations,
  useUpdateLocation,
} from '@/lib/hooks/api/use-locations';
import { useDebounced } from '@/lib/hooks/common/use-debounced';
import { LocationActionsSheet } from './location-actions-sheet';
import { LoadMoreRow, LocationRow, useTreeExpansion } from './location-tree';
import { useLocationTree } from './use-location-tree';

/** How long a revealed row stays picked out before it settles back in. */
const HIGHLIGHT_MS = 4000;

/**
 * The location hierarchy, as a hierarchy.
 *
 * A flat list could not show that Block C sits inside Sri Sai Apartments, which
 * is the thing that makes coverage readable — a row covers its node and
 * everything under it. The tree is still rendered *as* one flat virtualised
 * list, so a tenant with thousands of doors scrolls and pages like any other
 * screen. Searching drops to a flat result set, because a match five levels
 * down has no useful tree to sit in.
 */
// eslint-disable-next-line max-lines-per-function
export function LocationsScreen() {
  const router = useRouter();
  const sheet = useModal();

  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebounced(search.trim());
  const [target, setTarget] = React.useState<Location | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<Location | null>(null);
  const [revealing, setRevealing] = React.useState<string | null>(null);
  // Held after the scroll so the row is obvious among its siblings, then
  // dropped — a permanent highlight becomes another thing to clear by hand.
  const [highlighted, setHighlighted] = React.useState<string | null>(null);

  const { expanded, expand, toggle, collapse, collapseMany, collapseAll } = useTreeExpansion();
  const tree = useLocationTree(expanded);

  /**
   * The open nodes furthest down the tree.
   *
   * The header button closes exactly these, so each tap peels one level off
   * the bottom rather than throwing away everything the operator opened to get
   * there. Long-pressing it still collapses the lot.
   */
  const deepestOpen = React.useMemo(() => {
    let deepest = -1;
    let ids: string[] = [];

    for (const row of tree.rows) {
      if (row.kind !== 'node' || !expanded.has(row.node.id))
        continue;

      if (row.depth > deepest) {
        deepest = row.depth;
        ids = [];
      }
      if (row.depth === deepest)
        ids.push(row.node.id);
    }

    return ids;
  }, [tree.rows, expanded]);

  // Closing a group from a row deep inside it leaves the viewport pointing at
  // rows that no longer exist, so the list is sent back to the group header.
  const listRef = React.useRef<FlashListRef<typeof tree.rows[number]> | null>(null);
  const [scrollTo, setScrollTo] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!scrollTo)
      return;

    const index = tree.rows.findIndex(row => row.key === scrollTo);
    if (index < 0)
      return;

    listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.35 });
    setScrollTo(null);
  }, [scrollTo, tree.rows]);

  React.useEffect(() => {
    if (!highlighted)
      return;

    const timer = setTimeout(() => setHighlighted(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [highlighted]);

  /**
   * Open the tree onto a search hit rather than just listing it.
   *
   * Loading the ancestors' pages, expanding them, leaving search, and scrolling
   * are one action from the operator's side — they tapped a result expecting to
   * land on it.
   */
  const revealInTree = React.useCallback(async (location: Location) => {
    setRevealing(location.id);
    try {
      const ancestors = await tree.reveal(location.id);
      expand(ancestors);
      setSearch('');
      setHighlighted(location.id);
      setScrollTo(location.id);
    }
    catch (err) {
      Alert.alert('Could not open that location', (err as Error).message);
    }
    finally {
      setRevealing(null);
    }
  }, [tree, expand]);

  const { data: categories = [] } = useLocationCategories();
  const categoryName = React.useCallback(
    (id: string) => categories.find(c => c.id === id)?.name,
    [categories],
  );

  // Search is server-side and flat: `q` matches names and aliases at any depth.
  const { data: matches, isLoading: searching } = useLocations({
    variables: { q: debouncedSearch, limit: MAX_PAGE_SIZE },
    enabled: debouncedSearch.length > 0,
  });

  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();

  const openMenu = React.useCallback((location: Location) => {
    setTarget(location);
    sheet.present();
  }, [sheet]);

  const onAction = async (action: LocationAction) => {
    const node = target;
    sheet.dismiss();
    if (!node)
      return;

    switch (action) {
      case 'collapse':
        collapse(node.id);
        setScrollTo(node.id);
        return;

      case 'collapse-parent':
        if (node.parentId) {
          collapse(node.parentId);
          setScrollTo(node.parentId);
        }
        return;

      case 'add-child':
        router.push(`/add-location?parentId=${node.id}`);
        return;

      case 'edit':
        router.push(`/add-location?id=${node.id}`);
        return;

      case 'delete':
        setPendingDelete(node);
        return;

      case 'toggle-active':
        try {
          await updateLocation.mutateAsync({ id: node.id, patch: { isActive: !node.isActive } });
          await tree.refresh();
        }
        catch (err) {
          Alert.alert('Could not update location', (err as Error).message);
        }
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete)
      return;

    try {
      await deleteLocation.mutateAsync({ id: pendingDelete.id });
      setPendingDelete(null);
      await tree.refresh();
    }
    catch (err) {
      setPendingDelete(null);
      Alert.alert('Could not delete location', (err as Error).message);
    }
  };

  const isSearching = debouncedSearch.length > 0;

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />

      <LocationActionsSheet
        ref={sheet.ref}
        location={target}
        isExpanded={target ? expanded.has(target.id) : false}
        hasParent={Boolean(target?.parentId)}
        onSelect={onAction}
      />

      <ConfirmDialog
        visible={pendingDelete !== null}
        busy={deleteLocation.isPending}
        title="Delete location"
        message={`Delete ${pendingDelete?.name ?? ''}? Coverage rules that point at it go with it.`}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <SafeAreaView edges={['top']} className="bg-surface">
        <View className="flex-row items-center justify-between px-3 pt-1 pb-2">
          <View className="flex-1 flex-row items-center gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={() => router.back()}
              className="size-9 items-center justify-center rounded-lg border border-border bg-card"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={20} color={colors.charcoal[900]} strokeWidth={2.2} />
            </Pressable>
            <View>
              <Text className="text-[17px] font-bold text-foreground">Locations</Text>
              <Text className="text-[11px] text-muted-foreground">Manage areas and sub-areas</Text>
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close the deepest open level"
              accessibilityHint="Long press to close every group"
              disabled={deepestOpen.length === 0}
              onPress={() => collapseMany(deepestOpen)}
              onLongPress={collapseAll}
              className={`size-9 items-center justify-center rounded-lg border border-border bg-card ${
                deepestOpen.length === 0 ? 'opacity-40' : ''
              }`}
            >
              <HugeiconsIcon icon={FolderMinusIcon} size={18} color={colors.neutral[600]} strokeWidth={2} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add location"
              onPress={() => router.push('/add-location')}
              className="size-9 items-center justify-center rounded-full bg-primary-600 active:bg-primary-700"
            >
              <HugeiconsIcon icon={Add01Icon} size={20} color="#ffffff" strokeWidth={2.4} />
            </Pressable>
          </View>
        </View>

        <View className="px-3 pb-2">
          <View className="flex-row items-center rounded-xl border border-border bg-card px-3 py-2">
            <HugeiconsIcon icon={Search01Icon} size={16} color={colors.neutral[400]} strokeWidth={2} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search anywhere in the tree..."
              placeholderTextColor={colors.neutral[400]}
              className="ml-2 flex-1 py-0 text-sm text-foreground"
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
      </SafeAreaView>

      {isSearching
        ? (
            <FlashList
              data={matches?.items ?? []}
              keyExtractor={loc => loc.id}
              contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 4, paddingBottom: 40 }}
              ItemSeparatorComponent={() => <View className="h-2" />}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <Card className="border border-border px-2 py-1">
                  <LocationRow
                    node={item}
                    depth={0}
                    // A hit has none of its parents above it here, so tapping
                    // the row opens the tree on it — whether or not it is a
                    // branch — while the ⋮ still opens its actions.
                    isOpen={false}
                    busy={revealing === item.id}
                    onPress={() => revealInTree(item)}
                    onToggle={() => revealInTree(item)}
                    onMenu={openMenu}
                    categoryName={categoryName}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Show ${item.name} in the tree`}
                    onPress={() => revealInTree(item)}
                    className="flex-row items-center justify-between px-2 pb-1.5"
                  >
                    <Text className="flex-1 pr-2 text-[11px] text-muted-foreground" numberOfLines={1}>
                      {item.path}
                    </Text>
                    <Text className="text-[11px] font-semibold text-primary-600">Show in tree</Text>
                  </Pressable>
                </Card>
              )}
              ListEmptyComponent={
                searching
                  ? <Loading />
                  : (
                      <View className="items-center justify-center rounded-2xl border border-border bg-card px-4 py-12">
                        <Text className="text-sm font-semibold text-foreground">No locations found</Text>
                        <Text className="mt-1 text-center text-xs text-muted-foreground">
                          Nothing in the tree matches that name or alias.
                        </Text>
                      </View>
                    )
              }
            />
          )
        : tree.isLoading
          ? <Loading />
          : (
              <FlashList
                ref={listRef}
                data={tree.rows}
                keyExtractor={row => row.key}
                getItemType={row => row.kind}
                extraData={`${expanded.size}:${highlighted ?? ''}`}
                contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 4, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                // Pages the deepest level that still has rows behind it, so a
                // group of 4 000 doors keeps filling in as you scroll.
                onEndReachedThreshold={0.6}
                onEndReached={tree.onEndReached}
                refreshControl={(
                  <RefreshControl
                    refreshing={tree.refreshing}
                    onRefresh={tree.refresh}
                    tintColor={colors.primary[600]}
                  />
                )}
                renderItem={({ item }) => (item.kind === 'more'
                  ? <LoadMoreRow row={item} onPress={() => tree.loadMore(item.parentKey)} />
                  : (
                      <LocationRow
                        node={item.node}
                        depth={item.depth}
                        isOpen={expanded.has(item.node.id)}
                        isGroupEnd={item.isGroupEnd}
                        isHighlighted={highlighted === item.node.id}
                        onToggle={toggle}
                        onMenu={openMenu}
                        categoryName={categoryName}
                      />
                    ))}
                ListEmptyComponent={(
                  <View className="items-center justify-center rounded-2xl border border-border bg-card px-4 py-12">
                    <Text className="text-sm font-semibold text-foreground">No locations yet</Text>
                    <Text className="mt-1 text-center text-xs text-muted-foreground">
                      Tap + to add the first area of your network.
                    </Text>
                  </View>
                )}
              />
            )}
    </View>
  );
}

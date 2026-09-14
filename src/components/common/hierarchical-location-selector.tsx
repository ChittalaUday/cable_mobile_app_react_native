import type { Location, LocationCategory } from '@/lib/api/types';
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Folder01Icon,
  Home01Icon,
  Location01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { ActivityIndicator, colors, Pressable, Text, View } from '@/components/ui';
import {
  useLocationCategories,
  useLocationLevel,
  useLocations,
} from '@/lib/hooks/api/use-locations';

export type HierarchicalLocationSelectorProps = {
  /**
   * Currently selected location ID, if any.
   */
  selectedLocationId?: string;

  /**
   * Callback fired when a location is selected or cleared.
   */
  onSelectLocation: (location: Location | null) => void;

  /**
   * Custom label above the selector.
   * If null, no label is rendered.
   * If undefined, defaults to localized "Location".
   */
  label?: string | null;

  /**
   * Placeholder shown on the trigger button when nothing is selected.
   * If undefined, defaults to allOptionLabel or localized "All Locations".
   */
  placeholder?: string;

  /**
   * Whether to display the "All Locations" / root clear option inside the picker dropdown.
   * Defaults to true (ideal for filters). Set to false when picking a specific location in a form.
   */
  showAllOption?: boolean;

  /**
   * Label for the "All Locations" option.
   * Defaults to localized "All Locations".
   */
  allOptionLabel?: string;

  /**
   * Whether to allow clearing the selected value via a clear (X) icon on the trigger card.
   * Defaults to true.
   */
  allowClear?: boolean;

  /**
   * Whether only leaf locations (nodes without children) can be selected.
   * If true, clicking a node with children only drills down and parent selection banners are hidden.
   * Defaults to false.
   */
  leafOnly?: boolean;

  /**
   * Optional custom accessibility label for the trigger button.
   */
  accessibilityLabel?: string;

  /**
   * Optional container className.
   */
  className?: string;

  /**
   * Optional trigger button className.
   */
  triggerClassName?: string;
};

/**
 * Breadcrumbs bar allowing the user to navigate back to any ancestor level.
 */
export function LocationBreadcrumb({
  trail,
  onJump,
}: {
  trail: Location[];
  onJump: (next: Location[]) => void;
}) {
  const { t } = useTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="border-b border-border/70 pb-2"
      contentContainerClassName="items-center gap-1.5 px-1 py-1"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Top level"
        onPress={() => onJump([])}
        className={`flex-row items-center gap-1 rounded-lg px-2.5 py-1 ${
          trail.length === 0 ? 'dark:bg-primary-950/40 bg-primary-50' : 'bg-muted/50 active:bg-muted'
        }`}
      >
        <HugeiconsIcon
          icon={Home01Icon}
          size={13}
          color={trail.length === 0 ? colors.primary[600] : colors.neutral[600]}
          strokeWidth={2}
        />
        <Text
          className={`text-xs ${
            trail.length === 0 ? 'font-bold text-primary-600 dark:text-primary-400' : 'font-medium text-foreground'
          }`}
        >
          {t('customers_list.top_level')}
        </Text>
      </Pressable>

      {trail.map((step, index) => {
        const isCurrent = index === trail.length - 1;
        return (
          <View key={step.id} className="flex-row items-center gap-1.5">
            <HugeiconsIcon icon={ArrowRight01Icon} size={12} color={colors.neutral[400]} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={step.name}
              onPress={() => onJump(trail.slice(0, index + 1))}
              className={`max-w-[140px] rounded-lg px-2.5 py-1 ${
                isCurrent ? 'dark:bg-primary-950/40 bg-primary-50' : 'bg-muted/50 active:bg-muted'
              }`}
            >
              <Text
                className={`text-xs ${
                  isCurrent ? 'font-bold text-primary-600 dark:text-primary-400' : 'font-medium text-foreground'
                }`}
                numberOfLines={1}
              >
                {step.name}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

// eslint-disable-next-line max-lines-per-function
export function HierarchicalLocationSelector({
  selectedLocationId,
  onSelectLocation,
  label,
  placeholder,
  showAllOption = true,
  allOptionLabel,
  allowClear = true,
  leafOnly = false,
  accessibilityLabel,
  className,
  triggerClassName,
}: HierarchicalLocationSelectorProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const [trail, setTrail] = React.useState<Location[]>([]);
  const [pickedLocation, setPickedLocation] = React.useState<Location | null>(null);

  const currentParent = trail.at(-1) ?? null;

  const { data: locationsPage } = useLocations();
  const { data: categories = [] } = useLocationCategories();
  const {
    data: levelData,
    isLoading: isLevelLoading,
  } = useLocationLevel({
    variables: { parentId: currentParent?.id ?? null },
  });

  const categoriesMap = React.useMemo(() => {
    const map = new Map<string, LocationCategory>();
    for (const cat of categories) {
      map.set(cat.id, cat);
    }
    return map;
  }, [categories]);

  const locationsList = React.useMemo(() => locationsPage?.items ?? [], [locationsPage?.items]);

  React.useEffect(() => {
    if (!selectedLocationId) {
      setPickedLocation(null);
    }
  }, [selectedLocationId]);

  // Current level locations from useLocationLevel with fallback to useLocations
  const currentItems = React.useMemo(() => {
    const levelItems = levelData?.pages.flatMap(p => p.items) ?? [];
    if (levelItems.length > 0)
      return levelItems;

    if (!currentParent) {
      return locationsList.filter(loc => !loc.parentId || loc.parentId === 'null' || loc.depth === 0);
    }
    return locationsList.filter(loc => loc.parentId === currentParent.id);
  }, [levelData?.pages, currentParent, locationsList]);

  // Find the selected location object for the trigger display
  const selectedLocation = React.useMemo(() => {
    if (!selectedLocationId)
      return null;
    if (pickedLocation && pickedLocation.id === selectedLocationId)
      return pickedLocation;
    return locationsList.find(loc => loc.id === selectedLocationId) ?? null;
  }, [selectedLocationId, pickedLocation, locationsList]);

  const handleSelect = (loc: Location | null) => {
    setPickedLocation(loc);
    onSelectLocation(loc);
    setIsOpen(false);
  };

  const handleClear = (e?: { stopPropagation?: () => void }) => {
    e?.stopPropagation?.();
    setPickedLocation(null);
    onSelectLocation(null);
  };

  const defaultAllText = allOptionLabel ?? t('customers_list.all_locations');
  const triggerPlaceholder = placeholder ?? defaultAllText;
  const labelText = label === undefined ? t('customers_list.filter_location') : label;

  const selectedCategoryName = selectedLocation?.categoryId
    ? categoriesMap.get(selectedLocation.categoryId)?.name
    : null;

  const selectedLocationPath = selectedLocation?.path || selectedLocation?.name;

  return (
    <View className={`gap-2 ${className ?? ''}`}>
      {labelText !== null
        ? (
            <Text className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
              {labelText}
            </Text>
          )
        : null}

      {/* Main Trigger Card */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? 'Select Location'}
        onPress={() => setIsOpen(!isOpen)}
        className={`flex-row items-center justify-between rounded-xl border border-border bg-surface p-3 active:bg-muted/30 ${triggerClassName ?? ''}`}
      >
        <View className="flex-1 flex-row items-center gap-2.5">
          <View className="dark:bg-primary-950/50 size-7 items-center justify-center rounded-lg bg-primary-50">
            <HugeiconsIcon icon={Location01Icon} size={16} color={colors.primary[500]} strokeWidth={2.2} />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-bold text-foreground" numberOfLines={1}>
              {selectedLocation ? selectedLocation.name : triggerPlaceholder}
            </Text>
            {selectedLocation
              ? (
                  <View className="mt-0.5 flex-row items-center gap-1">
                    <Text className="text-[10px] font-semibold text-primary-600 dark:text-primary-400" numberOfLines={1}>
                      {selectedLocationPath}
                    </Text>
                    {selectedCategoryName
                      ? (
                          <Text className="text-[10px] text-muted-foreground" numberOfLines={1}>
                            ·
                            {' '}
                            {selectedCategoryName}
                          </Text>
                        )
                      : null}
                  </View>
                )
              : null}
          </View>
        </View>

        <View className="flex-row items-center gap-1.5">
          {selectedLocationId && allowClear
            ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear Location Filter"
                  hitSlop={8}
                  onPress={handleClear}
                  className="size-6 items-center justify-center rounded-full bg-muted/80 active:bg-muted"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={13} color={colors.neutral[600]} strokeWidth={2} />
                </Pressable>
              )
            : null}
          <HugeiconsIcon
            icon={isOpen ? ArrowUp01Icon : ArrowDown01Icon}
            size={16}
            color={colors.neutral[500]}
          />
        </View>
      </Pressable>

      {/* Hierarchical Picker Body */}
      {isOpen
        ? (
            <View className="gap-3 rounded-2xl border border-border bg-card p-3">
              {/* Breadcrumbs Navigation */}
              <LocationBreadcrumb trail={trail} onJump={setTrail} />

              {/* Top Level / Parent Selection Banner */}
              {currentParent === null && showAllOption
                ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Location Option: ${defaultAllText}`}
                      onPress={() => handleSelect(null)}
                      className={`flex-row items-center justify-between rounded-xl border p-2.5 ${
                        !selectedLocationId
                          ? 'dark:bg-primary-950/40 border-primary-500/50 bg-primary-50'
                          : 'border-border/60 bg-surface active:bg-muted/40'
                      }`}
                    >
                      <View className="flex-row items-center gap-2">
                        <HugeiconsIcon icon={Location01Icon} size={15} color={colors.primary[500]} />
                        <Text className={`text-xs ${!selectedLocationId ? 'font-extrabold text-primary-600 dark:text-primary-400' : 'font-medium text-foreground'}`}>
                          {defaultAllText}
                        </Text>
                      </View>
                      {!selectedLocationId
                        ? (
                            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} color={colors.primary[500]} strokeWidth={2.4} />
                          )
                        : null}
                    </Pressable>
                  )
                : currentParent !== null && !leafOnly
                  ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Location Option: ${currentParent.name}`}
                        onPress={() => handleSelect(currentParent)}
                        className={`flex-row items-center justify-between rounded-xl border p-2.5 ${
                          selectedLocationId === currentParent.id
                            ? 'dark:bg-primary-950/40 border-primary-500/50 bg-primary-50'
                            : 'border-border/60 bg-surface active:bg-muted/40'
                        }`}
                      >
                        <View className="flex-1 pr-2">
                          <Text className={`text-xs ${selectedLocationId === currentParent.id ? 'font-extrabold text-primary-600 dark:text-primary-400' : 'font-bold text-foreground'}`} numberOfLines={1}>
                            {t('customers_list.select_entire_location', { name: currentParent.name })}
                          </Text>
                          <Text className="text-[10px] text-muted-foreground" numberOfLines={1}>
                            {currentParent.path ? `${currentParent.path} · ` : ''}
                            {currentParent.childCount > 0
                              ? t('customers_list.inside_count', { count: currentParent.childCount })
                              : t('customers_list.leaf_location')}
                          </Text>
                        </View>
                        {selectedLocationId === currentParent.id
                          ? (
                              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} color={colors.primary[500]} strokeWidth={2.4} />
                            )
                          : null}
                      </Pressable>
                    )
                  : null}

              {/* Items in Current Level */}
              <View className="max-h-56">
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator contentContainerClassName="gap-1.5 pb-1">
                  {isLevelLoading && currentItems.length === 0
                    ? (
                        <View className="items-center justify-center py-6">
                          <ActivityIndicator size="small" color={colors.primary[500]} />
                        </View>
                      )
                    : currentItems.length === 0
                      ? (
                          <Text className="py-4 text-center text-xs text-muted-foreground">
                            {currentParent
                              ? `Nothing inside ${currentParent.name} yet.`
                              : t('customers_list.no_customers_desc')}
                          </Text>
                        )
                      : (
                          currentItems.map((loc) => {
                            const isSelected = selectedLocationId === loc.id;
                            const hasChildren = (loc.childCount ?? 0) > 0;
                            const categoryName = loc.categoryId ? categoriesMap.get(loc.categoryId)?.name : null;

                            return (
                              <View
                                key={loc.id}
                                className={`flex-row items-center justify-between rounded-xl border p-2.5 ${
                                  isSelected
                                    ? 'dark:bg-primary-950/40 border-primary-500/50 bg-primary-50'
                                    : 'border-border/60 bg-surface'
                                }`}
                              >
                                <Pressable
                                  accessibilityRole="button"
                                  accessibilityLabel={`Location Option: ${loc.name}`}
                                  onPress={() => (hasChildren ? setTrail([...trail, loc]) : handleSelect(loc))}
                                  className="flex-1 flex-row items-center gap-2.5 pr-2"
                                >
                                  <View className="size-7 items-center justify-center rounded-lg bg-muted/60">
                                    <HugeiconsIcon
                                      icon={hasChildren ? Folder01Icon : Location01Icon}
                                      size={15}
                                      color={hasChildren ? colors.neutral[600] : colors.primary[600]}
                                      strokeWidth={2}
                                    />
                                  </View>
                                  <View className="flex-1">
                                    <Text
                                      className={`text-xs ${
                                        isSelected ? 'font-extrabold text-primary-600 dark:text-primary-400' : 'font-semibold text-foreground'
                                      }`}
                                      numberOfLines={1}
                                    >
                                      {loc.name}
                                    </Text>
                                    <Text className="text-[10px] text-muted-foreground" numberOfLines={1}>
                                      {loc.path && loc.path !== loc.name ? `${loc.path} · ` : ''}
                                      {categoryName ? `${categoryName} · ` : ''}
                                      {hasChildren
                                        ? t('customers_list.inside_count', { count: loc.childCount })
                                        : t('customers_list.leaf_location')}
                                      {loc.code ? ` · ${loc.code}` : ''}
                                    </Text>
                                  </View>
                                </Pressable>

                                {hasChildren
                                  ? (
                                      <View className="flex-row items-center gap-1.5">
                                        {!leafOnly
                                          ? (
                                              <Pressable
                                                accessibilityRole="button"
                                                accessibilityLabel={`Select ${loc.name}`}
                                                onPress={() => handleSelect(loc)}
                                                className={`rounded-lg border px-2 py-1 ${
                                                  isSelected
                                                    ? 'border-primary-500 bg-primary-500'
                                                    : 'border-border bg-card active:bg-muted'
                                                }`}
                                              >
                                                <Text className={`text-[10px] font-bold ${isSelected ? 'text-white' : 'text-foreground'}`}>
                                                  Select
                                                </Text>
                                              </Pressable>
                                            )
                                          : null}
                                        <Pressable
                                          accessibilityRole="button"
                                          accessibilityLabel={`Open ${loc.name}`}
                                          onPress={() => setTrail([...trail, loc])}
                                          className="size-7 items-center justify-center rounded-lg bg-muted/50 active:bg-muted"
                                        >
                                          <HugeiconsIcon icon={ArrowRight01Icon} size={14} color={colors.neutral[500]} />
                                        </Pressable>
                                      </View>
                                    )
                                  : (
                                      <Pressable
                                        accessibilityRole="button"
                                        accessibilityLabel={`Select ${loc.name}`}
                                        onPress={() => handleSelect(loc)}
                                      >
                                        {isSelected
                                          ? (
                                              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} color={colors.primary[500]} strokeWidth={2.4} />
                                            )
                                          : null}
                                      </Pressable>
                                    )}
                              </View>
                            );
                          })
                        )}
                </ScrollView>
              </View>
            </View>
          )
        : null}
    </View>
  );
}

// Convenient alias for backward-compatibility and filter-oriented usages
export const HierarchicalLocationFilter = HierarchicalLocationSelector;
export type HierarchicalLocationFilterProps = HierarchicalLocationSelectorProps;

import type { ServiceProvider } from '@/lib/api/types';
import {
  Add01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Layers01Icon,
  Search01Icon,
  Tv01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { RefreshControl, TextInput } from 'react-native';

import { Card, Loading } from '@/components/common/shell';
import { getProviderBrand } from '@/components/services/provider-brand-utils';
import {
  colors,
  FocusAwareStatusBar,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { useServiceProviders } from '@/lib/hooks/api/use-service-providers';
import { useServices } from '@/lib/hooks/api/use-services';
import { serviceIcon } from '@/lib/service-icons';

function ProviderItemCard({
  prov,
  onPress,
}: {
  prov: ServiceProvider;
  onPress: () => void;
}) {
  const brand = getProviderBrand(prov.name, prov.serviceIcon);
  const packageCount = prov.packageCount ?? 0;

  return (
    <Card className="border border-border p-3.5">
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        className="flex-row items-center justify-between"
      >
        <View className="flex-1 flex-row items-center gap-3 pr-2">
          {/* Brand circular logo/avatar */}
          <View
            className="size-12 items-center justify-center rounded-full"
            style={{ backgroundColor: brand.bg }}
          >
            {brand.isLogo
              ? (
                  <Text className="text-center text-[10px]/3 font-black text-white">
                    {brand.text}
                  </Text>
                )
              : (
                  <HugeiconsIcon icon={brand.icon ?? Tv01Icon} size={22} color="#ffffff" strokeWidth={2} />
                )}
          </View>

          {/* Details */}
          <View className="flex-1">
            <Text className="text-base font-bold text-foreground" numberOfLines={1}>
              {prov.name}
            </Text>
            <View className="mt-1 flex-row items-center gap-2">
              <View className="rounded-md bg-muted px-2 py-0.5">
                <Text className="text-[11px] font-medium text-muted-foreground">
                  {prov.serviceName}
                </Text>
              </View>
            </View>
            <Text className="mt-1 text-xs text-muted-foreground">
              {packageCount}
              {' '}
              {packageCount === 1 ? 'Package' : 'Packages'}
            </Text>
          </View>
        </View>

        {/* Status and chevron */}
        <View className="flex-row items-center gap-2">
          <View className="flex-row items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 dark:bg-emerald-950/60">
            <View className="size-1.5 rounded-full bg-emerald-500" />
            <Text className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {prov.status === 'active' ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <HugeiconsIcon icon={ArrowRight01Icon} size={18} color={colors.neutral[400]} strokeWidth={2} />
        </View>
      </Pressable>
    </Card>
  );
}

// eslint-disable-next-line max-lines-per-function
export function ServicesScreen() {
  const router = useRouter();
  // The pills are the tenant's own services now, not a fixed list of types.
  const [selectedService, setSelectedService] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');

  // One unfiltered fetch, filtered here. Passing the pill and the search box as
  // query variables made every keystroke a new query key, and so a new request.
  const {
    data: providers = [],
    isPending,
    refetch,
    isRefetching,
  } = useServiceProviders();

  const filteredProviders = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return providers.filter((p) => {
      if (selectedService && p.serviceId !== selectedService)
        return false;
      if (!term)
        return true;
      return p.name.toLowerCase().includes(term)
        || (p.serviceName?.toLowerCase().includes(term) ?? false)
        || (p.code?.toLowerCase().includes(term) ?? false);
    });
  }, [providers, selectedService, search]);

  // Only for the filter pills now — the services themselves are managed on
  // their own screen, because stacked under the providers the two read as one
  // list of unrelated things.
  const { data: services = [] } = useServices();

  const onAddPress = () => router.push('/admin/services/add-provider');

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <SafeAreaView edges={['top']} className="bg-surface">
        {/* Header Bar */}
        <View className="flex-row items-center justify-between px-3 pt-1 pb-3">
          <View className="flex-row items-center gap-2.5">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={() => router.back()}
              className="size-9 items-center justify-center rounded-lg border border-border bg-card"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={20} color={colors.charcoal[900]} strokeWidth={2.2} />
            </Pressable>
            <View>
              <Text className="text-xl font-bold text-foreground">Service Providers</Text>
              <Text className="text-xs text-muted-foreground">
                {`${providers.length} across ${services.length} ${services.length === 1 ? 'service' : 'services'}`}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            {/* The services themselves: a short list, changed rarely, so it
                sits behind an icon rather than above the list worked in daily. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Manage services"
              onPress={() => router.push('/admin/services/types')}
              className="size-10 items-center justify-center rounded-lg border border-border bg-card"
            >
              <HugeiconsIcon icon={Layers01Icon} size={19} color={colors.neutral[700]} strokeWidth={2} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add provider"
              onPress={onAddPress}
              className="size-10 items-center justify-center rounded-full bg-primary-600 active:bg-primary-700"
            >
              <HugeiconsIcon icon={Add01Icon} size={22} color="#ffffff" strokeWidth={2.4} />
            </Pressable>
          </View>
        </View>

        {/* Search Bar */}
        <View className="px-3 pb-3">
          <View className="flex-row items-center rounded-2xl border border-border bg-card px-3.5 py-2.5">
            <HugeiconsIcon icon={Search01Icon} size={18} color={colors.neutral[400]} strokeWidth={2} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search providers..."
              placeholderTextColor={colors.neutral[400]}
              className="ml-2.5 flex-1 py-0 text-sm text-foreground"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <Text className="text-xs font-semibold text-primary-600">Clear</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* One pill per service the tenant actually sells. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="pb-3"
          contentContainerClassName="px-3 gap-2"
        >
          {[{ id: null, name: 'All', icon: null }, ...services].map((entry) => {
            const isSelected = selectedService === entry.id;

            return (
              <Pressable
                key={entry.id ?? 'all'}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => setSelectedService(entry.id)}
                className={`flex-row items-center gap-1.5 rounded-full px-3.5 py-1.5 ${
                  isSelected ? 'bg-primary-600' : 'border border-border bg-card'
                }`}
              >
                {entry.id
                  ? (
                      <HugeiconsIcon
                        icon={serviceIcon(entry.icon)}
                        size={14}
                        color={isSelected ? '#ffffff' : colors.neutral[500]}
                        strokeWidth={2}
                      />
                    )
                  : null}
                <Text className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-foreground'}`}>
                  {entry.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {/* Main List */}
      <FlashList
        data={filteredProviders}
        keyExtractor={prov => prov.id}
        renderItem={({ item }) => (
          <ProviderItemCard
            prov={item}
            onPress={() => router.push(`/admin/services/providers/${item.id}`)}
          />
        )}
        ItemSeparatorComponent={() => <View className="h-3" />}
        contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 4, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={(
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.primary[600]}
          />
        )}
        ListEmptyComponent={
          isPending
            ? <Loading />
            : (
                <View className="items-center justify-center rounded-2xl border border-border bg-card px-4 py-12">
                  <Text className="text-sm font-semibold text-foreground">No Providers Found</Text>
                  <Text className="mt-1 text-center text-xs text-muted-foreground">
                    {search.trim()
                      ? 'No providers match your search keyword.'
                      : 'No service providers registered under this category.'}
                  </Text>
                </View>
              )
        }
      />

    </View>
  );
}

export default ServicesScreen;

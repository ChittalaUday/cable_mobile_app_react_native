import type { NormalizedPackage } from '@/lib/hooks/api/use-packages';
import {
  Add01Icon,
  ArrowLeft01Icon,
  Delete02Icon,
  Location01Icon,
  PackageIcon,
  PencilEdit02Icon,
  Search01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { Alert, Linking, RefreshControl, TextInput } from 'react-native';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Card, Loading } from '@/components/common/shell';
import { getProviderBrand } from '@/components/services/provider-brand-utils';
import {
  colors,
  FocusAwareStatusBar,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from '@/components/ui';
import { coverageLabel, usePackages } from '@/lib/hooks/api/use-packages';
import { useDeleteServiceProvider, useServiceProvider } from '@/lib/hooks/api/use-service-providers';
import { usePackageFormStore } from '@/lib/hooks/stores/use-package-form-store';

type PackageRow = { kind: 'bar' } | { kind: 'package'; pkg: NormalizedPackage };

const CYCLE_LABEL: Record<string, string> = {
  monthly: '/ month',
  quarterly: '/ quarter',
  semi_annual: '/ 6 months',
  annual: '/ year',
};

function PackageItemCard({ pkg, onEdit }: { pkg: NormalizedPackage; onEdit: () => void }) {
  const coverage = coverageLabel(pkg);

  return (
    <Card className="border border-border p-3.5">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${pkg.name}`}
        onPress={onEdit}
        className="flex-row items-center justify-between"
      >
        <View className="flex-1 flex-row items-center gap-3 pr-2">
          <View className="dark:bg-primary-950/60 size-11 items-center justify-center rounded-2xl bg-primary-50">
            <HugeiconsIcon icon={PackageIcon} size={22} color={colors.primary[600]} strokeWidth={2.2} />
          </View>

          <View className="flex-1">
            <Text className="text-base font-bold text-foreground" numberOfLines={1}>
              {pkg.name}
            </Text>
            <Text className="mt-0.5 text-xs font-semibold text-foreground">
              {`₹${pkg.monthlyPrice} `}
              <Text className="font-normal text-muted-foreground">
                {CYCLE_LABEL[pkg.billingCycle] ?? '/ month'}
              </Text>
            </Text>
            <Text className="mt-0.5 text-[11px] text-muted-foreground">
              {pkg.channelCount > 0 ? `${pkg.channelCount} channels` : 'No channels assigned'}
              {pkg.active ? '' : ' · Inactive'}
            </Text>
            {/* The same name can appear twice under one provider, once per area
                it is sold in — so the area is the only thing separating them. */}
            {coverage
              ? (
                  <View className="mt-1 flex-row items-center gap-1">
                    <HugeiconsIcon icon={Location01Icon} size={11} color={colors.primary[600]} strokeWidth={2.2} />
                    <Text className="flex-1 text-[11px] font-semibold text-primary-600" numberOfLines={1}>
                      {coverage}
                    </Text>
                  </View>
                )
              : null}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${pkg.name}`}
          onPress={onEdit}
          hitSlop={8}
          className="size-8 items-center justify-center rounded-lg border border-border bg-surface"
        >
          <HugeiconsIcon icon={PencilEdit02Icon} size={16} color={colors.primary[600]} strokeWidth={2.2} />
        </Pressable>
      </Pressable>
    </Card>
  );
}

function InfoRow({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  const text = (
    <Text className="max-w-[62%] text-xs font-semibold text-foreground" numberOfLines={1}>
      {value}
    </Text>
  );

  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-xs text-muted-foreground">{label}</Text>
      {onPress ? <Pressable onPress={onPress}>{text}</Pressable> : text}
    </View>
  );
}

// eslint-disable-next-line max-lines-per-function
export function ProviderDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [search, setSearch] = React.useState('');
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const {
    data: provider,
    isPending: providerLoading,
    refetch: refetchProvider,
    isRefetching,
  } = useServiceProvider({ variables: { id: id ?? '' }, enabled: Boolean(id) });

  // Scoped to this provider: the whole catalogue was being fetched to throw
  // most of it away on every visit.
  const {
    data: packages = [],
    isPending: packagesLoading,
    refetch: refetchPackages,
  } = usePackages({
    variables: { serviceProviderId: id ?? '' },
    enabled: Boolean(id),
  });

  const deleteProvider = useDeleteServiceProvider();
  const initNewPackage = usePackageFormStore(s => s.initNewPackage);
  const initEditPackage = usePackageFormStore(s => s.initEditPackage);

  // The list is one provider's packages — small enough to filter here rather
  // than issue a request per keystroke.
  const filteredPackages = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term)
      return packages;
    return packages.filter(
      p => p.name.toLowerCase().includes(term) || (p.description?.toLowerCase().includes(term) ?? false),
    );
  }, [packages, search]);

  /**
   * The sticky bar is row 0 rather than a section header: FlashList pins rows
   * by index, and one flat list recycles package cards that a SectionList
   * would re-mount.
   */
  const rows = React.useMemo<PackageRow[]>(
    () => [{ kind: 'bar' }, ...filteredPackages.map(pkg => ({ kind: 'package' as const, pkg }))],
    [filteredPackages],
  );

  const contact = provider?.contact as { phone?: string; website?: string; email?: string } | null;
  const website = contact?.website ?? (provider?.metadata as { website?: string } | null)?.website;

  const onAddPackage = () => {
    if (!provider)
      return;
    initNewPackage({ id: provider.id, name: provider.name });
    router.push('/admin/packages/add-edit');
  };

  const onEditPackage = (pkg: NormalizedPackage) => {
    initEditPackage({
      id: pkg.id,
      name: pkg.name,
      price: pkg.monthlyPrice,
      billingCycle: pkg.billingCycle,
      description: pkg.description,
      active: pkg.active,
      providerId: pkg.serviceProviderId,
      providerName: pkg.serviceProviderName,
    });
    router.push('/admin/packages/add-edit');
  };

  const onDeleteProvider = async () => {
    if (!provider)
      return;

    try {
      await deleteProvider.mutateAsync({ id: provider.id });
      setConfirmDelete(false);
      router.back();
    }
    catch (err) {
      setConfirmDelete(false);
      Alert.alert('Could not delete', (err as Error).message);
    }
  };

  if (providerLoading || !provider) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <FocusAwareStatusBar />
        <Loading />
      </View>
    );
  }

  const brand = getProviderBrand(provider.name, provider.serviceIcon);

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />

      <ConfirmDialog
        visible={confirmDelete}
        busy={deleteProvider.isPending}
        title="Delete provider"
        message={`Delete ${provider.name}? Its packages stay on record for existing subscribers but can no longer be sold.`}
        onConfirm={onDeleteProvider}
        onCancel={() => setConfirmDelete(false)}
      />

      <SafeAreaView edges={['top']} className="bg-surface">
        <View className="flex-row items-center justify-between px-3 pt-1 pb-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            className="size-9 items-center justify-center rounded-lg border border-border bg-card"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={20} color={colors.charcoal[900]} strokeWidth={2.2} />
          </Pressable>
          <Text className="text-xl font-bold text-foreground">Provider Details</Text>
          <View className="flex-row items-center gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit coverage"
              onPress={() => router.push(
                `/coverage?scope=provider&id=${provider.id}&serviceId=${provider.serviceId}&name=${encodeURIComponent(provider.name)}`,
              )}
              className="size-9 items-center justify-center rounded-lg border border-border bg-card"
            >
              <HugeiconsIcon icon={Location01Icon} size={19} color={colors.neutral[700]} strokeWidth={2} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add package"
              onPress={onAddPackage}
              className="size-9 items-center justify-center rounded-lg bg-primary-600 active:bg-primary-700"
            >
              <HugeiconsIcon icon={Add01Icon} size={19} color="#ffffff" strokeWidth={2.4} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete provider"
              onPress={() => setConfirmDelete(true)}
              className="size-9 items-center justify-center rounded-lg border border-border bg-card"
            >
              <HugeiconsIcon icon={Delete02Icon} size={19} color={colors.danger[500]} strokeWidth={2} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {/*
        One list: the provider card scrolls away and the "Packages" bar pins to
        the top, so a long lineup is read against a fixed search box.
      */}
      <FlashList
        data={rows}
        extraData={packages.length}
        keyExtractor={row => (row.kind === 'bar' ? 'bar' : row.pkg.id)}
        getItemType={row => row.kind}
        stickyHeaderIndices={[0]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={(
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              refetchProvider();
              refetchPackages();
            }}
            tintColor={colors.primary[600]}
          />
        )}
        ListHeaderComponent={(
          <View className="px-3 pb-3">
            <Card className="border border-border p-4">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 flex-row items-center gap-3 pr-2">
                  <View
                    className="size-14 items-center justify-center rounded-full"
                    style={{ backgroundColor: brand.bg }}
                  >
                    {brand.isLogo
                      ? <Text className="text-center text-xs font-black text-white">{brand.text}</Text>
                      : <HugeiconsIcon icon={brand.icon ?? PackageIcon} size={26} color="#ffffff" strokeWidth={2} />}
                  </View>

                  <View className="flex-1">
                    <Text className="text-lg font-bold text-foreground" numberOfLines={1}>
                      {provider.name}
                    </Text>
                    {provider.description
                      ? (
                          <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={2}>
                            {provider.description}
                          </Text>
                        )
                      : null}
                  </View>
                </View>

                <View
                  className={`flex-row items-center gap-1.5 rounded-full px-2.5 py-1 ${
                    provider.status === 'active'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60'
                      : 'bg-neutral-100 dark:bg-neutral-800'
                  }`}
                >
                  <View className={`size-1.5 rounded-full ${provider.status === 'active' ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
                  <Text
                    className={`text-xs font-semibold ${
                      provider.status === 'active'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    {provider.status === 'active' ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>

              <View className="mt-3.5 gap-2 rounded-xl border border-border/60 bg-surface p-3">
                <InfoRow label="Service" value={provider.serviceName} />
                {contact?.phone
                  ? (
                      <InfoRow
                        label="Contact"
                        value={contact.phone}
                        onPress={() => Linking.openURL(`tel:${contact.phone}`)}
                      />
                    )
                  : null}
                {website
                  ? <InfoRow label="Website" value={website} onPress={() => Linking.openURL(website)} />
                  : null}
                {provider.code ? <InfoRow label="Provider Code" value={provider.code} /> : null}
              </View>
            </Card>
          </View>
        )}
        renderItem={({ item }) => (item.kind === 'bar'
          ? (
              <View className="border-b border-border bg-surface px-3 pb-2.5">
                <View className="flex-row items-center justify-between pb-2">
                  <Text className="text-sm font-bold text-primary-600">Packages</Text>
                  <Text className="text-xs text-muted-foreground">{`${packages.length} total`}</Text>
                </View>
                <View className="flex-row items-center rounded-2xl border border-border bg-card px-3.5 py-2.5">
                  <HugeiconsIcon icon={Search01Icon} size={18} color={colors.neutral[400]} strokeWidth={2} />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search packages..."
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
            )
          : (
              <View className="px-3 pt-2.5">
                <PackageItemCard pkg={item.pkg} onEdit={() => onEditPackage(item.pkg)} />
              </View>
            ))}
        ListFooterComponent={rows.length > 1
          ? null
          : (
              <View className="mx-3 mt-6 items-center justify-center rounded-2xl border border-border bg-card px-4 py-12">
                {packagesLoading
                  ? <Loading />
                  : (
                      <>
                        <Text className="text-sm font-semibold text-foreground">No packages found</Text>
                        <Text className="mt-1 text-center text-xs text-muted-foreground">
                          {search.trim()
                            ? 'No packages match your search.'
                            : 'No packages for this provider yet. Tap + above to add one.'}
                        </Text>
                      </>
                    )}
              </View>
            )}
      />
    </View>
  );
}

export default ProviderDetailsScreen;

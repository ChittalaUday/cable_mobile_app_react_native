import type { NormalizedPackage } from '@/lib/hooks/api/use-packages';
import {
  Add01Icon,
  ArrowLeft01Icon,
  Delete02Icon,
  PencilEdit02Icon,
  Search01Icon,
  Tv01Icon,
  Wifi01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, Alert, RefreshControl, TextInput } from 'react-native';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Card, LoadError, SectionHeader, StatusPill } from '@/components/common/shell';
import {
  colors,
  FocusAwareStatusBar,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { PERMISSIONS } from '@/constants';
import { coverageLabel, useDeletePackage, usePackages } from '@/lib/hooks/api/use-packages';
import { usePermissions } from '@/lib/hooks/common/use-permissions';
import { serviceIcon } from '@/lib/service-icons';
import { usePackageFormStore } from '@/screens/services/use-package-form-store';

/**
 * Status is a fixed property of a package; the rest of the filtering is by
 * service, and a tenant's services are its own — so those pills are built from
 * what the catalogue actually holds rather than a hard-coded list of types.
 */
type FilterType = 'all' | 'active' | 'inactive';

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
];

function matchesFilter(pkg: NormalizedPackage, filter: FilterType) {
  if (filter === 'active')
    return pkg.active;
  if (filter === 'inactive')
    return !pkg.active;

  return true;
}

function PackageMeta({ pkg }: { pkg: NormalizedPackage }) {
  const bits = [
    pkg.serviceName,
    pkg.durationMonths > 1 ? `${pkg.durationMonths} months` : 'Monthly',
    pkg.speedMbps ? `${pkg.speedMbps} Mbps` : null,
    pkg.channelCount ? `${pkg.channelCount} channels` : null,
    pkg.providerName,
    // Last, because it is what tells two same-named packages apart once the
    // rest of the line reads identically.
    coverageLabel(pkg),
  ].filter(Boolean) as string[];

  return (
    <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
      {bits.map(bit => (
        <Text key={bit} className="text-xs font-semibold text-muted-foreground">{bit}</Text>
      ))}
    </View>
  );
}

function PackageCard({ pkg, canUpdate, canDelete, onEdit, onDelete }: {
  pkg: NormalizedPackage;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (pkg: NormalizedPackage) => void;
  onDelete: (pkg: NormalizedPackage) => void;
}) {
  return (
    <Card className="gap-3 border border-border p-4">
      <View className="flex-row items-start gap-3">
        <View
          className="size-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: '#F1F1F4' }}
        >
          <HugeiconsIcon
            icon={serviceIcon(pkg.serviceIcon)}
            size={20}
            color={colors.neutral[600]}
          />
        </View>

        <View className="flex-1 gap-1">
          <View className="flex-row items-center justify-between gap-2">
            <Text className="flex-1 text-base font-extrabold text-foreground" numberOfLines={1}>{pkg.name}</Text>
            <StatusPill status={pkg.active ? 'active' : 'inactive'} />
          </View>
          <PackageMeta pkg={pkg} />
          {pkg.description
            ? <Text className="text-xs text-muted-foreground" numberOfLines={2}>{pkg.description}</Text>
            : null}
        </View>
      </View>

      <View className="flex-row items-center justify-between border-t border-border/60 pt-3">
        <Text className="text-lg font-extrabold text-foreground">
          ₹
          {pkg.monthlyPrice}
          <Text className="text-xs font-semibold text-muted-foreground">
            {pkg.durationMonths > 1 ? ` / ${pkg.durationMonths} mo` : ' / month'}
          </Text>
        </Text>

        <View className="flex-row gap-2">
          {canUpdate
            ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${pkg.name}`}
                  onPress={() => onEdit(pkg)}
                  className="flex-row items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 active:bg-neutral-100 dark:active:bg-neutral-800"
                >
                  <HugeiconsIcon icon={PencilEdit02Icon} size={15} color={colors.primary[600]} />
                  <Text className="text-xs font-extrabold text-primary-600">Edit</Text>
                </Pressable>
              )
            : null}
          {canDelete
            ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${pkg.name}`}
                  onPress={() => onDelete(pkg)}
                  className="flex-row items-center gap-1.5 rounded-xl border border-danger-200 bg-danger-50 px-3 py-2 dark:border-danger-900 dark:bg-danger-900/20"
                >
                  <HugeiconsIcon icon={Delete02Icon} size={15} color={colors.danger[500]} />
                  <Text className="text-xs font-extrabold text-danger-500">Delete</Text>
                </Pressable>
              )
            : null}
        </View>
      </View>
    </Card>
  );
}

function PackageListEmpty({ isPending, query }: { isPending: boolean; query: string }) {
  if (isPending) {
    return (
      <View className="items-center justify-center gap-2 py-14">
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text className="text-sm font-semibold text-muted-foreground">Loading package catalogue…</Text>
      </View>
    );
  }

  return (
    <View className="items-center justify-center gap-2 px-4 py-14">
      <Text className="text-base font-bold text-foreground">No packages found</Text>
      <Text className="text-center text-xs text-muted-foreground">
        {query
          ? `No plan matched "${query}".`
          : 'Create your first plan — it becomes selectable as a service on customer connections.'}
      </Text>
    </View>
  );
}

// eslint-disable-next-line max-lines-per-function
export function PackagesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ action?: string }>();
  const { can } = usePermissions();
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState<FilterType>('all');
  const initNewPackage = usePackageFormStore(s => s.initNewPackage);
  const initEditPackage = usePackageFormStore(s => s.initEditPackage);

  const canView = can(PERMISSIONS.PACKAGES_VIEW);
  const canCreate = can(PERMISSIONS.PACKAGES_CREATE);
  const canUpdate = can(PERMISSIONS.PACKAGES_UPDATE);
  const canDelete = can(PERMISSIONS.PACKAGES_DELETE);

  const { data: packages = [], isPending, isRefetching, error, refetch } = usePackages({ enabled: canView });
  const deletePackage = useDeletePackage();
  const [pendingDelete, setPendingDelete] = React.useState<NormalizedPackage | null>(null);

  const openCreate = React.useCallback(() => {
    // The provider is chosen on the form itself when we arrive without one.
    initNewPackage();
    router.push('/add-edit-package');
  }, [initNewPackage, router]);

  const openEdit = React.useCallback((pkg: NormalizedPackage) => {
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
    router.push('/add-edit-package');
  }, [initEditPackage, router]);

  // Deep link from the global search registry: `/packages?action=create`.
  React.useEffect(() => {
    if (params.action === 'create' && canCreate)
      openCreate();
  }, [params.action, canCreate, openCreate]);

  const visiblePackages = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return packages.filter((pkg) => {
      if (!matchesFilter(pkg, filter))
        return false;
      if (!term)
        return true;
      return pkg.name.toLowerCase().includes(term)
        || (pkg.description?.toLowerCase().includes(term) ?? false)
        || pkg.serviceName.toLowerCase().includes(term)
        || (pkg.providerName?.toLowerCase().includes(term) ?? false);
    });
  }, [packages, query, filter]);

  const handleDelete = async () => {
    if (!pendingDelete)
      return;

    try {
      await deletePackage.mutateAsync({ id: pendingDelete.id });
      setPendingDelete(null);
      refetch();
    }
    catch (err) {
      setPendingDelete(null);
      Alert.alert('Could not delete', (err as Error).message);
    }
  };

  if (!canView) {
    return (
      <View className="flex-1 bg-surface">
        <FocusAwareStatusBar />
        <SafeAreaView edges={['top']} className="bg-surface" />
        <View className="flex-1 items-center justify-center gap-2 px-8">
          <Text className="text-center text-[15px] font-semibold text-foreground">No access to packages</Text>
          <Text className="text-center text-[13px] text-muted-foreground">
            Your role does not include the packages.view permission.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <SafeAreaView edges={['top']} className="bg-surface" />

      <ConfirmDialog
        visible={pendingDelete !== null}
        busy={deletePackage.isPending}
        title="Delete package"
        confirmLabel="Delete plan"
        message={`Delete "${pendingDelete?.name ?? ''}"? Customers already on this plan keep their service, but it can no longer be assigned.`}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <View className="z-10 gap-3 border-b border-border/40 bg-surface px-4 py-3">
        <View className="flex-row items-center justify-between gap-2">
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} hitSlop={12}>
            <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={colors.neutral[500]} />
          </Pressable>
          <View className="flex-1">
            <SectionHeader icon={Tv01Icon} tint="purple" title="Packages & Plans" />
          </View>
          {canCreate
            ? (
                <Pressable
                  testID="add-package-button"
                  accessibilityRole="button"
                  onPress={openCreate}
                  className="flex-row items-center gap-1.5 rounded-xl bg-primary-500 px-3.5 py-2 active:bg-primary-600"
                >
                  <HugeiconsIcon icon={Add01Icon} size={16} color="#ffffff" />
                  <Text className="text-xs font-extrabold text-white">Add Package</Text>
                </Pressable>
              )
            : null}
        </View>

        <View className="flex-row items-center rounded-xl border border-border bg-card px-4 py-3">
          <HugeiconsIcon icon={Search01Icon} size={20} color={colors.neutral[400]} />
          <TextInput
            testID="package-search-input"
            value={query}
            onChangeText={setQuery}
            placeholder="Search plan name, service, provider…"
            placeholderTextColor={colors.neutral[400]}
            className="ml-3 flex-1 text-base font-medium text-foreground"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {FILTERS.map(item => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={`Filter: ${item.label}`}
              accessibilityState={{ selected: filter === item.key }}
              onPress={() => setFilter(item.key)}
              className={`rounded-full px-4 py-2 ${filter === item.key ? 'bg-primary-500' : 'border border-border bg-card'}`}
            >
              <Text className={`text-xs font-extrabold ${
                filter === item.key ? 'text-white' : 'text-neutral-600 dark:text-neutral-300'
              }`}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {error
        ? <LoadError message={error.message} onRetry={refetch} />
        : (
            <FlashList
              data={visiblePackages}
              keyExtractor={pkg => pkg.id}
              extraData={canUpdate || canDelete}
              renderItem={({ item }) => (
                <PackageCard
                  pkg={item}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                  onEdit={openEdit}
                  onDelete={setPendingDelete}
                />
              )}
              ItemSeparatorComponent={() => <View className="h-3" />}
              contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[600]} />}
              ListEmptyComponent={<PackageListEmpty isPending={isPending} query={query} />}
            />
          )}
    </View>
  );
}

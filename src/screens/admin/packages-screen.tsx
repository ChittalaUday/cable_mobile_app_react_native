import type { PackageDoc } from '@/types/service';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, Alert, RefreshControl, TextInput } from 'react-native';

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
import { useDeletePackage, usePackages } from '@/lib/hooks/use-packages';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { PackageFormModal } from './components/package-form-modal';

type FilterType = 'all' | 'active' | 'inactive' | 'cable' | 'broadband';

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
  { key: 'cable', label: 'Cable TV' },
  { key: 'broadband', label: 'Broadband' },
];

const SERVICE_LABEL: Record<PackageDoc['serviceType'], string> = {
  cable_tv: 'Cable TV',
  internet: 'Broadband',
  fiber: 'Fiber',
  iptv: 'IPTV',
  combo: 'Combo',
};

function isBroadbandType(type: PackageDoc['serviceType']) {
  return type !== 'cable_tv';
}

function matchesFilter(pkg: PackageDoc, filter: FilterType) {
  switch (filter) {
    case 'active':
      return pkg.active;
    case 'inactive':
      return !pkg.active;
    case 'cable':
      return pkg.serviceType === 'cable_tv' || pkg.serviceType === 'iptv';
    case 'broadband':
      return isBroadbandType(pkg.serviceType) && pkg.serviceType !== 'iptv';
    default:
      return true;
  }
}

function PackageMeta({ pkg }: { pkg: PackageDoc }) {
  const bits = [
    SERVICE_LABEL[pkg.serviceType],
    pkg.durationMonths > 1 ? `${pkg.durationMonths} months` : 'Monthly',
    pkg.speedMbps ? `${pkg.speedMbps} Mbps` : null,
    pkg.channelCount ? `${pkg.channelCount} channels` : null,
    pkg.dataLimitGb ? `${pkg.dataLimitGb} GB` : null,
    pkg.setupFee ? `₹${pkg.setupFee} setup` : null,
    pkg.providerName,
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
  pkg: PackageDoc;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (pkg: PackageDoc) => void;
  onDelete: (pkg: PackageDoc) => void;
}) {
  return (
    <Card className="gap-3 border border-border p-4">
      <View className="flex-row items-start gap-3">
        <View
          className="size-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: isBroadbandType(pkg.serviceType) ? '#E8F2FE' : '#FFF1E6' }}
        >
          <HugeiconsIcon
            icon={isBroadbandType(pkg.serviceType) ? Wifi01Icon : Tv01Icon}
            size={20}
            color={isBroadbandType(pkg.serviceType) ? '#2E90FA' : '#FF6C00'}
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

function PackageList({ isPending, packages, query, canUpdate, canDelete, onEdit, onDelete }: {
  isPending: boolean;
  packages: PackageDoc[];
  query: string;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (pkg: PackageDoc) => void;
  onDelete: (pkg: PackageDoc) => void;
}) {
  if (isPending) {
    return (
      <View className="items-center justify-center gap-2 py-14">
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text className="text-sm font-semibold text-muted-foreground">Loading package catalogue…</Text>
      </View>
    );
  }

  if (packages.length === 0) {
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

  return (
    <>
      {packages.map(pkg => (
        <PackageCard
          key={pkg.id}
          pkg={pkg}
          canUpdate={canUpdate}
          canDelete={canDelete}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}

// eslint-disable-next-line max-lines-per-function
export function PackagesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ action?: string }>();
  const { can } = usePermissions();
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState<FilterType>('all');
  const [editing, setEditing] = React.useState<PackageDoc | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);

  const canView = can(PERMISSIONS.PACKAGES_VIEW);
  const canCreate = can(PERMISSIONS.PACKAGES_CREATE);
  const canUpdate = can(PERMISSIONS.PACKAGES_UPDATE);
  const canDelete = can(PERMISSIONS.PACKAGES_DELETE);

  const { data: packages = [], isPending, isRefetching, error, refetch } = usePackages({ enabled: canView });
  const deletePackage = useDeletePackage();

  // Deep link from the global search registry: `/packages?action=create`.
  React.useEffect(() => {
    if (params.action === 'create' && canCreate) {
      setEditing(null);
      setFormOpen(true);
    }
  }, [params.action, canCreate]);

  const visiblePackages = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return packages.filter((pkg) => {
      if (!matchesFilter(pkg, filter))
        return false;
      if (!term)
        return true;
      return pkg.name.toLowerCase().includes(term)
        || (pkg.description?.toLowerCase().includes(term) ?? false)
        || SERVICE_LABEL[pkg.serviceType].toLowerCase().includes(term)
        || (pkg.providerName?.toLowerCase().includes(term) ?? false);
    });
  }, [packages, query, filter]);

  const handleDelete = (pkg: PackageDoc) => {
    Alert.alert(
      'Delete package',
      `Delete "${pkg.name}"? Customers already on this plan keep their current service, but it can no longer be assigned.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          // Distinct from the card's own "Delete" button so the confirmation is unambiguous.
          text: 'Delete plan',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePackage.mutateAsync({ id: pkg.id });
              refetch();
            }
            catch (err) {
              Alert.alert('Could not delete', (err as Error).message);
            }
          },
        },
      ],
    );
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

      {formOpen
        ? (
            <PackageFormModal
              key={editing?.id ?? 'new'}
              editing={editing}
              onClose={() => {
                setFormOpen(false);
                setEditing(null);
              }}
              onSuccess={() => refetch()}
            />
          )
        : null}

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
                  onPress={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
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
            <ScrollView
              className="flex-1"
              contentContainerClassName="gap-3 px-3 pt-3 pb-6"
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[600]} />}
            >
              <PackageList
                isPending={isPending}
                packages={visiblePackages}
                query={query}
                canUpdate={canUpdate}
                canDelete={canDelete}
                onEdit={(pkg) => {
                  setEditing(pkg);
                  setFormOpen(true);
                }}
                onDelete={handleDelete}
              />
            </ScrollView>
          )}
    </View>
  );
}

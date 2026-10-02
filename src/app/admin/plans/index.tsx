import type { Plan } from '@/lib/api/types';
import { Add01Icon, Delete02Icon, PencilEdit02Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { dialogs } from '@/components/common/dialogs';
import { PlanPrice } from '@/components/common/plan-price';
import { ScreenHeader } from '@/components/common/screen-header';
import { Card, LoadError, StatusPill } from '@/components/common/shell';
import { colors, FocusAwareStatusBar, Pressable, SafeAreaView, Text, ThemedIcon, View } from '@/components/ui';
import { PERMISSIONS } from '@/constants';
import { useDeletePlan, usePlans } from '@/lib/hooks/api/use-plans';
import { usePermissions } from '@/lib/hooks/common/use-permissions';
import { serviceIcon } from '@/lib/service-icons';

function PlanCard({ plan, canUpdate, canDelete, onEdit, onDelete }: {
  plan: Plan;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (plan: Plan) => void;
  onDelete: (plan: Plan) => void;
}) {
  const bundle = plan.packages?.map(pkg => pkg.name).join(' + ');

  return (
    <Card className="gap-3 border border-border p-4">
      <View className="flex-row items-start gap-3">
        <View className="size-11 items-center justify-center rounded-xl bg-muted">
          <ThemedIcon icon={serviceIcon(plan.serviceIcon)} size={20} colorClassName="text-muted-foreground" />
        </View>
        <View className="flex-1 gap-1">
          <View className="flex-row items-center justify-between gap-2">
            <Text className="flex-1 text-base font-extrabold text-foreground" numberOfLines={1}>{plan.name}</Text>
            {plan.kind === 'addon'
              ? <Text className="rounded-md bg-primary-500/15 px-2 py-0.5 text-[11px] font-bold text-primary-600">Add-on</Text>
              : null}
            <StatusPill status={plan.status} />
          </View>
          <Text className="text-xs font-semibold text-muted-foreground">
            {`${plan.serviceName} • ${plan.serviceProviderName} • ${plan.packageCount} ${plan.packageCount === 1 ? 'package' : 'packages'}`}
          </Text>
          {bundle ? <Text className="text-xs text-muted-foreground" numberOfLines={2}>{bundle}</Text> : null}
        </View>
      </View>

      <View className="flex-row items-center justify-between border-t border-border/60 pt-3">
        <View className="flex-1">
          <PlanPrice price={plan.price} amount={plan.amount} className="text-lg font-extrabold text-foreground" testID={`plan-amount-${plan.slug}`} />
        </View>
        <View className="flex-row gap-2">
          {canUpdate
            ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${plan.name}`}
                  onPress={() => onEdit(plan)}
                  className="flex-row items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2"
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
                  accessibilityLabel={`Delete ${plan.name}`}
                  onPress={() => onDelete(plan)}
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

/**
 * The operator's plans: what customers are sold and billed. Each one is the
 * operator's own price and discount over the provider packages it switches on;
 * those packages and their provider rates stay on the Packages screen.
 */
export function PlansScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ action?: string }>();
  const { can } = usePermissions();
  const [query, setQuery] = React.useState('');
  const [kind, setKind] = React.useState<'all' | Plan['kind']>('base');
  const [pendingDelete, setPendingDelete] = React.useState<Plan | null>(null);

  const canView = can(PERMISSIONS.PLANS_VIEW);
  const canCreate = can(PERMISSIONS.PLANS_CREATE);
  const canUpdate = can(PERMISSIONS.PLANS_UPDATE);
  const canDelete = can(PERMISSIONS.PLANS_DELETE);

  const { data: plans = [], isPending, isRefetching, error, refetch } = usePlans({ enabled: canView });
  const deletePlan = useDeletePlan();

  const openCreate = React.useCallback(() => router.push('/admin/plans/add-edit'), [router]);

  React.useEffect(() => {
    if (params.action === 'create' && canCreate)
      openCreate();
  }, [params.action, canCreate, openCreate]);

  const term = query.trim().toLowerCase();
  const ofKind = kind === 'all' ? plans : plans.filter(plan => plan.kind === kind);
  const visible = term === ''
    ? ofKind
    : ofKind.filter(plan => plan.name.toLowerCase().includes(term)
      || plan.serviceProviderName.toLowerCase().includes(term)
      || plan.serviceName.toLowerCase().includes(term));

  const handleDelete = async () => {
    if (!pendingDelete)
      return;

    try {
      await deletePlan.mutateAsync({ id: pendingDelete.id });
      setPendingDelete(null);
      refetch();
    }
    catch (err) {
      setPendingDelete(null);
      void dialogs.notify('Could not delete', (err as Error).message);
    }
  };

  if (!canView) {
    return (
      <View className="flex-1 bg-surface">
        <FocusAwareStatusBar />
        <SafeAreaView edges={['top']} className="bg-surface" />
        <View className="flex-1 items-center justify-center gap-2 px-8">
          <Text className="text-center text-[15px] font-semibold text-foreground">No access to plans</Text>
          <Text className="text-center text-[13px] text-muted-foreground">Your role does not include the plans.view permission.</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />

      <ConfirmDialog
        visible={pendingDelete !== null}
        busy={deletePlan.isPending}
        title="Delete plan"
        confirmLabel="Delete plan"
        message={`Delete "${pendingDelete?.name ?? ''}"? A plan any active line is still on cannot be deleted — move those lines first.`}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <SafeAreaView edges={['top']} className="bg-card">
        <ScreenHeader
          title="Plans"
          subtitle="What customers are sold and billed"
          showBack
          rightAction={canCreate
            ? (
                <Pressable
                  testID="add-plan-button"
                  accessibilityRole="button"
                  onPress={openCreate}
                  className="flex-row items-center gap-1.5 rounded-full bg-primary-600 px-3.5 py-2 active:bg-primary-700"
                >
                  <HugeiconsIcon icon={Add01Icon} size={16} color="#ffffff" strokeWidth={2.4} />
                  <Text className="text-xs font-bold text-white">Add Plan</Text>
                </Pressable>
              )
            : null}
        >
          <View className="flex-row items-center rounded-xl border border-border bg-surface px-3 py-2">
            <ThemedIcon icon={Search01Icon} size={18} strokeWidth={2} colorClassName="text-muted-foreground" />
            <TextInput
              testID="plan-search-input"
              value={query}
              onChangeText={setQuery}
              placeholder="Search plan, service, provider…"
              placeholderTextColor={colors.neutral[400]}
              className="ml-2 flex-1 py-0 text-sm text-foreground"
            />
          </View>
          <View className="flex-row gap-2 pt-1">
            {([['base', 'Plans'], ['addon', 'Add-ons'], ['all', 'All']] as const).map(([key, label]) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected: kind === key }}
                testID={`plans-kind-${key}`}
                onPress={() => setKind(key)}
                className={`rounded-full px-3.5 py-1.5 ${kind === key ? 'bg-primary-600' : 'border border-border bg-surface'}`}
              >
                <Text className={`text-xs font-bold ${kind === key ? 'text-white' : 'text-foreground'}`}>
                  {`${label} (${key === 'all' ? plans.length : plans.filter(plan => plan.kind === key).length})`}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScreenHeader>
      </SafeAreaView>

      {error
        ? <LoadError message={error.message} onRetry={refetch} />
        : (
            <FlashList
              data={visible}
              keyExtractor={plan => plan.id}
              extraData={canUpdate || canDelete}
              renderItem={({ item }) => (
                <PlanCard
                  plan={item}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                  onEdit={plan => router.push({ pathname: '/admin/plans/add-edit', params: { id: plan.id } })}
                  onDelete={setPendingDelete}
                />
              )}
              ItemSeparatorComponent={() => <View className="h-3" />}
              contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[600]} />}
              ListEmptyComponent={isPending
                ? (
                    <View className="items-center py-14">
                      <ActivityIndicator size="large" color={colors.primary[500]} />
                    </View>
                  )
                : (
                    <View className="items-center gap-2 px-4 py-14">
                      <Text className="text-base font-bold text-foreground">No plans found</Text>
                      <Text className="text-center text-xs text-muted-foreground">
                        {term ? `No plan matched "${query}".` : 'Create a plan over a provider\'s packages — it is what customers are put on and billed by.'}
                      </Text>
                    </View>
                  )}
            />
          )}
    </View>
  );
}

export default PlansScreen;

import type { NormalizedPackage } from '@/lib/hooks/api/use-packages';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { SectionList } from 'react-native';
import { dialogs } from '@/components/common/dialogs';
import { Card, LoadError, Loading, ScreenHeader } from '@/components/common/shell';
import { Input, Pressable, Text, View } from '@/components/ui';
import { useAddSubscription, useChangePlan, useCustomer } from '@/lib/hooks/api/use-customers';
import { usePackages } from '@/lib/hooks/api/use-packages';
import { useRechargeStore } from '@/lib/hooks/stores/use-recharge-store';
import { rupeesExact } from '@/lib/utils/admin-format';
import { ChoiceRow, Field } from './parts';

/**
 * The package kinds a line sits *on*. Everything else — a bouquet, a single
 * channel, an addon — is sold alongside one and never replaces it.
 */
const PLAN_TYPES = new Set(['base', 'combo']);
type PlanSection = {
  key: 'plans' | 'addons';
  title: string;
  empty: string;
  trailing: string;
  data: NormalizedPackage[];
};

/**
 * Changing what a connection is on, as a page of its own.
 *
 * Off the recharge flow rather than inside it: a provider sells dozens of packs
 * and a handful of them are plans, so the choice needs a search box and room to
 * scroll — neither of which belongs above an amount the collector is about to
 * type. It takes no money, so it returns to the flow the moment it is done.
 */
export function ChangePlanScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const customerId = useRechargeStore(state => state.customerId);
  const pickedId = useRechargeStore(state => state.subscriptionId);
  const setSubscription = useRechargeStore(state => state.setSubscription);

  const [query, setQuery] = React.useState('');
  const [activeCategory, setActiveCategory] = React.useState<'plans' | 'addons'>('plans');
  const listRef = React.useRef<SectionList<NormalizedPackage, PlanSection>>(null);

  const { data: customer, isPending, error, refetch } = useCustomer({
    variables: { id: customerId ?? '' },
    enabled: customerId !== null,
  });

  const lines = customer?.subscriptions ?? [];
  const line = lines.find(option => option.id === pickedId) ?? lines[0] ?? null;

  // Only what this line's own provider sells — the server refuses anything
  // else, because crossing providers is a new connection, not a plan change.
  const { data: offered, isPending: isLoading } = usePackages({
    variables: { serviceProviderId: line?.provider.id, status: 'active' },
    enabled: line !== null,
  });

  const { mutate: changePlan, isPending: isChanging } = useChangePlan();
  const { mutate: addSubscription, isPending: isAdding } = useAddSubscription();
  const busy = isChanging || isAdding;

  const needle = query.trim().toLowerCase();
  const sellable = (offered ?? []).filter(item =>
    item.active
    && item.id !== line?.package.id
    && (needle === '' || item.name.toLowerCase().includes(needle)),
  );
  const plans = sellable.filter(item => PLAN_TYPES.has(item.packageType));
  const addons = sellable.filter(item => !PLAN_TYPES.has(item.packageType));
  const sections: PlanSection[] = [
    { key: 'plans', title: 'Packages', empty: needle === '' ? 'No other plan from this provider.' : 'No plan matches that.', trailing: 'Switch', data: plans },
    { key: 'addons', title: t('recharge.add_ons'), empty: needle === '' ? 'No addons from this provider.' : 'No addon matches that.', trailing: 'Add', data: addons },
  ];

  const moveTo = (category: 'plans' | 'addons') => {
    setActiveCategory(category);
    const sectionIndex = category === 'plans' ? 0 : 1;
    if (sections[sectionIndex]!.data.length > 0)
      listRef.current?.scrollToLocation({ sectionIndex, itemIndex: 0, animated: true });
  };

  const onViewableItemsChanged = React.useRef(({ viewableItems }: { viewableItems: { section?: { key?: string } }[] }) => {
    const key = viewableItems[0]?.section?.key;
    if (key === 'plans' || key === 'addons')
      setActiveCategory(key);
  }).current;

  const switchTo = async (item: NormalizedPackage) => {
    if (line === null || customer === undefined)
      return;

    const agreed = await dialogs.confirm({
      title: `Move to ${item.name}?`,
      message: `This connection goes to ${rupeesExact(item.price)} / ${item.billingCycle}. It takes no money now and leaves the balance where it is.`,
      confirmLabel: 'Change plan',
      tone: 'default',
    });

    if (!agreed)
      return;

    changePlan(
      { customerId: customer.id, subscriptionId: line.id, payload: { packageId: item.id } },
      {
        onSuccess: () => router.back(),
        onError: failure => void dialogs.notify('Not changed', failure.message),
      },
    );
  };

  const addAddon = (item: NormalizedPackage) => {
    if (line === null || customer === undefined)
      return;

    addSubscription(
      { customerId: customer.id, payload: { packageId: item.id, basedOn: line.id } },
      {
        // It lands as a line of its own, so the flow comes back to a customer
        // with one more connection, and that new line is what it acts on.
        onSuccess: (added) => {
          setSubscription(added.id);
          router.back();
        },
        onError: failure => void dialogs.notify('Not added', failure.message),
      },
    );
  };

  if (isPending)
    return <Loading />;

  if (error || !customer)
    return <LoadError message={error?.message} onRetry={refetch} />;

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader
        title="Plans & addons"
        subtitle={line === null ? (customer.name ?? 'Customer') : `${line.provider.name} • on ${line.package.name}`}
        showBack
        withSafeArea
      >
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search plans and addons"
          autoCorrect={false}
          returnKeyType="search"
          testID="plan-search"
        />
        {line !== null && !isLoading && (
          <View className="flex-row gap-2 pt-3">
            {sections.map((section, index) => (
              <Pressable
                key={section.key}
                accessibilityRole="tab"
                accessibilityLabel={`${section.key === 'plans' ? t('recharge.plans') : t('recharge.add_ons')} (${section.data.length})`}
                accessibilityState={{ selected: activeCategory === section.key }}
                onPress={() => moveTo(section.key)}
                className={`flex-1 items-center rounded-xl border py-2.5 ${activeCategory === section.key ? 'border-primary-500 bg-primary-500' : 'border-border bg-card'}`}
              >
                <Text className={`text-xs font-bold ${activeCategory === section.key ? 'text-white' : 'text-foreground'}`}>
                  {`${index === 0 ? t('recharge.plans') : t('recharge.add_ons')} (${section.data.length})`}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScreenHeader>

      <SectionList
        ref={listRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        sections={line === null || isLoading ? [] : sections}
        keyExtractor={item => item.id}
        renderItem={({ item, section }) => (
          <View className="pb-2">
            <ChoiceRow
              title={item.name}
              subtitle={`${rupeesExact(item.price)} / ${item.billingCycle}${item.channelCount > 0 ? ` • ${item.channelCount} channels` : ''}`}
              trailing={section.trailing}
              disabled={busy}
              onPress={() => section.key === 'plans' ? void switchTo(item) : addAddon(item)}
            />
          </View>
        )}
        renderSectionHeader={({ section }) => (
          <Field label={`${section.title}${section.data.length > 0 ? ` (${section.data.length})` : ''}`}>
            {section.data.length === 0 ? <Text className="pb-4 text-xs text-muted-foreground">{section.empty}</Text> : null}
          </Field>
        )}
        SectionSeparatorComponent={() => <View className="h-4" />}
        ListHeaderComponent={line === null
          ? (
              <Card className="border border-border p-4">
                <Text className="text-sm text-muted-foreground">
                  This customer has no connection yet, so there is no plan to change.
                </Text>
              </Card>
            )
          : (
              <Card className="mb-4 gap-1 border border-primary-500 bg-primary-50 p-4 dark:bg-primary-950/40">
                <Text className="text-xs font-semibold tracking-wider text-primary-600 uppercase">{t('recharge.current_plan')}</Text>
                <Text className="text-base font-extrabold text-foreground">{line.package.name}</Text>
                <Text className="text-xs text-muted-foreground">{`${line.provider.name} • ${rupeesExact(line.price)} / ${line.billingCycle}`}</Text>
              </Card>
            )}
        ListEmptyComponent={isLoading ? <Loading /> : null}
        onViewableItemsChanged={onViewableItemsChanged}
        onScrollToIndexFailed={({ averageItemLength, index }) => {
          listRef.current?.getScrollResponder()?.scrollTo({ y: averageItemLength * index, animated: true });
        }}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

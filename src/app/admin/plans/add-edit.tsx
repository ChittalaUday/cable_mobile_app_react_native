import type { Plan } from '@/lib/api/types';
import { ArrowDown01Icon, CheckmarkCircle02Icon, DiscountTag01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { Switch, TextInput } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { FieldLabel, ProviderPicker } from '@/components/admin/catalogue-form';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { dialogs } from '@/components/common/dialogs';
import { PlanPrice } from '@/components/common/plan-price';
import { SaveBar } from '@/components/common/save-bar';
import { Card, Loading, ScreenHeader } from '@/components/common/shell';
import { colors, FocusAwareStatusBar, Pressable, Text, ThemedIcon, View } from '@/components/ui';
import { QUERY_KEYS } from '@/constants';
import { BILLING_OPTIONS } from '@/lib/constants/crm';
import { usePackages } from '@/lib/hooks/api/use-packages';
import { useCreatePlan, usePlanDetail, useUpdatePlan } from '@/lib/hooks/api/use-plans';
import { useServiceProviders } from '@/lib/hooks/api/use-service-providers';
import { rupeesExact } from '@/lib/utils/admin-format';

type Cycle = Plan['billingCycle'];

/** Money as typed: digits with at most two decimals, the same rule the API checks. */
const MONEY = /^\d{1,10}(?:\.\d{1,2})?$/;

const paise = (value: string) => Math.round(Number(value || 0) * 100);

/**
 * Create or edit a plan: the operator's own price and flat discount over the
 * provider packages it switches on. Repricing is live — every line on the plan
 * is charged the new amount from its next cycle — so the confirm step says so.
 */
export function AddEditPlanScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editingId = typeof id === 'string' && id !== '' ? id : null;
  const { data: existing, isPending } = usePlanDetail({ variables: { id: editingId ?? '' }, enabled: editingId !== null });

  // The form seeds its state once, from what is saved: mount it after the read.
  if (editingId !== null && (isPending || existing === undefined))
    return <Loading />;

  return <PlanForm existing={editingId === null ? null : existing ?? null} />;
}

function PlanForm({ existing }: { existing: Plan | null }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const editingId = existing?.id ?? null;
  const { data: providers = [] } = useServiceProviders();

  const [providerId, setProviderId] = React.useState(existing?.serviceProviderId ?? '');
  const [providerName, setProviderName] = React.useState(existing?.serviceProviderName ?? '');
  const [name, setName] = React.useState(existing?.name ?? '');
  const [price, setPrice] = React.useState(existing?.price ?? '');
  const [discount, setDiscount] = React.useState(existing?.discount ?? '0');
  const [billingCycle, setBillingCycle] = React.useState<Cycle>(existing?.billingCycle ?? 'monthly');
  const [description, setDescription] = React.useState(existing?.description ?? '');
  const [isActive, setIsActive] = React.useState(existing === null || existing.status === 'active');
  const [packageIds, setPackageIds] = React.useState<string[]>((existing?.packages ?? []).map(pkg => pkg.id));
  const [cycleOpen, setCycleOpen] = React.useState(false);
  const [confirmSave, setConfirmSave] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Only the chosen provider's live packages can go into its plan.
  const { data: offered = [], isPending: isLoadingPackages } = usePackages({
    variables: { serviceProviderId: providerId, status: 'active' },
    enabled: providerId !== '',
  });

  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const isSaving = createPlan.isPending || updatePlan.isPending;

  const amountPaise = paise(price) - paise(discount);
  const cycleLabel = BILLING_OPTIONS.find(option => option.key === billingCycle)?.label ?? 'Monthly';

  const togglePackage = (packageId: string) =>
    setPackageIds(current => current.includes(packageId) ? current.filter(item => item !== packageId) : [...current, packageId]);

  const handleSubmit = () => {
    const errs: Record<string, string> = {};
    if (name.trim() === '')
      errs.name = 'Plan name is required';
    if (providerId === '')
      errs.provider = 'Choose the provider whose packages this plan sells';
    if (!MONEY.test(price.trim()))
      errs.price = 'Enter the price in rupees, e.g. 300 or 300.50';
    if (!MONEY.test(discount.trim()))
      errs.discount = 'Enter the discount in rupees, or 0';
    else if (paise(discount) > paise(price))
      errs.discount = 'The discount cannot be more than the price';
    if (packageIds.length === 0)
      errs.packages = 'Pick at least one provider package this plan activates';

    setErrors(errs);
    if (Object.keys(errs).length === 0)
      setConfirmSave(true);
  };

  const handleSave = async () => {
    // Money crosses the wire as a decimal string, never a number.
    const money = (value: string) => (paise(value) / 100).toFixed(2);

    try {
      if (editingId !== null) {
        await updatePlan.mutateAsync({
          id: editingId,
          patch: {
            name: name.trim(),
            price: money(price),
            discount: money(discount),
            billingCycle,
            description: description.trim() || null,
            status: isActive ? 'active' : 'inactive',
            packageIds,
          },
        });
      }
      else {
        await createPlan.mutateAsync({
          payload: {
            serviceProviderId: providerId,
            name: name.trim(),
            price: money(price),
            discount: money(discount),
            billingCycle,
            description: description.trim() || undefined,
            packageIds,
          },
        });
      }

      // A plan's amount shows on every line on it, so the customer screens go stale too.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PLANS] }),
        queryClient.invalidateQueries({ queryKey: ['customer'] }),
        queryClient.invalidateQueries({ queryKey: ['customers'] }),
      ]);

      setConfirmSave(false);
      router.back();
    }
    catch (err) {
      setConfirmSave(false);
      void dialogs.notify('Could not save plan', (err as Error).message || 'Please try again.');
    }
  };

  const summary = [
    `${name.trim() || 'Untitled'} — ${rupeesExact(amountPaise / 100)} ${cycleLabel.toLowerCase()}`,
    paise(discount) > 0 ? `${rupeesExact(price)} less ${rupeesExact(discount)}` : null,
    `${packageIds.length} ${packageIds.length === 1 ? 'package' : 'packages'}`,
    editingId !== null ? 'Every line on this plan is charged the new amount from its next cycle.' : null,
  ].filter(Boolean).join(' · ');

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <ScreenHeader
        title={editingId !== null ? 'Edit Plan' : 'Add Plan'}
        subtitle="Your price and discount over provider packages"
        showBack
        withSafeArea
      />

      <KeyboardAwareScrollView
        style={{ flex: 1, paddingHorizontal: 16 }}
        contentContainerStyle={{ gap: 16, paddingTop: 8, paddingBottom: 112 }}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-1.5">
          <FieldLabel required>Plan Name</FieldLabel>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Satya Basic"
            testID="plan-name-input"
            maxLength={120}
            placeholderTextColor={colors.neutral[400]}
            className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          />
          {errors.name ? <Text className="text-xs text-danger-500">{errors.name}</Text> : null}
        </View>

        {editingId === null
          ? (
              <View className="gap-1.5">
                <ProviderPicker
                  providers={providers}
                  selectedId={providerId}
                  selectedName={providerName}
                  onSelect={(provider) => {
                    // Another provider's packages cannot be in this plan.
                    setProviderId(provider.id);
                    setProviderName(provider.name);
                    setPackageIds([]);
                  }}
                />
                {errors.provider ? <Text className="text-xs text-danger-500">{errors.provider}</Text> : null}
              </View>
            )
          : (
              <View className="gap-1.5">
                <FieldLabel>Provider</FieldLabel>
                <Text className="text-sm font-semibold text-foreground">{providerName}</Text>
              </View>
            )}

        <View className="flex-row gap-3">
          <View className="flex-1 gap-1.5">
            <FieldLabel required>Price (₹)</FieldLabel>
            <TextInput
              value={price}
              onChangeText={setPrice}
              placeholder="e.g. 300"
              testID="plan-price-input"
              keyboardType="decimal-pad"
              placeholderTextColor={colors.neutral[400]}
              className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
            />
            {errors.price ? <Text className="text-xs text-danger-500">{errors.price}</Text> : null}
          </View>
          <View className="flex-1 gap-1.5">
            <FieldLabel>Discount (₹)</FieldLabel>
            <TextInput
              value={discount}
              onChangeText={setDiscount}
              placeholder="e.g. 50"
              testID="plan-discount-input"
              keyboardType="decimal-pad"
              placeholderTextColor={colors.neutral[400]}
              className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
            />
            {errors.discount ? <Text className="text-xs text-danger-500">{errors.discount}</Text> : null}
          </View>
        </View>

        <Card className="flex-row items-center justify-between border border-primary-500 bg-primary-50 p-4 dark:bg-primary-950/40">
          <Text className="text-xs font-semibold tracking-wider text-primary-600 uppercase">Customer pays</Text>
          <PlanPrice price={(paise(price) / 100).toFixed(2)} amount={(Math.max(0, amountPaise) / 100).toFixed(2)} className="text-lg font-extrabold text-foreground" testID="plan-amount-preview" />
        </Card>

        <View className="gap-1.5">
          <FieldLabel required>Billing Cycle</FieldLabel>
          <Pressable
            accessibilityRole="button"
            testID="plan-cycle-picker"
            onPress={() => setCycleOpen(!cycleOpen)}
            className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3.5"
          >
            <Text className="text-sm font-medium text-foreground">{cycleLabel}</Text>
            <ThemedIcon icon={ArrowDown01Icon} size={18} colorClassName="text-muted-foreground" />
          </Pressable>
          {cycleOpen
            ? (
                <Card className="border border-border p-1">
                  {BILLING_OPTIONS.map(option => (
                    <Pressable
                      key={option.key}
                      onPress={() => {
                        setBillingCycle(option.key);
                        setCycleOpen(false);
                      }}
                      className={`rounded-xl px-4 py-2.5 ${billingCycle === option.key ? 'bg-primary-50 dark:bg-primary-950/60' : ''}`}
                    >
                      <Text className={`text-sm font-semibold ${billingCycle === option.key ? 'text-primary-600' : 'text-foreground'}`}>{option.label}</Text>
                    </Pressable>
                  ))}
                </Card>
              )
            : null}
        </View>

        <View className="gap-1.5">
          <FieldLabel required>Provider packages</FieldLabel>
          <Text className="text-xs text-muted-foreground">
            What the provider switches on for this plan. Customers see only the plan.
          </Text>
          {errors.packages ? <Text className="text-xs text-danger-500">{errors.packages}</Text> : null}
          <Card className="border border-border p-1">
            {providerId === ''
              ? <Text className="px-4 py-3 text-sm text-muted-foreground">Choose a provider first</Text>
              : isLoadingPackages
                ? <Text className="px-4 py-3 text-sm text-muted-foreground">Loading packages…</Text>
                : offered.length === 0
                  ? <Text className="px-4 py-3 text-sm text-muted-foreground">This provider has no active packages.</Text>
                  : offered.map((pkg) => {
                      const picked = packageIds.includes(pkg.id);
                      return (
                        <Pressable
                          key={pkg.id}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: picked }}
                          accessibilityLabel={pkg.name}
                          onPress={() => togglePackage(pkg.id)}
                          className={`flex-row items-center justify-between rounded-xl px-4 py-2.5 ${picked ? 'bg-primary-50 dark:bg-primary-950/60' : ''}`}
                        >
                          <View className="flex-1">
                            <Text className={`text-sm font-semibold ${picked ? 'text-primary-600' : 'text-foreground'}`}>{pkg.name}</Text>
                            <Text className="text-xs text-muted-foreground">{`Provider rate ${rupeesExact(pkg.price)} • ${pkg.packageType.replace('_', ' ')}`}</Text>
                          </View>
                          {picked ? <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} color={colors.primary[600]} /> : null}
                        </Pressable>
                      );
                    })}
          </Card>
        </View>

        <View className="gap-1.5">
          <FieldLabel>Description</FieldLabel>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What the customer gets"
            multiline
            numberOfLines={3}
            maxLength={500}
            textAlignVertical="top"
            placeholderTextColor={colors.neutral[400]}
            className="min-h-[84px] rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          />
        </View>

        {editingId !== null
          ? (
              <View className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
                <FieldLabel>Offered to new lines</FieldLabel>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  testID="plan-active-toggle"
                  trackColor={{ false: colors.neutral[300], true: colors.primary[500] }}
                  thumbColor="#ffffff"
                />
              </View>
            )
          : null}
      </KeyboardAwareScrollView>

      <SaveBar label={editingId !== null ? 'Save Changes' : 'Save Plan'} busyLabel="Saving Plan…" busy={isSaving} onPress={handleSubmit} />

      <ConfirmDialog
        visible={confirmSave}
        busy={isSaving}
        tone="default"
        icon={DiscountTag01Icon}
        title={editingId !== null ? 'Save changes' : 'Create plan'}
        confirmLabel={editingId !== null ? 'Save changes' : 'Create plan'}
        message={summary}
        onConfirm={handleSave}
        onCancel={() => setConfirmSave(false)}
      />
    </View>
  );
}

export default AddEditPlanScreen;

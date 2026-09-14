import type { ServiceProvider } from '@/lib/api/types';
import { ArrowDown01Icon, ArrowLeft01Icon, ArrowRight01Icon, Location01Icon, PackageIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Alert, ScrollView, Switch, TextInput } from 'react-native';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { SaveBar } from '@/components/common/save-bar';
import { Card } from '@/components/common/shell';
import {
  colors,
  FocusAwareStatusBar,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from '@/components/ui';
import { QUERY_KEYS } from '@/constants';
import { useCreatePackage, usePackageDetail, useSetPackageChannels, useUpdatePackage } from '@/lib/hooks/api/use-packages';
import { useServiceProviders } from '@/lib/hooks/api/use-service-providers';
import { sameChannels, usePackageFormStore } from '@/lib/hooks/stores/use-package-form-store';

const BILLING_OPTIONS: { key: 'monthly' | 'quarterly' | 'semi_annual' | 'annual'; label: string }[] = [
  { key: 'monthly', label: 'Monthly' },
  { key: 'quarterly', label: 'Quarterly' },
  { key: 'semi_annual', label: 'Semi-Annual' },
  { key: 'annual', label: 'Annual' },
];

function FieldLabel({ children, required }: { children: string; required?: boolean }) {
  return (
    <Text className="text-sm font-bold text-foreground">
      {children}
      {required ? <Text className="text-primary-600"> *</Text> : null}
    </Text>
  );
}

function ProviderPicker({
  providers,
  selectedId,
  selectedName,
  onSelect,
}: {
  providers: ServiceProvider[];
  selectedId: string;
  selectedName: string;
  onSelect: (provider: ServiceProvider) => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <View className="gap-1.5">
      <FieldLabel required>Provider</FieldLabel>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose provider"
        onPress={() => setOpen(!open)}
        className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3.5"
      >
        <Text className={`text-sm font-medium ${selectedId ? 'text-foreground' : 'text-muted-foreground'}`}>
          {selectedName || 'Select a provider'}
        </Text>
        <HugeiconsIcon icon={ArrowDown01Icon} size={18} color={colors.neutral[400]} />
      </Pressable>
      {open
        ? (
            <Card className="border border-border p-1">
              {providers.length === 0
                ? (
                    <Text className="px-4 py-3 text-sm text-muted-foreground">
                      No providers yet — add one from Services first.
                    </Text>
                  )
                : providers.map(provider => (
                    <Pressable
                      key={provider.id}
                      onPress={() => {
                        onSelect(provider);
                        setOpen(false);
                      }}
                      className={`rounded-xl px-4 py-2.5 ${provider.id === selectedId ? 'dark:bg-primary-950/60 bg-primary-50' : ''}`}
                    >
                      <Text className={`text-sm font-semibold ${provider.id === selectedId ? 'text-primary-600' : 'text-foreground'}`}>
                        {provider.name}
                      </Text>
                      <Text className="text-xs text-muted-foreground">{provider.serviceName}</Text>
                    </Pressable>
                  ))}
            </Card>
          )
        : null}
    </View>
  );
}

// eslint-disable-next-line max-lines-per-function
export function AddEditPackageScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const providerId = usePackageFormStore(s => s.providerId);
  const providerName = usePackageFormStore(s => s.providerName);
  const packageName = usePackageFormStore(s => s.packageName);
  const price = usePackageFormStore(s => s.price);
  const billingCycle = usePackageFormStore(s => s.billingCycle);
  const description = usePackageFormStore(s => s.description);
  const isActive = usePackageFormStore(s => s.isActive);
  const selectedChannelIds = usePackageFormStore(s => s.selectedChannelIds);
  const initialChannelIds = usePackageFormStore(s => s.initialChannelIds);
  const editingPackageId = usePackageFormStore(s => s.editingPackageId);
  const setField = usePackageFormStore(s => s.setField);
  const setProvider = usePackageFormStore(s => s.setProvider);
  const hydrateChannels = usePackageFormStore(s => s.hydrateChannels);
  const reset = usePackageFormStore(s => s.reset);

  const [cycleDropdownOpen, setCycleDropdownOpen] = React.useState(false);
  const [confirmSave, setConfirmSave] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const { data: providers = [] } = useServiceProviders();

  // The package's coverage cannot exceed its provider's, so the picker needs
  // both ids — the provider row is the only place the service id is to hand.
  const providerServiceId = providers.find(p => p.id === providerId)?.serviceId;

  // Editing: the saved lineup is only on the detail endpoint, and without it
  // "0 channels selected" would silently wipe the bouquet on save.
  const { data: detail } = usePackageDetail({
    variables: { id: editingPackageId ?? '' },
    enabled: Boolean(editingPackageId),
  });

  React.useEffect(() => {
    if (detail)
      hydrateChannels(detail.id, detail.channels.map(channel => channel.id));
  }, [detail, hydrateChannels]);

  const createPackage = useCreatePackage();
  const updatePackage = useUpdatePackage();
  const setPackageChannels = useSetPackageChannels();

  const isSaving = createPackage.isPending || updatePackage.isPending || setPackageChannels.isPending;

  const summary = [
    `${packageName.trim() || 'Untitled'} — ₹${Number(price) || 0} ${BILLING_OPTIONS.find(o => o.key === billingCycle)?.label.toLowerCase() ?? 'monthly'}`,
    providerName ? `Provider: ${providerName}` : null,
    `${selectedChannelIds.length} ${selectedChannelIds.length === 1 ? 'channel' : 'channels'}`,
    isActive ? 'Active' : 'Inactive',
  ].filter(Boolean).join(' · ');

  const handleSubmit = () => {
    const errs: Record<string, string> = {};
    if (!packageName.trim())
      errs.name = 'Package name is required';
    if (!providerId)
      errs.provider = 'Choose the provider that sells this package';

    const numPrice = Number(price);
    if (!price.trim() || Number.isNaN(numPrice) || numPrice < 0)
      errs.price = 'Valid price is required';

    setErrors(errs);
    if (Object.keys(errs).length === 0)
      setConfirmSave(true);
  };

  const handleSave = async () => {
    const numPrice = Number(price);

    try {
      const saved = editingPackageId
        ? await updatePackage.mutateAsync({
            id: editingPackageId,
            patch: {
              name: packageName.trim(),
              // Money crosses the wire as a decimal string, never a number.
              price: numPrice.toFixed(2),
              billingCycle,
              description: description.trim() || null,
              status: isActive ? 'active' : 'inactive',
            },
          })
        : await createPackage.mutateAsync({
            payload: {
              serviceProviderId: providerId,
              name: packageName.trim(),
              price: numPrice.toFixed(2),
              billingCycle,
              description: description.trim() || undefined,
            },
          });

      // Only when it actually changed — a PUT here rewrites the whole lineup.
      if (!sameChannels(selectedChannelIds, initialChannelIds))
        await setPackageChannels.mutateAsync({ id: saved.id, channelIds: selectedChannelIds });

      await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PACKAGES] });
      await queryClient.invalidateQueries({ queryKey: ['service-providers'] });

      setConfirmSave(false);
      reset();
      router.back();
    }
    catch (err) {
      setConfirmSave(false);
      Alert.alert('Could not save package', (err as Error).message || 'Please try again.');
    }
  };

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <SafeAreaView edges={['top']} className="bg-surface">
        <View className="flex-row items-center gap-3 px-3 pt-1 pb-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            className="size-9 items-center justify-center rounded-lg border border-border bg-card"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={20} color={colors.charcoal[900]} strokeWidth={2.2} />
          </Pressable>
          <View>
            <Text className="text-xl font-bold text-foreground">
              {editingPackageId ? 'Edit Package' : 'Add Package'}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {editingPackageId ? 'Update package details' : 'Create a new package'}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1 px-4"
        contentContainerClassName="pt-2 pb-28 gap-4"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-1.5">
          <FieldLabel required>Package Name</FieldLabel>
          <TextInput
            value={packageName}
            onChangeText={v => setField('packageName', v)}
            placeholder="e.g. Basic Pack"
            placeholderTextColor={colors.neutral[400]}
            className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          />
          {errors.name ? <Text className="text-xs text-danger-500">{errors.name}</Text> : null}
        </View>

        <View className="gap-1.5">
          <ProviderPicker
            providers={providers}
            selectedId={providerId}
            selectedName={providerName}
            onSelect={provider => setProvider({ id: provider.id, name: provider.name })}
          />
          {errors.provider ? <Text className="text-xs text-danger-500">{errors.provider}</Text> : null}
        </View>

        <View className="gap-1.5">
          <FieldLabel required>Price (₹)</FieldLabel>
          <TextInput
            value={price}
            onChangeText={v => setField('price', v)}
            placeholder="e.g. 299"
            keyboardType="numeric"
            placeholderTextColor={colors.neutral[400]}
            className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          />
          {errors.price ? <Text className="text-xs text-danger-500">{errors.price}</Text> : null}
        </View>

        <View className="gap-1.5">
          <FieldLabel required>Billing Cycle</FieldLabel>
          <Pressable
            accessibilityRole="button"
            onPress={() => setCycleDropdownOpen(!cycleDropdownOpen)}
            className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3.5"
          >
            <Text className="text-sm font-medium text-foreground">
              {BILLING_OPTIONS.find(o => o.key === billingCycle)?.label ?? 'Monthly'}
            </Text>
            <HugeiconsIcon icon={ArrowDown01Icon} size={18} color={colors.neutral[400]} />
          </Pressable>
          {cycleDropdownOpen
            ? (
                <Card className="border border-border p-1">
                  {BILLING_OPTIONS.map(opt => (
                    <Pressable
                      key={opt.key}
                      onPress={() => {
                        setField('billingCycle', opt.key);
                        setCycleDropdownOpen(false);
                      }}
                      className={`rounded-xl px-4 py-2.5 ${billingCycle === opt.key ? 'dark:bg-primary-950/60 bg-primary-50' : ''}`}
                    >
                      <Text className={`text-sm font-semibold ${billingCycle === opt.key ? 'text-primary-600' : 'text-foreground'}`}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </Card>
              )
            : null}
        </View>

        <View className="gap-1.5">
          <FieldLabel>Description</FieldLabel>
          <TextInput
            value={description}
            onChangeText={v => setField('description', v)}
            placeholder="Enter package description..."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            placeholderTextColor={colors.neutral[400]}
            className="min-h-[84px] rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          />
        </View>

        <View className="gap-1.5">
          <FieldLabel>Channels</FieldLabel>
          <Text className="text-xs text-muted-foreground">
            {providerId ? 'Select channels (optional)' : 'Choose a provider first'}
          </Text>
          <Card className="border border-border p-4">
            <Pressable
              accessibilityRole="button"
              disabled={!providerId}
              onPress={() => router.push('/admin/packages/channels')}
              className={`flex-row items-center justify-between ${providerId ? '' : 'opacity-50'}`}
            >
              <Text className="text-sm font-medium text-muted-foreground">
                {selectedChannelIds.length}
                {' channels selected'}
              </Text>
              <View className="flex-row items-center gap-1">
                <Text className="text-xs font-semibold text-foreground">Select Channels</Text>
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} color={colors.neutral[500]} />
              </View>
            </Pressable>
          </Card>
        </View>

        {editingPackageId
          ? (
              <View className="gap-1.5">
                <FieldLabel>Where it is sold</FieldLabel>
                <Text className="text-xs text-muted-foreground">
                  By default this package goes wherever its provider does. Narrowing it
                  here is how the same package is sold in one area and not another.
                </Text>
                <Card className="border border-border p-4">
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push(
                      `/coverage?scope=package&id=${editingPackageId}&serviceId=${providerServiceId ?? ''}&providerId=${providerId ?? ''}&name=${encodeURIComponent(packageName)}`,
                    )}
                    className="flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center gap-2.5">
                      <HugeiconsIcon icon={Location01Icon} size={18} color={colors.primary[600]} strokeWidth={2} />
                      <Text className="text-sm font-medium text-muted-foreground">Package coverage</Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Text className="text-xs font-semibold text-foreground">Choose locations</Text>
                      <HugeiconsIcon icon={ArrowRight01Icon} size={16} color={colors.neutral[500]} />
                    </View>
                  </Pressable>
                </Card>
              </View>
            )
          : null}

        <View className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
          <FieldLabel>Is Active</FieldLabel>
          <Switch
            value={isActive}
            onValueChange={v => setField('isActive', v)}
            trackColor={{ false: colors.neutral[300], true: colors.primary[500] }}
            thumbColor="#ffffff"
          />
        </View>
      </ScrollView>

      <SaveBar
        label={editingPackageId ? 'Save Changes' : 'Save Package'}
        busyLabel="Saving Package…"
        busy={isSaving}
        onPress={handleSubmit}
      />

      <ConfirmDialog
        visible={confirmSave}
        busy={isSaving}
        tone="default"
        icon={PackageIcon}
        title={editingPackageId ? 'Save changes' : 'Create package'}
        confirmLabel={editingPackageId ? 'Save changes' : 'Create package'}
        message={summary}
        onConfirm={handleSave}
        onCancel={() => setConfirmSave(false)}
      />
    </View>
  );
}

export default AddEditPackageScreen;

import type { PackageDoc, PackagePayload } from '@/types/service';
import { Cancel01Icon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { Modal, ScrollView, TextInput, TouchableOpacity } from 'react-native';

import { Button, colors, Pressable, Text, View } from '@/components/ui';
import { useCreatePackage, useUpdatePackage } from '@/lib/hooks/use-packages';

export type PackageFormModalProps = {
  /** Existing package for edit mode; omit for create mode. Mount only while open. */
  editing?: PackageDoc | null;
  onClose: () => void;
  onSuccess?: () => void;
};

const SERVICE_TYPES: { key: PackageDoc['serviceType']; label: string }[] = [
  { key: 'cable_tv', label: 'Cable TV' },
  { key: 'internet', label: 'Broadband' },
  { key: 'fiber', label: 'Fiber' },
  { key: 'iptv', label: 'IPTV' },
  { key: 'combo', label: 'Combo' },
];

const EMPTY = {
  name: '',
  description: '',
  serviceType: 'cable_tv' as PackageDoc['serviceType'],
  monthlyPrice: '',
  setupFee: '',
  durationMonths: '1',
  channelCount: '',
  speedMbps: '',
  dataLimitGb: '',
  providerName: '',
  active: true,
};

function Field({ label, value, onChange, placeholder, keyboardType, multiline, error, testID }: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'numeric' | 'default';
  multiline?: boolean;
  error?: string;
  testID?: string;
}) {
  return (
    <View className="flex-1 gap-1">
      <Text className="text-sm font-bold text-foreground">{label}</Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
        placeholderTextColor={colors.neutral[400]}
        className="rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
      />
      {error ? <Text className="text-xs font-semibold text-danger-500">{error}</Text> : null}
    </View>
  );
}

function formFrom(editing?: PackageDoc | null) {
  if (!editing)
    return EMPTY;
  const str = (value?: number) => (value != null ? String(value) : '');
  return {
    name: editing.name,
    description: editing.description ?? '',
    serviceType: editing.serviceType,
    monthlyPrice: str(editing.monthlyPrice),
    setupFee: str(editing.setupFee),
    durationMonths: String(editing.durationMonths ?? 1),
    channelCount: str(editing.channelCount),
    speedMbps: str(editing.speedMbps),
    dataLimitGb: str(editing.dataLimitGb),
    providerName: editing.providerName ?? '',
    active: editing.active,
  };
}

// eslint-disable-next-line max-lines-per-function
export function PackageFormModal({ editing, onClose, onSuccess }: PackageFormModalProps) {
  const [form, setForm] = React.useState(() => formFrom(editing));
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [done, setDone] = React.useState(false);
  const createPackage = useCreatePackage();
  const updatePackage = useUpdatePackage();

  const isEdit = Boolean(editing);
  const isSaving = createPackage.isPending || updatePackage.isPending;

  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim())
      errs.name = 'Package name is required';
    const price = Number(form.monthlyPrice);
    if (!form.monthlyPrice.trim() || Number.isNaN(price) || price < 0)
      errs.monthlyPrice = 'Enter a valid monthly price';
    const duration = Number(form.durationMonths);
    if (Number.isNaN(duration) || duration < 1)
      errs.durationMonths = 'Duration must be at least 1 month';
    setErrors(errs);
    if (Object.keys(errs).length > 0)
      return;

    const num = (raw: string) => (raw.trim() ? Number(raw) : undefined);
    const payload: PackagePayload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      serviceType: form.serviceType,
      monthlyPrice: price,
      setupFee: num(form.setupFee),
      durationMonths: duration,
      channelCount: num(form.channelCount),
      speedMbps: num(form.speedMbps),
      dataLimitGb: num(form.dataLimitGb),
      providerName: form.providerName.trim() || undefined,
      active: form.active,
    };

    try {
      if (editing)
        await updatePackage.mutateAsync({ id: editing.id, patch: payload });
      else
        await createPackage.mutateAsync({ payload });

      setDone(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 700);
    }
    catch (err) {
      setErrors({ submit: (err as Error).message || 'Could not save the package. Please try again.' });
    }
  };

  const isBroadband = form.serviceType !== 'cable_tv';

  return (
    <Modal animationType="slide" transparent visible onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <View className="max-h-[90%] rounded-t-3xl border-t border-border bg-surface">
          <View className="flex-row items-center justify-between border-b border-border/60 px-5 py-4">
            <View className="flex-1">
              <Text className="text-xl font-extrabold text-foreground">
                {isEdit ? 'Edit Package' : 'New Package'}
              </Text>
              <Text className="text-xs text-muted-foreground">
                Plans defined here appear as services on customer connections
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12} className="rounded-full bg-neutral-100 p-2 dark:bg-neutral-800">
              <HugeiconsIcon icon={Cancel01Icon} size={20} color={colors.neutral[500]} />
            </TouchableOpacity>
          </View>

          <ScrollView className="px-5 py-4" contentContainerClassName="gap-3.5 pb-8" keyboardShouldPersistTaps="handled">
            {done
              ? (
                  <View className="items-center justify-center gap-3 py-10">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={48} color={colors.success[500]} />
                    <Text className="text-lg font-bold text-success-600">
                      {isEdit ? 'Package updated' : 'Package created'}
                    </Text>
                  </View>
                )
              : (
                  <>
                    <Field
                      label="Package Name *"
                      testID="package-name-input"
                      value={form.name}
                      onChange={text => set('name', text)}
                      placeholder="e.g. HD Starter Pack"
                      error={errors.name}
                    />

                    <View className="gap-1">
                      <Text className="text-sm font-bold text-foreground">Service Type</Text>
                      <View className="flex-row flex-wrap gap-2">
                        {SERVICE_TYPES.map(item => (
                          <Pressable
                            key={item.key}
                            accessibilityRole="button"
                            onPress={() => set('serviceType', item.key)}
                            className={`rounded-full px-4 py-2 ${
                              form.serviceType === item.key ? 'bg-primary-500' : 'border border-border bg-card'
                            }`}
                          >
                            <Text className={`text-xs font-extrabold ${
                              form.serviceType === item.key ? 'text-white' : 'text-neutral-600 dark:text-neutral-300'
                            }`}
                            >
                              {item.label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    <View className="flex-row gap-3">
                      <Field
                        label="Monthly Price (₹) *"
                        testID="package-price-input"
                        value={form.monthlyPrice}
                        onChange={text => set('monthlyPrice', text)}
                        keyboardType="numeric"
                        placeholder="350"
                        error={errors.monthlyPrice}
                      />
                      <Field
                        label="Duration (months) *"
                        testID="package-duration-input"
                        value={form.durationMonths}
                        onChange={text => set('durationMonths', text)}
                        keyboardType="numeric"
                        placeholder="1"
                        error={errors.durationMonths}
                      />
                    </View>

                    <View className="flex-row gap-3">
                      <Field
                        label="Setup Fee (₹)"
                        testID="package-setup-fee-input"
                        value={form.setupFee}
                        onChange={text => set('setupFee', text)}
                        keyboardType="numeric"
                        placeholder="Optional"
                      />
                      {isBroadband
                        ? (
                            <Field
                              label="Speed (Mbps)"
                              testID="package-speed-input"
                              value={form.speedMbps}
                              onChange={text => set('speedMbps', text)}
                              keyboardType="numeric"
                              placeholder="100"
                            />
                          )
                        : (
                            <Field
                              label="Channels"
                              testID="package-channels-input"
                              value={form.channelCount}
                              onChange={text => set('channelCount', text)}
                              keyboardType="numeric"
                              placeholder="250"
                            />
                          )}
                    </View>

                    {isBroadband
                      ? (
                          <Field
                            label="Data Limit (GB)"
                            testID="package-data-limit-input"
                            value={form.dataLimitGb}
                            onChange={text => set('dataLimitGb', text)}
                            keyboardType="numeric"
                            placeholder="Blank for unlimited"
                          />
                        )
                      : null}

                    <Field
                      label="Provider / MSO"
                      testID="package-provider-input"
                      value={form.providerName}
                      onChange={text => set('providerName', text)}
                      placeholder="e.g. Satya Cable & Broadband"
                    />

                    <Field
                      label="Description"
                      testID="package-description-input"
                      value={form.description}
                      onChange={text => set('description', text)}
                      placeholder="What this plan includes"
                      multiline
                    />

                    <Pressable
                      testID="package-active-toggle"
                      accessibilityRole="switch"
                      accessibilityLabel="Available for sale"
                      accessibilityState={{ checked: form.active }}
                      onPress={() => set('active', !form.active)}
                      className="flex-row items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
                    >
                      <View className="flex-1">
                        <Text className="text-sm font-bold text-foreground">Available for sale</Text>
                        <Text className="text-xs text-muted-foreground">
                          Inactive plans stay on existing customers but cannot be newly assigned
                        </Text>
                      </View>
                      <View className={`ml-3 rounded-full px-3 py-1 ${form.active ? 'bg-success-500' : 'bg-neutral-300 dark:bg-neutral-700'}`}>
                        <Text className="text-[11px] font-extrabold text-white">{form.active ? 'ON' : 'OFF'}</Text>
                      </View>
                    </Pressable>

                    {errors.submit ? <Text className="text-xs font-semibold text-danger-500">{errors.submit}</Text> : null}
                  </>
                )}
          </ScrollView>

          {done
            ? null
            : (
                <View className="flex-row items-center gap-3 border-t border-border/60 bg-surface px-5 py-4">
                  <View className="flex-1">
                    <Button testID="package-cancel-button" label="Cancel" variant="outline" size="lg" onPress={onClose} />
                  </View>
                  <View className="flex-1">
                    <Button
                      testID="package-submit-button"
                      label={isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Package'}
                      size="lg"
                      disabled={isSaving}
                      onPress={handleSubmit}
                    />
                  </View>
                </View>
              )}
        </View>
      </View>
    </Modal>
  );
}

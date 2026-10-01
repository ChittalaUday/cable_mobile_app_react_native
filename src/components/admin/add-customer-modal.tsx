import type { CustomerDetail, Location } from '@/lib/api/types';
import type { NormalizedPackage } from '@/lib/hooks/api/use-packages';
import {
  AlertCircleIcon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Tv01Icon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, TextInput, TouchableOpacity } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Button, colors, Pressable, Text, View } from '@/components/ui';

import { useCreateCustomer, useCustomers } from '@/lib/hooks/api/use-customers';
import { useLocations } from '@/lib/hooks/api/use-locations';
import { usePackages } from '@/lib/hooks/api/use-packages';
import { useDismissKeyboardOnExit } from '@/lib/hooks/common/use-dismiss-keyboard';

export type AddCustomerModalProps = {
  visible: boolean;
  onClose: () => void;
  /** The subscriber that was registered, so the caller can open or refresh it. */
  onSuccess?: (created: CustomerDetail) => void;
};

type StepKey = 1 | 2;

/** How many matching areas to offer at once. More than this means search harder. */
const AREA_RESULTS = 8;

/**
 * Register a subscriber and fit their first connection, in one sheet.
 *
 * Two steps, not three. The package is picked from the tenant's own catalogue
 * rather than typed, because its price, cycle and provider all come with it,
 * and the area is picked from the location tree, because that is what decides
 * who can see this customer afterwards. Hardware is not here at all: issuing a
 * box moves stock and books a serial, which is the inventory flow's job.
 */
export function AddCustomerModal({ visible, onClose, onSuccess }: AddCustomerModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = React.useState<StepKey>(1);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = React.useState('');

  // This modal stays mounted between openings, so closing it is `visible`
  // going false rather than an unmount.
  useDismissKeyboardOnExit(visible);

  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [address, setAddress] = React.useState('');

  const digits = phone.replace(/\D/g, '');

  /**
   * Is this number already on the book?
   *
   * A second line for the same person belongs on their existing record as
   * another connection — registering them twice splits one household's balance
   * across two accounts, and nothing afterwards puts it back together. It warns
   * rather than blocks: a shop and the flat above it really do share a handset.
   */
  const { data: phoneMatches } = useCustomers({
    variables: { q: digits },
    enabled: digits.length === 10,
  });
  const duplicate = digits.length === 10
    ? (phoneMatches?.pages[0]?.items ?? []).find(item => item.phone === digits) ?? null
    : null;

  const [packageId, setPackageId] = React.useState<string | null>(null);
  const [areaQuery, setAreaQuery] = React.useState('');
  const [area, setArea] = React.useState<Location | null>(null);

  const { mutateAsync: createCustomer, isPending } = useCreateCustomer();
  const { data: allPackages } = usePackages({ variables: { status: 'active' } });
  const { data: areaPage } = useLocations({ variables: areaQuery.trim() === '' ? undefined : { q: areaQuery.trim() } });

  const catalogue = (allPackages ?? []).filter(item => item.active);
  const chosen = catalogue.find(item => item.id === packageId) ?? null;
  const areas = (areaPage?.items ?? []).slice(0, AREA_RESULTS);

  const resetForm = () => {
    setStep(1);
    setErrors({});
    setSuccessMessage('');
    setName('');
    setPhone('');
    setAddress('');
    setPackageId(null);
    setAreaQuery('');
    setArea(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim())
      errs.name = t('add_customer.name_required', 'Full name is required');

    if (digits.length !== 10)
      errs.phone = t('add_customer.phone_required', 'Valid 10-digit phone number is required');

    if (!address.trim())
      errs.address = t('add_customer.address_required', 'Address / Line Area is required');

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};
    if (chosen === null)
      errs.packageId = t('add_customer.package_required', 'Pick the package this connection is on');

    if (area === null)
      errs.area = t('add_customer.area_required', 'Pick the area the line is fitted in');

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep1())
      setStep(2);
  };

  const handleSubmit = async () => {
    if (!validateStep2() || chosen === null || area === null)
      return;

    try {
      const created = await createCustomer({
        payload: {
          name: name.trim(),
          phone: digits,
          address: address.trim(),
          connection: {
            packageId: chosen.id,
            locationId: area.id,
            installationAddress: address.trim(),
          },
        },
      });

      setSuccessMessage(t('add_customer.success', 'Customer added successfully!'));
      setTimeout(() => {
        onSuccess?.(created);
        handleClose();
      }, 1000);
    }
    catch (failure) {
      setErrors({ submit: (failure as Error).message || 'Failed to add customer. Please try again.' });
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={handleClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <View className="max-h-[90%] rounded-t-3xl border-t border-border bg-surface">
          <View className="flex-row items-center justify-between border-b border-border/60 px-5 py-4">
            <View>
              <Text className="text-xl font-extrabold text-foreground">
                {t('add_customer.title', 'Add New Customer')}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {t('add_customer.subtitle', 'Register the subscriber and their first connection')}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={12} testID="add-customer-close" accessibilityRole="button" accessibilityLabel={t('add_customer.close', 'Close')} className="rounded-full bg-neutral-100 p-2 dark:bg-neutral-800">
              <HugeiconsIcon icon={Cancel01Icon} size={20} color={colors.neutral[500]} />
            </TouchableOpacity>
          </View>

          <View className="flex-row border-b border-border/40 bg-neutral-50 px-4 py-3 dark:bg-neutral-900/40">
            {[
              { key: 1, label: t('add_customer.step1_title', '1. Customer Details'), icon: UserIcon },
              { key: 2, label: t('add_customer.step2_title', '2. Connection'), icon: Tv01Icon },
            ].map((item) => {
              const isActive = step === item.key;
              const isDone = step > item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => {
                    if (item.key < step)
                      setStep(item.key as StepKey);
                  }}
                  className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl px-1.5 py-2.5 ${
                    isActive
                      ? 'bg-primary-500'
                      : isDone
                        ? 'bg-primary-100 dark:bg-neutral-800'
                        : 'bg-transparent'
                  }`}
                >
                  <HugeiconsIcon
                    icon={item.icon}
                    size={16}
                    color={isActive ? '#ffffff' : isDone ? colors.primary[600] : colors.neutral[400]}
                  />
                  <Text
                    className={`text-xs font-bold ${
                      isActive ? 'text-white' : isDone ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-500'
                    }`}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <KeyboardAwareScrollView
            style={{ paddingHorizontal: 20, paddingVertical: 16 }}
            contentContainerStyle={{ gap: 16, paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
            bottomOffset={24}
          >
            {successMessage !== '' && (
              <View className="items-center justify-center gap-3 py-10">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={48} color={colors.success[500]} />
                <Text className="text-lg font-bold text-success-600">{successMessage}</Text>
              </View>
            )}

            {successMessage === '' && step === 1 && (
              <View className="gap-3.5">
                <Field label={t('add_customer.full_name', 'Full Name')} required error={errors.name}>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder={t('add_customer.full_name_placeholder', 'e.g. Ramesh Kumar')}
                    placeholderTextColor={colors.neutral[400]}
                    className="rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
                  />
                </Field>

                <Field label={t('add_customer.phone', 'Mobile Number')} required error={errors.phone}>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    maxLength={10}
                    placeholder={t('add_customer.phone_placeholder', 'e.g. 9876543210')}
                    placeholderTextColor={colors.neutral[400]}
                    className="rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
                  />
                  {duplicate !== null && (
                    <View className="mt-1 flex-row items-center gap-1.5 rounded-lg bg-warning-50 p-2.5 dark:bg-warning-900/20">
                      <HugeiconsIcon icon={AlertCircleIcon} size={16} color={colors.warning[500]} />
                      <Text className="flex-1 text-xs font-semibold text-warning-700 dark:text-warning-400" testID="add-customer-duplicate-phone">
                        {t('add_customer.duplicate_phone', 'Already registered')}
                        {': '}
                        {duplicate.name ?? duplicate.customerCode ?? t('add_customer.duplicate_phone_fallback', 'an existing customer')}
                        {duplicate.customerCode == null || duplicate.name == null ? '' : ` (${duplicate.customerCode})`}
                      </Text>
                    </View>
                  )}
                </Field>

                <Field label={t('add_customer.address', 'Address / Line Area')} required error={errors.address}>
                  <TextInput
                    value={address}
                    onChangeText={setAddress}
                    multiline
                    numberOfLines={2}
                    placeholder={t('add_customer.address_placeholder', 'e.g. Main Street, Door 4-12')}
                    placeholderTextColor={colors.neutral[400]}
                    className="rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
                  />
                </Field>
              </View>
            )}

            {successMessage === '' && step === 2 && (
              <View className="gap-3.5">
                <Field label={t('add_customer.choose_package', 'Package')} required error={errors.packageId}>
                  {catalogue.length === 0
                    ? (
                        <Text className="text-xs text-muted-foreground">
                          {t('add_customer.no_packages', 'No active packages yet. Add one under Packages first.')}
                        </Text>
                      )
                    : (
                        <View className="gap-2">
                          {catalogue.map(item => (
                            <PackageRow
                              key={item.id}
                              item={item}
                              selected={item.id === packageId}
                              onPress={() => setPackageId(item.id)}
                            />
                          ))}
                        </View>
                      )}
                </Field>

                <Field label={t('add_customer.area', 'Area the line is fitted in')} required error={errors.area}>
                  <TextInput
                    value={areaQuery}
                    onChangeText={setAreaQuery}
                    placeholder={t('add_customer.area_placeholder', 'Search an area or block')}
                    placeholderTextColor={colors.neutral[400]}
                    autoCorrect={false}
                    className="rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
                    testID="add-customer-area-search"
                  />
                  <View className="mt-2 gap-2">
                    {areas.length === 0
                      ? (
                          <Text className="text-xs text-muted-foreground">
                            {t('add_customer.no_areas', 'No area matches that.')}
                          </Text>
                        )
                      : areas.map(node => (
                          <Pressable
                            key={node.id}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: node.id === area?.id }}
                            onPress={() => setArea(node)}
                            className={`rounded-xl border px-3.5 py-2.5 ${
                              node.id === area?.id ? 'border-primary-500 bg-primary-500/10' : 'border-border bg-card'
                            }`}
                          >
                            <Text className="text-sm font-bold text-foreground" numberOfLines={1}>{node.name}</Text>
                            <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>{node.path}</Text>
                          </Pressable>
                        ))}
                  </View>
                </Field>

                {errors.submit != null && (
                  <View className="flex-row items-center gap-1.5 rounded-lg bg-danger-50 p-2.5 dark:bg-danger-900/20">
                    <HugeiconsIcon icon={AlertCircleIcon} size={16} color={colors.danger[500]} />
                    <Text className="text-xs font-semibold text-danger-500">{errors.submit}</Text>
                  </View>
                )}
              </View>
            )}
          </KeyboardAwareScrollView>

          {successMessage === '' && (
            <View className="flex-row items-center gap-3 border-t border-border/60 bg-surface px-5 py-4">
              {step > 1 && (
                <View className="flex-1">
                  <Button
                    label={t('add_customer.back', 'Back')}
                    variant="outline"
                    size="lg"
                    onPress={() => {
                      setErrors({});
                      setStep(1);
                    }}
                  />
                </View>
              )}

              <View className="flex-1">
                {step === 1
                  ? <Button label={t('add_customer.next', 'Next Step')} size="lg" onPress={handleNext} />
                  : (
                      <Button
                        label={isPending
                          ? t('add_customer.submitting', 'Creating Customer...')
                          : t('add_customer.submit', 'Create Customer')}
                        size="lg"
                        disabled={isPending}
                        onPress={() => void handleSubmit()}
                      />
                    )}
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Field({ label, required = false, error, children }: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-1">
      <Text className="text-sm font-bold text-foreground">
        {label}
        {required && <Text className="text-danger-500"> *</Text>}
      </Text>
      {children}
      {error != null && <Text className="text-xs font-semibold text-danger-500">{error}</Text>}
    </View>
  );
}

function PackageRow({ item, selected, onPress }: {
  item: NormalizedPackage;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`flex-row items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 ${
        selected ? 'border-primary-500 bg-primary-500/10' : 'border-border bg-card'
      }`}
    >
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-extrabold text-foreground" numberOfLines={1}>{item.name}</Text>
        {item.providerName != null && (
          <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>{item.providerName}</Text>
        )}
      </View>
      <Text className="text-xs font-bold text-primary-600">
        {`₹${item.monthlyPrice} / ${item.billingCycle}`}
      </Text>
    </Pressable>
  );
}

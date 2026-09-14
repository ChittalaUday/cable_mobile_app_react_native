import {
  AlertCircleIcon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Tv01Icon,
  UserIcon,
  Wifi01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, TextInput, TouchableOpacity } from 'react-native';

import { Button, colors, Pressable, Text, View } from '@/components/ui';
import { useCreateCustomer } from '@/lib/hooks/api/use-admin-dashboard';
import { usePackages } from '@/lib/hooks/api/use-packages';

export type AddCustomerModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

type StepKey = 1 | 2 | 3;

// eslint-disable-next-line max-lines-per-function
export function AddCustomerModal({ visible, onClose, onSuccess }: AddCustomerModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = React.useState<StepKey>(1);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = React.useState('');

  // Step 1 Form State
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [email, setEmail] = React.useState('');

  // Step 2 Form State
  const [serviceType, setServiceType] = React.useState<'cable' | 'broadband'>('cable');
  const [packageName, setPackageName] = React.useState('');
  const [monthlyPrice, setMonthlyPrice] = React.useState('350');
  const [speedMbps, setSpeedMbps] = React.useState('');
  const [packageId, setPackageId] = React.useState<string | undefined>();

  // Step 3 Form State
  const [stbNumber, setStbNumber] = React.useState('');
  const [vcNumber, setVcNumber] = React.useState('');
  const [locationLabel, setLocationLabel] = React.useState('Living Room');

  const createCustomerMutation = useCreateCustomer();
  const { data: allPackages = [] } = usePackages();

  /*
   * Every plan on sale.
   *
   * This used to narrow by the cable/broadband toggle below, which worked while
   * a package carried a fixed `serviceType`. Services are the tenant's own now,
   * so there is nothing to match that toggle against — the toggle still labels
   * the connection itself, but the catalogue is no longer filtered by it.
   *
   * ponytail: filter by service once this screen is wired to the real customer
   * API, which will know which service the connection is for.
   */
  const catalogue = React.useMemo(
    () => allPackages.filter(pkg => pkg.active),
    [allPackages],
  );

  const selectCataloguePackage = (pkg: (typeof allPackages)[number]) => {
    setPackageId(pkg.id);
    setPackageName(pkg.name);
    setMonthlyPrice(String(pkg.monthlyPrice));
    if (pkg.speedMbps)
      setSpeedMbps(String(pkg.speedMbps));
  };

  const resetForm = () => {
    setStep(1);
    setErrors({});
    setSuccessMessage('');
    setName('');
    setPhone('');
    setAddress('');
    setEmail('');
    setServiceType('cable');
    setPackageName('');
    setMonthlyPrice('350');
    setSpeedMbps('');
    setPackageId(undefined);
    setStbNumber('');
    setVcNumber('');
    setLocationLabel('Living Room');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) {
      errs.name = t('add_customer.name_required', 'Full name is required');
    }
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      errs.phone = t('add_customer.phone_required', 'Valid 10-digit phone number is required');
    }
    if (!address.trim()) {
      errs.address = t('add_customer.address_required', 'Address / Line Area is required');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!packageName.trim()) {
      errs.packageName = t('add_customer.package_required', 'Package name is required');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!stbNumber.trim() && !vcNumber.trim()) {
      errs.stbOrVc = t('add_customer.stb_or_vc_required', 'Please enter STB serial or VC card number');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
      if (!packageName) {
        setPackageName(serviceType === 'cable' ? 'Standard Cable HD Pack' : '100Mbps Fiber Broadband');
      }
    }
    else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    setErrors({});
    if (step > 1) {
      setStep((step - 1) as StepKey);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep3()) {
      return;
    }

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim(),
      serviceType,
      packageName: packageName.trim() || (serviceType === 'broadband' ? 'Fiber 100Mbps' : 'HD Starter Pack'),
      packageId,
      monthlyPrice: Number(monthlyPrice) || 350,
      speedMbps: speedMbps ? Number(speedMbps) : undefined,
      stbNumber: stbNumber.trim() || undefined,
      vcNumber: vcNumber.trim() || undefined,
      locationLabel: locationLabel.trim() || 'Living Room',
    };

    try {
      await createCustomerMutation.mutateAsync({ payload });
      setSuccessMessage(t('add_customer.success', 'Customer added successfully!'));
      setTimeout(() => {
        onSuccess?.();
        handleClose();
      }, 1000);
    }
    catch (err) {
      setErrors({ submit: (err as Error).message || 'Failed to add customer. Please try again.' });
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
          {/* Header Bar */}
          <View className="flex-row items-center justify-between border-b border-border/60 px-5 py-4">
            <View>
              <Text className="text-xl font-extrabold text-foreground">
                {t('add_customer.title', 'Add New Customer')}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {t('add_customer.subtitle', 'Register subscriber, service plan, and hardware box')}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={12} className="rounded-full bg-neutral-100 p-2 dark:bg-neutral-800">
              <HugeiconsIcon icon={Cancel01Icon} size={20} color={colors.neutral[500]} />
            </TouchableOpacity>
          </View>

          {/* Wizard Progress Steps Indicator */}
          <View className="flex-row border-b border-border/40 bg-neutral-50 px-4 py-3 dark:bg-neutral-900/40">
            {[
              { key: 1, label: t('add_customer.step1_title', '1. Customer Details'), icon: UserIcon },
              { key: 2, label: t('add_customer.step2_title', '2. Service Details'), icon: serviceType === 'broadband' ? Wifi01Icon : Tv01Icon },
              { key: 3, label: t('add_customer.step3_title', '3. Box Details'), icon: CheckmarkCircle02Icon },
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

          {/* Form Step Content */}
          <ScrollView className="px-5 py-4" contentContainerClassName="gap-4 pb-8" keyboardShouldPersistTaps="handled">
            {successMessage
              ? (
                  <View className="items-center justify-center gap-3 py-10">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={48} color={colors.success[500]} />
                    <Text className="text-lg font-bold text-success-600">{successMessage}</Text>
                  </View>
                )
              : null}

            {!successMessage && step === 1 && (
              <View className="gap-3.5">
                <View className="gap-1">
                  <Text className="text-sm font-bold text-foreground">
                    {t('add_customer.full_name', 'Full Name')}
                    {' '}
                    <Text className="text-danger-500">*</Text>
                  </Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder={t('add_customer.full_name_placeholder', 'e.g. Ramesh Kumar')}
                    placeholderTextColor={colors.neutral[400]}
                    className="rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
                  />
                  {errors.name && <Text className="text-xs font-semibold text-danger-500">{errors.name}</Text>}
                </View>

                <View className="gap-1">
                  <Text className="text-sm font-bold text-foreground">
                    {t('add_customer.phone', 'Mobile Number')}
                    {' '}
                    <Text className="text-danger-500">*</Text>
                  </Text>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    maxLength={10}
                    placeholder={t('add_customer.phone_placeholder', 'e.g. 9876543210')}
                    placeholderTextColor={colors.neutral[400]}
                    className="rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
                  />
                  {errors.phone && <Text className="text-xs font-semibold text-danger-500">{errors.phone}</Text>}
                </View>

                <View className="gap-1">
                  <Text className="text-sm font-bold text-foreground">
                    {t('add_customer.address', 'Address / Line Area')}
                    {' '}
                    <Text className="text-danger-500">*</Text>
                  </Text>
                  <TextInput
                    value={address}
                    onChangeText={setAddress}
                    multiline
                    numberOfLines={2}
                    placeholder={t('add_customer.address_placeholder', 'e.g. Main Street, Door 4-12')}
                    placeholderTextColor={colors.neutral[400]}
                    className="rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
                  />
                  {errors.address && <Text className="text-xs font-semibold text-danger-500">{errors.address}</Text>}
                </View>

                <View className="gap-1">
                  <Text className="text-sm font-bold text-foreground">
                    {t('add_customer.email', 'Email Address (Optional)')}
                  </Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder={t('add_customer.email_placeholder', 'e.g. ramesh@example.com')}
                    placeholderTextColor={colors.neutral[400]}
                    className="rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
                  />
                </View>
              </View>
            )}

            {!successMessage && step === 2 && (
              <View className="gap-3.5">
                <View className="gap-1">
                  <Text className="text-sm font-bold text-foreground">
                    {t('add_customer.service_type', 'Service Type')}
                  </Text>
                  <View className="flex-row gap-3">
                    <Pressable
                      onPress={() => {
                        setServiceType('cable');
                        setPackageId(undefined);
                        if (!packageName || packageName.includes('Broadband')) {
                          setPackageName('Standard Cable HD Pack');
                        }
                      }}
                      className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl border p-3.5 ${
                        serviceType === 'cable'
                          ? 'border-primary-500 bg-primary-500/10'
                          : 'border-border bg-card'
                      }`}
                    >
                      <HugeiconsIcon icon={Tv01Icon} size={20} color={serviceType === 'cable' ? colors.primary[600] : colors.neutral[500]} />
                      <Text className={`text-sm font-bold ${serviceType === 'cable' ? 'text-primary-600' : 'text-foreground'}`}>
                        {t('add_customer.cable_tv', 'Cable TV')}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        setServiceType('broadband');
                        setPackageId(undefined);
                        if (!packageName || packageName.includes('Cable')) {
                          setPackageName('100Mbps Fiber Broadband');
                        }
                      }}
                      className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl border p-3.5 ${
                        serviceType === 'broadband'
                          ? 'border-primary-500 bg-primary-500/10'
                          : 'border-border bg-card'
                      }`}
                    >
                      <HugeiconsIcon icon={Wifi01Icon} size={20} color={serviceType === 'broadband' ? colors.primary[600] : colors.neutral[500]} />
                      <Text className={`text-sm font-bold ${serviceType === 'broadband' ? 'text-primary-600' : 'text-foreground'}`}>
                        {t('add_customer.broadband', 'Broadband / Fiber')}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {catalogue.length > 0
                  ? (
                      <View className="gap-1.5">
                        <Text className="text-sm font-bold text-foreground">
                          {t('add_customer.choose_package', 'Choose from Packages & Plans')}
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                          {catalogue.map(pkg => (
                            <Pressable
                              key={pkg.id}
                              accessibilityRole="button"
                              onPress={() => selectCataloguePackage(pkg)}
                              className={`rounded-xl border px-3.5 py-2.5 ${
                                packageId === pkg.id ? 'border-primary-500 bg-primary-500/10' : 'border-border bg-card'
                              }`}
                            >
                              <Text className={`text-xs font-extrabold ${packageId === pkg.id ? 'text-primary-600' : 'text-foreground'}`}>
                                {pkg.name}
                              </Text>
                              <Text className="text-[11px] font-semibold text-muted-foreground">
                                {`\u20B9${pkg.monthlyPrice}${pkg.durationMonths > 1 ? ` / ${pkg.durationMonths} mo` : ' / mo'}`}
                              </Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    )
                  : null}

                <View className="gap-1">
                  <Text className="text-sm font-bold text-foreground">
                    {t('add_customer.package_name', 'Plan / Package Name')}
                    {' '}
                    <Text className="text-danger-500">*</Text>
                  </Text>
                  <TextInput
                    value={packageName}
                    onChangeText={(text) => {
                      setPackageName(text);
                      setPackageId(undefined);
                    }}
                    placeholder={t('add_customer.package_name_placeholder', 'e.g. Standard HD Pack or 100Mbps')}
                    placeholderTextColor={colors.neutral[400]}
                    className="rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
                  />
                  {errors.packageName && <Text className="text-xs font-semibold text-danger-500">{errors.packageName}</Text>}
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1 gap-1">
                    <Text className="text-sm font-bold text-foreground">
                      {t('add_customer.monthly_price', 'Monthly Charge (₹)')}
                    </Text>
                    <TextInput
                      value={monthlyPrice}
                      onChangeText={setMonthlyPrice}
                      keyboardType="numeric"
                      placeholder={t('add_customer.monthly_price_placeholder', 'e.g. 350')}
                      placeholderTextColor={colors.neutral[400]}
                      className="rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
                    />
                  </View>

                  {serviceType === 'broadband' && (
                    <View className="flex-1 gap-1">
                      <Text className="text-sm font-bold text-foreground">
                        {t('add_customer.speed', 'Speed (Mbps)')}
                      </Text>
                      <TextInput
                        value={speedMbps}
                        onChangeText={setSpeedMbps}
                        keyboardType="numeric"
                        placeholder={t('add_customer.speed_placeholder', 'e.g. 100')}
                        placeholderTextColor={colors.neutral[400]}
                        className="rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
                      />
                    </View>
                  )}
                </View>
              </View>
            )}

            {!successMessage && step === 3 && (
              <View className="gap-3.5">
                <View className="gap-1">
                  <Text className="text-sm font-bold text-foreground">
                    {t('add_customer.stb_number', 'STB Serial Number')}
                  </Text>
                  <TextInput
                    value={stbNumber}
                    onChangeText={setStbNumber}
                    placeholder={t('add_customer.stb_number_placeholder', 'e.g. STB987654321')}
                    placeholderTextColor={colors.neutral[400]}
                    className="rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
                  />
                </View>

                <View className="gap-1">
                  <Text className="text-sm font-bold text-foreground">
                    {t('add_customer.vc_number', 'VC / Smart Card Number')}
                  </Text>
                  <TextInput
                    value={vcNumber}
                    onChangeText={setVcNumber}
                    placeholder={t('add_customer.vc_number_placeholder', 'e.g. VC001234567')}
                    placeholderTextColor={colors.neutral[400]}
                    className="rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
                  />
                </View>

                {errors.stbOrVc && (
                  <View className="flex-row items-center gap-1.5 rounded-lg bg-danger-50 p-2.5 dark:bg-danger-900/20">
                    <HugeiconsIcon icon={AlertCircleIcon} size={16} color={colors.danger[500]} />
                    <Text className="text-xs font-semibold text-danger-500">{errors.stbOrVc}</Text>
                  </View>
                )}

                <View className="gap-1">
                  <Text className="text-sm font-bold text-foreground">
                    {t('add_customer.location_label', 'Box Location')}
                  </Text>
                  <TextInput
                    value={locationLabel}
                    onChangeText={setLocationLabel}
                    placeholder={t('add_customer.location_label_placeholder', 'e.g. Living Room, Bedroom')}
                    placeholderTextColor={colors.neutral[400]}
                    className="rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
                  />
                </View>

                {errors.submit && (
                  <Text className="text-xs font-semibold text-danger-500">{errors.submit}</Text>
                )}
              </View>
            )}
          </ScrollView>

          {/* Action Footer Bar */}
          {!successMessage && (
            <View className="flex-row items-center gap-3 border-t border-border/60 bg-surface px-5 py-4">
              {step > 1
                ? (
                    <View className="flex-1">
                      <Button
                        label={t('add_customer.back', 'Back')}
                        variant="outline"
                        size="lg"
                        onPress={handleBack}
                      />
                    </View>
                  )
                : null}

              <View className="flex-1">
                {step < 3
                  ? (
                      <Button
                        label={t('add_customer.next', 'Next Step')}
                        size="lg"
                        onPress={handleNext}
                      />
                    )
                  : (
                      <Button
                        label={createCustomerMutation.isPending ? t('add_customer.submitting', 'Creating Customer...') : t('add_customer.submit', 'Create Customer')}
                        size="lg"
                        disabled={createCustomerMutation.isPending}
                        onPress={handleSubmit}
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

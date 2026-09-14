import type { ServiceProvider } from '@/lib/api/types';
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Calendar01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Tv01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';

import { HierarchicalLocationSelector } from '@/components/common/hierarchical-location-selector';
import { colors, Pressable, Text, View } from '@/components/ui';
import { useServiceProviders } from '@/lib/hooks/api/use-service-providers';

export type DatePresetType = 'all' | 'today' | '7d' | '30d' | 'month';

export type CustomerFilterValues = {
  status?: 'active' | 'inactive' | 'pending';
  locationId?: string;
  serviceProviderId?: string;
  datePreset?: DatePresetType;
};

export type CustomerFilterModalProps = {
  visible: boolean;
  onClose: () => void;
  filters: CustomerFilterValues;
  onApply: (filters: CustomerFilterValues) => void;
  onReset: () => void;
};

export function getDateRangeFromPreset(preset?: DatePresetType): { createdFrom?: string; createdTo?: string } {
  if (!preset || preset === 'all')
    return {};

  const now = new Date();
  if (preset === 'today') {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    return { createdFrom: startOfToday.toISOString() };
  }

  if (preset === '7d') {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { createdFrom: sevenDaysAgo.toISOString() };
  }

  if (preset === '30d') {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { createdFrom: thirtyDaysAgo.toISOString() };
  }

  if (preset === 'month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return { createdFrom: startOfMonth.toISOString() };
  }

  return {};
}

// eslint-disable-next-line max-lines-per-function
export function CustomerFilterModal({
  visible,
  onClose,
  filters,
  onApply,
  onReset,
}: CustomerFilterModalProps) {
  const { t } = useTranslation();

  const [draftStatus, setDraftStatus] = React.useState<'active' | 'inactive' | 'pending' | undefined>(filters.status);
  const [draftLocationId, setDraftLocationId] = React.useState<string | undefined>(filters.locationId);
  const [draftServiceProviderId, setDraftServiceProviderId] = React.useState<string | undefined>(filters.serviceProviderId);
  const [draftDatePreset, setDraftDatePreset] = React.useState<DatePresetType>(filters.datePreset || 'all');

  const [providerDropdownOpen, setProviderDropdownOpen] = React.useState(false);

  const { data: serviceProvidersList = [] } = useServiceProviders();

  React.useEffect(() => {
    if (visible) {
      setDraftStatus(filters.status);
      setDraftLocationId(filters.locationId);
      setDraftServiceProviderId(filters.serviceProviderId);
      setDraftDatePreset(filters.datePreset || 'all');
      setProviderDropdownOpen(false);
    }
  }, [visible, filters]);

  const selectedProvider = React.useMemo(() => {
    if (!draftServiceProviderId)
      return null;
    return serviceProvidersList.find(prov => prov.id === draftServiceProviderId) || null;
  }, [draftServiceProviderId, serviceProvidersList]);

  const handleApply = () => {
    onApply({
      status: draftStatus,
      locationId: draftLocationId,
      serviceProviderId: draftServiceProviderId,
      datePreset: draftDatePreset,
    });
    onClose();
  };

  const handleReset = () => {
    setDraftStatus(undefined);
    setDraftLocationId(undefined);
    setDraftServiceProviderId(undefined);
    setDraftDatePreset('all');
    onReset();
    onClose();
  };

  const statusOptions: { key: 'active' | 'inactive' | 'pending' | undefined; label: string }[] = [
    { key: undefined, label: t('customers_list.all') },
    { key: 'active', label: t('customers_list.active') },
    { key: 'inactive', label: t('customers_list.inactive') },
    { key: 'pending', label: t('customers_list.pending') },
  ];

  const dateOptions: { key: DatePresetType; label: string }[] = [
    { key: 'all', label: t('customers_list.date_all_time') },
    { key: 'today', label: t('customers_list.date_today') },
    { key: '7d', label: t('customers_list.date_last_7_days') },
    { key: '30d', label: t('customers_list.date_last_30_days') },
    { key: 'month', label: t('customers_list.date_this_month') },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 justify-end bg-black/50">
          <TouchableWithoutFeedback>
            <View className="max-h-[85%] rounded-t-3xl border-t border-border bg-card">
              {/* Header */}
              <View className="flex-row items-center justify-between border-b border-border/60 px-5 py-4">
                <Text className="text-base font-extrabold text-foreground">
                  {t('customers_list.filters_title')}
                </Text>
                <View className="flex-row items-center gap-3">
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleReset}
                    className="rounded-lg px-2.5 py-1 active:bg-muted"
                  >
                    <Text className="text-xs font-bold text-muted-foreground">
                      {t('customers_list.reset')}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={onClose}
                    className="size-8 items-center justify-center rounded-full border border-border bg-surface active:bg-muted"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={16} color={colors.neutral[600]} />
                  </Pressable>
                </View>
              </View>

              {/* Filter Options Content */}
              <ScrollView
                className="px-5 py-4"
                contentContainerClassName="gap-5 pb-6"
                showsVerticalScrollIndicator={false}
              >
                {/* 1. Status Filter */}
                <View className="gap-2">
                  <Text className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    {t('customers_list.filter_status')}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {statusOptions.map((opt) => {
                      const isSelected = draftStatus === opt.key;
                      return (
                        <Pressable
                          key={opt.key || 'all'}
                          accessibilityRole="button"
                          onPress={() => setDraftStatus(opt.key)}
                          className={`rounded-xl border px-3.5 py-2 ${
                            isSelected
                              ? 'border-primary-500 bg-primary-500'
                              : 'border-border bg-surface active:bg-muted/40'
                          }`}
                        >
                          <Text
                            className={`text-xs font-bold ${
                              isSelected ? 'text-white' : 'text-foreground'
                            }`}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* 2. Location Filter */}
                <HierarchicalLocationSelector
                  selectedLocationId={draftLocationId}
                  onSelectLocation={loc => setDraftLocationId(loc?.id)}
                />

                {/* 3. Created Date Filter */}
                <View className="gap-2">
                  <View className="flex-row items-center gap-1.5">
                    <HugeiconsIcon icon={Calendar01Icon} size={14} color={colors.primary[500]} />
                    <Text className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                      {t('customers_list.filter_created_date')}
                    </Text>
                  </View>
                  <View className="flex-row flex-wrap gap-2">
                    {dateOptions.map((opt) => {
                      const isSelected = draftDatePreset === opt.key;
                      return (
                        <Pressable
                          key={opt.key}
                          accessibilityRole="button"
                          onPress={() => setDraftDatePreset(opt.key)}
                          className={`rounded-xl border px-3.5 py-2 ${
                            isSelected
                              ? 'border-primary-500 bg-primary-500'
                              : 'border-border bg-surface active:bg-muted/40'
                          }`}
                        >
                          <Text
                            className={`text-xs font-bold ${
                              isSelected ? 'text-white' : 'text-foreground'
                            }`}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* 4. Service Provider Filter */}
                <View className="gap-2">
                  <Text className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    {t('customers_list.filter_service_provider')}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Select Service Provider"
                    onPress={() => setProviderDropdownOpen(!providerDropdownOpen)}
                    className="flex-row items-center justify-between rounded-xl border border-border bg-surface p-3 active:bg-muted/30"
                  >
                    <View className="flex-1 flex-row items-center gap-2">
                      <HugeiconsIcon icon={Tv01Icon} size={16} color={colors.primary[500]} />
                      <Text className="flex-1 text-xs font-semibold text-foreground" numberOfLines={1}>
                        {selectedProvider ? selectedProvider.name : t('customers_list.all_providers')}
                      </Text>
                    </View>
                    <HugeiconsIcon
                      icon={providerDropdownOpen ? ArrowUp01Icon : ArrowDown01Icon}
                      size={16}
                      color={colors.neutral[500]}
                    />
                  </Pressable>

                  {providerDropdownOpen
                    ? (
                        <View className="max-h-44 rounded-xl border border-border bg-card p-1">
                          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel="Provider Option: All Providers"
                              onPress={() => {
                                setDraftServiceProviderId(undefined);
                                setProviderDropdownOpen(false);
                              }}
                              className={`flex-row items-center justify-between rounded-lg p-2.5 ${
                                !draftServiceProviderId ? 'dark:bg-primary-950/40 bg-primary-50' : 'active:bg-muted'
                              }`}
                            >
                              <Text className={`text-xs ${!draftServiceProviderId ? 'font-extrabold text-primary-600' : 'font-medium text-foreground'}`}>
                                {t('customers_list.all_providers')}
                              </Text>
                              {!draftServiceProviderId
                                ? (
                                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} color={colors.primary[500]} />
                                  )
                                : null}
                            </Pressable>

                            {serviceProvidersList.map((prov: ServiceProvider) => {
                              const isSel = draftServiceProviderId === prov.id;
                              return (
                                <Pressable
                                  key={prov.id}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Provider Option: ${prov.name}`}
                                  onPress={() => {
                                    setDraftServiceProviderId(prov.id);
                                    setProviderDropdownOpen(false);
                                  }}
                                  className={`flex-row items-center justify-between rounded-lg p-2.5 ${
                                    isSel ? 'dark:bg-primary-950/40 bg-primary-50' : 'active:bg-muted'
                                  }`}
                                >
                                  <View className="flex-1 pr-2">
                                    <Text className={`text-xs ${isSel ? 'font-extrabold text-primary-600' : 'font-medium text-foreground'}`} numberOfLines={1}>
                                      {prov.name}
                                    </Text>
                                    {prov.code
                                      ? (
                                          <Text className="text-[10px] text-muted-foreground">{prov.code}</Text>
                                        )
                                      : null}
                                  </View>
                                  {isSel
                                    ? (
                                        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} color={colors.primary[500]} />
                                      )
                                    : null}
                                </Pressable>
                              );
                            })}
                          </ScrollView>
                        </View>
                      )
                    : null}
                </View>
              </ScrollView>

              {/* Footer Buttons */}
              <View className="flex-row items-center gap-3 border-t border-border/60 bg-card p-4">
                <Pressable
                  accessibilityRole="button"
                  onPress={handleReset}
                  className="flex-1 items-center justify-center rounded-xl border border-border bg-surface py-3 active:bg-muted"
                >
                  <Text className="text-xs font-bold text-foreground">
                    {t('customers_list.clear_all')}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleApply}
                  className="flex-1 items-center justify-center rounded-xl bg-primary-500 py-3 active:bg-primary-600"
                >
                  <Text className="text-xs font-extrabold text-white">
                    {t('customers_list.apply_filters')}
                  </Text>
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

import type { ServiceProvider } from '@/lib/api/types';
import type { DatePresetType } from '@/lib/utils/date-presets';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
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
import { ScrollView } from 'react-native';

import { HierarchicalLocationSelector } from '@/components/common/hierarchical-location-selector';
import { colors, Modal, Pressable, Text, useModal, View } from '@/components/ui';
import { useServiceProviders } from '@/lib/hooks/api/use-service-providers';

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

const SNAP_POINTS = ['75%', '92%'];

export function CustomerFilterModal({
  visible,
  onClose,
  filters,
  onApply,
  onReset,
}: CustomerFilterModalProps) {
  const { t } = useTranslation();
  const sheet = useModal();

  const [draftStatus, setDraftStatus] = React.useState<'active' | 'inactive' | 'pending' | undefined>(filters.status);
  const [draftLocationId, setDraftLocationId] = React.useState<string | undefined>(filters.locationId);
  const [draftServiceProviderId, setDraftServiceProviderId] = React.useState<string | undefined>(filters.serviceProviderId);
  const [draftDatePreset, setDraftDatePreset] = React.useState<DatePresetType>(filters.datePreset || 'all');

  const [providerDropdownOpen, setProviderDropdownOpen] = React.useState(false);

  const { data: serviceProvidersList = [] } = useServiceProviders();

  const { present, dismiss } = sheet;

  /**
   * Seed the drafts from the applied filters each time the sheet opens.
   *
   * Adjusted during render rather than in an effect (React's documented pattern
   * for "state that changes with a prop"): an effect would paint one frame of
   * the previous session's drafts before correcting itself.
   */
  const [openedWith, setOpenedWith] = React.useState(false);
  if (visible && !openedWith) {
    setOpenedWith(true);
    setDraftStatus(filters.status);
    setDraftLocationId(filters.locationId);
    setDraftServiceProviderId(filters.serviceProviderId);
    setDraftDatePreset(filters.datePreset || 'all');
    setProviderDropdownOpen(false);
  }
  else if (!visible && openedWith) {
    setOpenedWith(false);
  }

  // The sheet itself is imperative, so showing it stays an effect.
  const wasVisible = React.useRef(false);
  React.useEffect(() => {
    if (visible === wasVisible.current)
      return;

    wasVisible.current = visible;
    if (visible)
      present();
    else
      dismiss();
  }, [visible, present, dismiss]);

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
    sheet.dismiss();
    onClose();
  };

  const handleReset = () => {
    setDraftStatus(undefined);
    setDraftLocationId(undefined);
    setDraftServiceProviderId(undefined);
    setDraftDatePreset('all');
    onReset();
    sheet.dismiss();
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

  if (!visible) {
    return null;
  }

  return (
    <Modal
      ref={sheet.ref}
      snapPoints={SNAP_POINTS}
      onDismiss={onClose}
    >
      <View className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-border/60 px-5 py-3">
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
              accessibilityLabel="close modal"
              onPress={() => {
                sheet.dismiss();
                onClose();
              }}
              className="size-8 items-center justify-center rounded-full border border-border bg-surface active:bg-muted"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={16} color={colors.neutral[600]} />
            </Pressable>
          </View>
        </View>
        <BottomSheetScrollView
          className="flex-1 px-5 py-4"
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
                  <View className="max-h-56 rounded-xl border border-border bg-card p-1">
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Provider Option: All Providers"
                        onPress={() => {
                          setDraftServiceProviderId(undefined);
                          setProviderDropdownOpen(false);
                        }}
                        className={`flex-row items-center justify-between rounded-lg p-2.5 ${
                          !draftServiceProviderId ? 'bg-primary-50 dark:bg-muted' : 'active:bg-muted'
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
                              isSel ? 'bg-primary-50 dark:bg-muted' : 'active:bg-muted'
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
        </BottomSheetScrollView>

        {/* Footer Buttons */}
        <View className="flex-row items-center gap-3 border-t border-border/60 bg-card p-4 pb-8">
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
    </Modal>
  );
}

export type { DatePresetType };

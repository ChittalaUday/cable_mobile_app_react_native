import type { CustomerFilterValues } from '@/components/admin/customer-filter-modal';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { colors, Pressable, ScrollView, Text } from '@/components/ui';
import { useLocations } from '@/lib/hooks/api/use-locations';

function FilterPill({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center gap-1 rounded-full border border-primary-500/40 bg-primary-50 px-2.5 py-1 dark:bg-primary-950/40"
    >
      <Text className="text-[11px] font-bold text-primary-600 dark:text-primary-400" numberOfLines={1}>
        {label}
      </Text>
      <HugeiconsIcon icon={Cancel01Icon} size={12} color={colors.primary[500]} />
    </Pressable>
  );
}

/** The filters set in the sheet, one removable pill each. */
export function CustomerActiveFilters({ filters, onClear }: {
  filters: CustomerFilterValues;
  onClear: (key: keyof CustomerFilterValues) => void;
}) {
  const { t } = useTranslation();
  const { data: locationsPage } = useLocations();

  const location = filters.locationId ? locationsPage?.items?.find(l => l.id === filters.locationId) : null;
  const locationName = location?.path || location?.name;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="flex-row gap-1.5 pt-0.5">
      {filters.status
        ? <FilterPill label={`${t('customers_list.filter_status')}:${filters.status}`} onPress={() => onClear('status')} />
        : null}
      {filters.locationId
        ? (
            <FilterPill
              label={locationName ? `${t('customers_list.filter_location')}: ${locationName}` : t('customers_list.filter_location')}
              onPress={() => onClear('locationId')}
            />
          )
        : null}
      {filters.serviceProviderId
        ? <FilterPill label={t('customers_list.filter_service_provider')} onPress={() => onClear('serviceProviderId')} />
        : null}
      {filters.datePreset && filters.datePreset !== 'all'
        ? <FilterPill label={`${t('customers_list.filter_created_date')}:${filters.datePreset}`} onPress={() => onClear('datePreset')} />
        : null}
    </ScrollView>
  );
}

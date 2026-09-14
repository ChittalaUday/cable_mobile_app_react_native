import type { CoverageScope, Mark } from './coverage-marks';
import type { Coverage, Location } from '@/lib/api/types';
import type { CoverageEntryInput } from '@/lib/hooks/api/use-locations';
import {
  ArrowLeft01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { FlashList } from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { Alert } from 'react-native';

import { SaveBar } from '@/components/common/save-bar';
import { Card, Loading } from '@/components/common/shell';
import {
  colors,
  FocusAwareStatusBar,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import {
  usePackageCoverage,
  useServiceCoverage,
  useServiceProviderCoverage,
  useUpdatePackageCoverage,
  useUpdateServiceCoverage,
  useUpdateServiceProviderCoverage,
} from '@/lib/hooks/api/use-locations';
import { boundsFor } from './coverage-marks';
import { CoveragePicker, entriesFromMarks, marksFromCoverage } from './coverage-picker';

const SCOPE_COPY: Record<CoverageScope, { title: string; blurb: string }> = {
  service: {
    title: 'Service Coverage',
    blurb: 'Where this service is sold at all, whoever supplies it.',
  },
  provider: {
    title: 'Provider Coverage',
    blurb: 'Where this provider reaches, within the places the service is sold.',
  },
  package: {
    title: 'Package Coverage',
    blurb: 'Where this one package is sold, within the places its provider reaches.',
  },
};

/**
 * Pick the places a service, provider or package is sold in.
 *
 * Two things make this small rather than a checkbox per door: **a mark covers
 * the node and everything under it**, and a mark can say "not here". So "the
 * whole town except Block C" is two rows, and leaving the list empty means it
 * inherits — a package with nothing marked simply goes wherever its provider
 * does.
 */

export function CoverageScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { scope, id, name, serviceId, providerId } = useLocalSearchParams<{
    scope: CoverageScope;
    id: string;
    name?: string;
    /** The level above, so the picker only offers places it reaches. */
    serviceId?: string;
    providerId?: string;
  }>();

  const [marks, setMarks] = React.useState<Map<string, Mark>>(new Map());
  const hydrated = React.useRef(false);

  const serviceCoverage = useServiceCoverage({ variables: { id }, enabled: scope === 'service' });
  const providerCoverage = useServiceProviderCoverage({ variables: { id }, enabled: scope === 'provider' });
  const packageCoverage = usePackageCoverage({ variables: { id }, enabled: scope === 'package' });

  const updateService = useUpdateServiceCoverage();
  const updateProvider = useUpdateServiceProviderCoverage();
  const updatePackage = useUpdatePackageCoverage();

  const query = scope === 'service'
    ? serviceCoverage
    : scope === 'provider' ? providerCoverage : packageCoverage;

  const rows: Coverage[] = React.useMemo(() => query.data ?? [], [query.data]);

  // Seed the marks from what is already saved, once.
  React.useEffect(() => {
    if (query.isLoading || hydrated.current)
      return;

    hydrated.current = true;
    setMarks(marksFromCoverage(rows));
  }, [query.isLoading, rows]);

  const entries: CoverageEntryInput[] = React.useMemo(() => entriesFromMarks(marks), [marks]);

  const isSaving = updateService.isPending || updateProvider.isPending || updatePackage.isPending;

  const handleSave = async () => {
    try {
      if (scope === 'service')
        await updateService.mutateAsync({ id, entries });
      else if (scope === 'provider')
        await updateProvider.mutateAsync({ id, entries });
      else
        await updatePackage.mutateAsync({ id, entries });

      await queryClient.invalidateQueries({ queryKey: [scope === 'package' ? 'packages' : `${scope}s`, 'coverage'] });
      router.back();
    }
    catch (err) {
      Alert.alert('Could not save coverage', (err as Error).message || 'Please try again.');
    }
  };

  const copy = SCOPE_COPY[scope] ?? SCOPE_COPY.service;

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <SafeAreaView edges={['top']} className="bg-surface">
        <View className="flex-row items-center gap-3 px-3 pt-1 pb-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            className="size-9 items-center justify-center rounded-lg border border-border bg-card"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={20} color={colors.charcoal[900]} strokeWidth={2.2} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-[17px] font-bold text-foreground">{copy.title}</Text>
            <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
              {name ?? copy.blurb}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {query.isLoading
        ? <Loading />
        : (
            <CoveragePicker
              marks={marks}
              onChange={setMarks}
              blurb={copy.blurb}
              bounds={boundsFor(scope, { serviceId, providerId })}
            />
          )}

      <SaveBar
        label={entries.length === 0 ? 'Save (sold everywhere)' : `Save Coverage (${entries.length})`}
        busyLabel="Saving Coverage…"
        busy={isSaving}
        onPress={handleSave}
      />
    </View>
  );
}

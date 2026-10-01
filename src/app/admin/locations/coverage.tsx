import type { CoverageScope, Mark } from '@/components/locations/coverage-marks';
import type { Coverage } from '@/lib/api/types';
import type { CoverageEntryInput } from '@/lib/hooks/api/use-locations';
import { useQueryClient } from '@tanstack/react-query';

import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';

import { dialogs } from '@/components/common/dialogs';

import { SaveBar } from '@/components/common/save-bar';
import { Loading, ScreenHeader } from '@/components/common/shell';
import { boundsFor, entriesFromMarks, marksFromCoverage } from '@/components/locations/coverage-marks';
import { CoveragePicker } from '@/components/locations/coverage-picker';
import {
  FocusAwareStatusBar,
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

  const [marks, setMarks] = React.useState<Map<string, Mark>>(() => new Map());

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

  // Seed the marks from what is already saved, once. Done during render so the
  // picker never paints an empty map over saved coverage.
  const [hydrated, setHydrated] = React.useState(false);
  if (!query.isLoading && !hydrated) {
    setHydrated(true);
    setMarks(marksFromCoverage(rows));
  }

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
      void dialogs.notify('Could not save coverage', (err as Error).message || 'Please try again.');
    }
  };

  const copy = SCOPE_COPY[scope] ?? SCOPE_COPY.service;

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <ScreenHeader
        title={copy.title}
        subtitle={name ?? copy.blurb}
        showBack
        withSafeArea
      />

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

export default CoverageScreen;

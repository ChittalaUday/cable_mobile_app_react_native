import type { AutomationProvider, JobRunSummary } from '@/lib/api/contracts';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, RefreshControl } from 'react-native';
import { Card, ScreenHeader, TINT } from '@/components/common/shell';
import { Button, colors, List, Pressable, Text, View } from '@/components/ui';
import { PERMISSIONS } from '@/constants/permissions';
import { activeRunForProvider, formatRunDuration, formatRunTime, presentProviderName, presentRunResult, presentRunStatus, startFailureKey } from '@/lib/automations/job-run-presenter';
import { useAutomationProviders, useJobRuns, useStartCustomerSync } from '@/lib/hooks/api/use-job-runs';
import { usePermissions } from '@/lib/hooks/common/use-permissions';

/**
 * Every scheduled and manual automation run, newest first, under a Providers
 * section where each provider has its own Hard sync for whoever holds `jobs.run`
 * across the whole tenant.
 */
export function AutomationRunsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { hasScope } = usePermissions();
  const { data, isPending, isRefetching, error, refetch } = useJobRuns();
  const providers = useAutomationProviders();
  const start = useStartCustomerSync();
  const [startFailure, setStartFailure] = React.useState<{ providerId: string; message: string } | null>(null);
  const [startingId, setStartingId] = React.useState<string | null>(null);

  const runs = data?.items ?? [];
  const canStart = hasScope(PERMISSIONS.JOBS_RUN, 'ALL');
  const openRun = (id: string) => router.push(`/admin/automations/${id}`);

  const hardSync = async (providerId: string) => {
    const active = activeRunForProvider(runs, providerId);
    if (active !== undefined) {
      openRun(active.id);
      return;
    }
    setStartFailure(null);
    setStartingId(providerId);
    try {
      // Created or reused, the answer is the run to look at.
      const { run } = await start.mutateAsync({ providerId });
      openRun(run.id);
    }
    catch (failure) {
      setStartFailure({ providerId, message: t(startFailureKey(failure)) });
    }
    finally {
      setStartingId(null);
    }
  };

  const retry = () => {
    void refetch();
    void providers.refetch();
  };

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader
        title={t('automations.title')}
        subtitle={data === undefined ? t('automations.subtitle') : t('automations.list.count', { count: data.total })}
        showBack
        withSafeArea
      />

      {error && data !== undefined && (
        <Pressable accessibilityRole="button" onPress={retry} className="mx-4 mb-2 rounded-lg border border-border px-3 py-2" testID="runs-refresh-error">
          <Text className="text-xs text-foreground">{t('automations.list.refresh_failed')}</Text>
        </Pressable>
      )}

      {error && data === undefined
        ? (
            <View className="flex-1 items-center justify-center gap-3 px-8">
              <Text className="text-center text-[15px] font-semibold text-foreground">{t('automations.list.error_title')}</Text>
              <Button label={t('automations.list.retry')} variant="outline" onPress={retry} />
            </View>
          )
        : (
            <List
              testID="runs-list"
              ListHeaderComponent={(
                <ProvidersSection
                  providers={providers}
                  runs={runs}
                  canStart={canStart}
                  startPending={start.isPending}
                  startingId={startingId}
                  failure={startFailure}
                  onHardSync={id => void hardSync(id)}
                />
              )}
              data={runs}
              keyExtractor={item => item.id}
              renderItem={({ item }) => <RunRow run={item} onPress={() => openRun(item.id)} />}
              contentContainerStyle={{ paddingBottom: 24 }}
              refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={retry} tintColor={colors.primary[500]} />}
              ListEmptyComponent={isPending
                ? <View className="items-center py-14"><ActivityIndicator color={colors.primary[500]} /></View>
                : (
                    <View className="items-center gap-1 px-8 py-14">
                      <Text className="text-center text-[15px] font-semibold text-foreground">{t('automations.list.empty_title')}</Text>
                      <Text className="text-center text-sm text-muted-foreground">{t('automations.list.empty_message')}</Text>
                    </View>
                  )}
            />
          )}
    </View>
  );
}

type ProvidersQuery = ReturnType<typeof useAutomationProviders>;

function ProvidersSection({ providers, runs, canStart, startPending, startingId, failure, onHardSync }: {
  providers: ProvidersQuery;
  runs: JobRunSummary[];
  canStart: boolean;
  startPending: boolean;
  startingId: string | null;
  failure: { providerId: string; message: string } | null;
  onHardSync: (providerId: string) => void;
}) {
  const { t } = useTranslation();
  const items = providers.data?.items ?? [];

  return (
    <View className="gap-2 px-4 pb-3" testID="providers-section">
      <Text className="text-sm font-bold text-foreground">{t('automations.provider.title')}</Text>
      {providers.isPending
        ? <ActivityIndicator color={colors.primary[500]} />
        : providers.error && providers.data === undefined
          ? (
              <View className="items-start gap-2">
                <Text className="text-xs text-red-600">{t('automations.provider.error_title')}</Text>
                <Button label={t('automations.provider.retry')} variant="outline" size="sm" onPress={() => void providers.refetch()} />
              </View>
            )
          : items.length === 0
            ? (
                <View className="gap-1 rounded-2xl border border-border bg-card p-3" testID="providers-empty">
                  <Text className="text-[15px] font-semibold text-foreground">{t('automations.provider.empty_title')}</Text>
                  <Text className="text-sm text-muted-foreground">{t('automations.provider.empty_message')}</Text>
                </View>
              )
            : items.map(provider => (
                <ProviderCard
                  key={provider.providerId}
                  provider={provider}
                  activeRunId={activeRunForProvider(runs, provider.providerId)?.id}
                  canStart={canStart}
                  starting={startPending && startingId === provider.providerId}
                  busy={startPending}
                  failure={failure?.providerId === provider.providerId ? failure.message : null}
                  onHardSync={() => onHardSync(provider.providerId)}
                />
              ))}
    </View>
  );
}

function ProviderCard({ provider, activeRunId, canStart, starting, busy, failure, onHardSync }: {
  provider: AutomationProvider;
  activeRunId: string | undefined;
  canStart: boolean;
  starting: boolean;
  busy: boolean;
  failure: string | null;
  onHardSync: () => void;
}) {
  const { t } = useTranslation();
  const active = activeRunId !== undefined;
  const label = active ? t('automations.hard_sync_open_current') : starting ? t('automations.hard_sync_starting') : t('automations.hard_sync');

  return (
    <View className="gap-2 rounded-2xl border border-border bg-card p-3" testID={`provider-${provider.providerId}`}>
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1">
          <Text className="text-[15px] font-semibold text-foreground">{provider.name}</Text>
          {provider.code !== null && <Text className="text-xs text-muted-foreground">{provider.code}</Text>}
        </View>
        <Text className="text-xs font-semibold text-muted-foreground">{provider.enabled ? t('automations.provider.enabled') : t('automations.provider.disabled')}</Text>
      </View>
      {canStart && (
        <>
          <Button
            testID={`hard-sync-${provider.providerId}`}
            label={label}
            // An active run is always openable; only a new start needs an enabled account.
            disabled={active ? false : !provider.enabled || busy}
            onPress={onHardSync}
          />
          {failure !== null
            ? <Text className="text-xs text-red-600">{failure}</Text>
            : <Text className="text-xs text-muted-foreground">{!provider.enabled && !active ? t('automations.hard_sync_disabled_hint') : t('automations.hard_sync_hint')}</Text>}
        </>
      )}
    </View>
  );
}

function RunRow({ run, onPress }: { run: JobRunSummary; onPress: () => void }) {
  const { t } = useTranslation();
  const status = presentRunStatus(run.status);
  const tint = TINT[status.tint];
  const started = formatRunTime(run.startedAt);
  const queued = formatRunTime(run.queuedAt);
  const finished = formatRunTime(run.finishedAt);
  const duration = formatRunDuration(run.startedAt, run.finishedAt);
  const counts = presentRunResult(run.result);
  const summary = [
    counts?.downloadedRows !== undefined && t('automations.run.rows', { count: counts.downloadedRows }),
    counts?.created !== undefined && t('automations.run.created', { count: counts.created }),
    counts?.updated !== undefined && t('automations.run.updated', { count: counts.updated }),
    counts?.unchanged !== undefined && t('automations.run.unchanged', { count: counts.unchanged }),
    counts?.warnings ? t('automations.run.warnings', { count: counts.warnings }) : false,
  ].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('automations.run.open', { status: t(status.key) })}
      onPress={onPress}
      testID={`run-row-${run.id}`}
      className="mx-4 mb-2 active:opacity-70"
    >
      <Card className="gap-1.5 border border-border p-3">
        <View className="flex-row items-center justify-between gap-2">
          <View className="rounded-sm px-1.5 py-0.5" style={{ backgroundColor: tint.bg }}>
            <Text className="text-[11px] font-bold uppercase" style={{ color: tint.fg }}>{t(status.key)}</Text>
          </View>
          {duration !== null && <Text className="text-xs text-muted-foreground">{t('automations.run.duration', { duration })}</Text>}
        </View>
        <Text className="text-xs font-semibold text-muted-foreground" testID={`run-trigger-${run.id}`}>{`${presentProviderName(run.providerName) ?? t('automations.provider.generic')} · ${t(`automations.trigger.${run.trigger}`)}`}</Text>
        <Text className="text-sm font-semibold text-foreground">
          {started !== null ? t('automations.run.started', { time: started }) : queued !== null ? t('automations.run.queued', { time: queued }) : t('automations.run.not_started')}
        </Text>
        {finished !== null && <Text className="text-xs text-muted-foreground">{t('automations.run.finished', { time: finished })}</Text>}
        {summary !== '' && <Text className="text-xs text-muted-foreground">{summary}</Text>}
      </Card>
    </Pressable>
  );
}

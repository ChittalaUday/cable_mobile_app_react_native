import type { JobRunSummary } from '@/lib/api/contracts';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, RefreshControl } from 'react-native';
import { Card, ScreenHeader, TINT } from '@/components/common/shell';
import { Button, colors, List, Pressable, Text, View } from '@/components/ui';
import { PERMISSIONS } from '@/constants/permissions';
import { formatRunDuration, formatRunTime, isActiveRun, presentRunResult, presentRunStatus, startFailureKey } from '@/lib/automations/job-run-presenter';
import { useJobRuns, useStartCustomerSync } from '@/lib/hooks/api/use-job-runs';
import { usePermissions } from '@/lib/hooks/common/use-permissions';

/**
 * Every scheduled and manual automation run, newest first, with the Hard sync
 * action on top for whoever holds `jobs.run` across the whole tenant.
 */
export function AutomationRunsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { hasScope } = usePermissions();
  const { data, isPending, isRefetching, error, refetch } = useJobRuns();
  const start = useStartCustomerSync();
  const [startError, setStartError] = React.useState<string | null>(null);

  const runs = data?.items ?? [];
  const activeRun = runs.find(run => isActiveRun(run.status));
  const canStart = hasScope(PERMISSIONS.JOBS_RUN, 'ALL');
  const openRun = (id: string) => router.push(`/admin/automations/${id}`);

  const hardSync = async () => {
    if (activeRun !== undefined) {
      openRun(activeRun.id);
      return;
    }
    setStartError(null);
    try {
      // Created or reused, the answer is the run to look at.
      const { run } = await start.mutateAsync();
      openRun(run.id);
    }
    catch (failure) {
      setStartError(t(startFailureKey(failure)));
    }
  };

  const retry = () => void refetch();

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader
        title={t('automations.title')}
        subtitle={data === undefined ? t('automations.subtitle') : t('automations.list.count', { count: data.total })}
        showBack
        withSafeArea
      />

      {canStart && (
        <View className="gap-1 px-4 pb-2">
          <Button
            testID="hard-sync"
            label={activeRun === undefined ? start.isPending ? t('automations.hard_sync_starting') : t('automations.hard_sync') : t('automations.hard_sync_open_current')}
            disabled={start.isPending}
            onPress={() => void hardSync()}
          />
          {startError === null
            ? <Text className="text-xs text-muted-foreground">{t('automations.hard_sync_hint')}</Text>
            : <Text className="text-xs text-red-600">{startError}</Text>}
        </View>
      )}

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
        <Text className="text-sm font-semibold text-foreground">
          {started !== null ? t('automations.run.started', { time: started }) : queued !== null ? t('automations.run.queued', { time: queued }) : t('automations.run.not_started')}
        </Text>
        {finished !== null && <Text className="text-xs text-muted-foreground">{t('automations.run.finished', { time: finished })}</Text>}
        {summary !== '' && <Text className="text-xs text-muted-foreground">{summary}</Text>}
      </Card>
    </Pressable>
  );
}

import type { JobAttempt, JobRunDetail, JobRunEvent } from '@/lib/api/contracts';
import type { LivePhase } from '@/lib/hooks/common/use-job-live-stream';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, RefreshControl } from 'react-native';
import { Card, ScreenHeader, TINT } from '@/components/common/shell';
import { Button, colors, Image, Pressable, ScrollView, Text, View } from '@/components/ui';
import { presentJobEvent } from '@/lib/automations/job-activity';
import { formatRunDuration, formatRunTime, isTerminalRun, presentRunResult, presentRunStatus } from '@/lib/automations/job-run-presenter';
import { useJobRun } from '@/lib/hooks/api/use-job-runs';
import { useJobLiveStream } from '@/lib/hooks/common/use-job-live-stream';

const NO_EVENTS: JobRunEvent[] = [];
const LEVEL_TINT = { info: TINT.blue, warning: TINT.orange, error: TINT.red } as const;

/** A 401, 403 or 404 on the run itself will not change by streaming it. */
function isRefused(error: unknown): boolean {
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  return status === 401 || status === 403 || status === 404;
}

/**
 * One run: the live browser on top while it is active, the run and its attempts,
 * and the activity timeline at the bottom. A finished run reads entirely from
 * REST; no socket is opened for it.
 */
export function AutomationRunDetailScreen({ id }: { id: string }) {
  const { t } = useTranslation();
  const { data, isPending, isRefetching, error, refetch } = useJobRun(id);
  const live = useJobLiveStream({
    runId: id,
    enabled: data !== undefined && !isRefused(error),
    terminal: data !== undefined && isTerminalRun(data.status),
    persistedEvents: data?.events ?? NO_EVENTS,
  });
  const retry = () => void refetch();

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader title={t('automations.detail.title')} subtitle={data === undefined ? undefined : (formatRunTime(data.startedAt ?? data.queuedAt) ?? undefined)} showBack withSafeArea />

      {data === undefined
        ? isPending
          ? (
              <View className="flex-1 items-center justify-center gap-3">
                <ActivityIndicator color={colors.primary[600]} />
                <Text className="text-[13px] text-muted-foreground">{t('automations.detail.loading')}</Text>
              </View>
            )
          : (
              <View className="flex-1 items-center justify-center gap-3 px-8">
                <Text className="text-center text-[15px] font-semibold text-foreground">{t('automations.detail.error_title')}</Text>
                <Button label={t('automations.detail.retry')} variant="outline" onPress={retry} />
              </View>
            )
        : (
            <ScrollView
              className="flex-1"
              contentContainerClassName="gap-3 px-4 pb-12 pt-1"
              refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={retry} tintColor={colors.primary[500]} />}
            >
              {error && (
                <Pressable accessibilityRole="button" onPress={retry} className="rounded-lg border border-border px-3 py-2" testID="detail-refresh-error">
                  <Text className="text-xs text-foreground">{t('automations.detail.refresh_failed')}</Text>
                </Pressable>
              )}
              <LivePreview run={data} phase={live.phase} frame={live.frame} />
              <RunSummary run={data} />
              <Attempts attempts={data.attempts} />
              <Timeline events={live.events} />
            </ScrollView>
          )}
    </View>
  );
}

const PHASE_TEXT: Record<LivePhase, 'live.connecting' | 'live.live' | 'live.reconnecting' | 'live.ended' | 'live.error'> = {
  idle: 'live.connecting',
  connecting: 'live.connecting',
  live: 'live.live',
  reconnecting: 'live.reconnecting',
  ended: 'live.ended',
  error: 'live.error',
};

function LivePreview({ run, phase, frame }: { run: JobRunDetail; phase: LivePhase; frame: ReturnType<typeof useJobLiveStream>['frame'] }) {
  const { t } = useTranslation();
  const finished = isTerminalRun(run.status);

  return (
    <Card className="gap-2 overflow-hidden border border-border p-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-bold text-foreground">{t('automations.live.title')}</Text>
        {!finished && <Text className="text-xs text-muted-foreground" testID="live-phase">{t(`automations.${PHASE_TEXT[phase]}`)}</Text>}
      </View>
      {frame === null
        ? (
            <View className="items-center justify-center rounded-lg border border-border bg-muted px-4 py-10">
              <Text className="text-center text-xs text-muted-foreground" testID="live-placeholder">
                {finished ? t('automations.live.no_preview') : phase === 'error' ? t('automations.live.unavailable') : t('automations.live.waiting')}
              </Text>
            </View>
          )
        : (
            <View className="w-full overflow-hidden rounded-lg border border-border bg-black" style={{ aspectRatio: frame.width / frame.height }}>
              <Image
                testID="live-frame"
                accessibilityLabel={t('automations.live.preview_label')}
                source={{ uri: frame.uri }}
                placeholder={null}
                contentFit="contain"
                cachePolicy="none"
                style={{ width: '100%', height: '100%' }}
              />
            </View>
          )}
    </Card>
  );
}

function RunSummary({ run }: { run: JobRunDetail }) {
  const { t } = useTranslation();
  const status = presentRunStatus(run.status);
  const tint = TINT[status.tint];
  const duration = formatRunDuration(run.startedAt, run.finishedAt);
  const counts = presentRunResult(run.result);
  const lines = [
    counts?.downloadedRows !== undefined && t('automations.run.rows', { count: counts.downloadedRows }),
    counts?.created !== undefined && t('automations.run.created', { count: counts.created }),
    counts?.updated !== undefined && t('automations.run.updated', { count: counts.updated }),
    counts?.unchanged !== undefined && t('automations.run.unchanged', { count: counts.unchanged }),
    counts?.warnings ? t('automations.run.warnings', { count: counts.warnings }) : false,
  ].filter(Boolean);
  const finished = formatRunTime(run.finishedAt);

  return (
    <Card className="gap-1.5 border border-border p-3">
      <View className="flex-row items-center justify-between gap-2">
        <View className="rounded-sm px-1.5 py-0.5" style={{ backgroundColor: tint.bg }}>
          <Text className="text-[11px] font-bold uppercase" style={{ color: tint.fg }}>{t(status.key)}</Text>
        </View>
        <Text className="text-xs font-semibold text-muted-foreground">{t('automations.detail.progress', { count: run.progress })}</Text>
      </View>
      <Text className="text-xs text-muted-foreground">{t('automations.detail.queued_at', { time: formatRunTime(run.queuedAt) ?? '-' })}</Text>
      {finished !== null && <Text className="text-xs text-muted-foreground">{t('automations.run.finished', { time: finished })}</Text>}
      {duration !== null && <Text className="text-xs text-muted-foreground">{t('automations.run.duration', { duration })}</Text>}
      {lines.length > 0 && (
        <View className="mt-1 gap-0.5 border-t border-border pt-2">
          <Text className="text-xs font-bold text-foreground">{t('automations.detail.result_title')}</Text>
          <Text className="text-xs text-muted-foreground">{lines.join(' · ')}</Text>
        </View>
      )}
    </Card>
  );
}

function Attempts({ attempts }: { attempts: JobAttempt[] }) {
  const { t } = useTranslation();
  if (attempts.length === 0)
    return null;
  const ordered = [...attempts].sort((a, b) => a.attemptNumber - b.attemptNumber);

  return (
    <Card className="gap-2 border border-border p-3">
      <Text className="text-sm font-bold text-foreground">{t('automations.detail.attempts_title')}</Text>
      {ordered.map((attempt) => {
        const duration = formatRunDuration(attempt.startedAt, attempt.finishedAt);
        return (
          <View key={attempt.attemptNumber} className="gap-0.5" testID={`attempt-${attempt.attemptNumber}`}>
            <Text className="text-xs font-semibold text-foreground">
              {`${t('automations.detail.attempt', { number: attempt.attemptNumber })} · ${t(`automations.detail.attempt_status.${attempt.status}`)}${duration === null ? '' : ` · ${duration}`}`}
            </Text>
            {attempt.safeErrorMessage !== null && (
              <Text className="text-xs text-muted-foreground">{`${t('automations.detail.error_label')}: ${attempt.safeErrorMessage}`}</Text>
            )}
          </View>
        );
      })}
    </Card>
  );
}

function Timeline({ events }: { events: JobRunEvent[] }) {
  const { t } = useTranslation();

  return (
    <Card className="gap-2 border border-border p-3">
      <Text className="text-sm font-bold text-foreground">{t('automations.detail.activity_title')}</Text>
      {events.length === 0
        ? <Text className="text-xs text-muted-foreground">{t('automations.detail.activity_empty')}</Text>
        : events.map((event) => {
            const presented = presentJobEvent(event);
            const time = formatRunTime(event.createdAt);
            return (
              <View key={event.sequence} className="flex-row gap-2" testID={`activity-${event.sequence}`}>
                <View className="mt-1.5 size-2 rounded-full" style={{ backgroundColor: LEVEL_TINT[event.level]?.fg ?? TINT.blue.fg }} />
                <View className="min-w-0 flex-1">
                  <Text className="text-[13px] text-foreground">{t(presented.key, presented.values)}</Text>
                  {time !== null && <Text className="text-[11px] text-muted-foreground">{time}</Text>}
                </View>
              </View>
            );
          })}
    </Card>
  );
}

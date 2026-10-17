import * as React from 'react';
import { dialogs } from '@/components/common/dialogs';
import { Button } from '@/components/ui';
import { isActiveRun, isTerminalRun } from '@/lib/automations/job-run-presenter';
import { useInstantRefreshStatus, useStartInstantRefresh } from '@/lib/hooks/api/use-job-runs';

const NOT_REFRESHED = 'Not refreshed';
const GENERIC_FAILURE = 'ACT could not refresh this set-top box.';

/**
 * The ACT dashboard's Instant Refresh for one box, from the phone: the server signs in to ACT and
 * submits the box's number, and this reports what ACT answered: its green "successfully reactivated", or why not. The box stays disabled while a
 * refresh is running, and the result is said once.
 */
export function RefreshBoxButton({ customerEquipmentId }: { customerEquipmentId: string }) {
  const start = useStartInstantRefresh();
  const [runId, setRunId] = React.useState<string | undefined>();
  const progress = useInstantRefreshStatus(runId);
  const status = progress.data?.status;
  const reported = React.useRef<string | null>(null);
  const waiting = start.isPending || (runId !== undefined && !progress.isError && (status === undefined || isActiveRun(status)));

  React.useEffect(() => {
    if (runId === undefined || reported.current === runId)
      return;
    if (progress.isError) {
      reported.current = runId;
      void dialogs.notify(NOT_REFRESHED, 'Could not check whether the refresh finished. Open the box again in a minute.');
      return;
    }
    if (status === undefined || !isTerminalRun(status))
      return;
    reported.current = runId;
    if (status === 'succeeded')
      void dialogs.notify('Box refreshed', 'ACT confirmed it: the set-top box was successfully reactivated.');
    else
      void dialogs.notify(NOT_REFRESHED, progress.data?.message ?? GENERIC_FAILURE);
  }, [runId, status, progress.isError, progress.data?.message]);

  return (
    <Button
      label={waiting ? 'Refreshing…' : 'Refresh box'}
      variant="outline"
      size="sm"
      fullWidth={false}
      disabled={waiting}
      testID="refresh-box"
      onPress={() => start.mutate({ customerEquipmentId }, {
        onSuccess: ({ run }) => setRunId(run.id),
        onError: failure => void dialogs.notify(NOT_REFRESHED, failure.message || GENERIC_FAILURE),
      })}
    />
  );
}

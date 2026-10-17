import type { ActVisitSource } from '@/components/customer/act-visit-dialog';
import type { ActivationStatus } from '@/lib/api/contracts';
import { AlertCircleIcon, CheckmarkCircle02Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { ActivityIndicator, Modal, ScrollView } from 'react-native';
import { dialogs } from '@/components/common/dialogs';
import { ActVisitDialog } from '@/components/customer/act-visit-dialog';
import { Button, colors, Pressable, Text, View } from '@/components/ui';
import { queryClient } from '@/lib/api/query-client';
import { isActiveRun, isTerminalRun } from '@/lib/automations/job-run-presenter';
import { useActivationStatus, useDecideActivation, useStartActivation } from '@/lib/hooks/api/use-job-runs';
import { rupeesExact } from '@/lib/utils/admin-format';

/** `activate` extends a running box whose plan is about to end, on ACT; `renew` is ACT's STB Renew for a box whose service expired. */
export type ActAction = 'activate' | 'renew';

/** The worker reports these percentages as it goes; each step is current from its own to the next one's. */
const STEPS: Record<ActAction, readonly { at: number; label: string }[]> = {
  activate: [
    { at: 5, label: 'Signing in to ACT' },
    { at: 25, label: 'Opening Service Extension' },
    { at: 35, label: 'Finding the set-top box' },
    { at: 50, label: 'Selecting its packages' },
    { at: 65, label: 'Asking ACT to extend them' },
    { at: 75, label: 'Waiting for your confirmation' },
    { at: 85, label: 'Extending on ACT' },
    { at: 95, label: 'Checking the new end date' },
  ],
  renew: [
    { at: 5, label: 'Signing in to ACT' },
    { at: 30, label: 'Finding the set-top box' },
    { at: 60, label: 'Waiting for your confirmation' },
    { at: 70, label: 'Checking the expired packages again' },
    { at: 75, label: 'Renewing on ACT' },
  ],
};

const COPY = {
  activate: {
    button: 'Activate on ACT',
    title: 'Activate on ACT',
    go: 'Activate',
    doing: 'Activating on ACT…',
    success: 'ACT confirmed it: the set-top box was extended.',
    // ACT's final OK is switched off on the server for now: the run does everything but press it.
    previewed: 'Confirmed. ACT\'s final OK is switched off for now, so nothing was extended.',
    failure: 'Not activated',
    generic: 'ACT could not activate this set-top box.',
    offer: 'ACT will extend these packages:',
  },
  renew: {
    button: 'Renew on ACT',
    title: 'Renew on ACT',
    go: 'Renew',
    doing: 'Renewing on ACT…',
    success: 'ACT confirmed it: the set-top box was renewed.',
    failure: 'Not renewed',
    generic: 'ACT could not renew this set-top box.',
    offer: 'ACT will renew these expired packages:',
  },
} as const;

/** True when the wallet cannot cover what ACT would take. */
const walletTooLow = (status: ActivationStatus) => status.bill !== null && status.bill.availableBalance !== null && status.bill.totalMsoSharePayable !== null && status.bill.totalMsoSharePayable > status.bill.availableBalance;

function Step({ label, state }: { label: string; state: 'done' | 'current' | 'todo' }) {
  return (
    <View className="flex-row items-center gap-3 py-1.5">
      <View className="size-5 items-center justify-center">
        {state === 'done' ? <HugeiconsIcon icon={Tick02Icon} size={18} color={colors.primary[600]} strokeWidth={2.5} /> : null}
        {state === 'current' ? <ActivityIndicator size="small" color={colors.primary[600]} /> : null}
        {state === 'todo' ? <View className="size-2.5 rounded-full bg-border" /> : null}
      </View>
      <Text className={`flex-1 text-sm ${state === 'current' ? 'font-bold text-foreground' : state === 'done' ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</Text>
    </View>
  );
}

function Offer({ action, status }: { action: ActAction; status: ActivationStatus }) {
  const bill = status.bill;
  const share = bill?.totalMsoSharePayable ?? null;
  return (
    <View className="mt-3 gap-1 rounded-xl bg-surface p-3" testID="act-offer">
      <Text className="text-xs font-semibold text-muted-foreground">{COPY[action].offer}</Text>
      <Text className="text-[13px] text-foreground">{status.packages.join(', ')}</Text>
      {bill !== null && bill.billAmount !== null && bill.taxAmount !== null && bill.totalPayable !== null
        ? <Text className="mt-1 text-xs text-muted-foreground">{`Bill ${rupeesExact(bill.billAmount)} + tax ${rupeesExact(bill.taxAmount)} = ${rupeesExact(bill.totalPayable)}`}</Text>
        : null}
      {share !== null
        ? <Text className="text-[13px] font-bold text-foreground">{`ACT takes ${rupeesExact(share)} from the LCO wallet${bill?.availableBalance == null ? '' : ` (wallet ${rupeesExact(bill.availableBalance)} → ${rupeesExact(bill.availableBalance - share)})`}`}</Text>
        : <Text className="mt-1 text-xs text-muted-foreground">{`ACT does not show a price before ${action === 'renew' ? 'renewing' : 'extending'}.`}</Text>}
    </View>
  );
}

type ModalProps = {
  action: ActAction;
  status: ActivationStatus | undefined;
  failed: boolean;
  answered: boolean;
  deciding: boolean;
  onDecide: (decision: 'approve' | 'cancel') => void;
  onClose: () => void;
};

/**
 * Blocks the screen for as long as ACT is working: which step the run is on, ACT's offer when it waits for the
 * person, then a spinner while the answer is carried out. It can only be closed once the run is over, or by declining.
 */
function ActModal({ action, status, failed, answered, deciding, onDecide, onClose }: ModalProps) {
  const copy = COPY[action];
  const progress = status?.progress ?? 0;
  const over = failed || (status !== undefined && isTerminalRun(status.status));
  const succeeded = status?.status === 'succeeded' && (status.outcome === 'activated' || status.outcome === 'renewed');
  const previewed = status?.status === 'succeeded' && status.outcome === 'previewed' && action === 'activate';
  const awaiting = status?.awaitingConfirmation === true && !answered;
  const steps = STEPS[action];
  const currentAt = [...steps].reverse().find(step => progress >= step.at)?.at ?? 0;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={over ? onClose : undefined}>
      <View className="flex-1 items-center justify-center bg-black/60 px-6" testID="act-modal">
        <View className="max-h-[85%] w-full max-w-sm rounded-3xl border border-border bg-card p-5">
          <ScrollView bounces={false}>
            <Text className="text-lg font-bold text-foreground">{copy.title}</Text>

            {over
              ? (
                  <View className="mt-3 items-center gap-2" testID={succeeded || previewed ? 'act-modal-success' : 'act-modal-failure'}>
                    <HugeiconsIcon icon={succeeded || previewed ? CheckmarkCircle02Icon : AlertCircleIcon} size={48} color={succeeded || previewed ? colors.primary[600] : colors.danger[500]} strokeWidth={1.8} />
                    <Text className="text-center text-sm text-foreground">{succeeded ? copy.success : previewed ? COPY.activate.previewed : (status?.message ?? copy.generic)}</Text>
                  </View>
                )
              : (
                  <View className="mt-3">
                    {steps.map(step => (
                      <Step key={step.at} label={step.label} state={step.at < currentAt || (answered && step.at <= currentAt && step.at > 75) ? 'done' : step.at === currentAt ? 'current' : 'todo'} />
                    ))}
                  </View>
                )}

            {!over && status !== undefined && (awaiting || answered) && status.packages.length > 0 ? <Offer action={action} status={status} /> : null}
            {!over && status === undefined ? <Text className="mt-2 text-xs text-muted-foreground">Starting…</Text> : null}
            {!over && status !== undefined && !awaiting && !answered ? <Text className="mt-3 text-xs text-muted-foreground">Please wait. The screen stays locked while ACT works.</Text> : null}
          </ScrollView>

          {awaiting && status !== undefined
            ? (
                <View className="mt-4 gap-2">
                  {walletTooLow(status) ? <Text className="text-xs font-semibold text-danger-600" testID="act-wallet-low">The LCO wallet cannot cover ACT's share. Top it up on ACT, then try again.</Text> : null}
                  <View className="flex-row gap-2.5">
                    <Pressable accessibilityRole="button" disabled={deciding} onPress={() => onDecide('cancel')} testID="act-cancel" className="flex-1 items-center justify-center rounded-xl border border-border bg-surface py-3 active:bg-muted/40">
                      <Text className="text-sm font-bold text-foreground">Cancel</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" disabled={deciding || walletTooLow(status)} onPress={() => onDecide('approve')} testID="act-approve" className={`flex-1 items-center justify-center rounded-xl bg-primary-600 py-3 active:bg-primary-700 ${deciding || walletTooLow(status) ? 'opacity-50' : ''}`}>
                      <Text className="text-sm font-bold text-white">{copy.go}</Text>
                    </Pressable>
                  </View>
                </View>
              )
            : null}
          {answered && !over ? <Text className="mt-4 text-center text-sm font-bold text-foreground" testID="act-doing">{copy.doing}</Text> : null}
          {over
            ? (
                <Pressable accessibilityRole="button" onPress={onClose} testID="act-close" className="mt-4 items-center justify-center rounded-xl bg-primary-600 py-3 active:bg-primary-700">
                  <Text className="text-sm font-bold text-white">{succeeded || previewed ? 'Done' : 'Close'}</Text>
                </Pressable>
              )
            : null}
        </View>
      </View>
    </Modal>
  );
}

/** What a finished activation or renewal changes on screen: the customer, their line, the timeline and the lists. */
function refreshCustomer() {
  void queryClient.invalidateQueries({ queryKey: ['customer'] });
  void queryClient.invalidateQueries({ queryKey: ['customers'] });
  void queryClient.invalidateQueries({ queryKey: ['customer-timeline'] });
}

/**
 * Activates a running box on ACT again for the next cycle, or renews a lapsed one. One press starts one run that reads
 * ACT's offer and waits: a locked progress window shows the step it is on, then ACT's packages and bill. Only
 * the person's tap on the offer spends anything, and the window stays locked until the run is over.
 */
export function ActivateAtActButton({ customerEquipmentId, action = 'activate', collectionId, visit, autoStart = false }: {
  customerEquipmentId: string;
  action?: ActAction;
  /** The payment this run follows ("renew or activate for the next cycle"): the server checks it and tells the admins what triggered the run. */
  collectionId?: string;
  /** With no payment behind it, the run follows a visit: a tap opens the dialog that asks why, saves the visit, then starts the run. */
  visit?: ActVisitSource;
  /** Starts the run as soon as the button appears, once: the collector asked for it before paying. */
  autoStart?: boolean;
}) {
  const copy = COPY[action];
  const start = useStartActivation();
  const [runId, setRunId] = React.useState<string | undefined>();
  const [open, setOpen] = React.useState(false);
  const [asking, setAsking] = React.useState(false);
  const [answered, setAnswered] = React.useState(false);
  const decide = useDecideActivation(runId);
  const status = useActivationStatus(runId);
  const refreshed = React.useRef(new Set<string>());

  const current = status.data;
  const failed = status.isError;
  const over = failed || (current !== undefined && isTerminalRun(current.status));

  React.useEffect(() => {
    if (runId === undefined || current === undefined || current.status !== 'succeeded' || refreshed.current.has(runId))
      return;
    refreshed.current.add(runId);
    refreshCustomer();
  }, [runId, current]);

  const startRun = start.mutate;
  /* eslint-disable react-hooks-extra/no-direct-set-state-in-use-effect -- these run in the mutation's callbacks, after the request answers; the lint only sees them because the auto-start effect calls `onStart` */
  const onStart = React.useCallback((visitId?: string) => startRun({ customerEquipmentId, action, ...(collectionId === undefined ? {} : { collectionId }), ...(visitId === undefined ? {} : { visitId }) }, {
    onSuccess: ({ run }) => {
      setAnswered(false);
      setRunId(run.id);
      setOpen(true);
    },
    onError: failure => void dialogs.notify(copy.failure, failure.message || copy.generic),
  }), [startRun, customerEquipmentId, action, collectionId, copy]);
  /* eslint-enable react-hooks-extra/no-direct-set-state-in-use-effect */

  const onVisitSaved = (visitId: string) => {
    setAsking(false);
    onStart(visitId);
  };

  // A payment is its own reason; without one the person says why first, as a visit.
  const onPress = () => {
    if (collectionId !== undefined)
      onStart();
    else if (visit !== undefined)
      setAsking(true);
    else
      void dialogs.notify(copy.failure, 'Mark a visit or take a payment first: ACT is not changed without a reason on record.');
  };

  const onDecide = (decision: 'approve' | 'cancel') => {
    const total = current?.bill?.totalMsoSharePayable;
    decide.mutate({ decision, ...(decision === 'approve' && total != null ? { approvedTotal: total } : {}) }, {
      onSuccess: () => {
        if (decision === 'cancel')
          setOpen(false);
        else
          setAnswered(true);
      },
      onError: failure => void dialogs.notify(copy.failure, failure.message || copy.generic),
    });
  };

  // Once only, however often the screen re-renders; a refusal leaves the button for a manual retry.
  const autoStarted = React.useRef(false);
  React.useEffect(() => {
    if (!autoStart || autoStarted.current)
      return;
    autoStarted.current = true;
    onStart();
  }, [autoStart, onStart]);

  const working = start.isPending || (open && !over) || (runId !== undefined && current !== undefined && isActiveRun(current.status));

  return (
    <>
      <Button
        label={working ? 'Working with ACT…' : copy.button}
        size="sm"
        fullWidth={false}
        disabled={working}
        testID={`${action}-at-act`}
        onPress={onPress}
      />
      {asking && visit !== undefined
        ? <ActVisitDialog action={action} source={visit} onClose={() => setAsking(false)} onSaved={onVisitSaved} />
        : null}
      {open
        ? <ActModal action={action} status={current} failed={failed} answered={answered} deciding={decide.isPending} onDecide={onDecide} onClose={() => setOpen(false)} />
        : null}
    </>
  );
}

import type { VisitChoice, VisitTarget } from '@/lib/visits/visit-flow';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUniwind } from 'uniwind';
import { DatePickerModal } from '@/components/common/date-picker-modal';
import { dialogs } from '@/components/common/dialogs';
import { Button, colors, Input, Pill, Pressable, renderBackdrop, Text, ThemedIcon, View } from '@/components/ui';
import BottomSheetKeyboardAwareScrollView from '@/components/ui/modal-keyboard-aware-scroll-view';
import { newCollectionReference } from '@/lib/hooks/api/use-payments';
import { useUpdateTicket } from '@/lib/hooks/api/use-tickets';
import { recordVisit, VISIT_PURPOSE_LABELS } from '@/lib/hooks/api/use-visits';
import { fixPayload, useCollectionFix } from '@/lib/hooks/common/use-collection-fix';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';
import { ensureFix } from '@/lib/payments/require-fix';
import { dayKey } from '@/lib/utils/round-filters';
import { clearVisitFlow, useVisitFlow } from '@/lib/visits/visit-flow';

export type MarkVisitTarget = VisitTarget;

const SNAP_POINTS = ['50%', '80%'];

const NEXT_VISIT: { key: string; label: string; days: number }[] = [
  { key: 'tomorrow', label: 'Tomorrow', days: 1 },
  { key: '3d', label: 'In 3 days', days: 3 },
  { key: 'week', label: 'Next week', days: 7 },
];

const ACTION_LABEL = { collect_payment: 'Collect payment', resolve_complaint: 'Fix the complaint' } as const;
const NOT_DONE: { key: Exclude<VisitChoice, 'action'>; label: string }[] = [
  { key: 'not_available', label: 'Not available' },
  { key: 'refused', label: 'Refused' },
  { key: 'come_later', label: 'Come later' },
  { key: 'other', label: 'Other' },
];

function addLocalDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 12);
}

function localDateFromKey(key: string): Date {
  const [year, month, date] = key.split('-').map(Number);
  return new Date(year!, month! - 1, date!, 12);
}

function nextVisitAt(next: string, customDate: string | null, now = new Date()): string {
  const minimumDate = dayKey(addLocalDays(now, 1));
  if (next === 'custom' && customDate !== null && customDate >= minimumDate)
    return localDateFromKey(customDate).toISOString();

  const days = NEXT_VISIT.find(option => option.key === next)?.days ?? 1;
  return addLocalDays(now, days).toISOString();
}

/** Opens the visit sheet for a door. The reason for the visit is the list's, so it is never asked. */
export function startVisit(target: VisitTarget) {
  useVisitFlow.getState().start(target, newCollectionReference());
}

export function MarkVisitSheet() {
  const active = useVisitFlow(state => state.active);
  const sheet = React.useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const { theme } = useUniwind();
  const visible = active !== null && active.stage === 'form';
  const wasVisible = React.useRef(false);

  React.useEffect(() => {
    if (visible === wasVisible.current)
      return;

    wasVisible.current = visible;
    if (visible)
      sheet.current?.present();
    else
      sheet.current?.dismiss();
  }, [visible]);

  const handleDismiss = React.useCallback(() => {
    // Launching a payment hides this sheet but keeps the visit alive until the
    // payment records it. A user-dismissed form, however, drops its draft.
    if (useVisitFlow.getState().active?.stage === 'form')
      clearVisitFlow();
  }, []);

  const dismissForm = React.useCallback(() => {
    sheet.current?.dismiss();
    handleDismiss();
  }, [handleDismiss]);

  const isDark = theme === 'dark';

  return (
    <BottomSheetModal
      ref={sheet}
      index={0}
      snapPoints={SNAP_POINTS}
      enableDynamicSizing={false}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: isDark ? colors.neutral[900] : colors.white }}
      handleIndicatorStyle={{ backgroundColor: isDark ? colors.neutral[600] : colors.neutral[300] }}
      onDismiss={handleDismiss}
    >
      {visible ? <Sheet key={active.reference} dismiss={dismissForm} bottomInset={insets.bottom} /> : null}
    </BottomSheetModal>
  );
}

function Sheet({ dismiss, bottomInset }: { dismiss: () => void; bottomInset: number }) {
  const router = useRouter();
  const { i18n, t } = useTranslation();
  const role = useAuthStore.use.role();
  const base = role === 'staff' ? '/staff' : '/admin';
  const { target, draft, reference } = useVisitFlow(state => state.active!);
  const patch = useVisitFlow(state => state.patch);
  const fix = useCollectionFix();
  const { mutateAsync: updateTicket } = useUpdateTicket();
  const [saving, setSaving] = React.useState(false);
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);
  const minimumDate = dayKey(addLocalDays(new Date(), 1));

  // A complaint can only be fixed if we know which ticket it is.
  const action = target.action === 'resolve_complaint' && target.ticketId === undefined ? null : target.action;
  const isAction = draft.choice === 'action' && action !== null;
  const finishWithVisit = async (outcome: 'done' | Exclude<VisitChoice, 'action'>, where: ReturnType<typeof fixPayload>) => {
    // "Come later" is a promise to return, so it always carries a date: the chosen one, else tomorrow.
    const visitAt = outcome === 'come_later' ? nextVisitAt(draft.next, draft.nextVisitDate) : null;
    await recordVisit(target.customerId, {
      purpose: target.purpose,
      outcome,
      reference,
      ...where,
      ...(target.subscriptionId === undefined ? {} : { subscriptionId: target.subscriptionId }),
      ...(target.ticketId === undefined ? {} : { ticketId: target.ticketId }),
      ...(draft.notes.trim() === '' ? {} : { notes: draft.notes.trim() }),
      ...(visitAt === null ? {} : { nextVisitAt: visitAt }),
    });
  };

  const submit = async () => {
    if (!ensureFix(fix))
      return;
    const where = fixPayload(fix);

    if (isAction && action === 'collect_payment') {
      // The payment screen takes over; the visit completes when the payment is recorded.
      useVisitFlow.getState().launch(where);
      router.push({
        pathname: `${base}/recharge/[id]`,
        params: { id: target.customerId, ...(target.subscriptionId === undefined ? {} : { subscriptionId: target.subscriptionId }) },
      });
      return;
    }

    if (isAction && draft.resolution.trim().length < 3) {
      void dialogs.notify('Say what was fixed', 'A few words on what was done — the subscriber is told this.');
      return;
    }

    setSaving(true);
    try {
      if (isAction) {
        if (!draft.resolved) {
          await updateTicket({ id: target.ticketId!, payload: { status: 'resolved', resolution: draft.resolution.trim() } });
          patch({ resolved: true });
        }
        await finishWithVisit('done', where);
      }
      else {
        await finishWithVisit(draft.choice as Exclude<VisitChoice, 'action'>, where);
      }
      dismiss();
      void dialogs.notify(isAction ? 'Complaint fixed' : 'Visit marked', isAction ? 'The ticket is resolved and the visit is marked done.' : 'It is on the customer\'s timeline and in Visits.');
    }
    catch (failure) {
      void dialogs.notify('Not saved', (failure as Error).message || 'Nothing was lost — try again.');
    }
    finally {
      setSaving(false);
    }
  };

  const submitLabel = saving
    ? 'Saving…'
    : isAction
      ? (action === 'collect_payment' ? 'Collect payment' : 'Fix & complete visit')
      : 'Save visit';

  return (
    <View className="flex-1">
      <View className="flex-row items-center gap-2 px-5 pb-4">
        <View className="min-w-0 flex-1">
          <Text className="text-xl font-extrabold text-foreground">Mark a visit</Text>
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>{target.customerName ?? 'This customer'}</Text>
        </View>
        <View className="rounded-full bg-primary-500/15 px-2.5 py-1">
          <Text className="text-[11px] font-bold text-primary-600">{VISIT_PURPOSE_LABELS[target.purpose]}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="close modal"
          hitSlop={12}
          onPress={dismiss}
          className="size-9 items-center justify-center rounded-full active:bg-muted"
        >
          <ThemedIcon icon={Cancel01Icon} size={20} colorClassName="text-muted-foreground" />
        </Pressable>
      </View>

      <BottomSheetKeyboardAwareScrollView
        style={{ flex: 1, paddingHorizontal: 20 }}
        contentContainerStyle={{ gap: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
      >
        <Field label="What happened">
          <View className="flex-row flex-wrap gap-2">
            {action !== null && <Pill accessibilityRole="radio" label={ACTION_LABEL[action]} selected={draft.choice === 'action'} onPress={() => patch({ choice: 'action' })} testID="visit-choice-action" />}
            {NOT_DONE.map(option => <Pill key={option.key} accessibilityRole="radio" label={option.label} selected={draft.choice === option.key} onPress={() => patch({ choice: option.key })} testID={`visit-choice-${option.key}`} />)}
          </View>
        </Field>

        {isAction && action === 'collect_payment' && (
          <Text className="text-xs text-muted-foreground">You will record the payment as usual; the visit is marked done as soon as it is saved.</Text>
        )}

        {isAction && action === 'resolve_complaint' && (
          <Field label="What was fixed?">
            <Input value={draft.resolution} onChangeText={resolution => patch({ resolution })} placeholder="Replaced the drop wire" multiline numberOfLines={2} testID="visit-resolution" />
          </Field>
        )}

        {draft.choice === 'come_later' && (
          <Field label="Come back">
            <View className="flex-row flex-wrap gap-2">
              {NEXT_VISIT.map(option => <Pill key={option.key} accessibilityRole="radio" label={option.label} selected={draft.next === option.key} onPress={() => patch({ next: option.key, nextVisitDate: null })} testID={`visit-next-${option.key}`} />)}
              <Pill
                accessibilityRole="radio"
                label={draft.next === 'custom' && draft.nextVisitDate !== null
                  ? localDateFromKey(draft.nextVisitDate).toLocaleDateString(i18n.resolvedLanguage?.startsWith('te') ? 'te-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : t('mark_visit.custom_date')}
                selected={draft.next === 'custom'}
                onPress={() => setDatePickerOpen(true)}
                testID="visit-next-custom"
              />
            </View>
          </Field>
        )}

        {!isAction && (
          <Field label="Notes (optional)">
            <Input value={draft.notes} onChangeText={notes => patch({ notes })} placeholder="Door locked, neighbour says back on Sunday" multiline numberOfLines={3} testID="visit-notes" />
          </Field>
        )}

        <Text className="text-xs text-muted-foreground" testID="visit-location">
          {fix.status === 'ready' ? `Location attached · accurate to ${Math.round(fix.gpsAccuracyM)} m` : fix.status === 'locating' ? 'Finding your location…' : 'Location needed to save the visit'}
        </Text>
      </BottomSheetKeyboardAwareScrollView>

      <View className="flex-row gap-3 px-5 pt-4" style={{ paddingBottom: Math.max(bottomInset, 12) }}>
        <View className="flex-1">
          <Button label="Cancel" variant="outline" size="lg" onPress={dismiss} testID="visit-cancel" />
        </View>
        <View className="flex-1">
          <Button label={submitLabel} size="lg" disabled={saving} onPress={() => void submit()} testID="visit-submit" />
        </View>
      </View>

      <DatePickerModal
        minimumDate={minimumDate}
        onApply={(date) => {
          patch({ next: 'custom', nextVisitDate: date });
          setDatePickerOpen(false);
        }}
        onClose={() => setDatePickerOpen(false)}
        value={draft.nextVisitDate}
        visible={datePickerOpen}
      />
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-bold text-foreground">{label}</Text>
      {children}
    </View>
  );
}

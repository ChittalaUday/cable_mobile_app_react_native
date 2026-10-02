import type { VisitOutcome, VisitPurpose } from '@/lib/hooks/api/use-visits';
import * as React from 'react';
import { Modal as RNModal } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { dialogs } from '@/components/common/dialogs';
import { Button, Input, Pressable, Text, View } from '@/components/ui';
import { newCollectionReference } from '@/lib/hooks/api/use-payments';
import { useRecordVisit, VISIT_OUTCOME_LABELS, VISIT_PURPOSE_LABELS } from '@/lib/hooks/api/use-visits';
import { fixPayload, useCollectionFix } from '@/lib/hooks/common/use-collection-fix';
import { ensureFix } from '@/lib/payments/require-fix';

export type MarkVisitTarget = {
  customerId: string;
  customerName?: string | null;
  subscriptionId?: string;
  /** Purpose to start on — a complaint visit opened from a ticket, say. */
  purpose?: VisitPurpose;
  ticketId?: string;
};

const NEXT_VISIT: { key: string; label: string; days: number | null }[] = [
  { key: 'none', label: 'No date', days: null },
  { key: 'tomorrow', label: 'Tomorrow', days: 1 },
  { key: '3d', label: 'In 3 days', days: 3 },
  { key: 'week', label: 'Next week', days: 7 },
];

/**
 * Mark that someone went to the door — most of all when nobody answered, the
 * visit that otherwise leaves no trace. Two taps and Save is the whole job: the
 * purpose, what happened, and the phone adds where.
 */
export function MarkVisitSheet({ target, onClose }: { target: MarkVisitTarget | null; onClose: () => void }) {
  if (target === null)
    return null;
  return <Sheet key={`${target.customerId}:${target.ticketId ?? ''}`} target={target} onClose={onClose} />;
}

function Sheet({ target, onClose }: { target: MarkVisitTarget; onClose: () => void }) {
  const [purpose, setPurpose] = React.useState<VisitPurpose>(target.purpose ?? 'payment');
  const [outcome, setOutcome] = React.useState<VisitOutcome>('not_available');
  const [next, setNext] = React.useState('none');
  const [notes, setNotes] = React.useState('');
  // One reference per sheet: a retry after a dropped connection replays the
  // same visit instead of logging a second one.
  const [reference] = React.useState(newCollectionReference);
  const fix = useCollectionFix();
  const { mutate: record, isPending } = useRecordVisit();

  const submit = () => {
    if (!ensureFix(fix))
      return;
    const days = NEXT_VISIT.find(option => option.key === next)?.days ?? null;
    record({
      customerId: target.customerId,
      payload: {
        purpose,
        outcome,
        reference,
        ...fixPayload(fix),
        ...(target.subscriptionId === undefined ? {} : { subscriptionId: target.subscriptionId }),
        ...(target.ticketId === undefined ? {} : { ticketId: target.ticketId }),
        ...(notes.trim() === '' ? {} : { notes: notes.trim() }),
        ...(days === null ? {} : { nextVisitAt: new Date(Date.now() + days * 86_400_000).toISOString() }),
      },
    }, {
      onSuccess: () => {
        onClose();
        void dialogs.notify('Visit marked', 'It is on the customer\'s timeline and in Visits.');
      },
      onError: failure => void dialogs.notify('Not saved', failure.message || 'The visit was not saved. Try again.'),
    });
  };

  return (
    <RNModal animationType="slide" transparent visible onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <View className="max-h-[90%] rounded-t-3xl border-t border-border bg-surface">
          <View className="border-b border-border/60 px-5 py-4">
            <Text className="text-xl font-extrabold text-foreground">Mark a visit</Text>
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>{target.customerName ?? 'This customer'}</Text>
          </View>

          <KeyboardAwareScrollView
            style={{ paddingHorizontal: 20, paddingVertical: 16 }}
            contentContainerStyle={{ gap: 16, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            bottomOffset={24}
          >
            <Field label="Came for">
              <Chips options={VISIT_PURPOSE_LABELS} value={purpose} onChange={setPurpose} prefix="visit-purpose" />
            </Field>
            <Field label="What happened">
              <Chips options={VISIT_OUTCOME_LABELS} value={outcome} onChange={setOutcome} prefix="visit-outcome" />
            </Field>
            <Field label="Come back">
              <Chips options={Object.fromEntries(NEXT_VISIT.map(option => [option.key, option.label]))} value={next} onChange={setNext} prefix="visit-next" />
            </Field>
            <Field label="Notes (optional)">
              <Input value={notes} onChangeText={setNotes} placeholder="Door locked, neighbour says back on Sunday" multiline numberOfLines={3} testID="visit-notes" />
            </Field>
            <Text className="text-xs text-muted-foreground" testID="visit-location">
              {fix.status === 'ready' ? `Location attached · accurate to ${Math.round(fix.gpsAccuracyM)} m` : fix.status === 'locating' ? 'Finding your location…' : 'Location needed to save the visit'}
            </Text>
          </KeyboardAwareScrollView>

          <View className="flex-row gap-3 border-t border-border/60 px-5 py-4">
            <View className="flex-1">
              <Button label="Cancel" variant="outline" size="lg" onPress={onClose} />
            </View>
            <View className="flex-1">
              <Button label={isPending ? 'Saving…' : 'Save visit'} size="lg" disabled={isPending} onPress={submit} testID="visit-submit" />
            </View>
          </View>
        </View>
      </View>
    </RNModal>
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

function Chips<K extends string>({ options, value, onChange, prefix }: { options: Record<K, string>; value: K; onChange: (key: K) => void; prefix: string }) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {(Object.keys(options) as K[]).map(key => (
        <Pressable
          key={key}
          accessibilityRole="radio"
          accessibilityState={{ selected: key === value }}
          testID={`${prefix}-${key}`}
          onPress={() => onChange(key)}
          className={`rounded-full border px-3.5 py-2 ${key === value ? 'border-primary-500 bg-primary-500' : 'border-border bg-card'}`}
        >
          <Text className={`text-xs font-bold ${key === value ? 'text-white' : 'text-foreground'}`}>{options[key]}</Text>
        </Pressable>
      ))}
    </View>
  );
}

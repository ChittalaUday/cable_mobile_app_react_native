import * as React from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView } from 'react-native';
import { dialogs } from '@/components/common/dialogs';
import { Button, Input, Pill, Text, View } from '@/components/ui';
import { newCollectionReference } from '@/lib/hooks/api/use-payments';
import { recordVisit } from '@/lib/hooks/api/use-visits';
import { fixPayload, useCollectionFix } from '@/lib/hooks/common/use-collection-fix';
import { ensureFix } from '@/lib/payments/require-fix';

/** Who the visit is about: the customer, and the line the box is on. */
export type ActVisitSource = { customerId: string; customerName?: string | null; subscriptionId?: string | null };

/** Why ACT is being changed with no payment behind it. "Other" has to say more. */
const REASONS = [
  { key: 'office', label: 'Paid at the office' },
  { key: 'upi', label: 'Paid by UPI to the LCO' },
  { key: 'complaint', label: 'Complaint resolved' },
  { key: 'owner', label: 'Approved by the owner' },
  { key: 'other', label: 'Other' },
] as const;

/**
 * Every ACT activation or renewal has a reason on record. With no payment behind it, the reason is a visit: the
 * person says why, the visit is saved with where they are (as every visit is), and only then does the ACT run start.
 */
export function ActVisitDialog({ action, source, onSaved, onClose }: {
  action: 'activate' | 'renew';
  source: ActVisitSource;
  /** The saved visit's id, which the ACT run follows. */
  onSaved: (visitId: string) => void;
  onClose: () => void;
}) {
  const fix = useCollectionFix();
  const [reason, setReason] = React.useState<(typeof REASONS)[number]['key'] | null>(null);
  const [note, setNote] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  // One reference per dialog: a retry after a lost answer replays this visit instead of logging a second.
  const reference = React.useRef(newCollectionReference());

  const chosen = REASONS.find(option => option.key === reason);
  const typed = note.trim();

  const save = async () => {
    if (chosen === undefined) {
      void dialogs.notify('Pick a reason', 'Say why this is being done without a payment.');
      return;
    }
    if (chosen.key === 'other' && typed.length < 3) {
      void dialogs.notify('Say why', 'A few words on the reason: it stays on the customer\'s record.');
      return;
    }
    if (!ensureFix(fix))
      return;

    setSaving(true);
    try {
      const visit = await recordVisit(source.customerId, {
        purpose: action === 'renew' ? 'renewal' : 'activation',
        outcome: 'done',
        reference: reference.current,
        ...fixPayload(fix),
        ...(source.subscriptionId == null ? {} : { subscriptionId: source.subscriptionId }),
        notes: chosen.key === 'other' ? typed : typed === '' ? chosen.label : `${chosen.label}: ${typed}`,
      });
      onSaved(visit.id);
    }
    catch (failure) {
      void dialogs.notify('Visit not saved', (failure as Error).message || 'Nothing was changed on ACT. Try again.');
    }
    finally {
      setSaving(false);
    }
  };

  const verb = action === 'renew' ? 'Renew' : 'Activate';

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="flex-1 items-center justify-center bg-black/60 px-6" testID="act-visit-dialog">
          <View className="max-h-[85%] w-full max-w-sm rounded-3xl border border-border bg-card p-5">
            <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
              <Text className="text-lg font-bold text-foreground">{`${verb} on ACT`}</Text>
              <Text className="mt-1 text-xs text-muted-foreground">
                {`${source.customerName ?? 'This customer'} has not paid for this. It is marked as a visit with your reason and location, then ACT is asked.`}
              </Text>

              <Text className="mt-4 mb-1.5 text-sm font-bold text-foreground">Why?</Text>
              <View className="flex-row flex-wrap gap-2">
                {REASONS.map(option => (
                  <Pill key={option.key} accessibilityRole="radio" label={option.label} selected={reason === option.key} onPress={() => setReason(option.key)} testID={`act-visit-reason-${option.key}`} />
                ))}
              </View>

              {reason !== null && (
                <View className="mt-3 gap-1.5">
                  <Text className="text-sm font-bold text-foreground">{reason === 'other' ? 'What is the reason?' : 'Note (optional)'}</Text>
                  <Input value={note} onChangeText={setNote} placeholder={reason === 'other' ? 'Why is ACT being changed?' : 'Receipt or UPI reference'} multiline numberOfLines={2} testID="act-visit-note" />
                </View>
              )}

              <Text className="mt-3 text-xs text-muted-foreground" testID="act-visit-location">
                {fix.status === 'ready' ? `Location attached · accurate to ${Math.round(fix.gpsAccuracyM)} m` : fix.status === 'locating' ? 'Finding your location…' : 'Location needed to save the visit'}
              </Text>
            </ScrollView>

            <View className="mt-4 flex-row gap-3">
              <View className="flex-1">
                <Button label="Cancel" variant="outline" disabled={saving} onPress={onClose} testID="act-visit-cancel" />
              </View>
              <View className="flex-1">
                <Button label={saving ? 'Saving…' : 'Save visit'} disabled={saving} onPress={() => void save()} testID="act-visit-save" />
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

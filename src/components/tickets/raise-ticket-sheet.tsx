import type { TicketCategory, TicketPriority } from '@/lib/hooks/api/use-tickets';
import * as React from 'react';
import { Modal as RNModal } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { dialogs } from '@/components/common/dialogs';
import { Button, Input, Pressable, Text, View } from '@/components/ui';
import {
  TICKET_CATEGORIES,
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITIES,
  TICKET_PRIORITY_LABELS,
  useRaiseTicket,
} from '@/lib/hooks/api/use-tickets';

export type RaiseTicketTarget = {
  customerId: string;
  customerName?: string | null;
  /** The line the complaint is about. It decides which area the ticket lands in. */
  subscriptionId?: string;
  accountNumber?: string | null;
};

/**
 * Raise a complaint from wherever the customer is already on screen.
 *
 * The subject is prefilled from the category and only retyped when the default
 * is wrong, because the common case is a collector at a door with one hand on
 * the gate: two taps and Send should be the whole interaction.
 */
export function RaiseTicketSheet({ target, onClose, onRaised }: {
  target: RaiseTicketTarget | null;
  onClose: () => void;
  onRaised?: (ticketNo: string) => void;
}) {
  if (target === null)
    return null;

  // Keyed on the customer, so opening it on somebody else starts a blank form
  // rather than carrying the last visit's notes across.
  return <Sheet key={target.customerId} target={target} onClose={onClose} onRaised={onRaised} />;
}

function Sheet({ target, onClose, onRaised }: {
  target: RaiseTicketTarget;
  onClose: () => void;
  onRaised?: (ticketNo: string) => void;
}) {
  const [category, setCategory] = React.useState<TicketCategory>('no_signal');
  const [priority, setPriority] = React.useState<TicketPriority>('normal');
  const [subject, setSubject] = React.useState('');
  const [description, setDescription] = React.useState('');

  const { mutate: raise, isPending } = useRaiseTicket();

  const finalSubject = subject.trim() === '' ? TICKET_CATEGORY_LABELS[category] : subject.trim();

  const submit = () => {
    raise({
      payload: {
        customerId: target.customerId,
        ...(target.subscriptionId === undefined ? {} : { subscriptionId: target.subscriptionId }),
        category,
        priority,
        subject: finalSubject,
        ...(description.trim() === '' ? {} : { description: description.trim() }),
      },
    }, {
      onSuccess: (ticket) => {
        onRaised?.(ticket.ticketNo);
        onClose();
        void dialogs.notify('Complaint raised', `${ticket.ticketNo} is now in the queue.`);
      },
      onError: failure => void dialogs.notify(
        'Not raised',
        failure.message || 'The complaint was not saved. Nothing has been logged.',
      ),
    });
  };

  return (
    <RNModal animationType="slide" transparent visible onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <View className="max-h-[90%] rounded-t-3xl border-t border-border bg-surface">
          <View className="border-b border-border/60 px-5 py-4">
            <Text className="text-xl font-extrabold text-foreground">Raise a complaint</Text>
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {[target.customerName, target.accountNumber].filter(part => part != null && part !== '').join(' • ')
                || 'This customer'}
            </Text>
          </View>

          <KeyboardAwareScrollView
            style={{ paddingHorizontal: 20, paddingVertical: 16 }}
            contentContainerStyle={{ gap: 16, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            bottomOffset={24}
          >
            <Field label="What is wrong">
              <View className="flex-row flex-wrap gap-2">
                {TICKET_CATEGORIES.map(option => (
                  <Chip
                    key={option}
                    label={TICKET_CATEGORY_LABELS[option]}
                    selected={option === category}
                    onPress={() => setCategory(option)}
                  />
                ))}
              </View>
            </Field>

            <Field label="How urgent">
              <View className="flex-row flex-wrap gap-2">
                {TICKET_PRIORITIES.map(option => (
                  <Chip
                    key={option}
                    label={TICKET_PRIORITY_LABELS[option]}
                    selected={option === priority}
                    onPress={() => setPriority(option)}
                  />
                ))}
              </View>
            </Field>

            <Field label="Subject">
              <Input
                value={subject}
                onChangeText={setSubject}
                placeholder={TICKET_CATEGORY_LABELS[category]}
                returnKeyType="next"
                testID="ticket-subject"
              />
            </Field>

            <Field label="Anything the engineer should know (optional)">
              <Input
                value={description}
                onChangeText={setDescription}
                placeholder="Whole block is dark since last night"
                multiline
                numberOfLines={3}
                testID="ticket-description"
              />
            </Field>
          </KeyboardAwareScrollView>

          <View className="flex-row gap-3 border-t border-border/60 px-5 py-4">
            <View className="flex-1">
              <Button label="Cancel" variant="outline" size="lg" onPress={onClose} />
            </View>
            <View className="flex-1">
              <Button
                label={isPending ? 'Raising…' : 'Raise'}
                size="lg"
                disabled={isPending}
                onPress={submit}
                testID="ticket-submit"
              />
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

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`rounded-full border px-3.5 py-2 ${
        selected ? 'border-primary-500 bg-primary-500' : 'border-border bg-card'
      }`}
    >
      <Text className={`text-xs font-bold ${selected ? 'text-white' : 'text-foreground'}`}>{label}</Text>
    </Pressable>
  );
}

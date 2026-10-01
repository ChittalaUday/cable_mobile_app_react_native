import type { StaffMember } from '@/lib/api/types';
import type { Ticket } from '@/lib/hooks/api/use-tickets';
import * as React from 'react';
import { Modal as RNModal, ScrollView } from 'react-native';
import { dialogs } from '@/components/common/dialogs';
import { LoadError, Loading } from '@/components/common/shell';
import { Button, Pressable, Text, View } from '@/components/ui';
import { useStaff } from '@/lib/hooks/api/use-staff';
import { useAssignTicket } from '@/lib/hooks/api/use-tickets';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';

/**
 * Hand a complaint to somebody, or put it back in the pool.
 *
 * The server keys an assignee by **user** id, not by the staff membership id —
 * `assignedTo: 'me'` resolves to the caller's user id — so every row here sends
 * `member.userId` and the current holder is matched on it too.
 */
export function AssignTicketSheet({ ticket, onClose }: { ticket: Ticket | null; onClose: () => void }) {
  if (ticket === null)
    return null;

  // Keyed on the ticket, so reopening it on another complaint never shows the
  // previous one's holder as selected.
  return <Sheet key={ticket.id} ticket={ticket} onClose={onClose} />;
}

function Sheet({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  const myUserId = useAuthStore.use.user()?.uid ?? null;
  const { data, isPending, error, refetch } = useStaff({ variables: { status: 'active' } });
  const { mutate: assign, isPending: isAssigning } = useAssignTicket();

  const holderId = ticket.assignedTo?.id ?? null;

  // Whoever is already holding it sorts to the top, then everybody else by
  // name. A dispatcher reassigning one wants to see who has it without reading
  // the whole roster.
  const members = React.useMemo(() => {
    const rows = (data?.items ?? []).filter(member => member.userId !== myUserId);

    return [...rows].sort((a, b) => {
      if (a.userId === holderId)
        return -1;
      if (b.userId === holderId)
        return 1;

      return (a.name ?? '').localeCompare(b.name ?? '');
    });
  }, [data?.items, myUserId, holderId]);

  const hand = (assignedTo: string | null) => {
    if (assignedTo === holderId) {
      onClose();
      return;
    }

    assign({ id: ticket.id, assignedTo }, {
      onSuccess: onClose,
      onError: failure => void dialogs.notify(
        'Not handed over',
        failure.message || 'The complaint is still with whoever had it.',
      ),
    });
  };

  return (
    <RNModal animationType="slide" transparent visible onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <View className="max-h-[85%] rounded-t-3xl border-t border-border bg-surface">
          <View className="border-b border-border/60 px-5 py-4">
            <Text className="text-xl font-extrabold text-foreground">Hand this over</Text>
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {`${ticket.ticketNo} • ${ticket.assignedTo?.name ?? 'Unassigned'}`}
            </Text>
          </View>

          {isPending
            ? <Loading />
            : error
              ? <LoadError message={error.message} onRetry={refetch} />
              : (
                  <ScrollView contentContainerStyle={{ padding: 20, gap: 8, paddingBottom: 24 }}>
                    {myUserId !== null && (
                      <Row
                        label="Me"
                        detail="Take it on yourself"
                        selected={holderId === myUserId}
                        disabled={isAssigning}
                        onPress={() => hand(myUserId)}
                        testID="assign-me"
                      />
                    )}

                    {members.map(member => (
                      <Row
                        key={member.userId}
                        label={member.name ?? member.phone ?? 'Unnamed'}
                        detail={detailFor(member)}
                        selected={holderId === member.userId}
                        disabled={isAssigning}
                        onPress={() => hand(member.userId)}
                        testID={`assign-${member.userId}`}
                      />
                    ))}

                    {holderId !== null && (
                      <Row
                        label="Put back in the pool"
                        detail="Nobody holds it, and it stays visible to the area"
                        selected={false}
                        disabled={isAssigning}
                        onPress={() => hand(null)}
                        testID="assign-none"
                      />
                    )}
                  </ScrollView>
                )}

          <View className="border-t border-border/60 px-5 py-4">
            <Button label="Cancel" variant="outline" size="lg" onPress={onClose} />
          </View>
        </View>
      </View>
    </RNModal>
  );
}

/** Their crew and role, which is how a dispatcher tells two Rameshes apart. */
function detailFor(member: StaffMember): string {
  return [member.team?.name, member.roleId].filter(part => part != null && part !== '').join(' • ');
}

function Row({ label, detail, selected, disabled, onPress, testID }: {
  label: string;
  detail: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      className={`flex-row items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
        selected ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/60' : 'border-border bg-card active:bg-muted/40'
      }`}
    >
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-sm font-bold text-foreground" numberOfLines={1}>{label}</Text>
        {detail !== '' && (
          <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>{detail}</Text>
        )}
      </View>
      {selected && <Text className="text-[11px] font-bold text-primary-600">Holding it</Text>}
    </Pressable>
  );
}

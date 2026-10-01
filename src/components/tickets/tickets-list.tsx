import type { Ticket, TicketPriority, TicketStatus } from '@/lib/hooks/api/use-tickets';
import { FlashList } from '@shopify/flash-list';
import * as React from 'react';
import { RefreshControl } from 'react-native';
import { dialogs } from '@/components/common/dialogs';
import { Card, LoadError, Loading, ScreenHeader } from '@/components/common/shell';
import { AssignTicketSheet } from '@/components/tickets/assign-ticket-sheet';
import { colors, Input, Pressable, Text, View } from '@/components/ui';
import { PERMISSIONS } from '@/constants/permissions';
import {
  TICKET_CATEGORY_LABELS,
  TICKET_CLOSED_STATUSES,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  useTickets,
  useUpdateTicket,
} from '@/lib/hooks/api/use-tickets';
import { usePermissions } from '@/lib/hooks/common/use-permissions';
import { relativeTime } from '@/lib/utils/admin-stats';

type Filter = 'open' | 'mine' | 'all';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'mine', label: 'Mine' },
  { key: 'all', label: 'All' },
];

/** How loud each priority reads in a list somebody scans in a van. */
const PRIORITY_TINT: Record<TicketPriority, string> = {
  urgent: 'text-red-600',
  high: 'text-orange-600',
  normal: 'text-muted-foreground',
  low: 'text-muted-foreground',
};

const STATUS_TINT: Record<TicketStatus, string> = {
  open: 'bg-orange-100 text-orange-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-neutral-200 text-neutral-700',
  cancelled: 'bg-neutral-200 text-neutral-700',
};

/**
 * The complaint queue.
 *
 * Three filters rather than a filter sheet: on this screen an operator is
 * asking one of three questions — what is still broken, what is mine, and what
 * happened to that one from last week. Everything else is the search box.
 */
export function TicketsListScreen() {
  const [filter, setFilter] = React.useState<Filter>('open');
  const [query, setQuery] = React.useState('');

  const variables = {
    ...(filter === 'open' ? { openOnly: true } : {}),
    ...(filter === 'mine' ? { assignedTo: 'me' as const } : {}),
    ...(query.trim() === '' ? {} : { q: query.trim() }),
  };

  const { data, isPending, isRefetching, error, refetch } = useTickets({ variables });
  const { mutate: updateTicket } = useUpdateTicket();
  const { can } = usePermissions();

  // Handing a complaint to a named engineer is its own grant: an engineer may
  // resolve all day without being the person who decides who goes out.
  const canAssign = can(PERMISSIONS.TICKETS_ASSIGN);
  const [assigning, setAssigning] = React.useState<Ticket | null>(null);

  const now = React.useMemo(() => new Date(), []);
  const rows = data?.items ?? [];

  // Resolving is the one thing worth doing from the list: an engineer closes a
  // fault standing at the pole, and making them open a detail page first is how
  // tickets stay open for a week after the job was done.
  const resolve = async (ticket: Ticket) => {
    const resolution = await dialogs.prompt({
      title: `Resolve ${ticket.ticketNo}?`,
      message: 'What was done? The subscriber is told this.',
      confirmLabel: 'Resolve',
      prompt: { placeholder: 'Replaced the drop wire' },
    });

    if (resolution === null || resolution.trim().length < 3)
      return;

    updateTicket({ id: ticket.id, payload: { status: 'resolved', resolution: resolution.trim() } }, {
      onError: failure => void dialogs.notify('Not resolved', failure.message),
    });
  };

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader title="Complaints" subtitle={`${data?.total ?? 0} in this view`} showBack withSafeArea>
        <View className="gap-2.5">
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder="Search a ticket number or subject"
            autoCorrect={false}
            returnKeyType="search"
            testID="ticket-search"
          />
          <View className="flex-row gap-2">
            {FILTERS.map(option => (
              <Pressable
                key={option.key}
                accessibilityRole="radio"
                accessibilityState={{ selected: filter === option.key }}
                onPress={() => setFilter(option.key)}
                className={`flex-1 items-center rounded-xl border py-2 ${
                  filter === option.key ? 'border-primary-500 bg-primary-500' : 'border-border bg-card'
                }`}
              >
                <Text className={`text-xs font-bold ${filter === option.key ? 'text-white' : 'text-foreground'}`}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScreenHeader>

      {isPending
        ? <Loading />
        : error
          ? <LoadError message={error.message} onRetry={refetch} />
          : (
              <FlashList
                data={rows}
                keyExtractor={row => row.id}
                contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
                refreshControl={(
                  <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[600]} />
                )}
                ItemSeparatorComponent={() => <View className="h-2.5" />}
                ListEmptyComponent={(
                  <Card className="border border-border p-4">
                    <Text className="text-sm text-muted-foreground">
                      {query.trim() === ''
                        ? 'Nothing in this view. Complaints raised from a customer card land here.'
                        : 'No complaint matches that.'}
                    </Text>
                  </Card>
                )}
                renderItem={({ item }) => (
                  <TicketRow
                    ticket={item}
                    now={now}
                    onResolve={() => void resolve(item)}
                    onAssign={canAssign ? () => setAssigning(item) : undefined}
                  />
                )}
              />
            )}

      <AssignTicketSheet ticket={assigning} onClose={() => setAssigning(null)} />
    </View>
  );
}

function TicketRow({ ticket, now, onResolve, onAssign }: {
  ticket: Ticket;
  now: Date;
  onResolve: () => void;
  /** Undefined when this caller may not hand complaints over. */
  onAssign?: () => void;
}) {
  const settled = (TICKET_CLOSED_STATUSES as readonly TicketStatus[]).includes(ticket.status);
  const holder = ticket.assignedTo?.name ?? 'Unassigned';

  return (
    <Card className="gap-2 border border-border p-3.5">
      <View className="flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-sm font-extrabold text-foreground" numberOfLines={1}>{ticket.subject}</Text>
          <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
            {`${ticket.ticketNo} • ${TICKET_CATEGORY_LABELS[ticket.category]}`}
          </Text>
        </View>
        <Text className={`rounded-full px-2 py-1 text-[10px] font-bold ${STATUS_TINT[ticket.status]}`}>
          {TICKET_STATUS_LABELS[ticket.status]}
        </Text>
      </View>

      <Text className="text-xs text-muted-foreground" numberOfLines={1}>
        {[ticket.customer.name ?? ticket.customer.customerCode, ticket.subscription?.serviceAccountNumber, ticket.locationPath]
          .filter(part => part != null && part !== '')
          .join(' • ')}
      </Text>

      <View className="flex-row items-center justify-between gap-2">
        <Text className={`text-[11px] font-bold ${PRIORITY_TINT[ticket.priority]}`}>
          {`${TICKET_PRIORITY_LABELS[ticket.priority]} • ${relativeTime(new Date(ticket.createdAt), now)}`}
        </Text>
        {settled
          ? (
              <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>{holder}</Text>
            )
          : (
              <View className="max-w-[62%] flex-row items-center gap-2">
                {/*
                  Who holds an open fault is the thing a dispatcher scans for, so
                  it sits on the row rather than behind a detail page — and it is
                  the same control that reassigns it.
                */}
                {onAssign === undefined
                  ? (
                      <Text className="shrink text-[11px] text-muted-foreground" numberOfLines={1}>{holder}</Text>
                    )
                  : (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Assign ${ticket.ticketNo}, currently ${holder}`}
                        onPress={onAssign}
                        className="shrink rounded-full border border-border bg-card px-3 py-1.5 active:bg-muted/40"
                        testID={`assign-${ticket.id}`}
                      >
                        <Text
                          className={`text-[11px] font-bold ${
                            ticket.assignedTo === null ? 'text-orange-600' : 'text-foreground'
                          }`}
                          numberOfLines={1}
                        >
                          {holder}
                        </Text>
                      </Pressable>
                    )}
                <Pressable
                  accessibilityRole="button"
                  onPress={onResolve}
                  className="rounded-full border border-border bg-card px-3 py-1.5 active:bg-muted/40"
                  testID={`resolve-${ticket.id}`}
                >
                  <Text className="text-[11px] font-bold text-primary-600">Resolve</Text>
                </Pressable>
              </View>
            )}
      </View>
    </Card>
  );
}

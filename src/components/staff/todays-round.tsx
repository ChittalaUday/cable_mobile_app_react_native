import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { IconSvgElement } from '@hugeicons/react-native';
import type { TintKey } from '@/components/common/shell';
import type { DueVisit } from '@/lib/hooks/api/use-visits';
import type { RoundDate, RoundFilters, RoundType } from '@/lib/utils/round-filters';
import { Alert02Icon, Calendar03Icon, CallIcon, CheckmarkCircle02Icon, HeadsetIcon, Location01Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, Modal, ScrollView, TextInput } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateRangeModal } from '@/components/common/date-range-modal';
import { Avatar, Card, SectionHeader, TINT } from '@/components/common/shell';
import { LocationPickerSheet } from '@/components/locations/location-picker-sheet';
import { Button, colors, Pill, Pressable, Text, View } from '@/components/ui';
import { startVisit } from '@/components/visits/mark-visit-sheet';
import { openCallIntent } from '@/lib/call-intent';
import { useDueVisits } from '@/lib/hooks/api/use-visits';
import { useRefetchOnFocus } from '@/lib/hooks/common/use-refetch-on-focus';
import { getItem, setItem } from '@/lib/storage';
import { dateTime } from '@/lib/utils/admin-format';
import { matchesRound, NO_FILTERS } from '@/lib/utils/round-filters';

const LOOK: Record<DueVisit['reason'], { icon: IconSvgElement; tint: TintKey }> = {
  complaint: { icon: HeadsetIcon, tint: 'red' },
  expiring: { icon: Calendar03Icon, tint: 'orange' },
  follow_up: { icon: Location01Icon, tint: 'blue' },
};

const REASON_LABEL: Record<DueVisit['reason'], string> = { complaint: 'Complaint', expiring: 'Plan ending', follow_up: 'Return visit' };

const DAY = 86_400_000;
const COMPACT_ROWS = 5;
const POPUP_KEY = 'round-popup-day';
const today = () => new Date().toDateString();
const startOfToday = () => new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();

/** "3 days overdue", "due today", "in 2 days" — the part of the date that matters for a to-do. */
function daysUntil(item: DueVisit): number {
  return Math.round((new Date(item.dueAt).getTime() - startOfToday()) / DAY);
}

function whenText(item: DueVisit): string {
  const days = daysUntil(item);
  if (days < 0)
    return days === -1 ? 'Overdue since yesterday' : `Overdue ${-days} days`;
  return days === 0 ? 'Due today' : days === 1 ? 'Tomorrow' : `In ${days} days`;
}

/**
 * The round for this area as one plain list. It is shared: whoever visits, the
 * door is done for everybody and drops to the bottom, greyed, with who went.
 * What is still to do leads with the oldest first, and anything past its day is
 * in red, so overdue visits stack up at the top until somebody goes.
 *
 * `compact` is the home screen's cut: the first few to-dos and a link on to the
 * Visits tab for the whole list.
 */
export function TodaysRound({ basePath, compact = false, preset }: { basePath: '/staff' | '/admin'; compact?: boolean; preset?: string }) {
  const router = useRouter();
  const { data: items = [], isPending, refetch } = useDueVisits();
  const [filters, setFilters] = React.useState<RoundFilters>(NO_FILTERS);
  // `preset` changes each time the home alert is tapped, so tapping twice still applies.
  React.useEffect(() => {
    if (preset)
      setFilters(current => ({ ...current, type: 'all', date: 'overdue' }));
  }, [preset]);
  const [picking, setPicking] = React.useState(false);
  const placeSheet = React.useRef<BottomSheetModal>(null);
  const [announced, setAnnounced] = React.useState(() => getItem<string>(POPUP_KEY) === today());

  useRefetchOnFocus(refetch);

  const todo = items.filter(item => item.doneAt === null);
  const overdue = todo.filter(item => daysUntil(item) < 0).length;
  const dueToday = todo.filter(item => daysUntil(item) === 0).length;
  const shown = compact ? todo.slice(0, COMPACT_ROWS) : items;
  const visible = items.filter(item => matchesRound(item, filters));
  const visibleTodo = visible.filter(item => item.doneAt === null).length;

  const dismissPopup = () => {
    setAnnounced(true);
    void setItem(POPUP_KEY, today());
  };

  const mark = (item: DueVisit) => startVisit({
    customerId: item.customerId,
    customerName: item.customerName,
    purpose: item.purpose,
    action: item.action,
    ...(item.subscriptionId === null ? {} : { subscriptionId: item.subscriptionId }),
    ...(item.ticketId === null ? {} : { ticketId: item.ticketId }),
  });

  const open = (item: DueVisit) => router.push(`${basePath}/customers/${item.customerId}`);

  // Tapping the alert is "show me those": every type, overdue only. On the home
  // card there is no list to filter, so it opens the Visits tab already set so.
  const showOverdue = () => {
    if (compact)
      router.push({ pathname: `${basePath}/(tabs)/visits`, params: { show: 'overdue', at: String(Date.now()) } });
    else
      setFilters(current => ({ ...current, type: 'all', date: 'overdue' }));
  };

  const banner = overdue > 0 && (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Show overdue visits"
      testID="round-overdue"
      onPress={showOverdue}
      className="flex-row items-center gap-2 rounded-xl bg-danger-500/10 px-3 py-2 active:bg-danger-500/20"
    >
      <HugeiconsIcon icon={Alert02Icon} size={18} color={colors.danger[500]} strokeWidth={2.2} />
      <Text className="flex-1 text-[13px] font-extrabold text-danger-600">{`${overdue} overdue — go to these first`}</Text>
    </Pressable>
  );

  return (
    <>
      {compact
        ? (
            <Card className="gap-1 p-3.5">
              <SectionHeader icon={Location01Icon} tint="green" title="Today's round" action="See all" onAction={() => router.push(`${basePath}/(tabs)/visits`)} />
              {banner ? <View className="mt-2">{banner}</View> : null}
              {isPending
                ? <Loader />
                : shown.length === 0
                  ? <Text className="mt-3 text-xs text-muted-foreground">Nothing to do today.</Text>
                  : shown.map(item => <Row key={item.key} item={item} onOpen={open} onMark={mark} />)}
              {todo.length > shown.length && <Text className="mt-3 text-xs text-muted-foreground">{`+${todo.length - shown.length} more in Visits`}</Text>}
            </Card>
          )
        : (
            // The search and pills are the first child with `stickyHeaderIndices`, so they stay put while the cards scroll.
            <ScrollView className="flex-1" stickyHeaderIndices={[0]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View className="gap-2 bg-surface px-3 pt-1 pb-2" testID="round-filters">
                <RoundFilterBar filters={filters} onChange={setFilters} onPickDates={() => setPicking(true)} onPickPlace={() => placeSheet.current?.present()} />
                <Text className="text-xs text-muted-foreground">
                  {`${visibleTodo} to do${visible.length > visibleTodo ? ` · ${visible.length - visibleTodo} done` : ''}`}
                </Text>
              </View>
              <View className="gap-3 px-3 pt-1 pb-24">
                {banner}
                {isPending
                  ? <Loader />
                  : visible.length === 0
                    ? (
                        <Text className="py-6 text-center text-xs text-muted-foreground">
                          {items.length === 0 ? 'Nothing is due. Complaints, plans ending within 3 days and promised return visits show up here by themselves.' : 'No visits match these filters.'}
                        </Text>
                      )
                    : visible.map(item => <VisitCard key={item.key} item={item} onOpen={open} onMark={mark} />)}
                <LocationPickerSheet
                  ref={placeSheet}
                  title="Filter by location"
                  confirmLabel={current => (current === null ? 'Show all locations' : `Only ${current.name}`)}
                  onSelect={(place) => {
                    setFilters(current => ({ ...current, location: place?.path ?? null }));
                    placeSheet.current?.dismiss();
                  }}
                />
                <DateRangeModal
                  visible={picking}
                  from={filters.from}
                  to={filters.to}
                  onApply={(from, to) => {
                    setFilters(current => ({ ...current, date: 'custom', from, to }));
                    setPicking(false);
                  }}
                  onClose={() => setPicking(false)}
                />
              </View>
            </ScrollView>
          )}

      <RoundPopup overdue={overdue} today={dueToday} visible={!announced && overdue + dueToday > 0} onClose={dismissPopup} />
    </>
  );
}

const TYPE_PILLS: { key: RoundType; label: string }[] = [
  { key: 'all', label: 'All types' },
  { key: 'complaint', label: 'Complaints' },
  { key: 'expiring', label: 'Plan ending' },
  { key: 'follow_up', label: 'Return visits' },
];

const DATE_PILLS: { key: RoundDate; label: string }[] = [
  { key: 'any', label: 'Any date' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'week', label: 'This week' },
];

const shortDay = (key: string) => new Date(`${key}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

function Loader() {
  return (
    <View className="items-center py-8" testID="round-loading">
      <ActivityIndicator color={colors.primary[500]} />
    </View>
  );
}

function RoundFilterBar({ filters, onChange, onPickDates, onPickPlace }: { filters: RoundFilters; onChange: (filters: RoundFilters) => void; onPickDates: () => void; onPickPlace: () => void }) {
  const custom = filters.date === 'custom';
  const customLabel = custom && filters.from !== null
    ? (filters.to === null || filters.to === filters.from ? shortDay(filters.from) : `${shortDay(filters.from)} – ${shortDay(filters.to)}`)
    : 'Custom';

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        <View className="flex-1 flex-row items-center gap-2 rounded-xl border border-border bg-card px-3">
          <HugeiconsIcon icon={Search01Icon} size={17} color={colors.neutral[400]} />
          <TextInput
            value={filters.search}
            onChangeText={search => onChange({ ...filters, search })}
            placeholder="Search name, phone, address, area"
            placeholderTextColor={colors.neutral[400]}
            autoCorrect={false}
            returnKeyType="search"
            testID="visit-search"
            className="h-11 flex-1 text-sm text-foreground"
          />
          {filters.search !== '' && (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10} onPress={() => onChange({ ...filters, search: '' })}>
              <Text className="text-xs font-bold text-muted-foreground">Clear</Text>
            </Pressable>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filter by location"
          accessibilityState={{ selected: filters.location !== null }}
          testID="visit-location"
          onPress={onPickPlace}
          className={`size-11 items-center justify-center rounded-xl border ${filters.location === null ? 'border-border bg-card' : 'border-primary-500 bg-primary-500'}`}
        >
          <HugeiconsIcon icon={Location01Icon} size={19} color={filters.location === null ? colors.neutral[500] : '#ffffff'} />
        </Pressable>
      </View>

      {filters.location !== null && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear location filter"
          testID="visit-location-chip"
          onPress={() => onChange({ ...filters, location: null })}
          className="flex-row items-center gap-2 self-start rounded-full bg-primary-500/10 px-3 py-1.5"
        >
          <Text className="text-xs font-bold text-primary-600" numberOfLines={1}>{filters.location.split(' / ').join(' › ')}</Text>
          <Text className="text-xs font-bold text-primary-600">✕</Text>
        </Pressable>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerClassName="gap-1.5">
        {TYPE_PILLS.map(pill => <Pill key={pill.key} label={pill.label} selected={filters.type === pill.key} onPress={() => onChange({ ...filters, type: pill.key })} testID={`visit-type-${pill.key}`} />)}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerClassName="gap-1.5">
        {DATE_PILLS.map(pill => <Pill key={pill.key} label={pill.label} selected={filters.date === pill.key} onPress={() => onChange({ ...filters, date: pill.key })} testID={`visit-date-${pill.key}`} />)}
        <Pill label={customLabel} selected={custom} onPress={onPickDates} testID="visit-date-custom" />
      </ScrollView>
    </View>
  );
}

function VisitCard({ item, onOpen, onMark }: { item: DueVisit; onOpen: (item: DueVisit) => void; onMark: (item: DueVisit) => void }) {
  const look = LOOK[item.reason];
  const tint = TINT[look.tint];
  const done = item.doneAt !== null;
  const late = !done && daysUntil(item) < 0;
  const name = item.customerName ?? item.customerCode ?? 'Customer';
  const path = item.locationPath?.split(' / ').join(' › ') ?? null;

  return (
    <View
      testID={`round-${item.key}`}
      className={`overflow-hidden rounded-2xl border bg-card ${late ? 'border-danger-500/60' : 'border-border'} ${done ? 'opacity-60' : ''}`}
    >
      <View className="flex-row items-center gap-2 px-3.5 pt-3">
        <View className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1" style={{ backgroundColor: tint.bg }}>
          <HugeiconsIcon icon={look.icon} size={13} color={tint.fg} strokeWidth={2.2} />
          <Text className="text-[11px] font-bold" style={{ color: tint.fg }}>{REASON_LABEL[item.reason]}</Text>
        </View>
        <View className="flex-1" />
        {done
          ? (
              <View className="flex-row items-center gap-1">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} color={colors.success[600]} />
                <Text className="text-[11px] font-semibold text-success-600">{`Visited${item.doneByName === null ? '' : ` by ${item.doneByName}`}`}</Text>
              </View>
            )
          : <Text className={`text-[11px] font-bold ${late ? 'text-danger-600' : 'text-muted-foreground'}`}>{whenText(item)}</Text>}
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel={`Open ${name}`} onPress={() => onOpen(item)} className="gap-2.5 px-3.5 py-3 active:bg-muted/60">
        <View className="flex-row items-center gap-3">
          <Avatar name={name} size={40} />
          <View className="flex-1">
            <Text className="text-[15px] font-bold text-foreground" numberOfLines={1}>{name}</Text>
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {[item.customerCode, item.customerPhone].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>
        {(item.address !== null || path !== null) && (
          <View className="flex-row items-start gap-2">
            <HugeiconsIcon icon={Location01Icon} size={15} color={colors.neutral[400]} />
            <View className="flex-1 gap-0.5">
              {item.address !== null && <Text className="text-xs font-semibold text-foreground">{item.address}</Text>}
              {path !== null && <Text className="text-xs text-muted-foreground">{path}</Text>}
            </View>
          </View>
        )}
        <Text className="text-xs text-muted-foreground" numberOfLines={2}>
          {[item.title, item.detail].filter(Boolean).join(' · ')}
        </Text>
        <Text className="text-[11px] text-muted-foreground">
          {done ? `Visited ${dateTime(item.doneAt!)}` : `Due ${dateTime(item.dueAt)}`}
        </Text>
      </Pressable>

      {!done && (
        <View className="flex-row gap-2 border-t border-border px-3.5 py-2.5">
          {item.customerPhone !== null && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Call ${name}`}
              onPress={() => void openCallIntent(item.customerPhone!)}
              className="size-10 items-center justify-center rounded-xl border border-border active:bg-muted"
            >
              <HugeiconsIcon icon={CallIcon} size={18} color={colors.primary[600]} />
            </Pressable>
          )}
          <View className="flex-1">
            <Button label="Mark visit" size="sm" variant={late ? 'destructive' : 'default'} className="my-0" onPress={() => onMark(item)} testID={`mark-${item.key}`} />
          </View>
        </View>
      )}
    </View>
  );
}

function Row({ item, onOpen, onMark }: { item: DueVisit; onOpen: (item: DueVisit) => void; onMark: (item: DueVisit) => void }) {
  const look = LOOK[item.reason];
  const done = item.doneAt !== null;
  const late = !done && daysUntil(item) < 0;
  return (
    <View className={`flex-row items-center gap-3 pt-2.5 ${done ? 'opacity-50' : ''}`}>
      <Pressable accessibilityRole="button" testID={`round-${item.key}`} onPress={() => onOpen(item)} className="flex-1 flex-row items-center gap-3 active:opacity-60">
        <View className="size-9 items-center justify-center rounded-full" style={{ backgroundColor: done ? colors.neutral[200] : TINT[look.tint].bg }}>
          <HugeiconsIcon icon={done ? CheckmarkCircle02Icon : look.icon} size={17} color={done ? colors.success[600] : TINT[look.tint].fg} />
        </View>
        <View className="flex-1">
          <Text className="text-[13px] font-semibold text-foreground" numberOfLines={1}>{item.customerName ?? item.customerCode ?? 'Customer'}</Text>
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>{[item.title, item.detail].filter(Boolean).join(' · ')}</Text>
          <Text className={`text-[11px] ${late ? 'font-bold text-danger-600' : 'text-muted-foreground'}`} numberOfLines={1}>
            {done ? `Visited${item.doneByName === null ? '' : ` by ${item.doneByName}`} · ${dateTime(item.doneAt!)}` : `${whenText(item)} · ${dateTime(item.dueAt)}`}
          </Text>
        </View>
      </Pressable>
      {!done && (
        <Button
          label="Mark"
          size="sm"
          variant={late ? 'destructive' : 'outline'}
          fullWidth={false}
          className="my-0"
          accessibilityLabel={`Mark visit for ${item.customerName ?? 'customer'}`}
          onPress={() => onMark(item)}
        />
      )}
    </View>
  );
}

function RoundPopup({ overdue, today: due, visible, onClose }: { overdue: number; today: number; visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <Modal animationType="fade" transparent visible={visible} statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/60 px-6" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View className="w-full max-w-sm gap-3 rounded-3xl border border-border bg-card p-5" testID="round-popup">
          <Text className="text-lg font-bold text-foreground">Today's round</Text>
          {overdue > 0 && (
            <View className="flex-row items-center gap-3 rounded-2xl bg-danger-500/10 p-3">
              <HugeiconsIcon icon={Alert02Icon} size={22} color={colors.danger[500]} strokeWidth={2.2} />
              <Text className="flex-1 text-sm font-bold text-danger-600">{`${overdue} overdue — still waiting for a visit`}</Text>
            </View>
          )}
          {due > 0 && <Text className="text-sm text-foreground">{`${due} ${due === 1 ? 'visit is' : 'visits are'} due today.`}</Text>}
          <Button label="See my round" onPress={onClose} testID="round-popup-close" />
        </View>
      </View>
    </Modal>
  );
}

import type { TINT } from '@/components/common/shell';
import type { InboxRow } from '@/components/notifications/group-by-day';
import type { NotificationCategory } from '@/lib/api/types';
import type { AppNotification } from '@/lib/hooks/api/use-notifications';
import {
  Alert02Icon,
  Cancel01Icon,
  CheckmarkBadge02Icon,
  CloudSyncIcon,
  CreditCardIcon,
  FilterHorizontalIcon,
  InvoiceIcon,
  LocationCheck02Icon,
  Megaphone01Icon,
  MoneyReceiveCircleIcon,
  MoneySendCircleIcon,
  Notification03Icon,
  PackageAddIcon,
  PackageProcessIcon,
  PackageReceiveIcon,
  PlayCircleIcon,
  Refresh01Icon,
  RepeatIcon,
  Tick02Icon,
  UserAdd01Icon,
  UserEdit01Icon,
  UserGroupIcon,
  UserRemove01Icon,
  WifiConnected01Icon,
  WifiOff01Icon,
} from '@hugeicons/core-free-icons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';

import * as React from 'react';
import { RefreshControl } from 'react-native';
import { ScreenHeader } from '@/components/common/screen-header';
import { Card, IconTile, LoadError, Loading } from '@/components/common/shell';
import { groupByDay } from '@/components/notifications/group-by-day';
import {
  colors,
  FocusAwareStatusBar,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  Text,
  ThemedIcon,
  useModal,
  View,
} from '@/components/ui';
import { NOTIFICATION_CATEGORIES } from '@/lib/constants/notify';
import { useMarkAllRead, useMarkRead, useNotifications, useUnreadCount } from '@/lib/hooks/api/use-notifications';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';
import { notificationRoute } from '@/lib/notification-route';

const CATEGORIES: Record<NotificationCategory, { label: string; icon: typeof Notification03Icon; tint: keyof typeof TINT }> = {
  general: { label: 'General', icon: Notification03Icon, tint: 'blue' },
  alert: { label: 'Alerts', icon: Alert02Icon, tint: 'orange' },
  promotional: { label: 'Offers', icon: Megaphone01Icon, tint: 'purple' },
  billing: { label: 'Payments', icon: CreditCardIcon, tint: 'green' },
  service: { label: 'Connection', icon: WifiConnected01Icon, tint: 'blue' },
  staff: { label: 'Team', icon: UserGroupIcon, tint: 'purple' },
  activation: { label: 'Activations', icon: PlayCircleIcon, tint: 'green' },
  renewal: { label: 'Renewals', icon: RepeatIcon, tint: 'orange' },
  refresh: { label: 'Refreshes', icon: Refresh01Icon, tint: 'blue' },
  sync: { label: 'Data sync', icon: CloudSyncIcon, tint: 'purple' },
  activity: { label: 'Staff activity', icon: UserGroupIcon, tint: 'orange' },
};

type Presentation = { icon: typeof Notification03Icon; tint: keyof typeof TINT };

const TYPE_PRESENTATION: Record<string, Presentation> = {
  'payment.recorded': { icon: MoneyReceiveCircleIcon, tint: 'green' },
  'payment.refunded': { icon: MoneySendCircleIcon, tint: 'red' },
  'payment.marked_due': { icon: InvoiceIcon, tint: 'orange' },
  'visit.marked': { icon: LocationCheck02Icon, tint: 'blue' },
  'complaint.fixed': { icon: CheckmarkBadge02Icon, tint: 'green' },
  'customer.created': { icon: UserAdd01Icon, tint: 'orange' },
  'customer.updated': { icon: UserEdit01Icon, tint: 'orange' },
  'customer.deactivated': { icon: UserRemove01Icon, tint: 'orange' },
  'subscription.created': { icon: PackageAddIcon, tint: 'orange' },
  'subscription.plan_changed': { icon: PackageProcessIcon, tint: 'orange' },
  'subscription.suspended': { icon: WifiOff01Icon, tint: 'orange' },
  'subscription.resumed': { icon: WifiConnected01Icon, tint: 'orange' },
  'equipment.issued': { icon: PackageAddIcon, tint: 'orange' },
  'equipment.returned': { icon: PackageReceiveIcon, tint: 'orange' },
  'equipment.replaced': { icon: PackageProcessIcon, tint: 'orange' },
  'box_activated': { icon: PlayCircleIcon, tint: 'green' },
  'box_renewed': { icon: RepeatIcon, tint: 'orange' },
  'box_refreshed': { icon: Refresh01Icon, tint: 'blue' },
  'data_synced': { icon: CloudSyncIcon, tint: 'purple' },
  'payment.automation_stopped': { icon: Alert02Icon, tint: 'red' },
};

function presentation(item: AppNotification): Presentation {
  if (item.type.startsWith('error.'))
    return { icon: Alert02Icon, tint: 'red' };
  return TYPE_PRESENTATION[item.type] ?? CATEGORIES[item.category];
}

function ago(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1)
    return 'just now';
  if (minutes < 60)
    return `${minutes}m ago`;
  if (minutes < 1440)
    return `${Math.floor(minutes / 60)}h ago`;
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

function Row({ item, onPress }: { item: AppNotification; onPress: () => void }) {
  const unread = item.readAt === null;
  const category = CATEGORIES[item.category];
  const meta = presentation(item);

  return (
    <Pressable accessibilityRole="button" onPress={onPress} className="mb-2">
      <Card className="flex-row overflow-hidden">
        <View className={`w-1 ${unread ? 'bg-primary-600' : 'bg-transparent'}`} />
        <View className="flex-1 flex-row gap-3 p-3.5">
          <IconTile icon={meta.icon} tint={meta.tint} size={36} iconSize={18} />

          <View className="flex-1">
            <Text className={`text-[14px] text-foreground ${unread ? 'font-bold' : 'font-medium'}`}>
              {item.title ?? category.label}
            </Text>
            <Text className={`mt-0.5 text-[13px] ${unread ? 'text-foreground' : 'text-muted-foreground'}`}>{item.body}</Text>

            {item.imageUrl != null && item.imageUrl !== '' && (
              <Image
                source={item.imageUrl}
                contentFit="cover"
                transition={150}
                className="mt-2 h-36 w-full rounded-xl bg-muted"
              />
            )}

            <Text className="mt-1.5 text-[11px] text-muted-foreground">{`${category.label} · ${ago(item.createdAt)}`}</Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

function DayHeader({ label, first }: { label: string; first: boolean }) {
  return <Text className={`${first ? '' : 'mt-3'} mb-2 px-1 text-xs font-bold tracking-wide text-muted-foreground uppercase`}>{label}</Text>;
}

/** Two segments, one selected: the whole inbox, or only what has not been read. */
function Segments({ unreadOnly, unread, onChange }: { unreadOnly: boolean; unread: number; onChange: (unreadOnly: boolean) => void }) {
  const segment = (selected: boolean, label: string, onPress: () => void) => (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-1.5 ${selected ? 'bg-card' : ''}`}
    >
      <Text className={`text-[13px] ${selected ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'}`}>{label}</Text>
    </Pressable>
  );
  return (
    <View className="flex-1 flex-row rounded-xl bg-muted p-1" accessibilityRole="tablist">
      {segment(!unreadOnly, 'All', () => onChange(false))}
      {segment(unreadOnly, unread > 0 ? `Unread · ${unread}` : 'Unread', () => onChange(true))}
    </View>
  );
}

function CategoryTile({ label, icon, tint, count, selected, onPress, wide = false }: {
  label: string;
  icon: typeof Notification03Icon;
  tint: keyof typeof TINT;
  count: number;
  selected: boolean;
  onPress: () => void;
  wide?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`${wide ? 'w-full' : 'w-[48.5%]'} flex-row items-center gap-2.5 rounded-2xl border p-3 ${selected ? 'border-primary-600 bg-card' : 'border-border bg-card'}`}
    >
      <IconTile icon={icon} tint={tint} size={32} iconSize={17} />
      <Text className="flex-1 text-[13px] font-semibold text-foreground" numberOfLines={1}>{label}</Text>
      {count > 0 && (
        <View className="min-w-5 items-center rounded-full bg-primary-600 px-1.5 py-0.5">
          <Text className="text-[10px] font-bold text-white">{count}</Text>
        </View>
      )}
      {selected && <ThemedIcon icon={Tick02Icon} size={16} colorClassName="text-primary-600" strokeWidth={2.6} />}
    </Pressable>
  );
}

/** One inbox, shared by admin, staff and customer. */
export function NotificationsScreen() {
  const router = useRouter();
  const role = useAuthStore.use.role();
  const [category, setCategory] = React.useState<NotificationCategory | null>(null);
  const [unreadOnly, setUnreadOnly] = React.useState(false);
  const filter = useModal();
  const canViewActivity = role === 'admin' || role === 'super_admin';
  const visibleCategories = React.useMemo(
    () => NOTIFICATION_CATEGORIES.filter(value => value !== 'activity' || canViewActivity),
    [canViewActivity],
  );
  const selectedCategory = category !== null && visibleCategories.includes(category) ? category : null;

  const query = useNotifications({
    variables: { limit: 50, ...(selectedCategory ? { category: selectedCategory } : {}), ...(unreadOnly ? { unreadOnly: true } : {}) },
  });
  const counts = useUnreadCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const items = React.useMemo(
    () => (query.data?.items ?? []).filter(item => item.category !== 'activity' || canViewActivity),
    [canViewActivity, query.data],
  );
  const rows = React.useMemo(() => groupByDay(items), [items]);
  const unread = counts.data?.total ?? 0;
  const byCategory = counts.data?.byCategory ?? {};
  const hasUnread = unread > 0 || items.some(item => item.readAt === null);

  const pick = (next: NotificationCategory | null) => {
    setCategory(next);
    filter.dismiss();
  };

  if (query.isPending)
    return <Loading />;

  if (query.isError)
    return <LoadError message={query.error.message} onRetry={() => void query.refetch()} />;

  const active = selectedCategory === null ? null : CATEGORIES[selectedCategory];

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <SafeAreaView edges={['top']} className="bg-card" />

      <ScreenHeader
        title="Notifications"
        subtitle={active ? `${active.label} · ${query.data.total}` : `${query.data.total} total`}
        showBack
        rightAction={hasUnread
          ? (
              <Pressable accessibilityRole="button" onPress={() => markAllRead.mutate(selectedCategory === null ? undefined : { category: selectedCategory })}>
                <Text className="text-xs font-extrabold text-primary-600">Mark all read</Text>
              </Pressable>
            )
          : undefined}
      >
        <View className="mt-3 flex-row items-center gap-2">
          <Segments unreadOnly={unreadOnly} unread={unread} onChange={setUnreadOnly} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={active ? `Filtered by ${active.label}. Change filter` : 'Filter by type'}
            onPress={filter.present}
            className={`h-10 flex-row items-center gap-1.5 rounded-xl border px-3 ${active ? 'border-primary-600 bg-card' : 'border-border bg-card'}`}
          >
            <ThemedIcon icon={FilterHorizontalIcon} size={17} colorClassName={active ? 'text-primary-600' : 'text-foreground'} />
            {active && <Text className="text-[13px] font-bold text-primary-600">{active.label}</Text>}
          </Pressable>
          {active && (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear filter" onPress={() => setCategory(null)} hitSlop={8}>
              <ThemedIcon icon={Cancel01Icon} size={18} colorClassName="text-muted-foreground" />
            </Pressable>
          )}
        </View>
      </ScreenHeader>

      <FlashList<InboxRow>
        data={rows}
        keyExtractor={row => row.key}
        getItemType={row => row.kind}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 }}
        refreshControl={(
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => {
              void query.refetch();
              void counts.refetch();
            }}
            tintColor={colors.primary[600]}
          />
        )}
        renderItem={({ item: row, index }) => row.kind === 'header'
          ? <DayHeader label={row.label} first={index === 0} />
          : (
              <Row
                item={row.item}
                onPress={() => {
                  if (row.item.readAt === null)
                    markRead.mutate({ id: row.item.id });
                  const route = notificationRoute({ type: row.item.type, data: row.item.data });
                  if (route !== null)
                    router.push(route as never);
                }}
              />
            )}
        ListEmptyComponent={(
          <View className="items-center gap-2 py-20">
            <IconTile icon={active?.icon ?? Notification03Icon} tint={active?.tint ?? 'blue'} size={44} iconSize={22} />
            <Text className="text-sm text-muted-foreground">
              {unreadOnly ? 'You are all caught up.' : active ? `No ${active.label.toLowerCase()} yet.` : 'Nothing here yet.'}
            </Text>
          </View>
        )}
      />

      <Modal ref={filter.ref} snapPoints={['62%']} title="Filter by type">
        <View className="gap-2.5 px-5 pt-2 pb-8">
          <CategoryTile wide label="All activity" icon={Notification03Icon} tint="blue" count={unread} selected={category === null} onPress={() => pick(null)} />
          <View className="flex-row flex-wrap justify-between gap-y-2.5">
            {visibleCategories.map(value => (
              <CategoryTile
                key={value}
                label={CATEGORIES[value].label}
                icon={CATEGORIES[value].icon}
                tint={CATEGORIES[value].tint}
                count={byCategory[value] ?? 0}
                selected={category === value}
                onPress={() => pick(value)}
              />
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

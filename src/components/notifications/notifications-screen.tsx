import type { TINT } from '@/components/common/shell';
import type { NotificationCategory } from '@/lib/api/types';
import type { AppNotification } from '@/lib/hooks/api/use-notifications';
import {
  Alert02Icon,
  CreditCardIcon,
  Megaphone01Icon,
  Notification03Icon,
  UserGroupIcon,
  WifiConnected01Icon,
} from '@hugeicons/core-free-icons';
import { FlashList } from '@shopify/flash-list';

import * as React from 'react';
import { RefreshControl } from 'react-native';
import { ScreenHeader } from '@/components/common/screen-header';
import { Card, IconTile, LoadError, Loading } from '@/components/common/shell';
import {
  colors,
  FocusAwareStatusBar,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { NOTIFICATION_CATEGORIES } from '@/lib/constants/notify';
import { useMarkAllRead, useMarkRead, useNotifications } from '@/lib/hooks/api/use-notifications';

const CATEGORIES: Record<NotificationCategory, { label: string; icon: typeof Notification03Icon; tint: keyof typeof TINT }> = {
  general: { label: 'General', icon: Notification03Icon, tint: 'blue' },
  alert: { label: 'Alerts', icon: Alert02Icon, tint: 'orange' },
  promotional: { label: 'Offers', icon: Megaphone01Icon, tint: 'purple' },
  billing: { label: 'Payments', icon: CreditCardIcon, tint: 'green' },
  service: { label: 'Connection', icon: WifiConnected01Icon, tint: 'blue' },
  staff: { label: 'Team', icon: UserGroupIcon, tint: 'purple' },
};

function ago(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1)
    return 'just now';
  if (minutes < 60)
    return `${minutes}m ago`;
  if (minutes < 1440)
    return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`mr-2 rounded-full px-3 py-1.5 ${active ? 'bg-primary-500' : 'border border-border bg-card'}`}
    >
      <Text className={`text-xs font-extrabold ${active ? 'text-white' : 'text-muted-foreground'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function Row({ item, onPress }: { item: AppNotification; onPress: () => void }) {
  const unread = item.readAt === null;
  const meta = CATEGORIES[item.category];

  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={!unread}>
      <Card className={`mb-2 flex-row gap-3 p-3.5 ${unread ? 'border border-primary-500' : 'border border-border'}`}>
        <IconTile icon={meta.icon} tint={meta.tint} size={32} iconSize={17} />

        <View className="flex-1">
          <View className="flex-row items-start justify-between gap-2">
            <Text className={`flex-1 text-[14px] text-foreground ${unread ? 'font-bold' : 'font-medium'}`}>
              {item.title ?? meta.label}
            </Text>
            <Text className="text-[11px] text-muted-foreground">{ago(item.createdAt)}</Text>
          </View>

          <Text className="mt-1 text-[13px] text-muted-foreground">{item.body}</Text>

          {item.imageUrl != null && item.imageUrl !== '' && (
            <Image
              source={item.imageUrl}
              contentFit="cover"
              transition={150}
              className="mt-2 h-36 w-full rounded-xl bg-muted"
            />
          )}
          <Text className="mt-1.5 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            {meta.label}
          </Text>
        </View>

        {unread && <View className="mt-1.5 size-2 rounded-full bg-primary-600" />}
      </Card>
    </Pressable>
  );
}

/** One inbox, shared by admin, staff and customer. */
export function NotificationsScreen() {
  const [category, setCategory] = React.useState<NotificationCategory | null>(null);

  const query = useNotifications({
    variables: { limit: 50, ...(category ? { category } : {}) },
  });
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const items = query.data?.items ?? [];
  const hasUnread = items.some(item => item.readAt === null);

  if (query.isPending)
    return <Loading />;

  if (query.isError)
    return <LoadError message={query.error.message} onRetry={() => void query.refetch()} />;

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <SafeAreaView edges={['top']} className="bg-card" />

      <ScreenHeader
        title="Notifications"
        subtitle={query.data ? `${query.data.total} total` : undefined}
        showBack
        rightAction={hasUnread
          ? (
              <Pressable accessibilityRole="button" onPress={() => markAllRead.mutate()}>
                <Text className="text-xs font-extrabold text-primary-600">Mark all read</Text>
              </Pressable>
            )
          : undefined}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
          <Chip label="All" active={category === null} onPress={() => setCategory(null)} />
          {NOTIFICATION_CATEGORIES.map(value => (
            <Chip
              key={value}
              label={CATEGORIES[value].label}
              active={category === value}
              onPress={() => setCategory(value)}
            />
          ))}
        </ScrollView>
      </ScreenHeader>

      <FlashList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={(
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => void query.refetch()}
            tintColor={colors.primary[600]}
          />
        )}
        renderItem={({ item }) => (
          <Row item={item} onPress={() => markRead.mutate({ id: item.id })} />
        )}
        ListEmptyComponent={(
          <View className="items-center gap-2 py-20">
            <IconTile icon={Notification03Icon} tint="blue" size={44} iconSize={22} />
            <Text className="text-sm text-muted-foreground">Nothing here yet.</Text>
          </View>
        )}
      />
    </View>
  );
}

import { Notification03Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import * as React from 'react';

import { colors, Pressable, Text, View } from '@/components/ui';
import { useUnreadCount } from '@/lib/hooks/api/use-notifications';

/**
 * The inbox entry point, shown in every role's header. Admin, staff and
 * customer read the same inbox; they differ only in what is sent to them.
 */
export function NotificationBell({ className = 'bg-card' }: { className?: string }) {
  const router = useRouter();
  const { data } = useUnreadCount();
  const unread = data?.total ?? 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
      onPress={() => router.push('/notifications')}
      className={`size-10 items-center justify-center rounded-full ${className}`}
    >
      <HugeiconsIcon icon={Notification03Icon} size={19} color={colors.charcoal[800]} strokeWidth={2} />

      {unread > 0 && (
        <View className="absolute top-1 right-1 min-w-4 items-center justify-center rounded-full bg-primary-600 px-1">
          <Text className="text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

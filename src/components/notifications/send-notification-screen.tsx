import type { NotificationCategory, NotificationDelivery } from '@/lib/api/types';
import * as React from 'react';
import { showMessage } from 'react-native-flash-message';

import { ScreenHeader } from '@/components/common/screen-header';
import { Card } from '@/components/common/shell';
import {
  Button,
  FocusAwareStatusBar,
  Input,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { NOTIFICATION_CATEGORIES, NOTIFICATION_DELIVERIES } from '@/lib/constants/notify';
import { useSendNotification } from '@/lib/hooks/api/use-notifications';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';

type Audience = 'tenant' | 'admin' | 'staff' | 'customer';

const AUDIENCE_LABELS: Record<Audience, string> = {
  tenant: 'Everyone',
  admin: 'Admins',
  staff: 'Staff',
  customer: 'Customers',
};

const DELIVERY_LABELS: Record<NotificationDelivery, string> = {
  notification: 'Notification only',
  both: 'Notification + in-app',
  in_app: 'In-app only',
};

function Chips<T extends string>({ values, selected, labels, onSelect }: {
  values: readonly T[];
  selected: T;
  labels: Record<T, string>;
  onSelect: (value: T) => void;
}) {
  return (
    <View className="mt-2 flex-row flex-wrap gap-2">
      {values.map(value => (
        <Pressable
          key={value}
          onPress={() => onSelect(value)}
          className={`rounded-full px-3 py-1.5 ${selected === value ? 'bg-primary-500' : 'border border-border bg-card'}`}
        >
          <Text className={`text-xs font-extrabold ${selected === value ? 'text-white' : 'text-muted-foreground'}`}>
            {labels[value]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/**
 * ponytail: a direct composer — it pushes on submit, with no scheduling,
 * templates or preview. Staff may only raise things with admins; admins can
 * address anybody in the tenant.
 */
export function SendNotificationScreen() {
  const role = useAuthStore.use.role();
  const isStaff = role === 'staff';

  const [audience, setAudience] = React.useState<Audience>(isStaff ? 'admin' : 'tenant');
  const [category, setCategory] = React.useState<NotificationCategory>(isStaff ? 'staff' : 'general');
  const [delivery, setDelivery] = React.useState<NotificationDelivery>('notification');
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [imageUrl, setImageUrl] = React.useState('');

  const send = useSendNotification();
  const canSend = title.trim().length > 0 && body.trim().length > 0 && !send.isPending;

  const audiences: Audience[] = isStaff ? ['admin'] : ['tenant', 'admin', 'staff', 'customer'];

  const onSubmit = () => {
    send.mutate({
      ...(audience === 'tenant'
        ? { audience: 'tenant' as const }
        : { audience: 'role' as const, roleId: audience }),
      category,
      delivery,
      type: 'announcement',
      title: title.trim(),
      body: body.trim(),
      ...(imageUrl.trim() === '' ? {} : { imageUrl: imageUrl.trim() }),
    }, {
      onSuccess: (result) => {
        showMessage({
          message: `Sent to ${result.notified}`,
          description: `${result.pushed} pushed${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
          type: 'success',
        });
        setTitle('');
        setBody('');
        setImageUrl('');
      },
      onError: error => showMessage({ message: 'Could not send', description: error.message, type: 'danger' }),
    });
  };

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <SafeAreaView edges={['top']} className="bg-card" />
      <ScreenHeader title="Send a notification" showBack />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Card className="p-3.5">
          <Text className="text-[13px] font-bold text-foreground">Who</Text>
          <Chips values={audiences} selected={audience} labels={AUDIENCE_LABELS} onSelect={setAudience} />
          {isStaff && (
            <Text className="mt-2 text-xs text-muted-foreground">
              Staff messages go to your admins.
            </Text>
          )}
        </Card>

        <Card className="p-3.5">
          <Text className="text-[13px] font-bold text-foreground">Category</Text>
          <Chips
            values={NOTIFICATION_CATEGORIES}
            selected={category}
            labels={{
              general: 'General',
              alert: 'Alert',
              promotional: 'Offer',
              billing: 'Payment',
              service: 'Connection',
              staff: 'Team',
            }}
            onSelect={setCategory}
          />
        </Card>

        <Card className="p-3.5">
          <Text className="text-[13px] font-bold text-foreground">How it shows</Text>
          <Chips
            values={NOTIFICATION_DELIVERIES}
            selected={delivery}
            labels={DELIVERY_LABELS}
            onSelect={setDelivery}
          />
          <Text className="mt-2 text-xs text-muted-foreground">
            In-app only never reaches the notification tray — it waits until the app is opened.
            A signed-out phone is only reachable by an offer.
          </Text>
        </Card>

        <Card className="p-3.5">
          <Input label="Title" value={title} onChangeText={setTitle} maxLength={120} />
          <Input label="Message" value={body} onChangeText={setBody} multiline maxLength={1000} />
          <Input
            label="Image URL (optional)"
            value={imageUrl}
            onChangeText={setImageUrl}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="https://..."
          />
        </Card>

        <Button label="Send now" onPress={onSubmit} disabled={!canSend} loading={send.isPending} />
      </ScrollView>
    </View>
  );
}

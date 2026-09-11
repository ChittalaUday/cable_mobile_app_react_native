import { CreditCardIcon, FlashIcon, HeadsetIcon, UserAdd01Icon, Wifi01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';

import { Card, SectionHeader, TINT } from '@/components/common/shell';
import { Pressable, Text, View } from '@/components/ui';

const QUICK_ACTIONS = [
  { key: 'add-customer', icon: UserAdd01Icon, label: 'Add Customer', tint: 'orange' },
  { key: 'new-connection', icon: Wifi01Icon, label: 'New Connection', tint: 'blue' },
  { key: 'record-payment', icon: CreditCardIcon, label: 'Record Payment', tint: 'green' },
  { key: 'raise-ticket', icon: HeadsetIcon, label: 'Raise Ticket', tint: 'purple' },
] as const;

export type QuickActionKey = (typeof QUICK_ACTIONS)[number]['key'];

export function QuickActions({ onPress, onSeeAll }: { onPress: (key: QuickActionKey) => void; onSeeAll: () => void }) {
  return (
    <Card className="p-3.5">
      <SectionHeader icon={FlashIcon} tint="orange" title="Quick Actions" action="See All" onAction={onSeeAll} />
      <View className="mt-3 flex-row flex-wrap gap-2.5">
        {QUICK_ACTIONS.map(action => (
          <Pressable
            key={action.key}
            accessibilityRole="button"
            onPress={() => onPress(action.key)}
            className="min-w-[46%] flex-1 items-center gap-1.5 rounded-xl py-3.5"
            style={{ backgroundColor: TINT[action.tint].bg }}
          >
            <HugeiconsIcon icon={action.icon} size={22} color={TINT[action.tint].fg} strokeWidth={2.2} />
            <Text className="text-xs font-semibold" style={{ color: TINT[action.tint].fg }}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

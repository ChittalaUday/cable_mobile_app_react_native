import type { MoreNavItem } from '@/components/admin/more-view';
import {
  HeadsetIcon,
  Notification03Icon,
  Package01Icon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import * as React from 'react';

import { MoreView } from '@/components/admin/more-view';
import { FocusAwareStatusBar, SafeAreaView, View } from '@/components/ui';

/** Only what the staff role can open: catalogue, staff and location admin stay with the office. */
const STAFF_ITEMS: MoreNavItem[] = [
  { key: 'tickets', title: 'Complaints', subtitle: 'Faults assigned to you', icon: HeadsetIcon, tint: 'red', route: '/staff/tickets' },
  { key: 'inventory', title: 'Inventory', subtitle: 'Your stock, issue & return equipment', icon: Package01Icon, tint: 'orange', route: '/staff/inventory' },
  { key: 'notify', title: 'Message the office', subtitle: 'Send a notification to your admins', icon: Notification03Icon, tint: 'blue', route: '/staff/notifications/send' },
  { key: 'profile', title: 'Profile', subtitle: 'Account details, settings, and security', icon: UserIcon, tint: 'purple', route: '/staff/profile' },
];

export default function StaffMoreTab() {
  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <SafeAreaView edges={['top']} className="bg-card" />
      <MoreView items={STAFF_ITEMS} profileRoute="/staff/profile" subtitle="Complaints, inventory and your account" />
    </View>
  );
}

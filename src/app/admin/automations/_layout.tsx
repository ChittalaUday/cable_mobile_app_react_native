import { Stack } from 'expo-router';
import * as React from 'react';
import { AutomationAccessGate } from '@/components/automations/automation-access';

export default function AdminAutomationsLayout() {
  return (
    <AutomationAccessGate>
      <Stack screenOptions={{ headerShown: false }} />
    </AutomationAccessGate>
  );
}

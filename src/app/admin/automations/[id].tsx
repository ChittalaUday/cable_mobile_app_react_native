import { useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { AutomationRunDetailScreen } from '@/components/automations/automation-run-detail-screen';

export default function AdminAutomationRunRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AutomationRunDetailScreen id={id} />;
}

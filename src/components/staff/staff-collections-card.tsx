import type { StaffDashboard } from '@/lib/hooks/api/use-staff-dashboard';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/common/shell';
import { Pressable, Text, View } from '@/components/ui';
import { grouped } from '@/lib/utils/admin-format';

const amount = (value: number) => `₹${value.toFixed(2)}`;

export function StaffCollectionsCard({ dashboard }: { dashboard: StaffDashboard }) {
  const { t } = useTranslation();
  const [scope, setScope] = React.useState<'personal' | 'team'>('personal');
  const metrics = scope === 'team' && dashboard.team ? dashboard.team : dashboard.personal;

  return (
    <View className="gap-4">
      <View className="flex-row rounded-xl border border-border bg-card p-1">
        <ScopeButton label={t('staff_dashboard.personal')} selected={scope === 'personal'} onPress={() => setScope('personal')} />
        <ScopeButton label={t('staff_dashboard.team')} selected={scope === 'team'} disabled={!dashboard.team} onPress={() => setScope('team')} />
      </View>

      <View className="gap-2 rounded-2xl bg-charcoal-900 p-5">
        <Text className="text-sm font-semibold text-primary-300">{scope === 'team' ? t('staff_dashboard.team_status') : t('staff_dashboard.personal_status')}</Text>
        <Text selectable className="text-4xl font-bold text-white">{amount(metrics.today)}</Text>
        <Text className="text-charcoal-300">{t('staff_dashboard.collected_today')}</Text>
      </View>

      <View className="flex-row flex-wrap gap-3">
        <Metric label={t('staff_dashboard.this_week')} value={amount(metrics.week)} />
        <Metric label={t('staff_dashboard.this_month')} value={amount(metrics.month)} />
        <Metric label={t('staff_dashboard.receipts_today')} value={grouped(metrics.todayReceipts)} />
        <Metric label={t('staff_dashboard.receipts_month')} value={grouped(metrics.monthReceipts)} />
      </View>

      <Card className="gap-3 border border-border p-4">
        <Text className="text-base font-bold text-foreground">{t('staff_dashboard.workload')}</Text>
        <View className="flex-row flex-wrap gap-3">
          <Metric label={t('staff_dashboard.customers')} value={grouped(dashboard.workload.customers)} />
          <Metric label={t('staff_dashboard.due_customers')} value={grouped(dashboard.workload.dueCustomers)} />
          <Metric label={t('staff_dashboard.outstanding')} value={amount(dashboard.workload.outstanding)} />
          <Metric label={t('staff_dashboard.active_connections')} value={grouped(dashboard.workload.activeConnections)} />
        </View>
      </Card>

      <Card className="border border-border p-4">
        <Text className="text-base font-bold text-foreground">{t('staff_dashboard.recent_collections')}</Text>
        {dashboard.recentCollections.length === 0
          ? <Text className="mt-3 text-sm text-muted-foreground">{t('staff_dashboard.no_collections')}</Text>
          : dashboard.recentCollections.map(row => (
              <View key={row.id} className="mt-3 flex-row items-center border-t border-border pt-3">
                <View className="flex-1">
                  <Text className="font-semibold text-foreground">{row.customerName ?? row.accountNumber}</Text>
                  <Text className="text-xs text-muted-foreground">
                    {row.accountNumber}
                    {' '}
                    ·
                    {' '}
                    {row.ago}
                  </Text>
                </View>
                <Text className="font-bold text-foreground">{amount(row.amount)}</Text>
              </View>
            ))}
      </Card>
    </View>
  );
}

function ScopeButton({ label, selected, disabled, onPress }: { label: string; selected: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable disabled={disabled} accessibilityRole="tab" accessibilityState={{ selected, disabled }} onPress={onPress} className={`flex-1 items-center rounded-lg px-3 py-2.5 ${selected ? 'bg-primary-500' : ''}`}>
      <Text className={`font-semibold ${selected ? 'text-white' : disabled ? 'text-charcoal-300' : 'text-muted-foreground'}`}>{label}</Text>
    </Pressable>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-[44%] flex-1 gap-1">
      <Text className="text-xs text-muted-foreground">{label}</Text>
      <Text selectable className="text-xl font-bold text-foreground">{value}</Text>
    </View>
  );
}

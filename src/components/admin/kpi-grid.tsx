import type { IconSvgElement } from '@hugeicons/react-native';
import type { TFunction } from 'i18next';
import type { AdminDashboard } from '@/lib/utils/admin-stats';
import {
  ArrowDownRight01Icon,
  ArrowUpRight01Icon,
  IndianRupeeIcon,
  UserMultiple02Icon,
  Wifi01Icon,
  WifiDisconnected01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkline } from '@/components/common/charts';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Card, IconTile, TINT } from '@/components/common/shell';
import { colors, Text, View } from '@/components/ui';
import { PERMISSIONS } from '@/constants/permissions';
import { grouped, percent, rupees } from '@/lib/utils/admin-format';

type KpiSpec = { key: string; icon: IconSvgElement; tint: keyof typeof TINT; label: string; value: string; delta?: number | null; detail?: string; series: number[]; tone: 'good' | 'bad'; requiredPermission: string };

function kpiSpecs(data: AdminDashboard, t: TFunction): KpiSpec[] {
  return [
    { key: 'customers', icon: UserMultiple02Icon, tint: 'orange', label: t('admin_dashboard.total_customers'), value: grouped(data.totalCustomers), delta: data.totalCustomersDelta, series: data.totalCustomersSeries, tone: 'good', requiredPermission: PERMISSIONS.CUSTOMERS_VIEW },
    { key: 'active', icon: Wifi01Icon, tint: 'blue', label: t('admin_dashboard.active_connections'), value: grouped(data.activeConnections), delta: data.activeDelta, series: data.activeSeries, tone: 'good', requiredPermission: PERMISSIONS.CUSTOMERS_VIEW },
    { key: 'today', icon: IndianRupeeIcon, tint: 'green', label: t('admin_dashboard.collected_today'), value: rupees(data.collectedToday), detail: t('admin_dashboard.receipts_today', { count: data.receiptsToday }), series: data.revenue.daily.map(point => point.value), tone: 'good', requiredPermission: PERMISSIONS.REPORTS_VIEW },
    { key: 'outstanding', icon: WifiDisconnected01Icon, tint: 'red', label: t('admin_dashboard.outstanding_dues'), value: rupees(data.outstandingDues), detail: t('admin_dashboard.accounts_due', { count: data.dueAccounts }), series: [], tone: 'bad', requiredPermission: PERMISSIONS.CUSTOMERS_VIEW },
  ];
}

export function KpiGrid({ data }: { data: AdminDashboard }) {
  const { t } = useTranslation();
  return (
    <View className="flex-row flex-wrap gap-2.5">
      {kpiSpecs(data, t).map(kpi => (
        <PermissionGuard key={kpi.key} permission={kpi.requiredPermission}>
          <Card className="min-w-[46%] flex-1 overflow-hidden pt-3">
            <View className="px-3">
              <View className="flex-row items-center gap-2.5">
                <IconTile icon={kpi.icon} tint={kpi.tint} size={36} iconSize={19} />
                <View className="flex-1">
                  <Text adjustsFontSizeToFit numberOfLines={1} className="text-xl font-bold text-foreground">{kpi.value}</Text>
                  <Text className="text-[11px] text-muted-foreground">{kpi.label}</Text>
                </View>
              </View>
              {kpi.detail === undefined
                ? <KpiDelta delta={kpi.delta ?? null} tone={kpi.tone} noPriorMonth={t('admin_dashboard.no_prior_month')} />
                : <Text className="mt-2 text-[11px] text-muted-foreground">{kpi.detail}</Text>}
            </View>
            {kpi.series.length > 1 && <Sparkline series={kpi.series} color={TINT[kpi.tint].fg} />}
          </Card>
        </PermissionGuard>
      ))}
    </View>
  );
}

function KpiDelta({ delta, tone, noPriorMonth }: { delta: number | null; tone: 'good' | 'bad'; noPriorMonth: string }) {
  const label = percent(delta);
  if (label === null)
    return <Text className="mt-2 text-[11px] text-charcoal-300">{noPriorMonth}</Text>;
  const rising = (delta ?? 0) >= 0;
  const color = rising === (tone === 'good') ? '#0E9F6E' : colors.danger[500];
  return (
    <View className="mt-2 flex-row items-center gap-0.5">
      <HugeiconsIcon icon={rising ? ArrowUpRight01Icon : ArrowDownRight01Icon} size={14} color={color} strokeWidth={2.8} />
      <Text className="text-xs font-semibold" style={{ color }}>{label.replace('+', '')}</Text>
    </View>
  );
}

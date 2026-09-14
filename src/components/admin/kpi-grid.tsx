import type { IconSvgElement } from '@hugeicons/react-native';
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
import { Sparkline } from '@/components/common/charts';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Card, IconTile, TINT } from '@/components/common/shell';
import { colors, Text, View } from '@/components/ui';
import { PERMISSIONS } from '@/constants/permissions';
import { grouped, percent, rupees } from '@/lib/utils/admin-format';

type KpiSpec = { key: string; icon: IconSvgElement; tint: keyof typeof TINT; label: string; value: string; delta: number | null; series: number[]; tone: 'good' | 'bad'; requiredPermission: string };

function kpiSpecs(data: AdminDashboard): KpiSpec[] {
  return [
    { key: 'customers', icon: UserMultiple02Icon, tint: 'orange', label: 'Total Customers', value: grouped(data.totalCustomers), delta: data.totalCustomersDelta, series: data.totalCustomersSeries, tone: 'good', requiredPermission: PERMISSIONS.CUSTOMERS_VIEW },
    { key: 'active', icon: Wifi01Icon, tint: 'blue', label: 'Active Connections', value: grouped(data.activeConnections), delta: data.activeDelta, series: data.activeSeries, tone: 'good', requiredPermission: PERMISSIONS.CUSTOMERS_VIEW },
    { key: 'inactive', icon: WifiDisconnected01Icon, tint: 'red', label: 'Inactive / Disconnected', value: grouped(data.inactiveConnections), delta: data.inactiveDelta, series: data.inactiveSeries, tone: 'bad', requiredPermission: PERMISSIONS.CUSTOMERS_VIEW },
    { key: 'revenue', icon: IndianRupeeIcon, tint: 'green', label: 'Revenue (This Month)', value: rupees(data.revenueThisMonth), delta: data.revenueDelta, series: data.revenueSeries, tone: 'good', requiredPermission: PERMISSIONS.REPORTS_VIEW },
  ];
}

export function KpiGrid({ data }: { data: AdminDashboard }) {
  return (
    <View className="flex-row flex-wrap gap-2.5">
      {kpiSpecs(data).map(kpi => (
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
              <KpiDelta delta={kpi.delta} tone={kpi.tone} />
            </View>
            <Sparkline series={kpi.series} color={TINT[kpi.tint].fg} />
          </Card>
        </PermissionGuard>
      ))}
    </View>
  );
}

function KpiDelta({ delta, tone }: { delta: number | null; tone: 'good' | 'bad' }) {
  const label = percent(delta);
  if (label === null)
    return <Text className="mt-2 text-[11px] text-charcoal-300">No prior month</Text>;
  const rising = (delta ?? 0) >= 0;
  const color = rising === (tone === 'good') ? '#0E9F6E' : colors.danger[500];
  return (
    <View className="mt-2 flex-row items-center gap-0.5">
      <HugeiconsIcon icon={rising ? ArrowUpRight01Icon : ArrowDownRight01Icon} size={14} color={color} strokeWidth={2.8} />
      <Text className="text-xs font-semibold" style={{ color }}>{label.replace('+', '')}</Text>
    </View>
  );
}

import type { AdminDashboard } from '@/lib/utils/admin-stats';
import { DashboardSquare01Icon, PieChartIcon } from '@hugeicons/core-free-icons';
import * as React from 'react';

import { Donut, DonutLegend, SERVICE_COLORS, STATUS_COLORS } from '@/components/common/charts';
import { Card, SectionHeader } from '@/components/common/shell';
import { View } from '@/components/ui';

export function DonutCard({ variant, title, slices, total, caption, onDetails }: {
  variant: 'status' | 'service';
  title: string;
  slices: AdminDashboard['services'];
  total: number;
  caption: string;
  onDetails: () => void;
}) {
  const isStatus = variant === 'status';
  return (
    <Card className="p-3.5">
      <SectionHeader
        icon={isStatus ? DashboardSquare01Icon : PieChartIcon}
        tint="blue"
        title={title}
        action="View Details"
        onAction={onDetails}
      />
      <View className="mt-3 flex-row items-center">
        <Donut
          slices={slices}
          total={total}
          caption={caption}
          colors={isStatus ? STATUS_COLORS : SERVICE_COLORS}
        />
        <DonutLegend slices={slices} colors={isStatus ? STATUS_COLORS : SERVICE_COLORS} />
      </View>
    </Card>
  );
}

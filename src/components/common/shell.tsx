/* eslint-disable react-refresh/only-export-components -- TINT/TABS are shared layout config. */
import type { IconSvgElement } from '@hugeicons/react-native';
import {
  ArrowRight01Icon,
  Home01Icon,
  Message01Icon,
  MoreIcon,
  UserMultipleIcon,
  Wifi01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { showMessage } from 'react-native-flash-message';

import { ActivityIndicator, Button, colors, Pressable, Text, View } from '@/components/ui';

export type CustomerStatus = 'active' | 'inactive' | 'pending';

export const NAVY = '#1E2A44';

/** Icon-tile tints used by section headers, quick actions and activity rows. */
export const TINT = {
  orange: { bg: '#FFF1E6', fg: '#FF6C00' },
  blue: { bg: '#E8F2FE', fg: '#2E90FA' },
  green: { bg: '#E6F7EF', fg: '#12B76A' },
  purple: { bg: '#F1EAFE', fg: '#7C4DFF' },
  red: { bg: '#FDECEC', fg: '#EF4444' },
} as const;

export type TintKey = keyof typeof TINT;

export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <View className={`rounded-2xl bg-card ${className}`}>{children}</View>;
}

export function IconTile({ icon, tint, size = 28, iconSize = 16 }: { icon: IconSvgElement; tint: TintKey; size?: number; iconSize?: number }) {
  return (
    <View className="items-center justify-center rounded-lg" style={{ width: size, height: size, backgroundColor: TINT[tint].bg }}>
      <HugeiconsIcon icon={icon} size={iconSize} color={TINT[tint].fg} strokeWidth={2.2} />
    </View>
  );
}

export function SectionHeader({ icon, tint, title, action, onAction }: {
  icon: IconSvgElement;
  tint: TintKey;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View className="flex-row items-center gap-2.5">
      <IconTile icon={icon} tint={tint} />
      <Text className="flex-1 text-[15px] font-bold text-foreground">{title}</Text>
      {action && (
        <Pressable accessibilityRole="button" onPress={onAction} className="flex-row items-center gap-0.5">
          <Text className="text-xs font-semibold text-primary-600">{action}</Text>
          <HugeiconsIcon icon={ArrowRight01Icon} size={14} color={colors.primary[600]} strokeWidth={2.4} />
        </Pressable>
      )}
    </View>
  );
}

const STATUS_STYLE: Record<CustomerStatus, { bg: string; fg: string; label: string }> = {
  active: { bg: TINT.green.bg, fg: '#0E9F6E', label: 'Active' },
  pending: { bg: TINT.orange.bg, fg: '#E56100', label: 'Pending' },
  inactive: { bg: TINT.red.bg, fg: '#DC2626', label: 'Inactive' },
};

export function StatusPill({ status }: { status: CustomerStatus }) {
  const style = STATUS_STYLE[status];
  return (
    <View className="rounded-md px-2 py-1" style={{ backgroundColor: style.bg }}>
      <Text className="text-[11px] font-semibold" style={{ color: style.fg }}>{style.label}</Text>
    </View>
  );
}

export function comingSoon(label: string) {
  showMessage({ message: `${label} is not wired up yet.`, type: 'info' });
}

export function Loading() {
  return (
    <View className="flex-1 items-center justify-center gap-3">
      <ActivityIndicator color={colors.primary[600]} />
      <Text className="text-[13px] text-muted-foreground">Loading live figures…</Text>
    </View>
  );
}

export function LoadError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-3 px-8">
      <Text className="text-center text-[15px] font-semibold text-foreground">Could not load your network data</Text>
      <Text className="text-center text-[13px] text-muted-foreground">{message ?? 'Firestore returned no data for this account.'}</Text>
      <Button label="Try again" variant="outline" onPress={onRetry} />
    </View>
  );
}

export function Divider() {
  return <View className="h-px bg-border" />;
}

const TABS = [
  { key: 'home', icon: Home01Icon, label: 'Home' },
  { key: 'customers', icon: UserMultipleIcon, label: 'Customers' },
  { key: 'connections', icon: Wifi01Icon, label: 'Connections' },
  { key: 'tickets', icon: Message01Icon, label: 'Tickets' },
  { key: 'more', icon: MoreIcon, label: 'More' },
] as const;

export type TabKey = (typeof TABS)[number]['key'];

export function BottomNav({ active, onSelect, bottomInset }: { active: TabKey; onSelect: (key: TabKey) => void; bottomInset: number }) {
  return (
    <View className="flex-row rounded-t-2xl border-t border-border bg-card px-1 pt-2.5" style={{ paddingBottom: bottomInset + 6 }}>
      {TABS.map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onSelect(tab.key)}
            className="flex-1 items-center gap-1"
          >
            <HugeiconsIcon icon={tab.icon} size={21} color={selected ? colors.primary[600] : colors.neutral[400]} strokeWidth={selected ? 2.4 : 1.9} />
            <Text className={`text-[10px] ${selected ? 'font-semibold text-primary-600' : 'text-muted-foreground'}`}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

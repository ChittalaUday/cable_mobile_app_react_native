/* eslint-disable react-refresh/only-export-components -- TINT/TABS are shared layout config. */
import type { IconSvgElement } from '@hugeicons/react-native';
import {
  ArrowRight01Icon,
  CreditCardIcon,
  Home01Icon,
  MoreIcon,
  RemoteControlIcon,
  UserMultipleIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';

import { ActivityIndicator, Button, colors, Pressable, Text, View } from '@/components/ui';

export type CustomerStatus = 'active' | 'inactive' | 'pending';

export const NAVY = '#1E2A44';

/** Icon-tile tints used by section headers, quick actions and activity rows. */
// Tile backgrounds are the tint itself at ~12% opacity, not a fixed pastel:
// on white that is the same soft wash, and on a dark card it stays a subtle
// tint instead of a bright light square.
export const TINT = {
  orange: { bg: '#FF6C001F', fg: '#FF6C00' },
  blue: { bg: '#2E90FA1F', fg: '#2E90FA' },
  green: { bg: '#12B76A1F', fg: '#12B76A' },
  purple: { bg: '#7C4DFF1F', fg: '#7C4DFF' },
  red: { bg: '#EF44441F', fg: '#EF4444' },
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
      <Text className="text-center text-[13px] text-muted-foreground">{message ?? 'No data is available for this account.'}</Text>
      <Button label="Try again" variant="outline" onPress={onRetry} />
    </View>
  );
}

export function Divider({ className = '' }: { className?: string }) {
  return <View className={`h-px bg-border ${className}`} />;
}

/** The same five tabs the tab bar itself has — screens pushed over it reuse this. */
const TABS = [
  { key: 'home', icon: Home01Icon, label: 'Home' },
  { key: 'customers', icon: UserMultipleIcon, label: 'Customers' },
  { key: 'payments', icon: CreditCardIcon, label: 'Payments' },
  { key: 'remote', icon: RemoteControlIcon, label: 'Remote' },
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

export { ScreenHeader } from './screen-header';
export type { ScreenHeaderProps } from './screen-header';

const AVATAR_TINTS: TintKey[] = ['blue', 'green', 'red', 'orange', 'purple'];

/** Initials on a tint picked from the name, so the same person keeps the same colour on every screen. */
export function Avatar({ name, size = 44 }: { name?: string | null; size?: number }) {
  const hash = [...(name ?? '')].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const tint = TINT[AVATAR_TINTS[hash % AVATAR_TINTS.length]];
  return (
    <View className="items-center justify-center rounded-full" style={{ width: size, height: size, backgroundColor: tint.bg }}>
      <Text className="font-extrabold" style={{ color: tint.fg, fontSize: size * 0.34 }}>
        {(name ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?'}
      </Text>
    </View>
  );
}

/** Equal-width tabs: the selected one filled orange, the rest outlined. */
export function Segmented<K extends string>({ options, value, onChange }: {
  options: readonly { key: K; label: string; count?: number }[];
  value: K;
  onChange: (key: K) => void;
}) {
  return (
    <View className="flex-row gap-1.5" accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.key)}
            testID={`segment-${option.key}`}
            className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 ${selected ? 'bg-primary-500' : 'border border-border bg-card'}`}
          >
            <Text numberOfLines={1} className={`text-[13px] font-semibold ${selected ? 'text-white' : 'text-muted-foreground'}`}>
              {option.label}
            </Text>
            {option.count === undefined
              ? null
              : <Text className={`text-[13px] font-bold ${selected ? 'text-white' : 'text-foreground'}`}>{option.count}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

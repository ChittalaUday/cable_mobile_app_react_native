/* eslint-disable react-refresh/only-export-components -- STEP_LABELS belongs beside the pieces that use them. */
import type { IconSvgElement } from '@hugeicons/react-native';
import type { CustomerSubscription } from '@/lib/api/types';
import type { ChargeKind, Step } from '@/lib/hooks/stores/use-recharge-store';
import { CheckListIcon, CheckmarkCircle02Icon, PrinterIcon, Tick02Icon, ViewIcon, Wallet01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { PlanPrice } from '@/components/common/plan-price';
import { colors, Pressable, Text, View } from '@/components/ui';
import { STEPS } from '@/lib/hooks/stores/use-recharge-store';
import { rupeesExact } from '@/lib/utils/admin-format';

export const STEP_LABELS: Record<Step, string> = {
  plan: 'Select',
  amount: 'Payment',
  printer: 'Printer',
  preview: 'Preview',
  done: 'Done',
};

const STEP_ICONS: Record<Step, IconSvgElement> = {
  plan: CheckListIcon,
  amount: Wallet01Icon,
  printer: PrinterIcon,
  preview: ViewIcon,
  done: CheckmarkCircle02Icon,
};

/**
 * How far along the flow is: an icon per step, joined by a line. Past steps
 * show a tick, the current one is filled, the rest are outlined.
 */
export function StepTrail({ step }: { step: Step }) {
  const at = STEPS.indexOf(step);

  return (
    <View className="flex-row items-start" accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: STEPS.length, now: at + 1 }}>
      {STEPS.map((id, index) => {
        const state = index < at ? 'past' : index === at ? 'current' : 'next';

        return (
          <View key={id} className="flex-1 items-center gap-1">
            <View className="w-full flex-row items-center">
              <View className={`h-0.5 flex-1 ${index === 0 ? 'opacity-0' : index <= at ? 'bg-primary-500' : 'bg-border'}`} />
              <View
                testID={`step-${id}-${state}`}
                className={`size-8 items-center justify-center rounded-full border-2 ${
                  state === 'next' ? 'border-border bg-card' : 'border-primary-500 bg-primary-500'
                }`}
              >
                <HugeiconsIcon
                  icon={state === 'past' ? Tick02Icon : STEP_ICONS[id]}
                  size={16}
                  strokeWidth={2}
                  color={state === 'next' ? colors.neutral[400] : '#ffffff'}
                />
              </View>
              <View className={`h-0.5 flex-1 ${index === STEPS.length - 1 ? 'opacity-0' : index < at ? 'bg-primary-500' : 'bg-border'}`} />
            </View>
            <Text
              numberOfLines={1}
              className={`text-[10px] font-bold ${state === 'next' ? 'text-muted-foreground' : 'text-primary-600'}`}
            >
              {STEP_LABELS[id]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-1.5">
      <Text className="text-xs font-semibold text-foreground">{label}</Text>
      {children}
    </View>
  );
}

/** One line of a running sum. */
export function SumRow({ label, value, tone = 'normal', testID }: {
  label: string;
  value: string;
  tone?: 'normal' | 'strong' | 'credit';
  testID?: string;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      {/* The label gives way (wraps to two lines) so the amount is never pushed off the card. */}
      <Text
        numberOfLines={2}
        className={`min-w-0 flex-1 text-sm ${tone === 'strong' ? 'font-bold text-foreground' : 'text-muted-foreground'}`}
      >
        {label}
      </Text>
      <Text
        testID={testID}
        className={`shrink-0 ${tone === 'strong' ? 'text-xl font-black' : 'text-sm font-bold'} ${tone === 'credit' ? 'text-green-600' : 'text-foreground'}`}
      >
        {value}
      </Text>
    </View>
  );
}

/**
 * The customer's connections, and which one this visit is about.
 *
 * Rendered once, on the plan step. Every later step acts on the line chosen
 * here rather than asking again — a second copy of this list is how a collector
 * ends up typing an amount against one connection and recording it against
 * another.
 */
export function PlanTable({ lines, selectedId, onSelect }: {
  lines: CustomerSubscription[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <View className="gap-2">
      {lines.map((line) => {
        const due = Math.round(Number(line.outstandingBalance || 0) * 100);
        const selected = line.id === selectedId;

        return (
          <Pressable
            key={line.id}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onSelect(line.id)}
            className={`gap-1.5 rounded-xl border p-3.5 ${selected ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40' : 'border-border bg-card'}`}
          >
            <View className="flex-row items-start justify-between gap-2">
              <View className="min-w-0 flex-1 gap-0.5">
                <Text className="text-sm font-extrabold text-foreground" numberOfLines={1}>
                  {line.plan.name}
                </Text>
                <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                  {`${line.service.name} • ${line.provider.name}`}
                </Text>
              </View>
              <PlanPrice price={line.plan.price} amount={line.plan.amount} className="text-sm font-bold text-foreground" />
            </View>

            <View className="flex-row items-center justify-between gap-2">
              <Text className="text-[11px] font-semibold text-muted-foreground" numberOfLines={1}>
                {line.serviceAccountNumber}
              </Text>
              <Text className={`text-[11px] font-bold ${due > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                {due > 0 ? `${rupeesExact(line.outstandingBalance)} due` : 'Nothing due'}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A row in a list of things that can be chosen — equipment, a package, a printer. */
export function ChoiceRow({ title, subtitle, trailing, selected, disabled, onPress, testID }: {
  title: string;
  subtitle?: React.ReactNode;
  trailing?: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole={selected === undefined ? 'button' : 'radio'}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      className={`flex-row items-center justify-between gap-2 rounded-xl border p-3.5 ${
        selected === true ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40' : 'border-border bg-card'
      } ${disabled === true ? 'opacity-50' : 'active:bg-muted/40'}`}
    >
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-sm font-extrabold text-foreground" numberOfLines={1}>{title}</Text>
        {typeof subtitle === 'string'
          ? <Text className="text-xs text-muted-foreground" numberOfLines={1}>{subtitle}</Text>
          : subtitle}
      </View>
      {trailing != null && (
        <Text className="text-[11px] font-bold text-primary-600">{trailing}</Text>
      )}
    </Pressable>
  );
}

const CHARGES: { id: ChargeKind; label: string }[] = [
  { id: 'subscription', label: 'Subscription' },
  { id: 'equipment', label: 'Equipment' },
];

/**
 * What the money is for: the two tabs of the select step. Asked once, before
 * anything is picked, because each tab lists different things to pick.
 */
export function ChargePicker({ charge, onChange }: {
  charge: ChargeKind;
  onChange: (charge: ChargeKind) => void;
}) {
  return (
    <View className="flex-row rounded-xl border border-border bg-card p-1" accessibilityRole="tablist">
      {CHARGES.map(option => (
        <Pressable
          key={option.id}
          accessibilityRole="tab"
          accessibilityState={{ selected: charge === option.id }}
          onPress={() => onChange(option.id)}
          testID={`payment-tab-${option.id}`}
          className={`flex-1 items-center rounded-lg py-2.5 ${charge === option.id ? 'bg-primary-500' : ''}`}
        >
          <Text className={`text-sm font-bold ${charge === option.id ? 'text-white' : 'text-foreground'}`}>
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

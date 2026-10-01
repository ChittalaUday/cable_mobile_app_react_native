/* eslint-disable react-refresh/only-export-components -- STEP_LABELS and cycleLabel belong beside the pieces that use them. */
import type { CustomerSubscription } from '@/lib/api/types';
import type { ChargeKind, Step } from '@/lib/hooks/stores/use-recharge-store';
import * as React from 'react';
import { Pressable, Text, View } from '@/components/ui';
import { stepsFor } from '@/lib/hooks/stores/use-recharge-store';
import { rupeesExact } from '@/lib/utils/admin-format';

export const STEP_LABELS: Record<Step, string> = {
  plan: 'Plan',
  amount: 'Amount',
  done: 'Receipt',
};

/**
 * How far along the flow is. Walked forwards only, so past steps are just marks.
 *
 * It draws the steps this charge actually has, not all three: an equipment
 * charge never visits the plan step, and showing it greyed out would promise a
 * step the collector cannot reach.
 */
export function StepTrail({ step, charge }: { step: Step; charge: ChargeKind }) {
  const walk = stepsFor(charge);
  const at = walk.indexOf(step);

  return (
    <View className="flex-row items-center gap-2" accessibilityRole="progressbar">
      {walk.map((id, index) => (
        <View key={id} className="flex-1 gap-1.5">
          <View className={`h-1 rounded-full ${index <= at ? 'bg-primary-500' : 'bg-border'}`} />
          <Text className={`text-[10px] font-bold uppercase ${index <= at ? 'text-primary-600' : 'text-muted-foreground'}`}>
            {STEP_LABELS[id]}
          </Text>
        </View>
      ))}
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
    <View className="flex-row items-center justify-between">
      <Text className={`text-sm ${tone === 'strong' ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
        {label}
      </Text>
      <Text
        testID={testID}
        className={`${tone === 'strong' ? 'text-xl font-black' : 'text-sm font-bold'} ${tone === 'credit' ? 'text-green-600' : 'text-foreground'}`}
      >
        {value}
      </Text>
    </View>
  );
}

export function cycleLabel(subscription: CustomerSubscription): string {
  return `${rupeesExact(subscription.price)} / ${subscription.billingCycle}`;
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
                  {line.package.name}
                </Text>
                <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                  {`${line.service.name} • ${line.provider.name}`}
                </Text>
              </View>
              <Text className="text-sm font-bold text-foreground">{cycleLabel(line)}</Text>
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
  subtitle?: string;
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
        {subtitle != null && (
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>{subtitle}</Text>
        )}
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
 * What the money is for, asked before anything else.
 *
 * It sits above the steps rather than inside one, because the answer decides
 * which steps there are: dues are settled against a plan, hardware is not.
 */
export function ChargePicker({ charge, onChange }: {
  charge: ChargeKind;
  onChange: (charge: ChargeKind) => void;
}) {
  return (
    <Field label="What is this payment for">
      <View className="flex-row gap-2">
        {CHARGES.map(option => (
          <Pressable
            key={option.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: charge === option.id }}
            onPress={() => onChange(option.id)}
            className={`flex-1 items-center rounded-xl border p-3 ${charge === option.id ? 'border-primary-500 bg-primary-500' : 'border-border bg-card'}`}
          >
            <Text className={`text-sm font-bold ${charge === option.id ? 'text-white' : 'text-foreground'}`}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </Field>
  );
}

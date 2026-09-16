import * as React from 'react';

import { Text, View } from '@/components/ui';

/**
 * How far through a short flow you are.
 *
 * Deliberately not `add-customer/step-header.tsx`: that one owns the whole
 * header — its own back button, its own centre title, its own orange palette —
 * and bending it to a second flow would mean four new props on a component
 * seven screens already depend on. This is the part that was actually missing.
 */
export function StepBar({ current, total, label }: {
  current: number;
  total: number;
  /** What this step is for, beside the count. */
  label: string;
}) {
  return (
    <View className="gap-1.5">
      <View className="flex-row items-center gap-1.5">
        {Array.from({ length: total }, (_, index) => index + 1).map(step => (
          <View
            key={step}
            className={`h-1.5 flex-1 rounded-full ${step <= current ? 'bg-primary-600' : 'bg-muted'}`}
          />
        ))}
      </View>
      <Text className="text-xs text-muted-foreground">
        {`Step ${current} of ${total} · ${label}`}
      </Text>
    </View>
  );
}

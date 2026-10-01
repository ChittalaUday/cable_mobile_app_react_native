import type { CustomerDetail, CustomerSubscription } from '@/lib/api/types';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Card } from '@/components/common/shell';
import { Text, View } from '@/components/ui';
import { paise, useRechargeStore } from '@/lib/hooks/stores/use-recharge-store';
import { rupeesExact } from '@/lib/utils/admin-format';
import { ChoiceRow, cycleLabel, Field, PlanTable } from './parts';

/**
 * Step one: settle which connection this visit is about, and what it owes.
 *
 * Nothing more. Changing the plan is a page of its own — a collector at a door
 * is here to take money, and the dozen packs a provider sells are a search, not
 * a list to scroll past on the way to the amount.
 */
export function StepPlan({ customer, line, basePath }: {
  customer: CustomerDetail;
  line: CustomerSubscription | null;
  basePath: '/admin' | '/staff';
}) {
  const router = useRouter();
  const setSubscription = useRechargeStore(state => state.setSubscription);

  const duePaise = paise(line?.outstandingBalance ?? customer.outstandingBalance ?? 0);

  return (
    <>
      <Card className="gap-1 border border-border p-4">
        <Text className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Previous balance
        </Text>
        <Text testID="recharge-previous-balance" className="text-3xl font-black text-foreground">
          {rupeesExact(duePaise / 100)}
        </Text>
        {customer.locationPath != null && (
          <Text className="text-xs text-muted-foreground">{customer.locationPath}</Text>
        )}
      </Card>

      {customer.subscriptions.length === 0
        ? (
            <Card className="border border-border p-4">
              <Text className="text-sm text-muted-foreground">
                This customer has no connection yet. A payment here goes against the account balance.
              </Text>
            </Card>
          )
        : (
            <Field label="Which connection">
              <View className="gap-2">
                <PlanTable
                  lines={customer.subscriptions}
                  selectedId={line?.id ?? null}
                  onSelect={setSubscription}
                />
                {line !== null && (
                  <ChoiceRow
                    title="Switch plan or add a pack"
                    subtitle={`On ${line.package.name} • ${cycleLabel(line)}`}
                    trailing="Change"
                    onPress={() => router.push(`${basePath}/recharge/switch-plan`)}
                    testID="recharge-change-plan"
                  />
                )}
              </View>
            </Field>
          )}
    </>
  );
}

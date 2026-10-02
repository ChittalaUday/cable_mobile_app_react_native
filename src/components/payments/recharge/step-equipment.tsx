import type { CustomerDetail } from '@/lib/api/types';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Text, View } from '@/components/ui';
import { useCustomerEquipment } from '@/lib/hooks/api/use-inventory';
import { useRechargeStore } from '@/lib/hooks/stores/use-recharge-store';
import { rupeesExact } from '@/lib/utils/admin-format';
import { ChoiceRow, Field } from './parts';

/**
 * The equipment tab of the select step: the units the customer already has,
 * any of which can be replaced, and the units picked to add (chosen on their
 * own searchable page). Whatever is picked here is what the payment step charges for.
 */
export function StepEquipment({ customer, basePath }: { customer: CustomerDetail; basePath: '/admin' | '/staff' }) {
  const router = useRouter();
  const target = useRechargeStore(state => state.target);
  const setTarget = useRechargeStore(state => state.setTarget);

  const { data: held } = useCustomerEquipment({ variables: { customerId: customer.id } });

  const units = held ?? [];
  const picked = target?.kind === 'issue' ? target.units : [];

  // Units are picked on the add-equipment page; a replace here clears them, and the other way round.
  const remove = (equipmentId: string) => {
    const next = picked.filter(unit => unit.equipmentId !== equipmentId);
    setTarget(next.length === 0 ? null : { kind: 'issue', units: next });
  };

  return (
    <>
      <Field label="Existing equipment">
        {units.length === 0
          ? <Text className="text-xs text-muted-foreground">Nothing issued to this customer yet.</Text>
          : (
              <View className="gap-2">
                {units.map(unit => (
                  <ChoiceRow
                    key={unit.id}
                    title={unit.itemName}
                    subtitle={unit.serialNumber ?? unit.itemCode ?? unit.status}
                    trailing="Replace"
                    selected={target?.kind === 'replace' && target.customerEquipmentId === unit.id}
                    onPress={() => setTarget({ kind: 'replace', customerEquipmentId: unit.id })}
                    testID={`payment-replace-${unit.id}`}
                  />
                ))}
              </View>
            )}
      </Field>

      <Field label={picked.length > 0 ? `Add equipment · ${picked.length} selected` : 'Add equipment'}>
        <View className="gap-2">
          {picked.map(unit => (
            <ChoiceRow
              key={unit.equipmentId}
              title={unit.name}
              subtitle={`${unit.serialNumber ?? 'No serial'} • ${rupeesExact(unit.price)}`}
              trailing="Remove"
              selected
              onPress={() => remove(unit.equipmentId)}
              testID={`payment-picked-${unit.equipmentId}`}
            />
          ))}
          <ChoiceRow
            title={picked.length === 0 ? 'Add equipment' : 'Add or change items'}
            subtitle="Search stock by name, type or serial number"
            trailing="Open"
            onPress={() => router.push(`${basePath}/recharge/add-equipment`)}
            testID="payment-open-add-equipment"
          />
        </View>
      </Field>
    </>
  );
}

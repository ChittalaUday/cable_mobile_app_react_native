import type { AvailableUnit } from '@/lib/api/types';
import type { PickedUnit } from '@/lib/hooks/stores/use-recharge-store';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { LoadError, Loading, ScreenHeader } from '@/components/common/shell';
import { Button, Input, Pressable, Text, View } from '@/components/ui';
import { useAvailableUnits } from '@/lib/hooks/api/use-inventory';
import { useDebounced } from '@/lib/hooks/common/use-debounced';
import { paise, useRechargeStore } from '@/lib/hooks/stores/use-recharge-store';
import { rupeesExact } from '@/lib/utils/admin-format';
import { ChoiceRow } from './parts';

const ALL = 'All';

function toPicked(unit: AvailableUnit): PickedUnit {
  return {
    equipmentId: unit.id,
    catalogId: unit.catalogId,
    name: unit.itemName,
    serialNumber: unit.serialNumber,
    price: unit.defaultSalePrice,
  };
}

/**
 * Every unit on the shelf that can be issued, searchable by item, type, serial,
 * VC or MAC, and narrowed by type. Tap to pick one or several; Done hands the
 * picks back to the payment flow underneath.
 */
export function AddEquipmentScreen() {
  const router = useRouter();
  const target = useRechargeStore(state => state.target);
  const setTarget = useRechargeStore(state => state.setTarget);

  const [query, setQuery] = React.useState('');
  const [type, setType] = React.useState(ALL);
  const [picked, setPicked] = React.useState<PickedUnit[]>(() => target?.kind === 'issue' ? target.units : []);

  const q = useDebounced(query.trim());
  const { data, isPending, error, refetch } = useAvailableUnits({ variables: { q } });

  const units = data ?? [];
  const types = [ALL, ...new Set(units.map(unit => unit.typeName ?? 'Other'))];
  const shown = type === ALL ? units : units.filter(unit => (unit.typeName ?? 'Other') === type);
  const pickedIds = new Set(picked.map(unit => unit.equipmentId));
  const totalPaise = picked.reduce((sum, unit) => sum + paise(unit.price), 0);

  const toggle = (unit: AvailableUnit) => setPicked(current => pickedIds.has(unit.id)
    ? current.filter(item => item.equipmentId !== unit.id)
    : [...current, toPicked(unit)]);

  const done = () => {
    setTarget(picked.length === 0 ? null : { kind: 'issue', units: picked });
    router.back();
  };

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader title="Add equipment" subtitle="Pick one or more units from stock" showBack withSafeArea />

      <View className="gap-2.5 px-4 pt-3 pb-2">
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, type or serial number"
          autoCapitalize="characters"
          autoCorrect={false}
          testID="add-equipment-search"
        />
        <View className="flex-row flex-wrap gap-2">
          {types.map(option => (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ selected: type === option }}
              onPress={() => setType(option)}
              className={`rounded-full border px-3 py-1.5 ${type === option ? 'border-primary-500 bg-primary-500' : 'border-border bg-card'}`}
            >
              <Text className={`text-xs font-bold ${type === option ? 'text-white' : 'text-foreground'}`}>{option}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isPending
        ? <Loading />
        : error
          ? <LoadError message={error.message} onRetry={refetch} />
          : (
              <FlashList
                data={shown}
                keyExtractor={unit => unit.id}
                renderItem={({ item }) => (
                  <View className="px-4 pb-2">
                    <ChoiceRow
                      title={item.itemName}
                      subtitle={[item.typeName, item.serialNumber ?? item.vcNumber ?? item.macAddress ?? 'No serial', item.locationName].filter(Boolean).join(' • ')}
                      trailing={rupeesExact(item.defaultSalePrice)}
                      selected={pickedIds.has(item.id)}
                      onPress={() => toggle(item)}
                      testID={`add-equipment-unit-${item.id}`}
                    />
                  </View>
                )}
                ListEmptyComponent={(
                  <Text className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {q === '' ? 'Nothing in stock to issue.' : `No unit matches "${q}".`}
                  </Text>
                )}
                contentContainerStyle={{ paddingBottom: 16 }}
                keyboardShouldPersistTaps="handled"
              />
            )}

      <View className="border-t border-border bg-surface px-4 pt-3 pb-8">
        <Button
          label={picked.length === 0 ? 'Done' : `Add ${picked.length} item${picked.length > 1 ? 's' : ''} • ${rupeesExact(totalPaise / 100)}`}
          onPress={done}
          className="bg-primary-600"
          testID="add-equipment-done"
        />
      </View>
    </View>
  );
}

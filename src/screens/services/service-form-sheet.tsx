import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { Service } from '@/lib/api/types';
import { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useQueryClient } from '@tanstack/react-query';
import * as React from 'react';

import { Alert } from 'react-native';
import { colors, Modal, Pressable, Text, View } from '@/components/ui';
import { useCreateService } from '@/lib/hooks/api/use-services';
import { SERVICE_ICONS } from '@/lib/service-icons';

/**
 * Creates a service — what a subscriber buys, not who supplies it.
 *
 * The distinction is the one the whole catalogue rests on: "Cable TV" is a
 * service and "Tata Play" is a provider of it, so a second supplier is a
 * provider row rather than a second service. The copy here says so, because
 * naming a service after a brand is the easy mistake to make.
 */
// eslint-disable-next-line max-lines-per-function
export function ServiceFormSheet({
  ref,
  onCreated,
}: {
  ref: React.RefObject<BottomSheetModal | null>;
  onCreated?: (service: Service) => void;
}) {
  const queryClient = useQueryClient();
  const createService = useCreateService();

  const [name, setName] = React.useState('');
  const [icon, setIcon] = React.useState<string>('tv');
  const [description, setDescription] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const reset = () => {
    setName('');
    setIcon('tv');
    setDescription('');
    setError(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Give the service a name');
      return;
    }

    try {
      // No slug: the API derives one from the name.
      const created = await createService.mutateAsync({
        payload: {
          name: name.trim(),
          icon,
          description: description.trim() || undefined,
        },
      });

      await queryClient.invalidateQueries({ queryKey: ['services'] });
      reset();
      onCreated?.(created);
    }
    catch (err) {
      Alert.alert('Could not add service', (err as Error).message || 'Please try again.');
    }
  };

  return (
    <Modal ref={ref} snapPoints={['72%', '100%']} title="Add service">
      <BottomSheetScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="pb-3 text-xs/4 text-muted-foreground">
          A service is what a subscriber buys — Cable TV, Internet. Who delivers it is a provider,
          so name it for the thing, not the brand.
        </Text>

        <Text className="pb-1.5 text-sm font-bold text-foreground">
          Name
          <Text className="text-primary-600"> *</Text>
        </Text>
        <BottomSheetTextInput
          value={name}
          onChangeText={(value) => {
            setName(value);
            setError(null);
          }}
          placeholder="e.g. Cable TV"
          placeholderTextColor={colors.neutral[400]}
          style={{ color: colors.charcoal[900] }}
          className="rounded-2xl border border-border bg-card px-4 py-3 text-sm"
        />
        {error ? <Text className="pt-1 text-xs text-danger-500">{error}</Text> : null}

        <Text className="pt-4 pb-1.5 text-sm font-bold text-foreground">Icon</Text>
        <Text className="pb-2 text-[11px] text-muted-foreground">
          How it is recognised in lists — there are no fixed service types, so this is what
          tells your services apart.
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {SERVICE_ICONS.map(entry => (
            <Pressable
              key={entry.key}
              accessibilityRole="button"
              accessibilityState={{ selected: icon === entry.key }}
              accessibilityLabel={entry.label}
              onPress={() => setIcon(entry.key)}
              className={`h-16 w-[22%] items-center justify-center gap-1 rounded-2xl border ${
                icon === entry.key
                  ? 'dark:bg-primary-950/60 border-primary-500 bg-primary-50'
                  : 'border-border bg-card'
              }`}
            >
              <HugeiconsIcon
                icon={entry.icon}
                size={20}
                color={icon === entry.key ? colors.primary[600] : colors.neutral[500]}
                strokeWidth={2}
              />
              <Text
                className={`text-[10px] font-semibold ${
                  icon === entry.key ? 'text-primary-600' : 'text-muted-foreground'
                }`}
                numberOfLines={1}
              >
                {entry.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text className="pt-4 pb-1.5 text-sm font-bold text-foreground">Description</Text>
        <BottomSheetTextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Optional"
          placeholderTextColor={colors.neutral[400]}
          style={{ color: colors.charcoal[900] }}
          className="rounded-2xl border border-border bg-card px-4 py-3 text-sm"
        />

        <Pressable
          accessibilityRole="button"
          disabled={createService.isPending}
          onPress={handleSave}
          className={`mt-5 items-center justify-center rounded-2xl bg-primary-600 px-4 py-3.5 active:bg-primary-700 ${
            createService.isPending ? 'opacity-60' : ''
          }`}
        >
          <Text className="text-base font-bold text-white">
            {createService.isPending ? 'Adding Service…' : 'Add Service'}
          </Text>
        </Pressable>
      </BottomSheetScrollView>
    </Modal>
  );
}

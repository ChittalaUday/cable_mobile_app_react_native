import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { Service } from '@/lib/api/types';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { Keyboard } from 'react-native';

import { dialogs } from '@/components/common/dialogs';
import { colors, Modal, Pressable, Text, View } from '@/components/ui';
import BottomSheetKeyboardAwareScrollView from '@/components/ui/modal-keyboard-aware-scroll-view';
import { useCreateService, useUpdateService } from '@/lib/hooks/api/use-services';
import { SERVICE_ICONS } from '@/lib/service-icons';

/** Stable identity: `Modal` memoises on this, so a literal re-lays out the sheet. */
const SNAP_POINTS = ['72%', '100%'];

/**
 * Adds a service, or edits one — what a subscriber buys, not who supplies it.
 *
 * The distinction is the one the whole catalogue rests on: "Cable TV" is a
 * service and "Tata Play" is a provider of it, so a second supplier is a
 * provider row rather than a second service. The copy here says so, because
 * naming a service after a brand is the easy mistake to make.
 *
 * Editing shares this sheet rather than getting its own: the fields are the
 * same three, and without it the only way to fix a typo is to delete a service
 * that providers and packages already point at.
 */

export function ServiceFormSheet({
  ref,
  service,
  onSaved,
}: {
  ref: React.RefObject<BottomSheetModal | null>;
  /** The service being edited. Absent or null is the add case. */
  service?: Service | null;
  onSaved?: (service: Service) => void;
}) {
  const queryClient = useQueryClient();
  const createService = useCreateService();
  const updateService = useUpdateService();

  const editing = service ?? null;

  // Seeded from the service so a sheet mounted already holding one is filled,
  // not just one that is handed a different service later.
  const [name, setName] = React.useState(editing?.name ?? '');
  const [icon, setIcon] = React.useState<string>(editing?.icon ?? 'tv');
  const [description, setDescription] = React.useState(editing?.description ?? '');
  const [error, setError] = React.useState<string | null>(null);

  const reset = () => {
    setName('');
    setIcon('tv');
    setDescription('');
    setError(null);
  };

  // The sheet is mounted for the life of the screen and only presented, so
  // nothing remounts it with fresh defaults. Filling the fields during render
  // rather than in an effect is React's own answer to "reset state when a prop
  // changes": an effect would paint the previous service's name for a frame.
  const [filledFrom, setFilledFrom] = React.useState<Service | null>(editing);

  if (editing !== filledFrom) {
    setFilledFrom(editing);
    setName(editing?.name ?? '');
    setIcon(editing?.icon ?? 'tv');
    setDescription(editing?.description ?? '');
    setError(null);
  }

  const isSaving = createService.isPending || updateService.isPending;

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Give the service a name');
      return;
    }

    try {
      const saved = editing === null
        // No slug: the API derives one from the name.
        ? await createService.mutateAsync({
            payload: {
              name: name.trim(),
              icon,
              description: description.trim() || undefined,
            },
          })
        : await updateService.mutateAsync({
            id: editing.id,
            patch: {
              name: name.trim(),
              icon,
              // Null, not undefined: an emptied box means "clear the
              // description", and undefined would leave the old one standing.
              description: description.trim() || null,
            },
          });

      await queryClient.invalidateQueries({ queryKey: ['services'] });
      reset();
      // The sheet closes without unmounting, so nothing else takes the focus
      // away — the keyboard would stay up over whatever it closed onto.
      Keyboard.dismiss();
      onSaved?.(saved);
    }
    catch (err) {
      void dialogs.notify(
        editing === null ? 'Could not add service' : 'Could not save service',
        (err as Error).message || 'Please try again.',
      );
    }
  };

  return (
    <Modal ref={ref} snapPoints={SNAP_POINTS} title={editing === null ? 'Add service' : 'Edit service'}>
      <BottomSheetKeyboardAwareScrollView
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
          testID="service-name"
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
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/60'
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
          testID="service-description"
          placeholderTextColor={colors.neutral[400]}
          style={{ color: colors.charcoal[900] }}
          className="rounded-2xl border border-border bg-card px-4 py-3 text-sm"
        />

        <Pressable
          accessibilityRole="button"
          disabled={isSaving}
          onPress={handleSave}
          testID="service-save"
          className={`mt-5 items-center justify-center rounded-2xl bg-primary-600 px-4 py-3.5 active:bg-primary-700 ${
            isSaving ? 'opacity-60' : ''
          }`}
        >
          <Text className="text-base font-bold text-white">
            {saveLabel(editing !== null, isSaving)}
          </Text>
        </Pressable>
      </BottomSheetKeyboardAwareScrollView>
    </Modal>
  );
}

function saveLabel(isEdit: boolean, isSaving: boolean): string {
  if (isEdit)
    return isSaving ? 'Saving…' : 'Save Changes';

  return isSaving ? 'Adding Service…' : 'Add Service';
}

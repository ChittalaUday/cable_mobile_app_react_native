import type { LocationRef, Status } from '@/lib/api/types';
import { Delete02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { Alert, TextInput } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { AreaGrants } from '@/components/admin/area-grants';
import { SaveBar } from '@/components/common/save-bar';
import { Card, Loading, ScreenHeader } from '@/components/common/shell';
import {
  colors,
  FocusAwareStatusBar,
  Pressable,
  Text,
  View,
} from '@/components/ui';
import { ENTITY_STATUSES } from '@/lib/constants/crm';
import {
  sameAreas,
  useCreateTeam,
  useDeleteTeam,
  useSetTeamLocations,
  useTeam,
  useUpdateTeam,
} from '@/lib/hooks/api/use-staff';
import { apiErrorMessage } from '@/lib/utils/api-error';

/**
 * A crew, and the areas the whole crew reaches.
 *
 * The areas are the reason the screen exists: granting the collection round
 * three apartments here is one write, where doing it per member is one per
 * person and one more every time somebody joins.
 */
type Draft = Partial<{ name: string; description: string; status: Status; areas: LocationRef[] }>;

export function AddEditTeamScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ id?: string }>();

  const id = params.id;
  const isEdit = Boolean(id);

  const { data: team, isPending: loadingTeam } = useTeam({
    variables: { id: id ?? '' },
    enabled: isEdit,
  });

  /**
   * Only what the admin has actually touched, laid over the saved record — so
   * a fetch that lands after the first render just shows up, with no effect to
   * copy it into state and no ref to stop that effect running twice.
   */
  const [draft, setDraft] = React.useState<Draft>({});
  const [error, setError] = React.useState<string | null>(null);

  const name = draft.name ?? team?.name ?? '';
  const description = draft.description ?? team?.description ?? '';
  const status = draft.status ?? team?.status ?? 'active';
  const areas = draft.areas ?? team?.locations ?? [];

  const edit = (patch: Draft) => setDraft(current => ({ ...current, ...patch }));

  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const setLocations = useSetTeamLocations();
  const deleteTeam = useDeleteTeam();

  const saving = createTeam.isPending || updateTeam.isPending || setLocations.isPending;

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['teams'] });
    // A team's areas change what its members reach, so their rows are stale too.
    await queryClient.invalidateQueries({ queryKey: ['staff'] });
  };

  const save = async () => {
    if (!name.trim()) {
      setError('A name is required');
      return;
    }

    setError(null);

    try {
      if (isEdit && id) {
        await updateTeam.mutateAsync({
          id,
          patch: { name: name.trim(), description: description.trim() || null, status },
        });
        // A PUT rewrites the whole set, so only when it actually changed.
        if (!sameAreas(areas, team?.locations ?? []))
          await setLocations.mutateAsync({ id, locationIds: areas.map(area => area.id) });
      }
      else {
        await createTeam.mutateAsync({
          payload: {
            name: name.trim(),
            description: description.trim() || undefined,
            status,
            locationIds: areas.map(area => area.id),
          },
        });
      }

      await refresh();
      router.back();
    }
    catch (saveError) {
      Alert.alert('Could not save', apiErrorMessage(saveError, 'Try again.'));
    }
  };

  const confirmDelete = () => Alert.alert(
    'Disband this team',
    team && team.memberCount > 0
      ? `${team.memberCount} ${team.memberCount === 1 ? 'person is' : 'people are'} still on it. Move them off first — disbanding would take away every area they reach through it.`
      : 'The team and its area grants are removed.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disband',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTeam.mutateAsync({ id: id! });
            await refresh();
            router.back();
          }
          catch (deleteError) {
            Alert.alert('Could not disband', apiErrorMessage(deleteError, 'Try again.'));
          }
        },
      },
    ],
  );

  if (isEdit && loadingTeam)
    return <Loading />;

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <ScreenHeader
        title={isEdit ? 'Edit team' : 'Add team'}
        subtitle={team ? `${team.memberCount} ${team.memberCount === 1 ? 'member' : 'members'}` : undefined}
        showBack
        withSafeArea
        rightAction={
          isEdit
            ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Disband team"
                  onPress={confirmDelete}
                  className="size-9 shrink-0 items-center justify-center rounded-lg border border-danger-200 bg-card"
                >
                  <HugeiconsIcon icon={Delete02Icon} size={18} color={colors.danger[500]} strokeWidth={2} />
                </Pressable>
              )
            : null
        }
      />

      <KeyboardAwareScrollView
        contentContainerStyle={{ gap: 10, paddingHorizontal: 12, paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
      >
        <Card className="gap-2.5 border border-border p-3">
          <View className="gap-1">
            <Text className="text-[13px] font-bold text-foreground">
              Name
              <Text className="text-primary-600"> *</Text>
            </Text>
            <TextInput
              value={name}
              onChangeText={value => edit({ name: value })}
              placeholder="Collection round"
              placeholderTextColor={colors.neutral[400]}
              className={`rounded-xl border bg-card px-3 py-2 text-sm text-foreground ${error ? 'border-danger-400' : 'border-border'}`}
            />
            {error ? <Text className="text-xs font-medium text-danger-500">{error}</Text> : null}
          </View>

          <View className="gap-1">
            <Text className="text-[13px] font-bold text-foreground">Description</Text>
            <TextInput
              value={description}
              onChangeText={value => edit({ description: value })}
              placeholder="What this crew does"
              placeholderTextColor={colors.neutral[400]}
              multiline
              className="min-h-16 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"
            />
          </View>

          <View className="gap-1">
            <Text className="text-[13px] font-bold text-foreground">Status</Text>
            <View className="flex-row gap-1.5">
              {ENTITY_STATUSES.map(option => (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: status === option }}
                  onPress={() => edit({ status: option })}
                  className={`min-w-0 flex-1 items-center rounded-xl px-2.5 py-1.5 ${
                    status === option ? 'bg-primary-600' : 'border border-border bg-card'
                  }`}
                >
                  <Text className={`text-[13px] font-bold ${status === option ? 'text-white' : 'text-foreground'}`}>
                    {option === 'active' ? 'Active' : 'Inactive'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Card>

        <View className="px-1">
          <AreaGrants value={areas} onChange={value => edit({ areas: value })} />
          <Text className="px-1 pt-1.5 text-[10px] text-muted-foreground">
            Everyone on this team reaches these areas, including anyone added later.
          </Text>
        </View>
      </KeyboardAwareScrollView>

      <SaveBar
        label={isEdit ? 'Save changes' : 'Add team'}
        busyLabel="Saving..."
        busy={saving}
        onPress={save}
      />
    </View>
  );
}

export default AddEditTeamScreen;

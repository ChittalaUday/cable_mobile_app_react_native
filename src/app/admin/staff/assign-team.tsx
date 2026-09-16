import type { Team } from '@/lib/api/types';
import { Add01Icon, CheckmarkCircle02Icon, UserGroupIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { Alert, TextInput } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { StepBar } from '@/components/admin/step-bar';
import { SaveBar } from '@/components/common/save-bar';
import { Card, IconTile, ScreenHeader } from '@/components/common/shell';
import {
  ActivityIndicator,
  colors,
  FocusAwareStatusBar,
  Pressable,
  Text,
  View,
} from '@/components/ui';
import { useCreateTeam, useStaffMember, useTeams, useUpdateStaff } from '@/lib/hooks/api/use-staff';
import { apiErrorMessage } from '@/lib/utils/api-error';

/**
 * Step 2 of hiring: put the new person on a crew, or don't.
 *
 * It is a separate screen because it is a separate decision, and because a
 * tenant's first hire happens before their first team exists — a picker on the
 * details form would show an empty row and no way out of it. Here the list and
 * the "new team" field sit together, so the answer to "there are no teams" is
 * one tap away instead of a trip to another screen and back.
 *
 * Everything here is optional. The staff member already exists by the time this
 * renders; skipping leaves them on no crew, reaching only their own areas.
 */

export function AssignTeamScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: member } = useStaffMember({ variables: { id: id ?? '' }, enabled: Boolean(id) });
  const { data: teamPage, isPending: loadingTeams } = useTeams();
  const teams = teamPage?.items ?? [];

  const [selected, setSelected] = React.useState<string | null>(null);
  const [newTeam, setNewTeam] = React.useState('');
  const [creating, setCreating] = React.useState(false);

  const createTeam = useCreateTeam();
  const updateStaff = useUpdateStaff();

  const name = member?.name ?? 'This person';

  const done = async () => {
    await queryClient.invalidateQueries({ queryKey: ['staff'] });

    // This screen REPLACED the details form, so back is already the list —
    // replacing again would stack a second copy of it under the first.
    if (router.canGoBack())
      router.back();
    else
      router.replace('/admin/staff');
  };

  const addTeam = async () => {
    if (!newTeam.trim())
      return;

    try {
      const team = await createTeam.mutateAsync({ payload: { name: newTeam.trim() } });
      await queryClient.invalidateQueries({ queryKey: ['teams'] });
      setNewTeam('');
      setCreating(false);
      // Creating one here means wanting it, so it is chosen straight away.
      setSelected(team.id);
    }
    catch (error) {
      Alert.alert('Could not create the team', apiErrorMessage(error, 'Try again.'));
    }
  };

  const assign = async () => {
    if (!id || selected === null) {
      await done();
      return;
    }

    try {
      await updateStaff.mutateAsync({ id, patch: { teamId: selected } });
      await done();
    }
    catch (error) {
      Alert.alert('Could not assign', apiErrorMessage(error, 'Try again.'));
    }
  };

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <ScreenHeader
        title="Assign a team"
        withSafeArea
      >
        <StepBar current={2} total={2} label="optional" />
      </ScreenHeader>

      <KeyboardAwareScrollView
        contentContainerStyle={{ gap: 10, paddingHorizontal: 12, paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
      >
        <Card className="gap-1 border border-border p-3">
          <Text className="text-sm font-bold text-foreground">{`${name} was added.`}</Text>
          <Text className="text-xs text-muted-foreground">
            Put them on a crew and they reach every area that crew holds, on top of their own. You can do this later from their profile.
          </Text>
        </Card>

        <Card className="gap-1 border border-border p-2">
          <TeamRow
            label="No team"
            hint="Reaches only the areas granted to them directly"
            selected={selected === null}
            onPress={() => setSelected(null)}
          />
          {/* Without this the list is briefly empty, which reads as "there are
              no teams" — the exact wrong answer on the screen built to fix it. */}
          {loadingTeams
            ? (
                <View className="flex-row items-center gap-2 p-3">
                  <ActivityIndicator size="small" color={colors.primary[600]} />
                  <Text className="text-xs text-muted-foreground">Loading teams...</Text>
                </View>
              )
            : teams.map(team => (
                <TeamRow
                  key={team.id}
                  label={team.name}
                  hint={teamHint(team)}
                  selected={selected === team.id}
                  onPress={() => setSelected(team.id)}
                />
              ))}
        </Card>

        {creating
          ? (
              <Card className="gap-2 border border-border p-3">
                <Text className="text-sm font-bold text-foreground">New team</Text>
                <TextInput
                  value={newTeam}
                  onChangeText={setNewTeam}
                  placeholder="Collection round"
                  placeholderTextColor={colors.neutral[400]}
                  autoFocus
                  className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"
                />
                <Text className="text-[11px] text-muted-foreground">
                  It starts with no areas — grant them from the Teams tab once the crew is set up.
                </Text>
                <View className="flex-row gap-2 pt-1">
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setCreating(false);
                      setNewTeam('');
                    }}
                    className="min-w-0 flex-1 items-center rounded-xl border border-border bg-card py-2.5"
                  >
                    <Text className="text-sm font-bold text-foreground">Cancel</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !newTeam.trim() || createTeam.isPending }}
                    disabled={!newTeam.trim() || createTeam.isPending}
                    onPress={addTeam}
                    className={`min-w-0 flex-1 items-center rounded-xl bg-primary-600 py-2.5 ${
                      !newTeam.trim() || createTeam.isPending ? 'opacity-60' : ''
                    }`}
                  >
                    <Text className="text-sm font-bold text-white">
                      {createTeam.isPending ? 'Creating...' : 'Create team'}
                    </Text>
                  </Pressable>
                </View>
              </Card>
            )
          : (
              <Pressable
                accessibilityRole="button"
                onPress={() => setCreating(true)}
                className="flex-row items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-card py-3"
              >
                <HugeiconsIcon icon={Add01Icon} size={16} color={colors.primary[600]} strokeWidth={2.4} />
                <Text className="text-sm font-bold text-primary-600">Create a team</Text>
              </Pressable>
            )}
      </KeyboardAwareScrollView>

      <SaveBar
        label={selected === null ? 'Finish' : 'Assign & finish'}
        busyLabel="Saving..."
        busy={updateStaff.isPending}
        onPress={assign}
        secondary={{ label: 'Skip', onPress: () => void done() }}
      />
    </View>
  );
}

function teamHint(team: Team) {
  const members = `${team.memberCount} ${team.memberCount === 1 ? 'member' : 'members'}`;

  return team.locations.length === 0
    ? `${members} · no areas yet`
    : `${members} · ${team.locations.map(area => area.name).join(', ')}`;
}

function TeamRow({ label, hint, selected, onPress }: {
  label: string;
  hint: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`flex-row items-center gap-3 rounded-xl p-3 ${selected ? 'bg-primary-50 dark:bg-primary-950/60' : ''}`}
    >
      <IconTile icon={UserGroupIcon} tint={selected ? 'purple' : 'blue'} size={36} iconSize={18} />
      <View className="flex-1">
        <Text className={`text-sm font-bold ${selected ? 'text-primary-600' : 'text-foreground'}`} numberOfLines={1}>
          {label}
        </Text>
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>{hint}</Text>
      </View>
      {selected
        ? <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} color={colors.primary[600]} strokeWidth={2.2} />
        : null}
    </Pressable>
  );
}

export default AssignTeamScreen;

import type { LocationRef, TeamMember } from '@/lib/api/types';
import { Location01Icon, StarIcon, UserRemove01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { Switch } from 'react-native';
import { dialogs } from '@/components/common/dialogs';

import { Card } from '@/components/common/shell';
import { LocationPickerSheet } from '@/components/locations/location-picker-sheet';
import { toggleArea } from '@/components/locations/toggle-area';
import {
  colors,
  Modal,
  Pressable,
  ScrollView,
  Text,
  useModal,
  View,
} from '@/components/ui';
import { useSetStaffTeamAreas, useUpdateStaff } from '@/lib/hooks/api/use-staff';
import { apiErrorMessage } from '@/lib/utils/api-error';

/**
 * Hoisted so its identity is stable: `Modal` memoises `snapPoints` on the array
 * it is handed, and a fresh literal per render makes the sheet re-layout every
 * time a checkbox moves.
 */
const SNAP_POINTS = ['70%'];

/**
 * One crew member, as the team screen edits them.
 *
 * Three things live together here because they are the three things that only
 * make sense while somebody is on a crew: what part of its patch they cover,
 * whether they run it, and taking them off it. Everything else about the person
 * belongs on their own screen, and there is a link to it rather than a second
 * copy of the form.
 */

export function TeamMemberSheet({ member, teamAreas, onClose, onSaved }: {
  member: TeamMember | null;
  /** The crew's patch — the boundary on what can be chosen. */
  teamAreas: LocationRef[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const sheet = useModal();
  const picker = useModal();

  const [areas, setAreas] = React.useState<LocationRef[]>([]);
  const [leader, setLeader] = React.useState(false);

  /**
   * Open, seed and close — once per member, however often this re-renders.
   *
   * `useModal()` hands back a fresh object literal every render, so an effect
   * that depends on it runs on every render too. Without the guard, ticking an
   * area in the picker re-rendered this component and called `present()` again
   * underneath the open picker: a second backdrop faded in over everything and
   * swallowed all touches, which is the "frozen with an overlay until you press
   * back" this is fixing.
   */
  const memberId = member?.id ?? null;

  // The editable copy follows whoever is being edited. Adjusted during render
  // (React's pattern for state derived from a prop) so the sheet never shows
  // the previous member's areas for a frame.
  const [loadedFor, setLoadedFor] = React.useState<string | null>(null);
  if (member && loadedFor !== memberId) {
    setLoadedFor(memberId);
    setAreas(member.teamAreas);
    setLeader(member.isTeamLeader);
  }

  // Presenting the sheet is imperative, so it stays in an effect.
  const shownFor = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (shownFor.current === memberId)
      return;

    shownFor.current = memberId;
    if (memberId === null)
      sheet.dismiss();
    else
      sheet.present();
  }, [memberId, sheet]);

  const updateStaff = useUpdateStaff();
  const setTeamAreas = useSetStaffTeamAreas();
  const saving = updateStaff.isPending || setTeamAreas.isPending;

  const toggle = (node: LocationRef) => setAreas(current => toggleArea(current, node));

  const save = async () => {
    if (!member)
      return;

    try {
      if (leader !== member.isTeamLeader)
        await updateStaff.mutateAsync({ id: member.id, patch: { isTeamLeader: leader } });

      if (!sameIds(areas, member.teamAreas))
        await setTeamAreas.mutateAsync({ id: member.id, locationIds: areas.map(area => area.id) });

      onSaved();
      onClose();
    }
    catch (error) {
      void dialogs.notify('Could not save', apiErrorMessage(error, 'Try again.'));
    }
  };

  const removeFromTeam = async () => {
    if (!member)
      return;

    const agreed = await dialogs.confirm({
      title: 'Remove from this team',
      message: `${member.name ?? 'They'} stay on as staff, but lose every area they reached through this crew.`,
      confirmLabel: 'Remove',
    });

    if (!agreed)
      return;

    try {
      await updateStaff.mutateAsync({ id: member.id, patch: { teamId: null } });
      onSaved();
      onClose();
    }
    catch (error) {
      void dialogs.notify('Could not remove', apiErrorMessage(error, 'Try again.'));
    }
  };

  return (
    <>
      <LocationPickerSheet
        ref={picker.ref}
        mode="multi"
        title="Areas covered"
        roots={teamAreas}
        selected={areas}
        onToggle={toggle}
        emptyHint="Nothing selected — they cover all of the team’s areas"
      />

      <Modal ref={sheet.ref} snapPoints={SNAP_POINTS} title={member?.name ?? 'Crew member'} onDismiss={onClose}>
        <ScrollView contentContainerClassName="gap-2.5 px-4 pb-6">
          <Card className="gap-2.5 border border-border p-3">
            <View className="flex-row items-center gap-3">
              <View className="size-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/60">
                <HugeiconsIcon icon={StarIcon} size={18} color="#B54708" strokeWidth={2} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-bold text-foreground">Team leader</Text>
                <Text className="text-[11px] text-muted-foreground">
                  Optional. A leader can manage this crew — its members and their areas — and nothing outside it.
                </Text>
              </View>
              <Switch value={leader} onValueChange={setLeader} />
            </View>
          </Card>

          <Card className="gap-2.5 border border-border p-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold text-foreground">Areas covered</Text>
              <Pressable
                accessibilityRole="button"
                onPress={picker.present}
                className="rounded-lg border border-border bg-card px-2.5 py-1.5"
              >
                <Text className="text-xs font-bold text-primary-600">Choose</Text>
              </Pressable>
            </View>

            {areas.length === 0
              ? (
                  <Text className="text-xs text-muted-foreground">
                    All of the team’s areas. Choosing some narrows them to just those — it never adds anywhere new.
                  </Text>
                )
              : areas.map(area => (
                  <View key={area.id} className="flex-row items-center gap-2.5">
                    <View className="size-8 items-center justify-center rounded-lg bg-muted">
                      <HugeiconsIcon icon={Location01Icon} size={15} color={colors.neutral[600]} strokeWidth={2} />
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>{area.name}</Text>
                      <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>{area.path}</Text>
                    </View>
                  </View>
                ))}
          </Card>

          <View className="flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              onPress={removeFromTeam}
              className="min-w-0 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-danger-200 bg-card py-3"
            >
              <HugeiconsIcon icon={UserRemove01Icon} size={16} color={colors.danger[500]} strokeWidth={2} />
              <Text className="text-sm font-bold text-danger-500" numberOfLines={1}>Remove</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: saving }}
              disabled={saving}
              onPress={save}
              className={`min-w-0 flex-1 items-center justify-center rounded-xl bg-primary-600 py-3 ${saving ? 'opacity-60' : ''}`}
            >
              <Text className="text-sm font-bold text-white" numberOfLines={1}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </Modal>
    </>
  );
}

function sameIds(a: LocationRef[], b: LocationRef[]) {
  if (a.length !== b.length)
    return false;

  const left = new Set(a.map(area => area.id));
  return b.every(area => left.has(area.id));
}

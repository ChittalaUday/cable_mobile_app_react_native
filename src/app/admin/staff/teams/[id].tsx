import type { TeamMember } from '@/lib/api/types';
import {
  Location01Icon,
  PencilEdit02Icon,
  StarIcon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { RefreshControl, ScrollView } from 'react-native';

import { TeamMemberSheet } from '@/components/admin/team-member-sheet';
import { Card, IconTile, Loading, ScreenHeader } from '@/components/common/shell';
import {
  colors,
  FocusAwareStatusBar,
  Pressable,
  Text,
  View,
} from '@/components/ui';
import { teamCoverageLabel, useTeam, useTeamMembers } from '@/lib/hooks/api/use-staff';
import { initials } from '@/lib/utils/admin-format';

function MemberRow({ member, onPress }: { member: TeamMember; onPress: () => void }) {
  const name = member.name ?? member.phone ?? member.email ?? 'Unnamed';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-xl p-3 active:bg-muted/40"
    >
      <View className="size-10 shrink-0 items-center justify-center rounded-full bg-primary-600">
        <Text className="text-xs font-bold text-white">{initials(name)}</Text>
      </View>

      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-sm font-bold text-foreground" numberOfLines={1}>{name}</Text>
          {member.isTeamLeader
            ? (
                <View className="shrink-0 flex-row items-center gap-1 rounded-sm bg-amber-100 px-1.5 py-0.5 dark:bg-amber-950/60">
                  <HugeiconsIcon icon={StarIcon} size={10} color="#B54708" strokeWidth={2.4} />
                  <Text className="text-[10px] font-bold text-amber-700 uppercase dark:text-amber-400">Leader</Text>
                </View>
              )
            : null}
        </View>
        <View className="mt-0.5 flex-row items-center gap-1">
          <HugeiconsIcon icon={Location01Icon} size={11} color={colors.neutral[400]} strokeWidth={2} />
          <Text className="min-w-0 flex-1 text-[11px] text-muted-foreground" numberOfLines={1}>
            {teamCoverageLabel(member)}
          </Text>
        </View>
      </View>

      <HugeiconsIcon icon={PencilEdit02Icon} size={16} color={colors.neutral[400]} strokeWidth={2} />
    </Pressable>
  );
}

/**
 * One crew: its patch, and who works which part of it.
 *
 * The roster is the screen, not a tab on the team form — the crew's areas are
 * only half the answer, and the other half is which member covers which part of
 * them. Editing the crew itself is a step away behind the pencil, because
 * renaming it is rare next to moving people around inside it.
 */

export function TeamDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const team = useTeam({ variables: { id: id ?? '' }, enabled: Boolean(id) });
  const members = useTeamMembers({ variables: { id: id ?? '' }, enabled: Boolean(id) });

  const [editing, setEditing] = React.useState<TeamMember | null>(null);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['teams'] }),
      queryClient.invalidateQueries({ queryKey: ['staff'] }),
    ]);
  };

  if (team.isPending)
    return <Loading />;

  const areas = team.data?.locations ?? [];
  const roster = members.data ?? [];
  const leaders = roster.filter(member => member.isTeamLeader).length;

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />

      <TeamMemberSheet
        member={editing}
        teamAreas={areas}
        onClose={() => setEditing(null)}
        onSaved={() => void refresh()}
      />

      <ScreenHeader
        title={team.data?.name ?? 'Team'}
        subtitle={`${roster.length} ${roster.length === 1 ? 'member' : 'members'} · ${areas.length} ${areas.length === 1 ? 'area' : 'areas'}${leaders > 0 ? ` · ${leaders} ${leaders === 1 ? 'leader' : 'leaders'}` : ''}`}
        showBack
        withSafeArea
        rightAction={(
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit team"
            onPress={() => router.push(`/admin/staff/team-add-edit?id=${id}`)}
            className="size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card active:bg-muted"
          >
            <HugeiconsIcon icon={PencilEdit02Icon} size={18} color={colors.primary[600]} strokeWidth={2} />
          </Pressable>
        )}
      />

      <ScrollView
        contentContainerClassName="gap-3 px-3 pb-10"
        refreshControl={(
          <RefreshControl
            refreshing={members.isRefetching}
            onRefresh={() => void members.refetch()}
            tintColor={colors.primary[600]}
          />
        )}
      >
        <Card className="gap-2 border border-border p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-bold text-foreground">The team’s areas</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/admin/staff/team-add-edit?id=${id}`)}
              className="shrink-0 rounded-lg border border-border bg-card px-2.5 py-1.5"
            >
              <Text className="text-xs font-bold text-primary-600">Edit</Text>
            </Pressable>
          </View>
          {areas.length === 0
            ? (
                <Text className="text-xs text-muted-foreground">
                  None yet. Until this crew has areas, nobody on it reaches anything through it — and a member cannot be narrowed to part of a patch that does not exist.
                </Text>
              )
            : areas.map(area => (
                <View key={area.id} className="flex-row items-center gap-2.5">
                  <View className="size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <HugeiconsIcon icon={Location01Icon} size={15} color={colors.neutral[600]} strokeWidth={2} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>{area.name}</Text>
                    <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>{area.path}</Text>
                  </View>
                </View>
              ))}
        </Card>

        <Card className="gap-1 border border-border p-2">
          <View className="flex-row items-center gap-2 px-2 pt-1 pb-2">
            <IconTile icon={UserGroupIcon} tint="purple" size={28} iconSize={14} />
            <Text className="text-sm font-bold text-foreground">Members</Text>
          </View>

          {members.isPending
            ? <Loading />
            : roster.length === 0
              ? (
                  <Text className="px-2 py-6 text-center text-xs text-muted-foreground">
                    Nobody on this crew yet. Put someone on it from their own screen — open a person under Staff and pick this team.
                  </Text>
                )
              : roster.map(member => (
                  <MemberRow key={member.id} member={member} onPress={() => setEditing(member)} />
                ))}
        </Card>

        <Text className="px-2 text-[11px] text-muted-foreground">
          A member covering “all team areas” follows the crew wherever its patch goes. Narrowing one to named areas pins them there instead — it never grants anywhere the crew does not already work.
        </Text>
      </ScrollView>
    </View>
  );
}

export default TeamDetailScreen;

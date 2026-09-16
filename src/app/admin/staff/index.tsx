import type { StaffMember, Team } from '@/lib/api/types';
import {
  Add01Icon,
  ArrowRight01Icon,
  Location01Icon,
  PencilEdit02Icon,
  Search01Icon,
  UserGroupIcon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { RefreshControl, TextInput } from 'react-native';

import { ScreenHeader } from '@/components/common/screen-header';
import { Card, IconTile, Loading } from '@/components/common/shell';
import {
  colors,
  FocusAwareStatusBar,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from '@/components/ui';
import { useStaff, useTeams } from '@/lib/hooks/api/use-staff';
import { initials } from '@/lib/utils/admin-format';

type Tab = 'people' | 'teams';

const STATUS_TINT: Record<string, { bg: string; fg: string; label: string }> = {
  active: { bg: '#ECFDF3', fg: '#027A48', label: 'Active' },
  invited: { bg: '#EFF8FF', fg: '#175CD3', label: 'Invited' },
  suspended: { bg: '#FEF3F2', fg: '#B42318', label: 'Suspended' },
};

function StatusPill({ status }: { status: string }) {
  const tint = STATUS_TINT[status] ?? STATUS_TINT.active!;

  return (
    <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: tint.bg }}>
      <Text className="text-[11px] font-bold" style={{ color: tint.fg }}>{tint.label}</Text>
    </View>
  );
}

/**
 * One person. The areas line is the point of the row: a staff member with no
 * area reaches nothing, and that is invisible unless it is said out loud.
 */
function PersonCard({ member, onPress }: { member: StaffMember; onPress: () => void }) {
  const name = member.name ?? member.phone ?? member.email ?? 'Unnamed';
  const areas = member.locations.length + member.inheritedLocations.length;

  return (
    <Card className="border border-border p-3.5">
      <Pressable accessibilityRole="button" onPress={onPress} className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-3 pr-2">
          <View className="size-11 items-center justify-center rounded-full bg-primary-600">
            <Text className="text-sm font-bold text-white">{initials(name)}</Text>
          </View>

          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-base font-bold text-foreground" numberOfLines={1}>{name}</Text>
              {member.roleId === 'admin'
                ? (
                    <View className="shrink-0 rounded-sm bg-orange-100 px-1.5 py-0.5 dark:bg-orange-950/60">
                      <Text className="text-[10px] font-bold text-orange-700 uppercase dark:text-orange-400">Admin</Text>
                    </View>
                  )
                : null}
              {member.isTeamLeader
                ? (
                    <View className="shrink-0 rounded-sm bg-amber-100 px-1.5 py-0.5 dark:bg-amber-950/60">
                      <Text className="text-[10px] font-bold text-amber-700 uppercase dark:text-amber-400">Leader</Text>
                    </View>
                  )
                : null}
            </View>
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {member.phone ?? member.email ?? 'No contact'}
              {member.team ? ` · ${member.team.name}` : ''}
            </Text>
            <View className="mt-1 flex-row items-center gap-1">
              <HugeiconsIcon icon={Location01Icon} size={12} color={colors.neutral[400]} strokeWidth={2} />
              <Text className="text-[11px] text-muted-foreground">
                {areas === 0 ? 'No areas — reaches nothing' : `${areas} ${areas === 1 ? 'area' : 'areas'}`}
                {member.inheritedLocations.length > 0 ? ` (${member.inheritedLocations.length} via team)` : ''}
              </Text>
            </View>
          </View>
        </View>

        <View className="shrink-0 flex-row items-center gap-2">
          <StatusPill status={member.status} />
          <HugeiconsIcon icon={ArrowRight01Icon} size={18} color={colors.neutral[400]} strokeWidth={2} />
        </View>
      </Pressable>
    </Card>
  );
}

function TeamCard({ team, onPress, onEdit }: { team: Team; onPress: () => void; onEdit: () => void }) {
  return (
    <Card className="border border-border p-3.5">
      <Pressable accessibilityRole="button" onPress={onPress} className="flex-row items-center justify-between">
        <View className="min-w-0 flex-1 flex-row items-center gap-3 pr-2">
          <IconTile icon={UserGroupIcon} tint="purple" size={44} iconSize={20} />
          <View className="flex-1">
            <Text className="text-base font-bold text-foreground" numberOfLines={1}>{team.name}</Text>
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {`${team.memberCount} ${team.memberCount === 1 ? 'member' : 'members'}`}
              {` · ${team.locations.length} ${team.locations.length === 1 ? 'area' : 'areas'}`}
            </Text>
            {team.locations.length > 0
              ? (
                  <Text className="mt-0.5 text-[11px] text-muted-foreground" numberOfLines={1}>
                    {team.locations.map(area => area.name).join(', ')}
                  </Text>
                )
              : null}
          </View>
        </View>

        <View className="shrink-0 flex-row items-center gap-1.5">
          <StatusPill status={team.status === 'active' ? 'active' : 'suspended'} />
          {/* Separate from the row: the row opens the crew and its roster, which
              is what an admin wants nine times out of ten; renaming it is the
              tenth and gets its own target rather than a second screen to
              back out of. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${team.name}`}
            onPress={onEdit}
            hitSlop={8}
            className="size-8 items-center justify-center rounded-lg border border-border bg-card"
          >
            <HugeiconsIcon icon={PencilEdit02Icon} size={15} color={colors.primary[600]} strokeWidth={2} />
          </Pressable>
          <HugeiconsIcon icon={ArrowRight01Icon} size={18} color={colors.neutral[400]} strokeWidth={2} />
        </View>
      </Pressable>
    </Card>
  );
}

/**
 * Staff and crews behind one tab each.
 *
 * They are one screen because they are one decision: an area is granted to a
 * person or to the crew they are on, and an admin choosing between those two
 * should not have to navigate between two places to compare them.
 */

export function StaffScreen() {
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>('people');
  const [search, setSearch] = React.useState('');

  const staff = useStaff();
  const teams = useTeams();

  const term = search.trim().toLowerCase();

  // Filtered here, not sent as a query variable: every keystroke would
  // otherwise be a new query key, and so a new request.
  const people = React.useMemo(() => {
    const items = staff.data?.items ?? [];
    if (!term)
      return items;

    return items.filter(member => [member.name, member.email, member.phone, member.team?.name]
      .some(field => field?.toLowerCase().includes(term)));
  }, [staff.data, term]);

  const crews = React.useMemo(() => {
    const items = teams.data?.items ?? [];
    return term ? items.filter(team => team.name.toLowerCase().includes(term)) : items;
  }, [teams.data, term]);

  const isPeople = tab === 'people';
  const active = isPeople ? staff : teams;

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <SafeAreaView edges={['top']} className="bg-card">
        <ScreenHeader
          title="Staff & Teams"
          subtitle={`${staff.data?.total ?? 0} people · ${teams.data?.total ?? 0} teams`}
          showBack
          rightAction={(
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isPeople ? 'Add staff member' : 'Add team'}
              onPress={() => router.push(isPeople ? '/admin/staff/add-edit' : '/admin/staff/team-add-edit')}
              className="shrink-0 flex-row items-center gap-1.5 rounded-full bg-primary-600 px-3.5 py-2 active:bg-primary-700"
            >
              <HugeiconsIcon icon={Add01Icon} size={16} color="#ffffff" strokeWidth={2.4} />
              <Text className="text-xs font-bold text-white" numberOfLines={1}>
                {isPeople ? 'Add staff' : 'Add team'}
              </Text>
            </Pressable>
          )}
        >
          {/* People / Teams tab pills */}
          <View className="flex-row gap-2">
            {([['people', 'People', UserIcon], ['teams', 'Teams', UserGroupIcon]] as const).map(([key, label, icon]) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected: tab === key }}
                onPress={() => setTab(key)}
                className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2 ${
                  tab === key ? 'bg-primary-600' : 'border border-border bg-surface'
                }`}
              >
                <HugeiconsIcon
                  icon={icon}
                  size={16}
                  color={tab === key ? '#ffffff' : colors.neutral[600]}
                  strokeWidth={2}
                />
                <Text
                  className={`text-xs font-bold ${
                    tab === key ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Search Bar */}
          <View className="mt-2.5 flex-row items-center rounded-xl border border-border bg-surface px-3 py-2">
            <HugeiconsIcon icon={Search01Icon} size={16} color={colors.neutral[400]} strokeWidth={2} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={isPeople ? 'Search people...' : 'Search teams...'}
              placeholderTextColor={colors.neutral[400]}
              className="ml-2 flex-1 py-0 text-sm text-foreground"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <Text className="text-xs font-semibold text-primary-600">Clear</Text>
              </Pressable>
            )}
          </View>
        </ScreenHeader>
      </SafeAreaView>

      {isPeople
        ? (
            <FlashList
              data={people}
              keyExtractor={member => member.id}
              renderItem={({ item }) => (
                <PersonCard
                  member={item}
                  onPress={() => router.push(`/admin/staff/add-edit?id=${item.id}`)}
                />
              )}
              ItemSeparatorComponent={() => <View className="h-3" />}
              contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 4, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              refreshControl={(
                <RefreshControl
                  refreshing={active.isRefetching}
                  onRefresh={() => void active.refetch()}
                  tintColor={colors.primary[600]}
                />
              )}
              ListEmptyComponent={
                staff.isPending
                  ? <Loading />
                  : (
                      <Empty
                        title="No staff yet"
                        body={term ? 'Nobody matches that search.' : 'Add the people who work for you, then grant each of them the areas they cover.'}
                      />
                    )
              }
            />
          )
        : (
            <FlashList
              data={crews}
              keyExtractor={team => team.id}
              renderItem={({ item }) => (
                <TeamCard
                  team={item}
                  onPress={() => router.push(`/admin/staff/teams/${item.id}`)}
                  onEdit={() => router.push(`/admin/staff/team-add-edit?id=${item.id}`)}
                />
              )}
              ItemSeparatorComponent={() => <View className="h-3" />}
              contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 4, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              refreshControl={(
                <RefreshControl
                  refreshing={active.isRefetching}
                  onRefresh={() => void active.refetch()}
                  tintColor={colors.primary[600]}
                />
              )}
              ListEmptyComponent={
                teams.isPending
                  ? <Loading />
                  : (
                      <Empty
                        title="No teams yet"
                        body={term ? 'No team matches that search.' : 'A team lets you grant an area once instead of once per person.'}
                      />
                    )
              }
            />
          )}
    </View>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <View className="items-center justify-center rounded-2xl border border-border bg-card px-4 py-12">
      <Text className="text-sm font-semibold text-foreground">{title}</Text>
      <Text className="mt-1 text-center text-xs text-muted-foreground">{body}</Text>
    </View>
  );
}

export default StaffScreen;

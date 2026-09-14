import type { Membership } from '@/lib/api/types';
import {
  ArrowDown01Icon,
  Building03Icon,
  Logout03Icon,
  Tick02Icon,
  Tv01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { router } from 'expo-router';
import * as React from 'react';

import { colors, Modal, Pressable, SafeAreaView, ScrollView, Text, useModal, View } from '@/components/ui';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';

/** `roleId` is a raw row id — nobody outside the database reads `super_admin`. */
const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super admin',
  admin: 'Administrator',
  staff: 'Staff',
  customer: 'Customer',
};

function roleLabel(roleId: string): string {
  return ROLE_LABEL[roleId] ?? roleId;
}

function TenantRow({ membership, selected, onPress }: {
  membership: Membership;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${membership.tenantName}, ${roleLabel(membership.roleId)}`}
      onPress={onPress}
      className={`flex-row items-center gap-3 rounded-2xl border p-3.5 ${selected ? 'border-primary-600 bg-primary-50' : 'border-border bg-card'}`}
    >
      <View className="size-11 items-center justify-center rounded-2xl bg-primary-600">
        <HugeiconsIcon icon={Building03Icon} size={22} color="#fff" strokeWidth={2} />
      </View>
      <View className="flex-1">
        <Text className="text-[15px] font-semibold text-foreground" numberOfLines={1}>{membership.tenantName}</Text>
        <Text className="mt-0.5 text-xs text-muted-foreground">{roleLabel(membership.roleId)}</Text>
      </View>
      {selected
        ? <HugeiconsIcon icon={Tick02Icon} size={20} color={colors.primary[600]} strokeWidth={2.6} />
        : null}
    </Pressable>
  );
}

function TenantList({ onSelect }: { onSelect: (tenantId: string) => void }) {
  const memberships = useAuthStore.use.memberships();
  const tenantId = useAuthStore.use.tenantId();

  return (
    <View className="gap-2.5">
      {memberships.map(membership => (
        <TenantRow
          key={membership.tenantId}
          membership={membership}
          selected={membership.tenantId === tenantId}
          onPress={() => onSelect(membership.tenantId)}
        />
      ))}
    </View>
  );
}

/**
 * Enter a tenant and land on the home its role earns.
 *
 * Role belongs to the membership, so the same person is an admin in one network
 * and a customer in the next: `/` is the screen that branches on it. Going there
 * on every pick is what stops a switch leaving an admin stranded on a packages
 * screen they no longer have the permission to use.
 */
function useEnterTenant(): (tenantId: string) => void {
  const switchTenant = useAuthStore.use.switchTenant();

  return React.useCallback((tenantId: string) => {
    switchTenant(tenantId);
    router.replace('/');
  }, [switchTenant]);
}

/**
 * The gate a multi-tenant operator lands on after signing in.
 *
 * Nothing is pre-selected on purpose. Every list, figure and write in the app is
 * scoped to one operator, and a wrong guess here is silent — the app looks
 * perfectly normal while it files a customer into the wrong network.
 *
 * `(app)/_layout` lays it OVER the stack rather than replacing it: the group is
 * what `(auth)` redirects into on sign-in, and a group whose layout renders
 * something that is not a navigator gives that redirect nothing to land on.
 */
export function SelectTenantScreen() {
  const enterTenant = useEnterTenant();
  const signOut = useAuthStore.use.signOut();
  const memberships = useAuthStore.use.memberships();
  const name = useAuthStore.use.user()?.displayName;

  // No membership is not a choice to present — it is an account nobody has been
  // added to a network yet. Saying so beats an empty list, and beats the old
  // behaviour of falling through to a subscriber dashboard that shows nothing.
  const orphaned = memberships.length === 0;

  return (
    <SafeAreaView className="flex-1 bg-background" style={{ flex: 1 }}>
      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-5 pt-8 pb-10">
        <View className="items-center gap-3">
          <View className="size-14 items-center justify-center rounded-3xl bg-primary-600">
            <HugeiconsIcon icon={Tv01Icon} size={28} color="#fff" strokeWidth={2} />
          </View>
          <Text className="text-center text-[22px] font-bold text-foreground">
            {orphaned ? 'No network yet' : 'Choose a network'}
          </Text>
          <Text className="text-center text-[13px] text-muted-foreground">
            {orphaned
              ? `This account${name ? ` (${name})` : ''} is not a member of any operator yet, so there is nothing to show. Ask an administrator to add you, then sign in again.`
              : `${name ? `${name}, you ` : 'You '}belong to ${memberships.length} operators. Everything you see and change belongs to the one you pick.`}
          </Text>
        </View>

        <TenantList onSelect={enterTenant} />

        <Pressable
          accessibilityRole="button"
          onPress={() => void signOut()}
          className="mt-1 flex-row items-center justify-center gap-2 py-2"
        >
          <HugeiconsIcon icon={Logout03Icon} size={16} color={colors.neutral[500]} strokeWidth={2.2} />
          <Text className="text-[13px] font-semibold text-muted-foreground">Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * The active network, and the way to leave it — for a screen header.
 *
 * With one membership there is nothing to switch to, so it renders as plain
 * text: a control that cannot do anything is worse than no control.
 */
export function TenantSwitcher({ subtitle }: { subtitle?: string }) {
  const memberships = useAuthStore.use.memberships();
  const tenantId = useAuthStore.use.tenantId();
  const enterTenant = useEnterTenant();
  const modal = useModal();

  const active = memberships.find(item => item.tenantId === tenantId);
  const title = active?.tenantName ?? 'Select a network';
  const canSwitch = memberships.length > 1;

  const onSelect = React.useCallback((next: string) => {
    modal.dismiss();
    enterTenant(next);
  }, [enterTenant, modal]);

  const label = (
    <View className="flex-1">
      <View className="flex-row items-center gap-1">
        <Text className="text-xl font-bold text-foreground" numberOfLines={1}>{title}</Text>
        {canSwitch
          ? <HugeiconsIcon icon={ArrowDown01Icon} size={16} color={colors.neutral[500]} strokeWidth={2.4} />
          : null}
      </View>
      <Text className="text-xs text-muted-foreground" numberOfLines={1}>{subtitle ?? roleLabel(active?.roleId ?? '')}</Text>
    </View>
  );

  if (!canSwitch)
    return label;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Active network: ${title}. Switch network`}
        onPress={modal.present}
        className="flex-1 flex-row items-center"
      >
        {label}
      </Pressable>
      <Modal ref={modal.ref} snapPoints={['50%']} title="Switch network">
        <View className="gap-2.5 px-5 pt-2 pb-8">
          <TenantList onSelect={onSelect} />
        </View>
      </Modal>
    </>
  );
}

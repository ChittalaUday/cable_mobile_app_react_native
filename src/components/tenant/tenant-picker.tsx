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
 * The gate a multi-tenant operator lands on to select an active network.
 */
export function SelectTenantScreen() {
  const [remember, setRemember] = React.useState(true);
  const switchTenant = useAuthStore.use.switchTenant();
  const signOut = useAuthStore.use.signOut();
  const memberships = useAuthStore.use.memberships();
  const name = useAuthStore.use.user()?.displayName;

  const onSelectTenant = (tenantId: string) => {
    switchTenant(tenantId, remember);
    router.replace('/');
  };

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

        <TenantList onSelect={onSelectTenant} />

        {!orphaned && (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: remember }}
            onPress={() => setRemember(prev => !prev)}
            className="flex-row items-center justify-between rounded-2xl border border-border bg-card p-3.5"
          >
            <View className="flex-1 pr-3">
              <Text className="text-[14px] font-semibold text-foreground">Remember this network</Text>
              <Text className="mt-0.5 text-xs text-muted-foreground">Keep selection while your login session remains active</Text>
            </View>
            <View
              className={`size-6 items-center justify-center rounded-lg border ${
                remember
                  ? 'border-primary-600 bg-primary-600'
                  : 'border-neutral-300 bg-card dark:border-neutral-700'
              }`}
            >
              {remember && (
                <HugeiconsIcon icon={Tick02Icon} size={16} color="#ffffff" strokeWidth={3} />
              )}
            </View>
          </Pressable>
        )}

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
  const switchTenant = useAuthStore.use.switchTenant();
  const modal = useModal();

  const active = memberships.find(item => item.tenantId === tenantId);
  const title = active?.tenantName ?? 'Select a network';
  const canSwitch = memberships.length > 1;

  const onSelect = React.useCallback((next: string) => {
    modal.dismiss();
    switchTenant(next, true);
    router.replace('/');
  }, [switchTenant, modal]);

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

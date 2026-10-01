import type { LocationRef, MembershipStatus, StaffRole } from '@/lib/api/types';
import { Delete02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { TextInput } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { AreaGrants } from '@/components/admin/area-grants';

import { StepBar } from '@/components/admin/step-bar';
import { dialogs } from '@/components/common/dialogs';
import { SaveBar } from '@/components/common/save-bar';
import { Card, Loading, ScreenHeader } from '@/components/common/shell';
import {
  colors,
  FocusAwareStatusBar,
  Pressable,
  Text,
  View,
} from '@/components/ui';
import {
  sameAreas,
  useCreateStaff,
  useDeleteStaff,
  useSetStaffLocations,
  useStaffMember,
  useTeams,
  useUpdateStaff,
} from '@/lib/hooks/api/use-staff';
import { apiErrorMessage } from '@/lib/utils/api-error';

const ROLES: { key: StaffRole; label: string; hint: string }[] = [
  { key: 'staff', label: 'Staff', hint: 'Works the areas you grant them' },
  { key: 'admin', label: 'Admin', hint: 'Full control of this operator' },
];

type Draft = Partial<{
  name: string;
  email: string;
  phone: string;
  password: string;
  roleId: StaffRole;
  status: MembershipStatus;
  teamId: string | null;
  areas: LocationRef[];
}>;

const STATUSES: { key: MembershipStatus; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'invited', label: 'Invited' },
  { key: 'suspended', label: 'Suspended' },
];

function FieldLabel({ children, required }: { children: string; required?: boolean }) {
  return (
    <Text className="text-[13px] font-bold text-foreground">
      {children}
      {required ? <Text className="text-primary-600"> *</Text> : null}
    </Text>
  );
}

function Field({ label, required, error, ...input }: {
  label: string;
  required?: boolean;
  error?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'number-pad';
  autoCapitalize?: 'none' | 'words';
  secureTextEntry?: boolean;
  editable?: boolean;
}) {
  return (
    <View className="gap-1">
      <FieldLabel required={required}>{label}</FieldLabel>
      <TextInput
        {...input}
        placeholderTextColor={colors.neutral[400]}
        className={`rounded-xl border bg-card px-3 py-2 text-sm text-foreground ${
          error ? 'border-danger-400' : 'border-border'
        } ${input.editable === false ? 'opacity-60' : ''}`}
      />
      {error ? <Text className="text-xs font-medium text-danger-500">{error}</Text> : null}
    </View>
  );
}

function Choice<T extends string>({ label, options, value, onSelect }: {
  label: string;
  options: { key: T; label: string; hint?: string }[];
  value: T;
  onSelect: (key: T) => void;
}) {
  return (
    <View className="gap-1">
      <FieldLabel>{label}</FieldLabel>
      <View className="flex-row gap-1.5">
        {options.map(option => (
          <Pressable
            key={option.key}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === option.key }}
            onPress={() => onSelect(option.key)}
            className={`min-w-0 flex-1 rounded-xl px-2.5 py-1.5 ${
              value === option.key ? 'bg-primary-600' : 'border border-border bg-card'
            }`}
          >
            <Text
              className={`text-[13px] font-bold ${value === option.key ? 'text-white' : 'text-foreground'}`}
              numberOfLines={1}
            >
              {option.label}
            </Text>
            {option.hint
              ? (
                  <Text
                    className={`text-[10px] ${value === option.key ? 'text-white/80' : 'text-muted-foreground'}`}
                    numberOfLines={2}
                  >
                    {option.hint}
                  </Text>
                )
              : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/**
 * Hire someone, or change the job they already hold.
 *
 * Creating and editing are one screen because they are one form with two fields
 * swapped: an existing membership cannot change how a person signs in (identity
 * is global — their email and phone belong to the account, not to this
 * operator), and a new one has no areas to show until it exists.
 */

export function AddEditStaffScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ id?: string }>();

  const id = params.id;
  const isEdit = Boolean(id);

  const { data: member, isPending: loadingMember } = useStaffMember({
    variables: { id: id ?? '' },
    enabled: isEdit,
  });
  // Only the edit form offers the crew picker, so hiring does not pay for it.
  const { data: teamPage } = useTeams({ enabled: isEdit });
  const teams = teamPage?.items ?? [];

  /**
   * Only what the admin has actually touched, laid over the saved record.
   *
   * The alternative — copying the record into state once it loads — needs an
   * effect that must not re-run, and a ref to remember that it already did.
   * This way the fetch arriving late just shows up, and an untouched field
   * cannot drift from what the server says.
   */
  const [draft, setDraft] = React.useState<Draft>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const name = draft.name ?? member?.name ?? '';
  const email = draft.email ?? member?.email ?? '';
  const phone = draft.phone ?? member?.phone ?? '';
  const password = draft.password ?? '';
  const roleId = draft.roleId ?? member?.roleId ?? 'staff';
  const status = draft.status ?? member?.status ?? 'active';
  const teamId = draft.teamId === undefined ? (member?.team?.id ?? null) : draft.teamId;
  const areas = draft.areas ?? member?.locations ?? [];

  const edit = (patch: Draft) => setDraft(current => ({ ...current, ...patch }));

  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const setLocations = useSetStaffLocations();
  const deleteStaff = useDeleteStaff();

  const saving = createStaff.isPending || updateStaff.isPending || setLocations.isPending;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['staff'] });

  const validate = () => {
    const next: Record<string, string> = {};
    if (!name.trim())
      next.name = 'A name is required';
    if (!isEdit && !email.trim() && !phone.trim())
      next.email = 'An email or a phone number is required — it is how they sign in';
    if (phone.trim() && !/^\d{10}$/.test(phone.trim()))
      next.phone = 'Enter the 10-digit number, without a country code';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (!validate())
      return;

    try {
      if (isEdit && id) {
        await updateStaff.mutateAsync({
          id,
          patch: { name: name.trim(), roleId, status, teamId },
        });
        // A PUT rewrites the whole set, so only when it actually changed.
        if (!sameAreas(areas, member?.locations ?? []))
          await setLocations.mutateAsync({ id, locationIds: areas.map(area => area.id) });
      }
      else {
        const created = await createStaff.mutateAsync({
          payload: {
            name: name.trim(),
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
            password: password.trim() || undefined,
            roleId,
            status: status === 'suspended' ? 'active' : status,
            locationIds: areas.map(area => area.id),
          },
        });

        await refresh();

        // Step 2. `replace`, not `push`: the person exists now, so going back
        // to a form that would create them again is the one thing to prevent.
        router.replace(`/admin/staff/assign-team?id=${created.id}`);
        return;
      }

      await refresh();
      router.back();
    }
    catch (error) {
      void dialogs.notify('Could not save', apiErrorMessage(error, 'Try again.'));
    }
  };

  const confirmDelete = async () => {
    const agreed = await dialogs.confirm({
      title: 'Remove from this operator',
      message: `${name || 'This person'} loses their job here and every area granted to them. Their sign-in account is not deleted — they may be a subscriber elsewhere.`,
      confirmLabel: 'Remove',
    });

    if (!agreed)
      return;

    try {
      await deleteStaff.mutateAsync({ id: id! });
      await refresh();
      router.back();
    }
    catch (error) {
      void dialogs.notify('Could not remove', apiErrorMessage(error, 'Try again.'));
    }
  };

  if (isEdit && loadingMember)
    return <Loading />;

  return (
    <View className="flex-1 bg-surface">
      <FocusAwareStatusBar />
      <ScreenHeader
        title={isEdit ? 'Edit staff member' : 'Add staff member'}
        subtitle={isEdit ? (member?.name || member?.email || 'Manage staff details') : undefined}
        showBack
        withSafeArea
        rightAction={
          isEdit
            ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove staff member"
                  onPress={confirmDelete}
                  className="size-9 shrink-0 items-center justify-center rounded-lg border border-danger-200 bg-card"
                >
                  <HugeiconsIcon icon={Delete02Icon} size={18} color={colors.danger[500]} strokeWidth={2} />
                </Pressable>
              )
            : null
        }
      >
        {isEdit ? null : <StepBar current={1} total={2} label="their details" />}
      </ScreenHeader>

      <KeyboardAwareScrollView
        contentContainerStyle={{ gap: 10, paddingHorizontal: 12, paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
      >
        <Card className="gap-2.5 border border-border p-3">
          <Field label="Name" required value={name} onChangeText={value => edit({ name: value })} placeholder="Ravi Kumar" autoCapitalize="words" error={errors.name} />

          <Field
            label="Phone"
            value={phone}
            onChangeText={value => edit({ phone: value })}
            placeholder="9876543210"
            keyboardType="number-pad"
            editable={!isEdit}
            error={errors.phone}
          />

          <Field
            label="Email"
            value={email}
            onChangeText={value => edit({ email: value })}
            placeholder="ravi@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isEdit}
            error={errors.email}
          />

          {isEdit
            ? (
                <Text className="text-[10px] text-muted-foreground">
                  Phone and email belong to the person’s account, not to this operator, so they are changed by them and not here.
                </Text>
              )
            : (
                <Field
                  label="Password"
                  value={password}
                  onChangeText={value => edit({ password: value })}
                  placeholder="Leave empty to let them sign in with an OTP"
                  autoCapitalize="none"
                  secureTextEntry
                />
              )}
        </Card>

        <Card className="gap-2.5 border border-border p-3">
          <Choice label="Role" options={ROLES} value={roleId} onSelect={value => edit({ roleId: value })} />
          {isEdit ? <Choice label="Status" options={STATUSES} value={status} onSelect={value => edit({ status: value })} /> : null}

          {/* Choosing a crew is step 2 when hiring — a tenant with no teams yet
              would otherwise see an empty row and no way to fill it. */}
          {isEdit
            ? (
                <View className="gap-1">
                  <FieldLabel>Team</FieldLabel>
                  <View className="flex-row flex-wrap gap-1.5">
                    {[{ id: null, name: 'No team' }, ...teams].map(team => (
                      <Pressable
                        key={team.id ?? 'none'}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: teamId === team.id }}
                        onPress={() => edit({ teamId: team.id })}
                        className={`rounded-full px-3 py-1.5 ${
                          teamId === team.id ? 'bg-primary-600' : 'border border-border bg-card'
                        }`}
                      >
                        <Text className={`text-xs font-bold ${teamId === team.id ? 'text-white' : 'text-foreground'}`}>
                          {team.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text className="text-[10px] text-muted-foreground">
                    Putting someone on a team is how they join it — and they inherit every area the team holds.
                  </Text>
                </View>
              )
            : null}
        </Card>

        <View className="px-1">
          <AreaGrants
            value={areas}
            onChange={value => edit({ areas: value })}
            inherited={member?.inheritedLocations ?? []}
            inheritedFrom={member?.team?.name ?? null}
          />
        </View>
      </KeyboardAwareScrollView>

      <SaveBar
        label={isEdit ? 'Save changes' : 'Continue'}
        busyLabel="Saving..."
        busy={saving}
        onPress={save}
      />
    </View>
  );
}

export default AddEditStaffScreen;

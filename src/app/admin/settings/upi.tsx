import type { UpiAccount } from '@/lib/hooks/api/use-tenant-upi';
import { Add01Icon, CheckmarkCircle02Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { dialogs } from '@/components/common/dialogs';
import { Card, LoadError, Loading, ScreenHeader } from '@/components/common/shell';
import { Button, colors, Input, Pressable, Text, View } from '@/components/ui';
import {
  useAddUpiAccount,
  useRemoveUpiAccount,
  useTenantUpiAccounts,
  useUpdateUpiAccount,
} from '@/lib/hooks/api/use-tenant-upi';

/**
 * A handle looks like `name@bank`. Checked loosely on purpose — PSPs keep
 * inventing prefixes, and a rule that is nearly right rejects a real account.
 */
const VPA = /^[^@\s]{2,}@[^@\s]{2,}$/;

/**
 * The UPI handles money is collected into.
 *
 * More than one because an operator runs more than one: a personal VPA for the
 * round, the firm's current account for the counter. The collector is shown the
 * default unless they pick another, and whichever they use is the QR printed on
 * the receipt.
 */
export default function UpiSettingsScreen() {
  const { data: accounts, isPending, error, refetch } = useTenantUpiAccounts({
    variables: { includeInactive: true },
  });
  const { mutate: add, isPending: isAdding } = useAddUpiAccount();
  const { mutate: update } = useUpdateUpiAccount();
  const { mutate: remove } = useRemoveUpiAccount();

  const [upiId, setUpiId] = React.useState('');
  const [payeeName, setPayeeName] = React.useState('');
  const [label, setLabel] = React.useState('');

  const submit = () => {
    if (!VPA.test(upiId.trim())) {
      void dialogs.notify('Check the handle', 'A UPI handle looks like satyacable@okhdfc.');
      return;
    }

    if (payeeName.trim() === '') {
      void dialogs.notify('Name the payee', 'This is the name the customer sees before they confirm.');
      return;
    }

    add({
      payload: {
        upiId: upiId.trim(),
        payeeName: payeeName.trim(),
        ...(label.trim() === '' ? {} : { label: label.trim() }),
      },
    }, {
      onSuccess: () => {
        setUpiId('');
        setPayeeName('');
        setLabel('');
      },
      onError: failure => void dialogs.notify('Not added', failure.message),
    });
  };

  const confirmRemove = async (account: UpiAccount) => {
    const agreed = await dialogs.confirm({
      title: 'Remove this handle?',
      message: `${account.upiId} stops being offered to collectors. Receipts already printed with it are unaffected.`,
      confirmLabel: 'Remove',
    });

    if (agreed)
      remove({ id: account.id }, { onError: failure => void dialogs.notify('Not removed', failure.message) });
  };

  if (isPending)
    return <Loading />;

  if (error)
    return <LoadError message={error.message} onRetry={refetch} />;

  const live = accounts ?? [];

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader title="UPI handles" subtitle="Where collected money arrives" showBack withSafeArea />

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 16, padding: 16, paddingBottom: 96 }}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
      >
        {live.length === 0
          ? (
              <Card className="border border-border p-4">
                <Text className="text-sm text-muted-foreground">
                  No handle yet. Until one is added, a collector taking a UPI payment has no code to show —
                  the payment can still be recorded, but the customer has to be told the handle out loud.
                </Text>
              </Card>
            )
          : live.map(account => (
              <Card key={account.id} className="gap-2.5 border border-border p-4">
                <View className="flex-row items-start justify-between gap-2">
                  <View className="min-w-0 flex-1 gap-0.5">
                    <Text className="text-base font-extrabold text-foreground" numberOfLines={1}>
                      {account.upiId}
                    </Text>
                    <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                      {account.label == null ? account.payeeName : `${account.label} • ${account.payeeName}`}
                    </Text>
                  </View>
                  {account.isDefault && (
                    <View className="flex-row items-center gap-1">
                      <HugeiconsIcon
                        icon={CheckmarkCircle02Icon}
                        size={14}
                        color={colors.primary[600]}
                        strokeWidth={2.2}
                      />
                      <Text className="text-[11px] font-bold text-primary-600">Default</Text>
                    </View>
                  )}
                </View>

                <View className="flex-row items-center gap-2">
                  {!account.isDefault && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => update({ id: account.id, patch: { isDefault: true } })}
                      className="rounded-lg border border-border px-3 py-1.5 active:bg-muted/40"
                    >
                      <Text className="text-xs font-bold text-foreground">Make default</Text>
                    </Pressable>
                  )}

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => update(
                      { id: account.id, patch: { status: account.status === 'active' ? 'inactive' : 'active' } },
                      { onError: failure => void dialogs.notify('Not changed', failure.message) },
                    )}
                    className="rounded-lg border border-border px-3 py-1.5 active:bg-muted/40"
                  >
                    <Text className="text-xs font-bold text-foreground">
                      {account.status === 'active' ? 'Stand down' : 'Bring back'}
                    </Text>
                  </Pressable>

                  <View className="flex-1" />

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${account.upiId}`}
                    onPress={() => void confirmRemove(account)}
                    className="size-8 items-center justify-center rounded-lg border border-border active:bg-muted/40"
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={15} color={colors.danger[500]} strokeWidth={2} />
                  </Pressable>
                </View>

                {account.status === 'inactive' && (
                  <Text className="text-[11px] text-muted-foreground">
                    Stood down — not offered to collectors.
                  </Text>
                )}
              </Card>
            ))}

        <Card className="gap-3 border border-border p-4">
          <Text className="text-sm font-bold text-foreground">Add a handle</Text>

          <View className="gap-1.5">
            <Text className="text-xs font-semibold text-foreground">UPI ID</Text>
            <Input
              value={upiId}
              onChangeText={setUpiId}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="satyacable@okhdfc"
              testID="upi-id"
            />
          </View>

          <View className="gap-1.5">
            <Text className="text-xs font-semibold text-foreground">Payee name</Text>
            <Input
              value={payeeName}
              onChangeText={setPayeeName}
              placeholder="Satya Cable Network"
              testID="upi-payee"
            />
            <Text className="text-[11px] text-muted-foreground">
              What the customer's app shows before they confirm.
            </Text>
          </View>

          <View className="gap-1.5">
            <Text className="text-xs font-semibold text-foreground">Label (optional)</Text>
            <Input
              value={label}
              onChangeText={setLabel}
              returnKeyType="done"
              placeholder="Shop counter"
              testID="upi-label"
            />
          </View>

          <Button
            label={isAdding ? 'Adding…' : 'Add handle'}
            disabled={isAdding}
            onPress={submit}
            className="bg-primary-600"
            testID="upi-add"
          />
        </Card>

        <View className="flex-row items-start gap-2 px-1">
          <HugeiconsIcon icon={Add01Icon} size={14} color={colors.neutral[400]} strokeWidth={2} />
          <Text className="flex-1 text-[11px] text-muted-foreground">
            The default handle's QR is printed on every receipt, whether the payment was cash or UPI — it is
            what the customer scans next month.
          </Text>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

import type { RaiseTicketTarget } from '@/components/tickets/raise-ticket-sheet';
import { ArrowRight01Icon, RemoteControlIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl } from 'react-native';
import { CustomerConnectionCard } from '@/components/common/customer-connection-card';
import { Card, LoadError, Loading } from '@/components/common/shell';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { RaiseTicketSheet } from '@/components/tickets/raise-ticket-sheet';
import { Button, colors, Pressable, ScrollView, Text, View } from '@/components/ui';
import { customerItemToConsolidated, useCustomers } from '@/lib/hooks/api/use-customers';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';

/**
 * What the subscriber is actually paying for.
 *
 * This screen used to draw a `demoCustomer` — STB89741203, an ACT Family HD
 * Pack, ₹450 a month — for every person who signed in, and its Recharge and
 * Raise Ticket buttons logged to the console. A subscriber checking their box
 * number against a number the app invented is worse than showing nothing.
 *
 * `GET /customers` answers with the caller's own record and nothing else when
 * their grant is `customers.view` at OWN scope, which is what a customer gets,
 * so this needs no endpoint of its own.
 */
export function CustomerDashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore.use.user();
  const signOut = useAuthStore.use.signOut();
  const [ticketFor, setTicketFor] = React.useState<RaiseTicketTarget | null>(null);

  const { data, isPending, error, refetch, isRefetching } = useCustomers();
  const record = data?.pages[0]?.items[0] ?? null;
  const customer = record === null ? null : customerItemToConsolidated(record);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-5 px-4 pb-10 pt-5"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[500]} />}
      >
        <MotiView from={{ opacity: 0, translateY: -12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300 }}>
          <View className="flex-row items-start justify-between gap-2">
            <View className="flex-1 gap-1">
              <Text className="text-sm font-semibold tracking-widest text-primary-500 uppercase">
                {t('customer_home.title', 'My Subscriptions')}
              </Text>
              <Text selectable className="text-3xl font-bold text-foreground">
                {customer?.name ?? user?.displayName ?? user?.email?.split('@')[0] ?? t('customer_home.account', 'Customer account')}
              </Text>
              <Text selectable className="text-muted-foreground">{user?.email ?? customer?.phone ?? ''}</Text>
            </View>
            <NotificationBell />
          </View>
        </MotiView>

        {isPending
          ? <Loading />
          : error
            ? <LoadError message={error.message} onRetry={refetch} />
            : customer === null
              ? (
                  <Card className="items-center gap-2 p-6">
                    <Text className="text-base font-bold text-foreground">
                      {t('customer_home.no_account', 'No connection on this account yet')}
                    </Text>
                    <Text className="text-center text-sm text-muted-foreground">
                      {t('customer_home.no_account_desc', 'Your operator links your subscription to this login. Ask them to connect it.')}
                    </Text>
                  </Card>
                )
              : (
                  <CustomerConnectionCard
                    customer={customer}
                    onViewDetails={() => router.push('/customer/account')}
                    // Recharge is missing on purpose: taking money is
                    // `payments.collect`, which a subscriber is not granted, so
                    // the button would open a screen the server refuses.
                    onRaiseTicket={(_cust, conn) => setTicketFor({
                      customerId: customer.id,
                      customerName: customer.name,
                      ...(conn.subscriptionId === undefined ? {} : { subscriptionId: conn.subscriptionId }),
                      accountNumber: conn.packageName,
                    })}
                  />
                )}

        {/* The remote screen was registered but nothing reached it, so
            the `remotes.view` every customer is granted went unused. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('remote.public_remote')}
          onPress={() => router.push('/remote')}
          className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4 active:bg-muted"
        >
          <View className="size-11 items-center justify-center rounded-xl bg-primary-50">
            <HugeiconsIcon icon={RemoteControlIcon} size={22} color={colors.primary[600]} strokeWidth={2.2} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-semibold text-foreground">{t('remote.public_remote')}</Text>
            <Text className="text-xs text-muted-foreground">{t('remote.public_remote_desc')}</Text>
          </View>
          <HugeiconsIcon icon={ArrowRight01Icon} size={16} color={colors.neutral[400]} strokeWidth={2.4} />
        </Pressable>

        <Button label={t('profile.sign_out')} variant="outline" onPress={signOut} />
      </ScrollView>

      <RaiseTicketSheet target={ticketFor} onClose={() => setTicketFor(null)} />
    </View>
  );
}

export default CustomerDashboardScreen;

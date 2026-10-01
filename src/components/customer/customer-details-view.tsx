import type { CustomerDetail, CustomerEquipment, CustomerSubscription, CustomerTransaction } from '@/lib/api/types';
import {
  ArrowLeft02Icon,
  Call02Icon,
  Comment01Icon,
  CreditCardIcon,
  Location01Icon,
  Package01Icon,
  Tv01Icon,
  Wifi01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, RefreshControl, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StatusPill, TINT } from '@/components/common/shell';
import { colors, Pressable, Text, View } from '@/components/ui';
import { initials } from '@/lib/utils/admin-format';

export type CustomerDetailsData = {
  id: string;
  name: string;
  phone: string;
  alternatePhone?: string;
  address?: string;
  area?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'active' | 'inactive' | 'pending';
  packageName?: string;
  stbSerialNumber?: string;
  vcNumber?: string;
};

const DEFAULT_CUSTOMER_DETAIL: CustomerDetail = {
  id: 'cust-demo-101',
  customerCode: 'SSCN00101',
  name: 'Ramesh Kumar',
  phone: '9876543210',
  alternatePhone: null,
  whatsappNumber: null,
  status: 'active',
  outstandingBalance: '0.00',
  userId: null,
  locationId: null,
  locationPath: 'Mandapeta',
  address: '12-3-45, Main Road, Mandapeta',
  notes: null,
  subscriptions: [
    {
      id: 'sub-1',
      serviceAccountNumber: 'ACT9001',
      status: 'active',
      startDate: '2026-01-01',
      endDate: null,
      billingCycle: 'monthly',
      price: '350.00',
      outstandingBalance: '0.00',
      installationAddress: '12-3-45, Main Road, Mandapeta',
      service: { id: 'srv-1', name: 'Standard Cable HD Pack', slug: 'standard-cable-hd', icon: 'tv' },
      provider: { id: 'prov-1', name: 'Satya Cable', slug: 'satya-cable' },
      package: { id: 'pkg-1', name: 'Standard HD', slug: 'standard-hd', packageType: 'base' },
    },
  ],
  equipment: [
    {
      id: 'eq-1',
      subscriptionId: 'sub-1',
      name: 'HD Set-Top Box',
      serialNumber: 'STB123456789',
      status: 'active',
      assignedAt: '2026-01-01T00:00:00Z',
      returnedAt: null,
    },
  ],
  recentTransactions: [],
  summary: {
    subscriptions: 1,
    activeSubscriptions: 1,
    services: ['Standard Cable HD Pack'],
    monthlyValue: '350.00',
    outstandingBalance: '0.00',
  },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function normalizeCustomerDetail(c: CustomerDetail | CustomerDetailsData | undefined): CustomerDetail {
  if (!c)
    return DEFAULT_CUSTOMER_DETAIL;
  if ('subscriptions' in c && Array.isArray(c.subscriptions)) {
    return c as CustomerDetail;
  }
  const data = c as CustomerDetailsData;
  const statusLower = (data.status?.toLowerCase() || 'active') as 'active' | 'inactive' | 'pending';
  const finalStatus = statusLower === 'inactive' ? 'inactive' : statusLower === 'pending' ? 'pending' : 'active';
  return {
    id: data.id,
    customerCode: data.id,
    name: data.name,
    phone: data.phone,
    alternatePhone: data.alternatePhone || null,
    whatsappNumber: null,
    status: finalStatus,
    outstandingBalance: '0.00',
    userId: null,
    locationId: null,
    locationPath: data.area || null,
    address: data.address || null,
    notes: null,
    subscriptions: data.packageName
      ? [
          {
            id: 'sub-legacy-1',
            serviceAccountNumber: data.vcNumber || 'LEGACY-01',
            status: 'active',
            startDate: '2026-01-01',
            endDate: null,
            billingCycle: 'monthly',
            price: '350.00',
            outstandingBalance: '0.00',
            installationAddress: data.address || null,
            service: { id: 'srv-legacy', name: data.packageName, slug: 'cable', icon: 'tv' },
            provider: { id: 'prov-legacy', name: 'Satya Cable', slug: 'satya' },
            package: { id: 'pkg-legacy', name: data.packageName, slug: 'standard', packageType: 'cable' },
          },
        ]
      : [],
    equipment: data.stbSerialNumber
      ? [
          {
            id: 'eq-legacy-1',
            subscriptionId: 'sub-legacy-1',
            name: 'STB',
            serialNumber: data.stbSerialNumber,
            status: 'active',
            assignedAt: '2026-01-01T00:00:00Z',
            returnedAt: null,
          },
        ]
      : [],
    recentTransactions: [],
    summary: {
      subscriptions: data.packageName ? 1 : 0,
      activeSubscriptions: data.packageName ? 1 : 0,
      services: data.packageName ? [data.packageName] : [],
      monthlyValue: '350.00',
      outstandingBalance: '0.00',
    },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

export type CustomerDetailsViewProps = {
  customer?: CustomerDetail | CustomerDetailsData;
  role?: 'admin' | 'staff' | 'customer';
  onBack?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr)
    return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
  catch {
    return dateStr;
  }
}

function SubscriptionCardItem({ subscription }: { subscription: CustomerSubscription }) {
  const isAct = subscription.status === 'active';
  const isBroadband = subscription.service.slug.includes('broadband') || subscription.service.slug.includes('fiber');
  const ServiceIcon = isBroadband ? Wifi01Icon : Tv01Icon;

  return (
    <View className="gap-2.5 rounded-xl border border-border bg-card p-3.5">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-2.5 pr-2">
          <View className="rounded-lg bg-neutral-100 p-2 dark:bg-neutral-800">
            <HugeiconsIcon icon={ServiceIcon} size={18} color={colors.primary[500]} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-extrabold text-foreground" numberOfLines={1}>
              {subscription.service.name}
            </Text>
            <Text className="text-xs font-medium text-muted-foreground" numberOfLines={1}>
              {`${subscription.provider.name} • ${subscription.package.name}`}
            </Text>
          </View>
        </View>

        <StatusPill status={isAct ? 'active' : 'inactive'} />
      </View>

      <View className="flex-row flex-wrap items-center gap-2 border-t border-border/50 pt-2.5">
        <View className="min-w-[120px] flex-1 rounded-lg border border-border bg-surface px-2.5 py-1.5">
          <Text className="text-[10px] font-semibold text-muted-foreground">Account Number</Text>
          <Text className="text-xs font-bold text-foreground" numberOfLines={1}>
            {subscription.serviceAccountNumber}
          </Text>
        </View>

        <View className="min-w-[100px] flex-1 rounded-lg border border-border bg-surface px-2.5 py-1.5">
          <Text className="text-[10px] font-semibold text-muted-foreground">Price & Cycle</Text>
          <Text className="text-xs font-extrabold text-primary-600 dark:text-primary-400" numberOfLines={1}>
            {`₹${subscription.price} / ${subscription.billingCycle}`}
          </Text>
        </View>

        {subscription.startDate
          ? (
              <View className="rounded-lg border border-border bg-surface px-2.5 py-1.5">
                <Text className="text-[10px] font-semibold text-muted-foreground">Started</Text>
                <Text className="text-xs font-bold text-foreground" numberOfLines={1}>
                  {formatDate(subscription.startDate)}
                </Text>
              </View>
            )
          : null}
      </View>

      {subscription.installationAddress
        ? (
            <View className="flex-row items-center gap-1.5 pt-1">
              <HugeiconsIcon icon={Location01Icon} size={12} color={colors.neutral[400]} />
              <Text className="text-[11px] font-medium text-muted-foreground" numberOfLines={1}>
                {subscription.installationAddress}
              </Text>
            </View>
          )
        : null}
    </View>
  );
}

function EquipmentCardItem({ item }: { item: CustomerEquipment }) {
  const isAssigned = item.status === 'active';
  return (
    <View className="gap-1.5 rounded-xl border border-border bg-card p-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-xs font-extrabold text-foreground uppercase" numberOfLines={1}>
            {item.name}
          </Text>
          {item.serialNumber
            ? (
                <Text className="text-xs font-bold text-primary-600 dark:text-primary-400" numberOfLines={1}>
                  S/N:
                  {' '}
                  {item.serialNumber}
                </Text>
              )
            : null}
        </View>
        <View className={`rounded-full px-2 py-0.5 ${isAssigned ? 'bg-emerald-500/10' : 'bg-neutral-100 dark:bg-neutral-800'}`}>
          <Text className={`text-[10px] font-extrabold capitalize ${isAssigned ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-500'}`}>
            {item.status}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center gap-2 border-t border-border/40 pt-1">
        <Text className="text-[11px] font-medium text-muted-foreground">
          Assigned:
          {' '}
          {formatDate(item.assignedAt)}
        </Text>
        {item.returnedAt
          ? (
              <Text className="text-[11px] font-medium text-muted-foreground">
                • Returned:
                {' '}
                {formatDate(item.returnedAt)}
              </Text>
            )
          : null}
      </View>
    </View>
  );
}

function TransactionCardItem({ tx }: { tx: CustomerTransaction }) {
  const isCredit = Number(tx.credit) > 0;
  return (
    <View className="gap-1.5 rounded-xl border border-border bg-card p-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-xs font-extrabold text-foreground" numberOfLines={1}>
            {tx.transactionNo}
          </Text>
          <Text className="text-[11px] font-medium text-muted-foreground">
            {`${formatDate(tx.transactionDate)} • ${tx.transactionType}`}
          </Text>
        </View>
        <View className="items-end">
          <Text className={`text-xs font-extrabold ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
            {isCredit ? `+₹${tx.credit}` : `-₹${tx.debit}`}
          </Text>
          <Text className="text-[10px] font-semibold text-muted-foreground">
            Bal: ₹
            {tx.closingBalance}
          </Text>
        </View>
      </View>
      {tx.remarks
        ? (
            <Text className="border-t border-border/40 pt-1 text-[11px] text-muted-foreground" numberOfLines={1}>
              {tx.remarks}
            </Text>
          )
        : null}
    </View>
  );
}

export function CustomerDetailsView({
  customer: rawCustomer,
  role,
  onBack,
  onRefresh,
  isRefreshing = false,
}: CustomerDetailsViewProps) {
  const customer = React.useMemo(() => normalizeCustomerDetail(rawCustomer), [rawCustomer]);
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = onBack || (() => router.back());

  const handleCall = () => {
    if (customer.phone) {
      Linking.openURL(`tel:${customer.phone}`);
    }
  };

  const handleMessage = () => {
    if (customer.phone) {
      Linking.openURL(`sms:${customer.phone}`);
    }
  };

  const handleWhatsApp = () => {
    const rawNumber = customer.whatsappNumber || customer.phone;
    if (rawNumber) {
      const cleanPhone = rawNumber.replace(/\D/g, '');
      Linking.openURL(`https://wa.me/${cleanPhone}`);
    }
  };

  const displayName = customer.name || customer.customerCode || 'Customer';
  const hasDue = Number(customer.outstandingBalance) > 0;

  /**
   * What an operator does next from this page.
   *
   * Empty for a subscriber reading their own record: collecting is a staff act
   * against a round, and fitting a box moves stock. "View Customer Details" and
   * "Edit Customer" used to sit here with `onPress: () => {}` — a row that
   * looks tappable and answers nothing is worse than no row.
   */
  const actions = role === undefined || role === 'customer'
    ? []
    : [
        {
          id: 'collect-payment',
          title: 'Collect Payment',
          icon: CreditCardIcon,
          onPress: () => router.push(`/${role}/collect/${customer.id}`),
        },
        {
          id: 'issue-equipment',
          title: 'Issue Equipment',
          icon: Package01Icon,
          onPress: () => router.push({
            pathname: `/${role}/inventory/issue`,
            params: {
              customerId: customer.id,
              customerName: displayName,
              customerCode: customer.customerCode ?? '',
            },
          }),
        },
      ];

  return (
    <View className="flex-1 bg-surface">
      {/* Top Header Bar */}
      <View
        className="flex-row items-center justify-between border-b border-border bg-card px-4 py-3"
        style={{ paddingTop: Math.max(insets.top + 8, 16) }}
      >
        <Pressable
          accessibilityRole="button"
          onPress={handleBack}
          className="size-9 items-center justify-center rounded-full border border-border bg-surface active:bg-neutral-100 dark:active:bg-neutral-800"
        >
          <HugeiconsIcon icon={ArrowLeft02Icon} size={18} color={colors.neutral[700]} />
        </Pressable>

        <View className="flex-1 items-center px-3">
          <Text className="text-base font-extrabold text-foreground" numberOfLines={1}>
            {t('customer_details.title')}
          </Text>
        </View>

        <StatusPill status={customer.status} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: Math.max(insets.bottom + 24, 32) }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh
            ? (
                <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary[500]} />
              )
            : undefined
        }
      >
        {/* Profile Card */}
        <View className="items-center gap-2.5 rounded-2xl border border-border bg-card p-4">
          <View
            className="size-16 items-center justify-center rounded-full"
            style={{ backgroundColor: TINT.blue.bg }}
          >
            <Text className="text-xl font-extrabold" style={{ color: TINT.blue.fg }}>
              {initials(displayName)}
            </Text>
          </View>

          <View className="items-center gap-0.5">
            <Text className="text-center text-lg font-extrabold text-foreground">
              {displayName}
            </Text>
            {customer.customerCode
              ? (
                  <View className="mt-0.5 rounded-full border border-border bg-muted/40 px-2.5 py-0.5">
                    <Text className="text-[11px] font-bold text-primary-600 dark:text-primary-400">
                      {customer.customerCode}
                    </Text>
                  </View>
                )
              : null}
            {customer.phone
              ? (
                  <Text className="mt-0.5 text-xs font-semibold text-muted-foreground">
                    +91
                    {' '}
                    {customer.phone}
                  </Text>
                )
              : null}
            {customer.alternatePhone
              ? (
                  <Text className="text-xs font-medium text-muted-foreground">
                    Alt:
                    {' '}
                    {customer.alternatePhone}
                  </Text>
                )
              : null}
          </View>

          {/* Quick Contact Buttons */}
          <View className="mt-1 w-full flex-row items-center justify-center gap-3 border-t border-border pt-3">
            {customer.phone
              ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleCall}
                    className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-border bg-surface py-2.5 active:bg-neutral-100 dark:active:bg-neutral-800"
                  >
                    <HugeiconsIcon icon={Call02Icon} size={16} color={colors.primary[500]} />
                    <Text className="text-xs font-bold text-foreground">{t('customer_details.call')}</Text>
                  </Pressable>
                )
              : null}

            {customer.whatsappNumber || customer.phone
              ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleWhatsApp}
                    className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-border bg-surface py-2.5 active:bg-neutral-100 dark:active:bg-neutral-800"
                  >
                    <HugeiconsIcon icon={Comment01Icon} size={16} color="#25D366" />
                    <Text className="text-xs font-bold text-foreground">{t('customer_details.whatsapp')}</Text>
                  </Pressable>
                )
              : null}

            {customer.phone
              ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleMessage}
                    className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-border bg-surface py-2.5 active:bg-neutral-100 dark:active:bg-neutral-800"
                  >
                    <HugeiconsIcon icon={Comment01Icon} size={16} color={colors.neutral[600]} />
                    <Text className="text-xs font-bold text-foreground">{t('customer_details.message')}</Text>
                  </Pressable>
                )
              : null}
          </View>
        </View>

        {/* Financial & Lines Overview */}
        <View className="mt-3.5 flex-row gap-2.5">
          <View className={`flex-1 rounded-2xl border p-3.5 ${hasDue ? 'border-amber-500/30 bg-amber-500/5' : 'border-border bg-card'}`}>
            <Text className="text-[11px] font-semibold text-muted-foreground">{t('customer_details.outstanding_balance')}</Text>
            <Text className={`mt-0.5 text-lg font-extrabold ${hasDue ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
              ₹
              {customer.outstandingBalance}
            </Text>
          </View>

          <View className="flex-1 rounded-2xl border border-border bg-card p-3.5">
            <Text className="text-[11px] font-semibold text-muted-foreground">{t('customer_details.monthly_value')}</Text>
            <Text className="mt-0.5 text-lg font-extrabold text-foreground">
              ₹
              {customer.summary.monthlyValue}
            </Text>
          </View>

          <View className="flex-1 rounded-2xl border border-border bg-card p-3.5">
            <Text className="text-[11px] font-semibold text-muted-foreground">{t('customer_details.active_lines')}</Text>
            <Text className="mt-0.5 text-lg font-extrabold text-primary-600 dark:text-primary-400">
              {`${customer.summary.activeSubscriptions} / ${customer.summary.subscriptions}`}
            </Text>
          </View>
        </View>

        {/* Location & Address Section */}
        {customer.locationPath || customer.address || customer.notes
          ? (
              <View className="mt-3.5 gap-2 rounded-2xl border border-border bg-card p-4">
                <View className="flex-row items-center gap-2">
                  <HugeiconsIcon icon={Location01Icon} size={16} color={colors.primary[500]} />
                  <Text className="text-xs font-extrabold tracking-wider text-foreground uppercase">
                    {t('customer_details.location')}
                  </Text>
                </View>

                {customer.locationPath
                  ? (
                      <Text className="text-xs/relaxed font-bold text-foreground">
                        {customer.locationPath}
                      </Text>
                    )
                  : null}

                {customer.address
                  ? (
                      <Text className="text-xs font-medium text-muted-foreground">
                        {customer.address}
                      </Text>
                    )
                  : null}

                {customer.notes
                  ? (
                      <View className="mt-1 rounded-lg border border-border/60 bg-surface p-2.5">
                        <Text className="text-[11px] font-medium text-muted-foreground">
                          Note:
                          {' '}
                          {customer.notes}
                        </Text>
                      </View>
                    )
                  : null}
              </View>
            )
          : null}

        {/* Subscriptions List Section */}
        <View className="mt-4 gap-2.5">
          <View className="flex-row items-center justify-between px-1">
            <Text className="text-xs font-extrabold tracking-wider text-foreground uppercase">
              {t('customer_details.subscriptions')}
              {' '}
              (
              {customer.subscriptions.length}
              )
            </Text>
          </View>

          {customer.subscriptions.length === 0
            ? (
                <View className="items-center justify-center rounded-xl border border-border bg-card p-4">
                  <Text className="text-xs font-medium text-muted-foreground">
                    {t('customer_details.no_subscriptions')}
                  </Text>
                </View>
              )
            : (
                customer.subscriptions.map(sub => (
                  <SubscriptionCardItem key={sub.id} subscription={sub} />
                ))
              )}
        </View>

        {/* Equipment on Loan Section */}
        <View className="mt-4 gap-2.5">
          <View className="flex-row items-center justify-between px-1">
            <Text className="text-xs font-extrabold tracking-wider text-foreground uppercase">
              {t('customer_details.equipment_on_loan')}
              {' '}
              (
              {customer.equipment.length}
              )
            </Text>
          </View>

          {customer.equipment.length === 0
            ? (
                <View className="items-center justify-center rounded-xl border border-border bg-card p-4">
                  <Text className="text-xs font-medium text-muted-foreground">
                    {t('customer_details.no_equipment')}
                  </Text>
                </View>
              )
            : (
                customer.equipment.map(eq => (
                  <EquipmentCardItem key={eq.id} item={eq} />
                ))
              )}
        </View>

        {/* Recent Transactions Section */}
        <View className="mt-4 gap-2.5">
          <View className="flex-row items-center justify-between px-1">
            <Text className="text-xs font-extrabold tracking-wider text-foreground uppercase">
              {t('customer_details.recent_transactions')}
              {' '}
              (
              {customer.recentTransactions.length}
              )
            </Text>
          </View>

          {customer.recentTransactions.length === 0
            ? (
                <View className="items-center justify-center rounded-xl border border-border bg-card p-4">
                  <Text className="text-xs font-medium text-muted-foreground">
                    {t('customer_details.no_transactions')}
                  </Text>
                </View>
              )
            : (
                customer.recentTransactions.map(tx => (
                  <TransactionCardItem key={tx.id} tx={tx} />
                ))
              )}
        </View>

        {/* Quick Actions List Items (when role is provided) */}
        {actions.length > 0
          ? (
              <View className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
                <Text className="border-b border-border/60 p-3.5 text-xs font-extrabold tracking-wider text-muted-foreground uppercase">
                  Quick Actions
                </Text>
                <View className="divide-y divide-border/60">
                  {actions.map(item => (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      onPress={item.onPress}
                      className="flex-row items-center justify-between p-3.5 active:bg-muted/40"
                    >
                      <View className="flex-row items-center">
                        <View className="size-8 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-950/40">
                          <HugeiconsIcon icon={item.icon} size={16} color={colors.primary[500]} />
                        </View>
                        <Text className="ml-3 text-sm font-bold text-foreground">
                          {item.title}
                        </Text>
                      </View>
                      <Text className="text-sm text-muted-foreground">›</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )
          : null}
      </ScrollView>
    </View>
  );
}

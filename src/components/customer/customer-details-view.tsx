import type { IconSvgElement } from '@hugeicons/react-native';
import type { RaiseTicketTarget } from '@/components/tickets/raise-ticket-sheet';
import type { CustomerDetail, CustomerEquipment, CustomerSubscription, CustomerTransaction } from '@/lib/api/types';
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowDown02Icon,
  ArrowLeft02Icon,
  ArrowRight01Icon,
  ArrowUp02Icon,
  Calendar03Icon,
  Call02Icon,
  CheckListIcon,
  CreditCardIcon,
  IdIcon,
  Location01Icon,
  Message01Icon,
  MoreVerticalIcon,
  Note01Icon,
  PencilEdit02Icon,
  RouterIcon,
  Tv01Icon,
  UserIcon,
  WhatsappIcon,
  Wifi01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, RefreshControl, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, IconTile, Segmented, StatusPill, TINT } from '@/components/common/shell';
import { EditCustomerSheet } from '@/components/customer/edit-customer-sheet';
import { RaiseTicketSheet } from '@/components/tickets/raise-ticket-sheet';
import { Button, colors, Pressable, Text, ThemedIcon, View } from '@/components/ui';
import { dateTime, dayMonthYear } from '@/lib/utils/admin-format';

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
      locationId: 'location-1',
      serviceAccountNumber: 'ACT9001',
      status: 'active',
      startDate: '2026-01-01',
      endDate: null,
      billingCycle: 'monthly',
      price: '350.00',
      chargedThrough: null,
      nextPlanCharge: '0.00',
      outstandingBalance: '0.00',
      installationAddress: '12-3-45, Main Road, Mandapeta',
      service: { id: 'srv-1', name: 'Standard Cable HD Pack', slug: 'standard-cable-hd', icon: 'tv' },
      provider: { id: 'prov-1', name: 'Satya Cable', slug: 'satya-cable' },
      plan: { id: 'plan-1', name: 'Standard HD', slug: 'standard-hd', price: '400.00', discount: '50.00', amount: '350.00', billingCycle: 'monthly' },
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
            locationId: 'location-1',
            serviceAccountNumber: data.vcNumber || 'LEGACY-01',
            status: 'active',
            startDate: '2026-01-01',
            endDate: null,
            billingCycle: 'monthly',
            price: '350.00',
            chargedThrough: null,
            nextPlanCharge: '0.00',
            outstandingBalance: '0.00',
            installationAddress: data.address || null,
            service: { id: 'srv-legacy', name: data.packageName, slug: 'cable', icon: 'tv' },
            provider: { id: 'prov-legacy', name: 'Satya Cable', slug: 'satya' },
            plan: { id: 'plan-legacy', name: data.packageName, slug: 'standard', price: '350.00', discount: '0.00', amount: '350.00', billingCycle: 'monthly' },
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

const formatDate = (value: string | null | undefined) => (value ? dayMonthYear(new Date(value)) : '—');
const capitalize = (value?: string | null) => (value ? value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ') : '—');
const isBroadband = (sub: CustomerSubscription) => /broadband|fiber/.test(sub.service.slug);

/** Credit green, due red, settled plain: the same reading as the list's balance chips. */
function balanceTone(value: number) {
  if (value < 0)
    return { tint: TINT.green, text: 'text-green-600 dark:text-green-400' };
  if (value > 0)
    return { tint: TINT.red, text: 'text-red-600 dark:text-red-400' };
  return { tint: undefined, text: 'text-foreground' };
}

type DetailTab = 'overview' | 'services' | 'payments' | 'equipment';

const DETAIL_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'services', label: 'Services' },
  { key: 'payments', label: 'Payments' },
  { key: 'equipment', label: 'Equipment' },
] as const;

const PAYMENT_RANGES = [
  { months: 1, label: 'Last Month' },
  { months: 3, label: 'Last 3 Months' },
  { months: 6, label: 'Last 6 Months' },
  { months: 0, label: 'All' },
] as const;

function Panel({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <View className={`rounded-2xl border border-border bg-card p-4 ${className}`}>{children}</View>;
}

function ContactButton({ icon, color, label, onPress }: {
  icon: IconSvgElement;
  color: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className="flex-1 items-center gap-1.5 active:opacity-70">
      <View className="size-11 items-center justify-center rounded-full" style={{ backgroundColor: `${color}1F` }}>
        <HugeiconsIcon icon={icon} size={20} color={color} />
      </View>
      <Text className="text-xs font-medium text-muted-foreground">{label}</Text>
    </Pressable>
  );
}

/** Label beside value. Values are selectable, so a long-press copies an account or serial number. */
function DetailRow({ label, value, icon, valueClassName = 'text-foreground', children }: {
  label: string;
  value?: string | null;
  icon?: IconSvgElement;
  valueClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-start gap-2 py-2">
      {icon ? <ThemedIcon icon={icon} size={16} colorClassName="text-muted-foreground" /> : null}
      <Text className="w-[38%] text-[13px] text-muted-foreground">{label}</Text>
      {children ?? <Text selectable className={`flex-1 text-[13px] font-medium ${valueClassName}`}>{value || '—'}</Text>}
    </View>
  );
}

function StatusDot({ active, label }: { active: boolean; label: string }) {
  return (
    <View className="flex-1 flex-row items-center gap-1.5">
      <View className={`size-2.5 rounded-full ${active ? 'bg-green-500' : 'bg-neutral-400'}`} />
      <Text className="text-[13px] font-medium text-foreground">{label}</Text>
    </View>
  );
}

function Badge({ label, tint }: { label: string; tint: { bg: string; fg: string } }) {
  return (
    <View className="rounded-md px-2 py-1" style={{ backgroundColor: tint.bg }}>
      <Text className="text-[11px] font-semibold" style={{ color: tint.fg }}>{label}</Text>
    </View>
  );
}

function SectionHead({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View className="mt-5 mb-3 flex-row items-center justify-between">
      <Text className="text-[17px] font-bold text-foreground">{title}</Text>
      {action}
    </View>
  );
}

function EmptyNote({ children }: { children: string }) {
  return (
    <View className="items-center rounded-xl border border-border bg-card p-4">
      <Text className="text-xs font-medium text-muted-foreground">{children}</Text>
    </View>
  );
}

function StatTile({ icon, tint, value, label }: { icon: IconSvgElement; tint: 'green' | 'orange' | 'purple'; value: string; label: string }) {
  return (
    <View className="flex-1 gap-2 rounded-2xl border border-border bg-card p-3">
      <IconTile icon={icon} tint={tint} size={34} iconSize={18} />
      <Text adjustsFontSizeToFit numberOfLines={1} className="text-lg font-bold text-foreground">{value}</Text>
      <Text className="text-xs text-muted-foreground" numberOfLines={1}>{label}</Text>
    </View>
  );
}

function SummaryTile({ value, label, tint }: { value: string; label: string; tint: { bg: string; fg: string } }) {
  return (
    <View className="w-[48.5%] gap-0.5 rounded-xl p-3" style={{ backgroundColor: tint.bg }}>
      <Text adjustsFontSizeToFit numberOfLines={1} className="text-lg font-bold" style={{ color: tint.fg }}>{value}</Text>
      <Text className="text-xs" style={{ color: tint.fg }}>{label}</Text>
    </View>
  );
}

function OverviewTab({ customer }: { customer: CustomerDetail }) {
  const balance = Number(customer.outstandingBalance);
  const tone = balanceTone(balance);

  return (
    <View className="mt-4 gap-3">
      <View
        className={`rounded-2xl p-4 ${tone.tint ? '' : 'border border-border bg-card'}`}
        style={tone.tint ? { backgroundColor: tone.tint.bg } : undefined}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-medium text-foreground">Outstanding Balance</Text>
          {tone.tint ? <Badge label={balance < 0 ? 'Credit' : 'Due'} tint={tone.tint} /> : null}
        </View>
        <Text testID="customer-outstanding" className={`mt-1 text-3xl font-bold ${tone.text}`}>{`₹${customer.outstandingBalance}`}</Text>
        <Text className={`text-xs ${tone.text}`}>
          {balance < 0 ? 'Customer is in credit' : balance > 0 ? 'Payment pending' : 'No dues'}
        </Text>
      </View>

      <View className="flex-row gap-2">
        <StatTile icon={CheckListIcon} tint="green" value={String(customer.summary.activeSubscriptions)} label={customer.summary.activeSubscriptions === 1 ? 'Active Service' : 'Active Services'} />
        <StatTile icon={Calendar03Icon} tint="orange" value={`₹${customer.summary.monthlyValue}`} label="Monthly Value" />
        <StatTile icon={CreditCardIcon} tint="purple" value={String(customer.recentTransactions.length)} label="Transactions" />
      </View>

      <Panel>
        <Text className="mb-1 text-[15px] font-bold text-foreground">Customer Information</Text>
        <DetailRow icon={IdIcon} label="Customer Code" value={customer.customerCode} />
        <DetailRow icon={UserIcon} label="Name" value={customer.name} />
        <DetailRow icon={Call02Icon} label="Phone">
          <Pressable accessibilityRole="link" disabled={!customer.phone} onPress={() => Linking.openURL(`tel:${customer.phone}`)} className="flex-1 flex-row items-center gap-2">
            <Text selectable className="text-[13px] font-medium text-foreground">{customer.phone || '—'}</Text>
            {customer.phone ? <HugeiconsIcon icon={Call02Icon} size={14} color={TINT.blue.fg} /> : null}
          </Pressable>
        </DetailRow>
        <DetailRow icon={Call02Icon} label="Alternate Phone" value={customer.alternatePhone} />
        <DetailRow icon={CheckListIcon} label="Status">
          <StatusDot active={customer.status === 'active'} label={capitalize(customer.status)} />
        </DetailRow>
      </Panel>

      {customer.locationPath || customer.address
        ? (
            <Panel>
              <View className="mb-2 flex-row items-center gap-2">
                <HugeiconsIcon icon={Location01Icon} size={18} color={TINT.blue.fg} />
                <Text className="text-[15px] font-bold text-foreground">Address & Location</Text>
              </View>
              {customer.locationPath ? <Text selectable className="text-[13px] font-medium text-foreground">{customer.locationPath}</Text> : null}
              {customer.address ? <Text selectable className="mt-0.5 text-[13px] text-muted-foreground">{customer.address}</Text> : null}
            </Panel>
          )
        : null}

      {customer.notes
        ? (
            <Panel>
              <View className="mb-2 flex-row items-center gap-2">
                <ThemedIcon icon={Note01Icon} size={18} colorClassName="text-foreground" />
                <Text className="text-[15px] font-bold text-foreground">Notes</Text>
              </View>
              <Text selectable className="text-[13px] text-foreground">{customer.notes}</Text>
            </Panel>
          )
        : null}
    </View>
  );
}

function ServiceCard({ sub, onManage }: { sub: CustomerSubscription; onManage?: () => void }) {
  const outstanding = Number(sub.outstandingBalance);
  const active = sub.status === 'active';
  return (
    <Panel className="gap-1">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Manage ${sub.service.name}`}
        disabled={!onManage}
        onPress={onManage}
        className="mb-2 flex-row items-center gap-3 active:opacity-70"
      >
        <View className="size-12 items-center justify-center rounded-full" style={{ backgroundColor: TINT.orange.bg }}>
          <HugeiconsIcon icon={isBroadband(sub) ? Wifi01Icon : Tv01Icon} size={22} color={TINT.orange.fg} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-foreground" numberOfLines={1}>{sub.service.name}</Text>
          <Text className="text-[13px] text-muted-foreground" numberOfLines={1}>{sub.provider.name}</Text>
        </View>
        <Badge label={capitalize(sub.status)} tint={active ? TINT.green : TINT.red} />
        {onManage ? <HugeiconsIcon icon={ArrowRight01Icon} size={18} color={TINT.orange.fg} /> : null}
      </Pressable>

      <DetailRow label="Service Account No." value={sub.serviceAccountNumber} valueClassName="text-foreground font-bold" />
      <DetailRow label="Plan" value={sub.plan.name} />
      <DetailRow label="Billing Cycle" value={capitalize(sub.billingCycle)} />
      {Number(sub.plan.discount) > 0
        ? <DetailRow label="Plan Price" value={`₹${sub.plan.price} − ₹${sub.plan.discount} off`} />
        : null}
      <DetailRow label="Per Cycle" value={`₹${sub.price}`} />
      <DetailRow label="Outstanding" value={`₹${sub.outstandingBalance}`} valueClassName={balanceTone(outstanding).text} />
      <DetailRow label="Start Date" value={formatDate(sub.startDate)} />
      <DetailRow label="Next Charge" value={Number(sub.nextPlanCharge) > 0 ? `₹${sub.nextPlanCharge}` : '—'} />
      <DetailRow label="Charged Through" value={formatDate(sub.chargedThrough)} />
      {sub.installationAddress
        ? (
            <View className="mt-1 flex-row items-start gap-2 border-t border-border/60 pt-3">
              <ThemedIcon icon={Location01Icon} size={16} colorClassName="text-muted-foreground" />
              <View className="flex-1">
                <Text className="text-xs text-muted-foreground">Installation Address</Text>
                <Text selectable className="text-[13px] font-medium text-foreground">{sub.installationAddress}</Text>
              </View>
            </View>
          )
        : null}

      <View className="mt-1 flex-row items-center gap-3 border-t border-border/60 pt-3">
        <Avatar name={sub.provider.name} size={36} />
        <View className="flex-1">
          <Text className="text-xs text-muted-foreground">Service Provider</Text>
          <Text className="text-[13px] font-semibold text-foreground">{sub.provider.name}</Text>
        </View>
      </View>
    </Panel>
  );
}

function TransactionRow({ tx }: { tx: CustomerTransaction }) {
  const isCredit = Number(tx.credit) > 0;
  const tint = isCredit ? TINT.green : TINT.red;
  return (
    <View className="flex-row items-start gap-3 border-b border-border/60 py-3">
      <View className="size-10 items-center justify-center rounded-full" style={{ backgroundColor: tint.bg }}>
        <HugeiconsIcon icon={isCredit ? ArrowDown02Icon : ArrowUp02Icon} size={20} color={tint.fg} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text selectable className="text-sm font-bold text-foreground" numberOfLines={1}>{tx.transactionNo}</Text>
        <Text className="text-xs text-muted-foreground">{dateTime(tx.transactionDate)}</Text>
        {tx.remarks ? <Text className="text-xs text-muted-foreground" numberOfLines={2}>{tx.remarks}</Text> : null}
      </View>
      <View className="items-end gap-0.5">
        <Text className="text-sm font-bold" style={{ color: tint.fg }}>{`₹${isCredit ? tx.credit : tx.debit}`}</Text>
        <Text className="text-xs text-muted-foreground">{`Closing: ₹${tx.closingBalance}`}</Text>
      </View>
    </View>
  );
}

function PaymentsTab({ customer }: { customer: CustomerDetail }) {
  const [months, setMonths] = React.useState<number>(3);
  const [picking, setPicking] = React.useState(false);
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  // ponytail: filters the detail's recent ledger only; page `/transactions` if older history is needed here.
  const txs = months === 0 ? customer.recentTransactions : customer.recentTransactions.filter(tx => new Date(tx.transactionDate) >= since);
  const sum = (key: 'credit' | 'debit') => txs.reduce((total, tx) => total + Number(tx[key] || 0), 0).toFixed(2);

  return (
    <View className="mt-4">
      <Panel>
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-[17px] font-bold text-foreground">Payment Summary</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose period"
            onPress={() => setPicking(open => !open)}
            className="flex-row items-center gap-1.5 rounded-lg border border-border px-3 py-1.5"
          >
            <Text className="text-xs font-medium text-foreground">{PAYMENT_RANGES.find(r => r.months === months)?.label}</Text>
            <HugeiconsIcon icon={ArrowDown01Icon} size={14} color={colors.neutral[500]} />
          </Pressable>
        </View>
        {picking
          ? (
              <View className="mb-3 overflow-hidden rounded-xl border border-border">
                {PAYMENT_RANGES.map(range => (
                  <Pressable
                    key={range.months}
                    accessibilityRole="button"
                    onPress={() => {
                      setMonths(range.months);
                      setPicking(false);
                    }}
                    className="px-4 py-2.5 active:bg-muted/40"
                  >
                    <Text className={`text-[13px] ${range.months === months ? 'font-bold text-primary-600' : 'text-foreground'}`}>{range.label}</Text>
                  </Pressable>
                ))}
              </View>
            )
          : null}
        <View className="flex-row flex-wrap justify-between gap-y-2">
          <SummaryTile value={`₹${sum('credit')}`} label="Total Credits" tint={TINT.green} />
          <SummaryTile value={`₹${sum('debit')}`} label="Total Debits" tint={TINT.red} />
          <SummaryTile value={String(txs.length)} label="Transactions" tint={TINT.blue} />
          <SummaryTile value={`₹${customer.outstandingBalance}`} label="Current Balance" tint={TINT.purple} />
        </View>
      </Panel>

      <SectionHead title="Transaction History" />
      {txs.length === 0
        ? <EmptyNote>No transactions in this period</EmptyNote>
        : txs.map(tx => <TransactionRow key={tx.id} tx={tx} />)}
    </View>
  );
}

function EquipmentCard({ item, line }: { item: CustomerEquipment; line?: CustomerSubscription }) {
  const active = item.status === 'active';
  const assignedTo = line ? `${line.serviceAccountNumber} (${line.service.name})` : null;
  return (
    <Panel className="gap-1">
      <View className="mb-2 flex-row items-center gap-3">
        <View className="size-12 items-center justify-center rounded-full bg-muted">
          <ThemedIcon icon={RouterIcon} size={22} colorClassName="text-foreground" />
        </View>
        <Text className="flex-1 text-base font-bold text-foreground" numberOfLines={2}>{item.name}</Text>
        <Badge label={capitalize(item.status)} tint={active ? TINT.green : TINT.red} />
      </View>
      <DetailRow label="Serial Number" value={item.serialNumber} valueClassName="text-foreground font-bold" />
      <DetailRow label="Assigned To" value={assignedTo} />
      <DetailRow label="Assigned On" value={formatDate(item.assignedAt)} />
      <DetailRow label="Status">
        <StatusDot active={active} label={capitalize(item.status)} />
      </DetailRow>

      <View className="mt-2 border-t border-border/60 pt-3">
        <Text className="mb-2 text-sm font-bold text-foreground">History</Text>
        <TimelineStep color="bg-green-500" title="Assigned" detail={`${dateTime(item.assignedAt)}${assignedTo ? `\nto ${assignedTo}` : ''}`} last={false} />
        {item.returnedAt
          ? <TimelineStep color="bg-red-500" title="Returned" detail={dateTime(item.returnedAt)} last />
          : <TimelineStep color="bg-neutral-600" title={active ? 'Currently Active' : capitalize(item.status)} detail={active ? 'In use' : ''} last />}
      </View>
    </Panel>
  );
}

function TimelineStep({ color, title, detail, last }: { color: string; title: string; detail: string; last: boolean }) {
  return (
    <View className="flex-row gap-3">
      <View className="items-center">
        <View className={`mt-1 size-3 rounded-full ${color}`} />
        {last ? null : <View className="w-px flex-1 bg-border" />}
      </View>
      <View className="flex-1 pb-3">
        <Text className="text-sm font-semibold text-foreground">{title}</Text>
        {detail ? <Text className="text-xs text-muted-foreground">{detail}</Text> : null}
      </View>
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
  const [tab, setTab] = React.useState<DetailTab>('overview');
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [ticketFor, setTicketFor] = React.useState<RaiseTicketTarget | null>(null);
  const [editing, setEditing] = React.useState(false);

  const handleBack = onBack || (() => router.back());
  const displayName = customer.name || customer.customerCode || 'Customer';
  const plan = customer.subscriptions.find(sub => sub.status === 'active') ?? customer.subscriptions[0];
  const whatsapp = customer.phone?.replace(/\D/g, '');

  /**
   * What an operator does next from this page.
   *
   * Nothing for a subscriber reading their own record: collecting is a staff act
   * against a round, and fitting a box moves stock.
   */
  const isOperator = role === 'admin' || role === 'staff';
  const base = role === 'staff' ? '/staff' : '/admin';
  const recharge = (subscriptionId?: string) => router.push({
    pathname: `${base}/recharge/[id]`,
    params: { id: customer.id, ...(subscriptionId ? { subscriptionId } : {}) },
  });
  const issueEquipment = () => router.push({
    pathname: `${base}/inventory/issue`,
    params: { customerId: customer.id, customerName: displayName, customerCode: customer.customerCode ?? '' },
  });
  const raiseTicket = () => {
    setMenuOpen(false);
    setTicketFor({
      customerId: customer.id,
      customerName: displayName,
      ...(plan ? { subscriptionId: plan.id, accountNumber: plan.serviceAccountNumber } : {}),
    });
  };

  return (
    <View className="flex-1 bg-card">
      <View className="flex-row items-center gap-1 px-2" style={{ paddingTop: Math.max(insets.top, 12) }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={handleBack}
          className="size-10 items-center justify-center rounded-full active:bg-muted/40"
        >
          <ThemedIcon icon={ArrowLeft02Icon} size={22} colorClassName="text-foreground" />
        </Pressable>
        <Text className="flex-1 text-lg font-bold text-foreground">{t('customer_details.title')}</Text>
        {isOperator
          ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="More actions"
                onPress={() => setMenuOpen(open => !open)}
                className="size-10 items-center justify-center rounded-full active:bg-muted/40"
              >
                <ThemedIcon icon={MoreVerticalIcon} size={22} colorClassName="text-foreground" />
              </Pressable>
            )
          : null}
      </View>

      {menuOpen
        ? (
            <View
              className="absolute right-3 z-20 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
              style={{ top: Math.max(insets.top, 12) + 44 }}
            >
              <Pressable accessibilityRole="button" onPress={raiseTicket} className="px-4 py-3 active:bg-muted/40">
                <Text className="text-sm font-semibold text-foreground">Raise Ticket</Text>
              </Pressable>
            </View>
          )
        : null}

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: isOperator ? 24 : Math.max(insets.bottom + 24, 32) }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh
            ? <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary[500]} />
            : undefined
        }
      >
        <View className="flex-row items-center gap-3 pt-3">
          <Avatar name={displayName} size={64} />
          <View className="flex-1 gap-0.5">
            <Text className="text-lg font-bold text-foreground" numberOfLines={2}>{displayName}</Text>
            {customer.customerCode ? <Text selectable className="text-sm text-muted-foreground">{customer.customerCode}</Text> : null}
          </View>
          <StatusPill status={customer.status} />
        </View>

        {customer.phone || isOperator
          ? (
              <View className="mt-4 flex-row">
                {customer.phone
                  ? (
                      <>
                        <ContactButton icon={Call02Icon} color={TINT.blue.fg} label={t('customer_details.call')} onPress={() => Linking.openURL(`tel:${customer.phone}`)} />
                        <ContactButton icon={WhatsappIcon} color="#25D366" label={t('customer_details.whatsapp')} onPress={() => Linking.openURL(`https://wa.me/${whatsapp}`)} />
                        <ContactButton icon={Message01Icon} color={TINT.purple.fg} label={t('customer_details.message')} onPress={() => Linking.openURL(`sms:${customer.phone}`)} />
                      </>
                    )
                  : null}
                {isOperator
                  ? <ContactButton icon={PencilEdit02Icon} color={colors.neutral[500]} label="Edit" onPress={() => setEditing(true)} />
                  : null}
              </View>
            )
          : null}

        <View className="mt-4">
          <Segmented options={DETAIL_TABS} value={tab} onChange={setTab} />
        </View>

        {tab === 'overview' ? <OverviewTab customer={customer} /> : null}

        {tab === 'services'
          ? (
              <>
                <SectionHead title={customer.subscriptions.length === 1 ? 'Active Service' : 'Active Services'} />
                <View className="gap-3">
                  {customer.subscriptions.length === 0
                    ? <EmptyNote>{t('customer_details.no_subscriptions')}</EmptyNote>
                    : customer.subscriptions.map(sub => (
                        <ServiceCard key={sub.id} sub={sub} onManage={isOperator ? () => recharge(sub.id) : undefined} />
                      ))}
                </View>
              </>
            )
          : null}

        {tab === 'payments' ? <PaymentsTab customer={customer} /> : null}

        {tab === 'equipment'
          ? (
              <>
                <SectionHead
                  title="Equipment"
                  action={isOperator
                    ? (
                        <Pressable
                          accessibilityRole="button"
                          onPress={issueEquipment}
                          className="flex-row items-center gap-1.5 rounded-xl border border-primary-500 px-3 py-2 active:bg-primary-50 dark:active:bg-primary-950/40"
                        >
                          <HugeiconsIcon icon={Add01Icon} size={16} color={colors.primary[500]} />
                          <Text className="text-[13px] font-bold text-primary-500">Add Equipment</Text>
                        </Pressable>
                      )
                    : undefined}
                />
                <View className="gap-3">
                  {customer.equipment.length === 0
                    ? <EmptyNote>{t('customer_details.no_equipment')}</EmptyNote>
                    : customer.equipment.map(eq => (
                        <EquipmentCard key={eq.id} item={eq} line={customer.subscriptions.find(sub => sub.id === eq.subscriptionId)} />
                      ))}
                </View>
              </>
            )
          : null}
      </ScrollView>

      {isOperator
        ? (
            <View className="border-t border-border/60 bg-card px-4 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
              <Button
                label="Collect Payment"
                className="h-12 rounded-xl bg-primary-500"
                textClassName="text-base font-bold"
                onPress={() => recharge(plan?.id)}
              />
            </View>
          )
        : null}

      <RaiseTicketSheet target={ticketFor} onClose={() => setTicketFor(null)} />
      <EditCustomerSheet customer={editing ? customer : null} onClose={() => setEditing(false)} />
    </View>
  );
}

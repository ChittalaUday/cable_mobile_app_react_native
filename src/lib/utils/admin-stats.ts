export type Bar = { key: string; label: string; value: number };
export type Slice = { id: string; label: string; count: number; share: number };
export type CustomerStatus = 'active' | 'inactive' | 'pending';
export type CustomerRow = { id: string; name: string; phone: string; status: CustomerStatus; ago: string };
export type ActivityKind = 'customer' | 'connection' | 'payment' | 'ticket';
export type ActivityRow = { id: string; kind: ActivityKind; title: string; subtitle: string; ago: string };
export type RevenueRange = 'daily' | 'weekly' | 'monthly';
export type AreaRow = { id: string; name: string; count: number; share: number };
export type StaffRow = {
  id: string;
  name: string;
  collected: number;
  bills: number;
  ticketsClosed: number;
  lastAction: string;
  ago: string | null;
};

export type AdminDashboard = {
  totalCustomers: number;
  totalCustomersDelta: number | null;
  totalCustomersSeries: number[];
  activeConnections: number;
  activeDelta: number | null;
  activeSeries: number[];
  inactiveConnections: number;
  inactiveDelta: number | null;
  inactiveSeries: number[];
  revenueThisMonth: number;
  revenueDelta: number | null;
  revenueSeries: number[];
  revenue: Record<RevenueRange, Bar[]>;
  connectionStatus: Slice[];
  services: Slice[];
  recentCustomers: CustomerRow[];
  activity: ActivityRow[];
  collectedToday: number;
  collectedWeek: number;
  outstandingDues: number;
  dueAccounts: number;
  arpu: number;
  areas: AreaRow[];
  staff: StaffRow[];
};

export type AccountDoc = {
  id?: string;
  customerId?: string;
  status?: string;
  msoShareDue?: number;
  serviceType?: string;
  serviceTypeName?: string;
  createdAt?: string;
};
export type CustomerDoc = { id?: string; name?: string; phone?: string; address?: string; createdAt?: string };
export type PaymentDoc = { id?: string; amount?: number; paidAt?: string; subscriberName?: string; subscriberId?: string; collectorId?: string };
export type StaffDoc = { id?: string; name?: string; email?: string };
export type TicketDoc = { id?: string; assignedTo?: string; status?: string; subject?: string; resolvedAt?: string; updatedAt?: string };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY = 86_400_000;

export const SPARK_POINTS = 8;
export const BAR_POINTS = 9;

export function parseDate(value?: string) {
  if (!value)
    return null;
  const dmy = /^(\d{2})-(\d{2})-(\d{4})/.exec(value);
  const date = dmy ? new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1])) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function growth(current: number, previous: number) {
  return previous > 0 ? ((current - previous) / previous) * 100 : null;
}

export function relativeTime(from: Date, now: Date) {
  const minutes = Math.max(0, Math.round((now.getTime() - from.getTime()) / 60_000));
  if (minutes < 1)
    return 'just now';
  if (minutes < 60)
    return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24)
    return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30)
    return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.round(days / 30);
  return `${months} mo${months === 1 ? '' : 's'} ago`;
}

function share(count: number, total: number) {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

function normaliseStatus(status?: string): CustomerStatus {
  const value = (status ?? '').toLowerCase();
  if (value.includes('act') && !value.includes('deact') && !value.includes('inact'))
    return 'active';
  return value.includes('pend') ? 'pending' : 'inactive';
}

function monthEnds(now: Date, points: number) {
  return Array.from({ length: points }, (_, index) =>
    new Date(now.getFullYear(), now.getMonth() - (points - 1 - index) + 1, 1).getTime());
}

function cumulativeSeries(times: (number | null)[], now: Date, points = SPARK_POINTS) {
  const undated = times.filter(time => time === null).length;
  return monthEnds(now, points).map(end => undated + times.filter(time => time !== null && time < end).length);
}

export function summariseAccounts(accounts: AccountDoc[], now: Date) {
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const statusByCustomer = new Map<string, CustomerStatus>();
  const serviceCounts = new Map<string, number>();
  const counts: Record<CustomerStatus, number> = { active: 0, inactive: 0, pending: 0 };
  const allTimes: (number | null)[] = [];
  const activeTimes: (number | null)[] = [];
  const inactiveTimes: (number | null)[] = [];
  const activations: { name: string; at: Date }[] = [];

  let addedThisMonth = 0;
  let addedLastMonth = 0;
  let activeThisMonth = 0;
  let inactiveThisMonth = 0;
  let outstandingDues = 0;
  let dueAccounts = 0;

  for (const account of accounts) {
    const status = normaliseStatus(account.status);
    counts[status] += 1;
    if (account.customerId && !statusByCustomer.has(account.customerId))
      statusByCustomer.set(account.customerId, status);

    const service = account.serviceTypeName || account.serviceType || 'Unassigned';
    serviceCounts.set(service, (serviceCounts.get(service) ?? 0) + 1);

    const due = Number(account.msoShareDue) || 0;
    if (due > 0) {
      outstandingDues += due;
      dueAccounts += 1;
    }

    const created = parseDate(account.createdAt);
    const time = created?.getTime() ?? null;
    allTimes.push(time);
    if (status === 'active')
      activeTimes.push(time);
    if (status === 'inactive')
      inactiveTimes.push(time);
    if (status === 'active' && created)
      activations.push({ name: account.customerId ?? account.id ?? 'Connection', at: created });

    if (time === null)
      continue;
    if (time >= startOfMonth) {
      addedThisMonth += 1;
      if (status === 'active')
        activeThisMonth += 1;
      else if (status === 'inactive')
        inactiveThisMonth += 1;
    }
    else if (time >= startOfLastMonth) {
      addedLastMonth += 1;
    }
  }

  const total = accounts.length;
  const services = [...serviceCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ id: label, label, count, share: share(count, total) }));

  return {
    total,
    counts,
    outstandingDues,
    dueAccounts,
    statusByCustomer,
    services,
    activations,
    addedThisMonth,
    addedLastMonth,
    activeDelta: growth(counts.active, counts.active - activeThisMonth),
    inactiveDelta: growth(counts.inactive, counts.inactive - inactiveThisMonth),
    activeSeries: cumulativeSeries(activeTimes, now),
    inactiveSeries: cumulativeSeries(inactiveTimes, now),
    totalSeries: cumulativeSeries(allTimes, now),
    connectionStatus: [
      { id: 'active', label: 'Active', count: counts.active, share: share(counts.active, total) },
      { id: 'inactive', label: 'Inactive', count: counts.inactive, share: share(counts.inactive, total) },
      { id: 'pending', label: 'Pending', count: counts.pending, share: share(counts.pending, total) },
    ] satisfies Slice[],
  };
}

function bucketTotals(payments: PaymentDoc[], buckets: { label: string; from: number; to: number }[]) {
  const totals: Bar[] = buckets.map(bucket => ({ key: String(bucket.from), label: bucket.label, value: 0 }));
  for (const payment of payments) {
    const at = parseDate(payment.paidAt)?.getTime();
    const amount = Number(payment.amount) || 0;
    if (at === undefined || !amount)
      continue;
    const index = buckets.findIndex(bucket => at >= bucket.from && at < bucket.to);
    if (index >= 0)
      totals[index].value += amount;
  }
  return totals;
}

function dayBuckets(now: Date, points: number) {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Array.from({ length: points }, (_, index) => {
    const from = midnight - (points - 1 - index) * DAY;
    return { label: `${new Date(from).getDate()}`, from, to: from + DAY };
  });
}

function weekBuckets(now: Date, points: number) {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const thisWeek = midnight - now.getDay() * DAY;
  return Array.from({ length: points }, (_, index) => {
    const from = thisWeek - (points - 1 - index) * 7 * DAY;
    const start = new Date(from);
    return { label: `${start.getDate()} ${MONTHS[start.getMonth()]}`, from, to: from + 7 * DAY };
  });
}

function monthBuckets(now: Date, points: number) {
  return Array.from({ length: points }, (_, index) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (points - 1 - index), 1);
    return {
      label: MONTHS[start.getMonth()],
      from: start.getTime(),
      to: new Date(start.getFullYear(), start.getMonth() + 1, 1).getTime(),
    };
  });
}

export function summarisePayments(payments: PaymentDoc[], now: Date) {
  const monthly = bucketTotals(payments, monthBuckets(now, BAR_POINTS));
  const spark = bucketTotals(payments, monthBuckets(now, SPARK_POINTS));
  const daily = bucketTotals(payments, dayBuckets(now, BAR_POINTS));
  const weekly = bucketTotals(payments, weekBuckets(now, BAR_POINTS));
  const thisMonth = monthly[monthly.length - 1]?.value ?? 0;
  const lastMonth = monthly[monthly.length - 2]?.value ?? 0;

  return {
    revenueThisMonth: thisMonth,
    revenueDelta: growth(thisMonth, lastMonth),
    collectedToday: daily[daily.length - 1]?.value ?? 0,
    collectedWeek: weekly[weekly.length - 1]?.value ?? 0,
    revenueSeries: spark.map(point => point.value),
    revenue: { daily, weekly, monthly } satisfies Record<RevenueRange, Bar[]>,
  };
}

export function recentCustomers({ customers, statusByCustomer, now, take = 4 }: {
  customers: CustomerDoc[];
  statusByCustomer: Map<string, CustomerStatus>;
  now: Date;
  take?: number;
}): CustomerRow[] {
  return customers
    .map(customer => ({ customer, at: parseDate(customer.createdAt) }))
    .filter((entry): entry is { customer: CustomerDoc; at: Date } => entry.at !== null)
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, take)
    .map(({ customer, at }) => ({
      id: customer.id ?? customer.phone ?? customer.name ?? String(at.getTime()),
      name: customer.name ?? 'Unknown customer',
      phone: formatPhone(customer.phone),
      status: (customer.id && statusByCustomer.get(customer.id)) || 'pending',
      ago: relativeTime(at, now),
    }));
}

export function formatPhone(phone?: string) {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91'))
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  if (digits.length === 10)
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  return phone ?? '—';
}

export function buildActivity({ customers, activations, payments, nameById, now, take = 4 }: {
  customers: CustomerDoc[];
  activations: { name: string; at: Date }[];
  payments: PaymentDoc[];
  nameById: Map<string, string>;
  now: Date;
  take?: number;
}): ActivityRow[] {
  const rows: { at: Date; row: Omit<ActivityRow, 'ago'> }[] = [];

  for (const customer of customers) {
    const at = parseDate(customer.createdAt);
    if (at)
      rows.push({ at, row: { id: `c-${customer.id ?? customer.phone}`, kind: 'customer', title: 'New customer added', subtitle: customer.name ?? 'Unknown customer' } });
  }
  for (const activation of activations) {
    rows.push({
      at: activation.at,
      row: { id: `a-${activation.name}-${activation.at.getTime()}`, kind: 'connection', title: 'Connection activated', subtitle: nameById.get(activation.name) ?? activation.name },
    });
  }
  for (const payment of payments) {
    const at = parseDate(payment.paidAt);
    const amount = Number(payment.amount) || 0;
    if (at && amount) {
      rows.push({
        at,
        row: { id: `p-${payment.id ?? at.getTime()}`, kind: 'payment', title: 'Payment received', subtitle: `₹${Math.round(amount)} from ${payment.subscriberName ?? 'subscriber'}` },
      });
    }
  }

  return rows
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, take)
    .map(({ at, row }) => ({ ...row, ago: relativeTime(at, now) }));
}

export function areaOf(address?: string) {
  const cleaned = (address ?? '').trim();
  if (!cleaned)
    return 'Unassigned';
  const parts = cleaned.split(',').map(part => part.trim()).filter(Boolean);
  if (parts.length > 1)
    return parts[parts.length - 1];
  const block = /^[a-z]+/i.exec(cleaned)?.[0];
  return block && block.length < cleaned.length ? `Block ${block.toUpperCase()}` : cleaned;
}

export function topAreas(customers: CustomerDoc[], take = 5): AreaRow[] {
  const counts = new Map<string, number>();
  for (const customer of customers) {
    const area = areaOf(customer.address);
    counts.set(area, (counts.get(area) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, take)
    .map(([name, count]) => ({ id: name, name, count, share: share(count, customers.length) }));
}

const CLOSED_TICKET = /resolv|clos|complet|done|fixed/i;

export function summariseStaff({ staff, payments, tickets, nameById, now }: {
  staff: StaffDoc[];
  payments: PaymentDoc[];
  tickets: TicketDoc[];
  nameById: Map<string, string>;
  now: Date;
}): StaffRow[] {
  const rows = staff.map((member) => {
    const id = member.id ?? '';
    let collected = 0;
    let bills = 0;
    let ticketsClosed = 0;
    let latest: { at: Date; action: string } | null = null;

    const remember = (at: Date | null, action: string) => {
      if (at && (!latest || at.getTime() > latest.at.getTime()))
        latest = { at, action };
    };

    for (const payment of payments) {
      if (payment.collectorId !== id)
        continue;
      const amount = Number(payment.amount) || 0;
      if (!amount)
        continue;
      collected += amount;
      bills += 1;
      const who = payment.subscriberName ?? (payment.subscriberId ? nameById.get(payment.subscriberId) : undefined) ?? 'a subscriber';
      remember(parseDate(payment.paidAt), `Collected ₹${Math.round(amount)} from ${who}`);
    }

    for (const ticket of tickets) {
      if (ticket.assignedTo !== id || !CLOSED_TICKET.test(ticket.status ?? ''))
        continue;
      ticketsClosed += 1;
      remember(parseDate(ticket.resolvedAt ?? ticket.updatedAt), `Closed ticket · ${ticket.subject ?? 'no subject'}`);
    }

    const last = latest as { at: Date; action: string } | null;
    return {
      id: id || (member.name ?? 'staff'),
      name: member.name ?? member.email?.split('@')[0] ?? 'Staff member',
      collected,
      bills,
      ticketsClosed,
      lastAction: last?.action ?? 'No recorded activity yet',
      ago: last ? relativeTime(last.at, now) : null,
      at: last?.at.getTime() ?? 0,
    };
  });

  return rows
    .sort((a, b) => b.at - a.at || b.collected - a.collected)
    .map(({ at: _at, ...row }) => row);
}

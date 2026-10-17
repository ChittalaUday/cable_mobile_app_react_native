import type { AppNotification } from '@/lib/hooks/api/use-notifications';

export type InboxRow
  = | { kind: 'header'; key: string; label: string }
    | { kind: 'item'; key: string; item: AppNotification };

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
const DAY_MS = 86_400_000;

/** "Today", "Yesterday", then "Mon 12 Oct" (with the year once it is not this one). */
export function dayLabel(date: Date, now: Date): string {
  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
  if (days === 0)
    return 'Today';
  if (days === 1)
    return 'Yesterday';
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }) });
}

/** The inbox as one flat list, a header before each new day; the items keep the order the server sent. */
export function groupByDay(items: readonly AppNotification[], now: Date = new Date()): InboxRow[] {
  const rows: InboxRow[] = [];
  let current = '';
  for (const item of items) {
    const label = dayLabel(new Date(item.createdAt), now);
    if (label !== current) {
      current = label;
      rows.push({ kind: 'header', key: `day-${label}`, label });
    }
    rows.push({ kind: 'item', key: item.id, item });
  }
  return rows;
}

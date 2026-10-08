import type { DueVisit } from '@/lib/hooks/api/use-visits';

export type RoundDate = 'any' | 'overdue' | 'today' | 'tomorrow' | 'week' | 'custom';
export type RoundType = 'all' | DueVisit['reason'];

export type RoundFilters = {
  search: string;
  type: RoundType;
  date: RoundDate;
  /** Inclusive local days, `YYYY-MM-DD`; only read when `date` is `custom`. */
  from: string | null;
  to: string | null;
  /** A location path (`State / District / Area`); matches it and everything under it. */
  location: string | null;
};

export const NO_FILTERS: RoundFilters = { search: '', type: 'all', date: 'any', from: null, to: null, location: null };

const DAY = 86_400_000;

/** Local calendar day as `YYYY-MM-DD`, which sorts and compares as text. */
export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Whether a visit passes every filter that is set; searching looks at who, where and why. */
export function matchesRound(item: DueVisit, filters: RoundFilters, now = new Date()): boolean {
  if (filters.type !== 'all' && item.reason !== filters.type)
    return false;

  if (filters.location !== null && item.locationPath !== filters.location && !item.locationPath?.startsWith(`${filters.location} / `))
    return false;

  const term = filters.search.trim().toLowerCase();
  if (term !== '') {
    const haystack = [item.customerName, item.customerCode, item.customerPhone, item.address, item.locationPath, item.title, item.detail].filter(Boolean).join(' ').toLowerCase();
    if (!haystack.includes(term))
      return false;
  }

  const due = dayKey(new Date(item.dueAt));
  const today = dayKey(now);
  switch (filters.date) {
    case 'any':
      return true;
    case 'overdue':
      return item.doneAt === null && due < today;
    case 'today':
      return due === today;
    case 'tomorrow':
      return due === dayKey(new Date(now.getTime() + DAY));
    case 'week':
      return due >= today && due <= dayKey(new Date(now.getTime() + 6 * DAY));
    case 'custom':
      return (filters.from === null || due >= filters.from) && (filters.to === null || due <= filters.to);
  }
}

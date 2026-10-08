import type { RoundFilters } from './round-filters';
import type { DueVisit } from '@/lib/hooks/api/use-visits';
import { dayKey, matchesRound, NO_FILTERS } from './round-filters';

const NOW = new Date(2026, 9, 8, 10, 0);
const at = (days: number) => new Date(NOW.getTime() + days * 86_400_000).toISOString();
function visit(over: Partial<DueVisit>): DueVisit {
  return {
    key: 'k',
    reason: 'complaint',
    customerId: 'c',
    customerName: 'Kavitha Devi',
    customerCode: 'CUS-12',
    purpose: 'complaint',
    action: 'resolve_complaint',
    customerPhone: '9876543210',
    title: 'Complaint T-1',
    detail: 'No signal',
    dueAt: at(0),
    ticketId: null,
    subscriptionId: null,
    address: '12-4 Main Road',
    locationPath: 'East Godavari / Rajahmundry / North Colony',
    doneAt: null,
    doneByName: null,
    ...over,
  };
}
const pass = (item: DueVisit, filters: Partial<RoundFilters>) => matchesRound(item, { ...NO_FILTERS, ...filters }, NOW);

describe('round filters', () => {
  it('searches name, code, phone, address and the whole location path', () => {
    for (const search of ['kavitha', 'cus-12', '98765', 'main road', 'rajahmundry', 'no signal'])
      expect(pass(visit({}), { search })).toBe(true);
    expect(pass(visit({}), { search: 'vijayawada' })).toBe(false);
  });

  it('filters by visit type', () => {
    expect(pass(visit({ reason: 'expiring' }), { type: 'complaint' })).toBe(false);
    expect(pass(visit({ reason: 'expiring' }), { type: 'expiring' })).toBe(true);
  });

  it('filters by day: overdue (not done), today, tomorrow, the week', () => {
    expect(pass(visit({ dueAt: at(-2) }), { date: 'overdue' })).toBe(true);
    expect(pass(visit({ dueAt: at(-2), doneAt: at(0) }), { date: 'overdue' })).toBe(false);
    expect(pass(visit({ dueAt: at(0) }), { date: 'today' })).toBe(true);
    expect(pass(visit({ dueAt: at(1) }), { date: 'today' })).toBe(false);
    expect(pass(visit({ dueAt: at(1) }), { date: 'tomorrow' })).toBe(true);
    expect(pass(visit({ dueAt: at(6) }), { date: 'week' })).toBe(true);
    expect(pass(visit({ dueAt: at(7) }), { date: 'week' })).toBe(false);
    expect(pass(visit({ dueAt: at(-1) }), { date: 'week' })).toBe(false);
  });

  it('takes a custom range inclusive of both ends, open at either side', () => {
    const range = { date: 'custom' as const, from: dayKey(new Date(at(1))), to: dayKey(new Date(at(3))) };
    expect(pass(visit({ dueAt: at(1) }), range)).toBe(true);
    expect(pass(visit({ dueAt: at(3) }), range)).toBe(true);
    expect(pass(visit({ dueAt: at(4) }), range)).toBe(false);
    expect(pass(visit({ dueAt: at(0) }), range)).toBe(false);
    expect(pass(visit({ dueAt: at(-30) }), { date: 'custom', to: range.to })).toBe(true);
  });

  it('filters by location, taking everything underneath it', () => {
    const item = visit({ locationPath: 'East Godavari / Rajahmundry / North Colony' });
    expect(pass(item, { location: 'East Godavari' })).toBe(true);
    expect(pass(item, { location: 'East Godavari / Rajahmundry / North Colony' })).toBe(true);
    expect(pass(item, { location: 'East Godavari / Rajahmundry / North' })).toBe(false);
    expect(pass(item, { location: 'West Godavari' })).toBe(false);
    expect(pass(visit({ locationPath: null }), { location: 'East Godavari' })).toBe(false);
  });
});

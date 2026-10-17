import type { AppNotification } from '@/lib/hooks/api/use-notifications';
import { dayLabel, groupByDay } from './group-by-day';

const NOW = new Date(2026, 9, 13, 20, 30);
const at = (day: number, hour = 9, month = 9, year = 2026) => new Date(year, month, day, hour).toISOString();
const note = (id: string, createdAt: string) => ({ id, createdAt }) as AppNotification;

describe('dayLabel', () => {
  it('says Today and Yesterday, then the date, with the year only when it is not this one', () => {
    expect(dayLabel(new Date(2026, 9, 13, 0, 5), NOW)).toBe('Today');
    expect(dayLabel(new Date(2026, 9, 12, 23, 55), NOW)).toBe('Yesterday');
    expect(dayLabel(new Date(2026, 9, 9), NOW)).toMatch(/9/);
    expect(dayLabel(new Date(2026, 9, 9), NOW)).not.toMatch(/2026/);
    expect(dayLabel(new Date(2025, 11, 31), NOW)).toMatch(/2025/);
  });
});

describe('groupByDay', () => {
  it('puts one header before each new day and keeps the order the server sent', () => {
    const rows = groupByDay([note('a', at(13, 18)), note('b', at(13, 9)), note('c', at(12, 22)), note('d', at(9))], NOW);

    expect(rows.map(row => (row.kind === 'header' ? row.label.slice(0, 5) : row.item.id))).toEqual(['Today', 'a', 'b', 'Yeste', 'c', expect.stringMatching(/^\w{3},/) as unknown as string, 'd']);
    expect(new Set(rows.map(row => row.key)).size).toBe(rows.length);
  });

  it('is empty for an empty inbox', () => {
    expect(groupByDay([], NOW)).toEqual([]);
  });
});

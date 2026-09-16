/** The quick date filters a customer list offers. */
export type DatePresetType = 'all' | 'today' | '7d' | '30d' | 'month';

/** The created-at window a quick-filter preset stands for. */
export function getDateRangeFromPreset(preset?: DatePresetType): { createdFrom?: string; createdTo?: string } {
  if (!preset || preset === 'all')
    return {};

  const now = new Date();
  if (preset === 'today') {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    return { createdFrom: startOfToday.toISOString() };
  }

  if (preset === '7d') {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { createdFrom: sevenDaysAgo.toISOString() };
  }

  if (preset === '30d') {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { createdFrom: thirtyDaysAgo.toISOString() };
  }

  if (preset === 'month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return { createdFrom: startOfMonth.toISOString() };
  }

  return {};
}

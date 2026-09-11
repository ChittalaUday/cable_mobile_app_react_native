/** Indian digit grouping (12,480 / 8,42,600) without relying on Intl being built into Hermes. */
export function grouped(value: number) {
  const digits = Math.round(Math.abs(value)).toString();
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const body = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}` : last3;
  return `${value < 0 ? '-' : ''}${body}`;
}

export function rupees(value: number) {
  return `₹${grouped(value)}`;
}

export function lakhs(value: number) {
  if (value >= 100_000) {
    const scaled = value / 100_000;
    return `${Number.isInteger(scaled) ? scaled : scaled.toFixed(1)}L`;
  }
  if (value >= 1000) {
    const scaled = value / 1000;
    return `${Number.isInteger(scaled) ? scaled : scaled.toFixed(0)}K`;
  }
  return '0';
}

/** Axis steps that land on 50K / 1L / 1.5L style boundaries. */
export function niceTicks(max: number, steps = 4) {
  const raw = Math.max(max, 1) / steps;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(factor => factor * magnitude).find(candidate => candidate >= raw) ?? magnitude * 10;
  return Array.from({ length: steps + 1 }, (_, index) => step * index);
}

export function percent(value: number | null) {
  return value === null ? null : `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export function greeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12)
    return 'Good Morning';
  return hour < 17 ? 'Good Afternoon' : 'Good Evening';
}

export function shortDate(date: Date) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export function monthYear(date: Date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

export function initials(name?: string | null) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length)
    return 'AD';
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0].slice(0, 2)).toUpperCase();
}

import { serviceIcon } from '@/lib/service-icons';

/**
 * The avatar for a provider: its own brand where we know it, otherwise the icon
 * of the service it supplies.
 *
 * The fallback used to key off a fixed `serviceType`; services are now the
 * tenant's own, so it keys off the icon they chose for one.
 */
export function getProviderBrand(name: string, icon?: string | null) {
  const lower = name.toLowerCase();
  if (lower.includes('tata')) {
    return { bg: '#D81B60', text: 'TATA\nPLAY', isLogo: true };
  }
  if (lower.includes('act')) {
    return { bg: '#E53935', text: 'ACT', isLogo: true };
  }
  if (lower.includes('airtel')) {
    return { bg: '#E60000', text: 'airtel', isLogo: true };
  }
  if (lower.includes('jio')) {
    return { bg: '#0A2540', text: 'Jio', isLogo: true };
  }
  if (icon)
    return { bg: '#6366F1', text: '', isLogo: false, icon: serviceIcon(icon) };

  return { bg: '#6366F1', text: name.slice(0, 3).toUpperCase(), isLogo: true };
}

export function getChannelBrand(name: string) {
  const upper = name.toUpperCase();
  if (upper.includes('STAR SPORTS') || upper.includes('STAR ')) {
    return { bg: '#0F172A', text: '★ STAR', color: '#E11D48' };
  }
  if (upper.includes('ZEE')) {
    return { bg: '#FF5722', text: 'ZEE', color: '#FFFFFF' };
  }
  if (upper.includes('SONY')) {
    return { bg: '#000000', text: 'SONY', color: '#FFFFFF' };
  }
  if (upper.includes('COLORS')) {
    return { bg: '#7C3AED', text: 'colors', color: '#F59E0B' };
  }
  if (upper.includes('ESPN')) {
    return { bg: '#DC2626', text: 'ESPN', color: '#FFFFFF' };
  }
  if (upper.includes('DISCOVERY')) {
    return { bg: '#0284C7', text: 'DISC', color: '#FFFFFF' };
  }
  if (upper.includes('SUN') || upper.includes('GEMINI')) {
    return { bg: '#EA580C', text: 'SUN', color: '#FEF08A' };
  }
  if (upper.includes('ETV')) {
    return { bg: '#B91C1C', text: 'ETV', color: '#FDE047' };
  }
  return { bg: '#475569', text: name.slice(0, 4).toUpperCase(), color: '#FFFFFF' };
}

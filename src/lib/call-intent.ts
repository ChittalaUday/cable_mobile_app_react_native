import { Linking } from 'react-native';

/** Formats stored 10- or 12-digit phone values as an Indian E.164 dial number. */
export function indianDialNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 10)
    return `+91${digits}`;

  if (digits.length === 12)
    return `+91${digits.slice(-10)}`;

  return phone.trim();
}

/** Opens the platform dialer with a normalized Indian phone number. */
export async function openCallIntent(phone: string | null | undefined): Promise<void> {
  if (!phone)
    return;

  await Linking.openURL(`tel:${indianDialNumber(phone)}`);
}

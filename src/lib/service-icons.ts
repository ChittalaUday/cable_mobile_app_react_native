import type { IconSvgElement } from '@hugeicons/react-native';
import {
  CloudIcon,
  Globe02Icon,
  PackageIcon,
  PlayCircleIcon,
  RadioIcon,
  SatelliteIcon,
  SignalIcon,
  SmartPhone01Icon,
  TelephoneIcon,
  Tv01Icon,
  Wifi01Icon,
} from '@hugeicons/core-free-icons';

/**
 * The icons a service can be given.
 *
 * A tenant defines its own services — "Cable TV", "Internet + IPTV", whatever
 * it actually sells — so there is no fixed list of service types to colour them
 * by. The icon is chosen when the service is created and stored as one of these
 * names, which is why the set is closed: the API stores a name, and an unknown
 * one has to fall back to something rather than render nothing.
 */
export const SERVICE_ICONS: { key: string; label: string; icon: IconSvgElement }[] = [
  { key: 'tv', label: 'TV', icon: Tv01Icon },
  { key: 'wifi', label: 'Wi-Fi', icon: Wifi01Icon },
  { key: 'satellite', label: 'Satellite', icon: SatelliteIcon },
  { key: 'stream', label: 'Streaming', icon: PlayCircleIcon },
  { key: 'globe', label: 'Internet', icon: Globe02Icon },
  { key: 'signal', label: 'Signal', icon: SignalIcon },
  { key: 'phone', label: 'Voice', icon: TelephoneIcon },
  { key: 'mobile', label: 'Mobile', icon: SmartPhone01Icon },
  { key: 'radio', label: 'Radio', icon: RadioIcon },
  { key: 'cloud', label: 'Cloud', icon: CloudIcon },
  { key: 'bundle', label: 'Bundle', icon: PackageIcon },
];

const BY_KEY = new Map(SERVICE_ICONS.map(entry => [entry.key, entry.icon]));

/** Falls back to a generic bundle, so an unknown or missing name still draws. */
export function serviceIcon(key: string | null | undefined): IconSvgElement {
  return (key ? BY_KEY.get(key) : undefined) ?? PackageIcon;
}

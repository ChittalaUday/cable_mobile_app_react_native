import {
  AlarmClockIcon,
  Album02Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowTurnBackwardIcon,
  ArrowUp01Icon,
  Backward01Icon,
  Calendar03Icon,
  Cancel01Icon,
  ClosedCaptionIcon,
  DashboardSquare01Icon,
  Exchange01Icon,
  FavouriteIcon,
  Forward01Icon,
  Home01Icon,
  Idea01Icon,
  Image01Icon,
  InformationCircleIcon,
  Mail01Icon,
  Menu01Icon,
  MinusSignIcon,
  Moon02Icon,
  MusicNote01Icon,
  MuteIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PlayListIcon,
  PlusSignIcon,
  PowerServiceIcon,
  PreviousIcon,
  RecordIcon,
  Search01Icon,
  Settings01Icon,
  StopIcon,
  Volume02Icon,
  VolumeLowIcon,
} from '@hugeicons/core-free-icons';

type Icon = typeof PowerServiceIcon;

/**
 * The vocabulary every remote surface shares.
 *
 * The pad and the raw-capture list both used to decide for themselves what
 * counted as a power key and which bucket a key belonged in, and they
 * disagreed — `power_lg` read as power in one and not the other. One table
 * here, so a key looks and sorts the same wherever it is drawn.
 */

/**
 * A handset may name any key at all: the API only constrains the shape
 * (`^[a-z0-9][a-z0-9_]{0,31}$`), and the seeded library alone carries 75
 * distinct names against the 37 the shared vocabulary lists. So every lookup
 * here degrades to a sensible default rather than assuming a known key.
 */
export const KEY_ICONS: Readonly<Record<string, Icon>> = {
  power: PowerServiceIcon,
  input: Exchange01Icon,
  mute: MuteIcon,

  volume_up: Volume02Icon,
  volume_down: VolumeLowIcon,
  channel_up: PlusSignIcon,
  channel_down: MinusSignIcon,

  up: ArrowUp01Icon,
  down: ArrowDown01Icon,
  left: ArrowLeft01Icon,
  right: ArrowRight01Icon,

  menu: Menu01Icon,
  home: Home01Icon,
  guide: Calendar03Icon,
  info: InformationCircleIcon,
  back: ArrowTurnBackwardIcon,
  exit: Cancel01Icon,

  play: PlayIcon,
  pause: PauseIcon,
  stop: StopIcon,
  rewind: Backward01Icon,
  forward: Forward01Icon,
  record: RecordIcon,
  next: NextIcon,
  prev: PreviousIcon,

  page_up: ArrowUp01Icon,
  page_down: ArrowDown01Icon,
  prev_channel: Exchange01Icon,

  fav: FavouriteIcon,
  audio: MusicNote01Icon,
  music: MusicNote01Icon,
  media: Album02Icon,
  mail: Mail01Icon,
  reminder: AlarmClockIcon,
  list: PlayListIcon,
  apps: DashboardSquare01Icon,
  smart_hub: DashboardSquare01Icon,
  search: Search01Icon,
  settings: Settings01Icon,
  tools: Settings01Icon,
  options: Settings01Icon,
  sleep: Moon02Icon,
  picture: Image01Icon,
  subtitle: ClosedCaptionIcon,
  text: ClosedCaptionIcon,
  help: Idea01Icon,
};

/**
 * True for `power` and for every branded variant a universal handset carries
 * (`power_lg`, `power_samsung`, …) — 16 of them in the seeded library alone.
 * They are the one key that can switch off a customer's box by accident, so
 * they are the one key drawn in red everywhere.
 */
export function isPowerKey(key: string): boolean {
  return key === 'power' || key.startsWith('power_');
}

/** Colour keys are drawn as the colour they are named after, not as text. */
export const COLOUR_KEYS = ['red', 'green', 'yellow', 'blue'] as const;

export const COLOUR_SWATCHES: Readonly<Record<string, string>> = {
  red: '#FF453A',
  green: '#30D158',
  yellow: '#FFD60A',
  blue: '#0A84FF',
};

/** Streaming keys get their own shelf rather than joining the overflow grid. */
const APP_KEYS = new Set(['netflix', 'youtube', 'prime_video', 'apps', 'smart_hub']);

export type KeyGroup = 'apps' | 'more';

/**
 * Where a key the moulded pad does not name should go.
 *
 * Only two shelves on purpose: an app launcher is what somebody scans for by
 * name, everything else is a long tail nobody browses.
 */
export function groupFor(key: string): KeyGroup {
  return APP_KEYS.has(key) ? 'apps' : 'more';
}

/** Known keys get a translated label; anything learned falls back to what it was stored as. */
export function labelFor(
  t: (key: string, options?: Record<string, unknown>) => string,
  key: string,
  fallback: string,
): string {
  return t(`remote.keys.${key}`, { defaultValue: fallback });
}

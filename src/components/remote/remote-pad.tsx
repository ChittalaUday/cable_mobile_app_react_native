import type { RemoteButton, RemoteDetail } from '@/lib/api/types';
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { Text, View } from '@/components/ui';
import { COLOUR_KEYS, COLOUR_SWATCHES, groupFor, isPowerKey, KEY_ICONS, labelFor } from './keys';
import { PAD, RemoteKey } from './remote-key';

type Press = (button: RemoteButton) => void;

/**
 * Diameter of the keys that sit in a fixed row.
 *
 * Three of these plus their gaps fit the body at 320dp, the narrowest phone
 * worth drawing for, so these rows need no flexing. The direction pad is the
 * exception and sizes itself — see `DirectionPad`.
 */
const KEY_SIZE = 58;

type PadProps = {
  byKey: Map<string, RemoteButton>;
  disabled: boolean;
  sending: string | null;
  onPress: Press;
};

/** Every key the moulded body draws itself; the rest fall through to the shelves below. */
export const MOULDED = new Set([
  'power',
  'input',
  'mute',
  'volume_up',
  'volume_down',
  'channel_up',
  'channel_down',
  'up',
  'down',
  'left',
  'right',
  'ok',
  'menu',
  'home',
  'guide',
  'info',
  'back',
  'exit',
  'digit_0',
  'digit_1',
  'digit_2',
  'digit_3',
  'digit_4',
  'digit_5',
  'digit_6',
  'digit_7',
  'digit_8',
  'digit_9',
  'rewind',
  'play',
  'pause',
  'stop',
  'forward',
  'record',
  ...COLOUR_KEYS,
]);

/**
 * The handset.
 *
 * Laid out the way the plastic one on the customer's table is, because that is
 * the thing the technician is replacing: power top-left, volume and channel as
 * rockers either side of the pad, digits in a phone grid. A row the stored
 * handset has no keys for is dropped rather than drawn blank, so a set-top box
 * without colour keys does not show an empty strip where they would be.
 */
export function RemotePad({ remote, disabled, sending, onPress }: {
  remote: RemoteDetail;
  disabled: boolean;
  sending: string | null;
  onPress: Press;
}) {
  const { t } = useTranslation();

  const byKey = React.useMemo(
    () => new Map(remote.buttons.map(button => [button.key, button])),
    [remote.buttons],
  );

  const shelves = React.useMemo(() => {
    const extras = remote.buttons.filter(button => !MOULDED.has(button.key));
    return {
      apps: extras.filter(button => groupFor(button.key) === 'apps'),
      more: extras.filter(button => groupFor(button.key) === 'more'),
    };
  }, [remote.buttons]);

  const props: PadProps = { byKey, disabled, sending, onPress };
  const has = (...keys: string[]) => keys.some(key => byKey.has(key));

  return (
    <View className="gap-4">
      <LinearGradient
        colors={[PAD.bodyTop, PAD.bodyBottom]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ borderRadius: 36, padding: 20, gap: 22 }}
      >
        {has('power', 'input', 'mute') ? <TopRow {...props} /> : null}
        {has('up', 'down', 'left', 'right', 'ok', 'volume_up', 'volume_down', 'channel_up', 'channel_down')
          ? <ControlCluster {...props} />
          : null}
        {has('menu', 'home', 'guide', 'info', 'back', 'exit') ? <NavRow {...props} /> : null}
        {has('digit_0', 'digit_1', 'digit_2', 'digit_3', 'digit_4', 'digit_5', 'digit_6', 'digit_7', 'digit_8', 'digit_9')
          ? <Keypad {...props} />
          : null}
        {has('rewind', 'play', 'pause', 'stop', 'forward', 'record') ? <TransportRow {...props} /> : null}
        {has(...COLOUR_KEYS) ? <ColourRow {...props} /> : null}
      </LinearGradient>

      <Shelf title={t('remote.groups.apps')} buttons={shelves.apps} {...props} />
      <Shelf title={t('remote.groups.more')} buttons={shelves.more} {...props} />
    </View>
  );
}

/** Draws one moulded key, or an invisible spacer that holds the pad's shape. */
function Key({ byKey, disabled, sending, onPress, k, ...rest }: PadProps & {
  k: string;
  tone?: React.ComponentProps<typeof RemoteKey>['tone'];
  shape?: React.ComponentProps<typeof RemoteKey>['shape'];
  swatch?: string;
  iconSize?: number;
  size?: number;
  height?: number;
  className?: string;
  text?: boolean;
}) {
  const { t } = useTranslation();
  const { text, ...keyProps } = rest;
  const button = byKey.get(k);

  // A missing key still holds its slot, so the pad keeps its shape and the
  // arrows around a gap do not slide out of the compass points.
  if (!button) {
    const round = rest.shape === undefined || rest.shape === 'circle';
    if (round)
      return <View style={rest.size === undefined ? { flex: 1 } : { width: rest.size, height: rest.size }} />;
    return <View style={{ flex: 1, height: rest.height ?? 44 }} />;
  }

  const label = labelFor(t, k, button.label);
  return (
    <RemoteKey
      {...keyProps}
      label={label}
      icon={text ? undefined : KEY_ICONS[k]}
      tone={rest.tone ?? (isPowerKey(k) ? 'power' : 'neutral')}
      disabled={disabled}
      pending={sending === k}
      onPress={() => onPress(button)}
    />
  );
}

function TopRow(p: PadProps) {
  return (
    <View className="flex-row items-center justify-between">
      <Key {...p} k="power" size={KEY_SIZE} />
      <Key {...p} k="input" size={KEY_SIZE} />
      <Key {...p} k="mute" size={KEY_SIZE} />
    </View>
  );
}

/**
 * Volume and channel as rockers either side of the direction pad.
 *
 * A rocker rather than two round keys because that is the shape the thumb
 * already knows: volume and channel are the two keys pressed without looking.
 */
function ControlCluster(p: PadProps) {
  return (
    <View className="flex-row items-center justify-center gap-3">
      <Rocker {...p} up="volume_up" down="volume_down" />
      <DirectionPad {...p} />
      <Rocker {...p} up="channel_up" down="channel_down" />
    </View>
  );
}

function Rocker({ up, down, ...p }: PadProps & { down: string; up: string }) {
  const { t } = useTranslation();
  const upButton = p.byKey.get(up);
  const downButton = p.byKey.get(down);

  if (!upButton && !downButton)
    return <View className="w-[54px]" />;

  return (
    <View
      className="w-[54px] self-stretch overflow-hidden rounded-full"
      style={{ backgroundColor: PAD.face, borderWidth: 1, borderColor: PAD.faceEdge }}
    >
      {[{ half: up, button: upButton }, { half: down, button: downButton }].map(({ half, button }, index) =>
        button
          ? (
              <View
                key={half}
                className="flex-1"
                style={index === 1 ? { borderTopWidth: 1, borderTopColor: PAD.faceEdge } : undefined}
              >
                <RemoteKey
                  label={labelFor(t, button.key, button.label)}
                  icon={KEY_ICONS[button.key]}
                  shape="wide"
                  disabled={p.disabled}
                  pending={p.sending === button.key}
                  onPress={() => p.onPress(button)}
                  className="h-full rounded-none"
                />
              </View>
            )
          : <View key={half} className="flex-1" />,
      )}
    </View>
  );
}

const DPAD_KEYS = ['up', 'down', 'left', 'right', 'ok'];

/** The clickpad: arrows on the compass points, OK in the middle. */
function DirectionPad(p: PadProps) {
  // A power-only universal handset has rockers and no pad; drawing the ring
  // anyway would leave a large empty dial in the middle of the body.
  if (!DPAD_KEYS.some(key => p.byKey.has(key)))
    return null;

  // Three equal rows of three equal cells inside a square that flexes: the
  // corners stay empty and nothing carries a width of its own, so the cluster
  // cannot outgrow the body on a narrow screen. `maxWidth` only stops the dial
  // ballooning on a tablet.
  return (
    <View
      className="aspect-square max-w-[196px] flex-1 rounded-full p-2"
      style={{ backgroundColor: '#212127', borderWidth: 1, borderColor: PAD.faceEdge }}
    >
      <View className="flex-1 flex-row gap-1">
        <View className="flex-1" />
        <Key {...p} k="up" />
        <View className="flex-1" />
      </View>
      <View className="flex-1 flex-row gap-1">
        <Key {...p} k="left" />
        <Key {...p} k="ok" tone="accent" text />
        <Key {...p} k="right" />
      </View>
      <View className="flex-1 flex-row gap-1">
        <View className="flex-1" />
        <Key {...p} k="down" />
        <View className="flex-1" />
      </View>
    </View>
  );
}

function NavRow(p: PadProps) {
  const keys = ['menu', 'home', 'guide', 'info', 'back', 'exit'].filter(k => p.byKey.has(k));
  return (
    <View className="flex-row flex-wrap justify-center gap-2">
      {keys.map(k => (
        <View key={k} className="min-w-[30%] grow basis-0">
          <Key {...p} k={k} shape="pill" iconSize={18} />
        </View>
      ))}
    </View>
  );
}

function Keypad(p: PadProps) {
  const rows = [
    ['digit_1', 'digit_2', 'digit_3'],
    ['digit_4', 'digit_5', 'digit_6'],
    ['digit_7', 'digit_8', 'digit_9'],
    ['gap_zero_l', 'digit_0', 'gap_zero_r'],
  ];
  return (
    <View className="items-center gap-3">
      {rows.map(row => (
        <View key={row.join()} className="flex-row justify-center gap-5">
          {row.map(k =>
            k.startsWith('gap_')
              ? <View key={k} style={{ width: KEY_SIZE, height: KEY_SIZE }} />
              : <Key key={k} {...p} k={k} text size={KEY_SIZE} />,
          )}
        </View>
      ))}
    </View>
  );
}

function TransportRow(p: PadProps) {
  const keys = ['rewind', 'play', 'pause', 'stop', 'forward', 'record'].filter(k => p.byKey.has(k));
  return (
    <View className="flex-row flex-wrap justify-center gap-2">
      {keys.map(k => (
        <View key={k} className="min-w-[28%] grow basis-0">
          <Key {...p} k={k} shape="pill" iconSize={18} tone={k === 'record' ? 'power' : 'neutral'} />
        </View>
      ))}
    </View>
  );
}

/** The four teletext keys, drawn as the colour they are named after. */
function ColourRow(p: PadProps) {
  return (
    <View className="flex-row gap-2.5">
      {COLOUR_KEYS.map(k => (
        <View key={k} className="flex-1">
          <Key {...p} k={k} shape="wide" tone="colour" swatch={COLOUR_SWATCHES[k]} height={14} text />
        </View>
      ))}
    </View>
  );
}

/** Keys the moulded body does not name, kept off it rather than crammed on. */
function Shelf({ title, buttons, ...p }: PadProps & { buttons: RemoteButton[]; title: string }) {
  const { t } = useTranslation();

  if (buttons.length === 0)
    return null;

  return (
    <View className="gap-2.5">
      <Text className="px-1 text-[11px] font-bold tracking-widest text-muted-foreground uppercase">{title}</Text>
      <View
        className="flex-row flex-wrap gap-2 rounded-3xl p-3"
        style={{ backgroundColor: PAD.bodyBottom }}
      >
        {buttons.map(button => (
          <View key={button.key} className="min-w-[30%] grow basis-0">
            <RemoteKey
              label={labelFor(t, button.key, button.label)}
              icon={KEY_ICONS[button.key]}
              shape="pill"
              tone={isPowerKey(button.key) ? 'power' : 'neutral'}
              iconSize={18}
              disabled={p.disabled}
              pending={p.sending === button.key}
              onPress={() => p.onPress(button)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

import type { RemoteButton, RemoteDetail, RemoteDeviceType, RemoteSummary } from '@/lib/api/types';
import type { IrCapabilities, IrCapabilityStatus } from '@/lib/ir-blaster';
import { CirclePowerIcon, RemoteControlIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { ActivityIndicator, Button, colors, Pressable, Text, View } from '@/components/ui';
import { useRemote, useRemotes } from '@/lib/hooks/api/use-remotes';
import { getCapabilities, transmit } from '@/lib/ir-blaster';

import { RemotePicker } from './remote-picker';

const statusKeys: Record<Exclude<IrCapabilityStatus, 'available'>, 'remote.hardware_error' | 'remote.module_unavailable' | 'remote.no_emitter' | 'remote.service_unavailable' | 'remote.unsupported_platform'> = {
  'hardware-error': 'remote.hardware_error',
  'module-unavailable': 'remote.module_unavailable',
  'no-emitter': 'remote.no_emitter',
  'service-unavailable': 'remote.service_unavailable',
  'unsupported-platform': 'remote.unsupported_platform',
};

/**
 * Where each known key sits on the moulded pad. `''` is a gap.
 *
 * A stored handset supplies whatever keys it has, so a row with nothing on it
 * is dropped rather than drawn empty, and any key this layout does not name
 * still reaches the user through the extras grid below. That is what lets a
 * learned handset with an odd button work without a change here.
 */
const LAYOUT: readonly (readonly string[])[] = [
  ['power', 'input', 'mute'],
  ['volume_up', 'volume_down', 'channel_up', 'channel_down'],
  ['menu', 'up', 'back'],
  ['left', 'ok', 'right'],
  ['gap_dpad_l', 'down', 'gap_dpad_r'],
  ['digit_1', 'digit_2', 'digit_3'],
  ['digit_4', 'digit_5', 'digit_6'],
  ['digit_7', 'digit_8', 'digit_9'],
  ['gap_zero_l', 'digit_0', 'gap_zero_r'],
  ['rewind', 'play', 'pause', 'forward'],
  ['red', 'green', 'yellow', 'blue'],
];

/** A `gap_*` slot holds the pad's shape where no button sits. */
const isGap = (key: string) => key.startsWith('gap_');

const LAID_OUT = new Set(LAYOUT.flat().filter(key => !isGap(key)));

function formatKilohertz(value: number) {
  return Number((value / 1000).toFixed(1)).toString();
}

function formatRanges(capabilities: IrCapabilities) {
  return capabilities.carrierFrequencyRanges
    .map(range => `${formatKilohertz(range.minHz)}–${formatKilohertz(range.maxHz)} kHz`)
    .join(', ');
}

export function RemoteControl() {
  const { t } = useTranslation();
  const [capabilities, setCapabilities] = React.useState<IrCapabilities | null>(null);
  const [deviceType, setDeviceType] = React.useState<RemoteDeviceType>('tv');
  const [selected, setSelected] = React.useState<RemoteSummary | null>(null);
  const [sending, setSending] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  const remotes = useRemotes({ variables: { deviceType } });
  const remote = useRemote({ variables: { id: selected?.id ?? '' }, enabled: selected !== null });

  const refreshCapabilities = React.useCallback(async () => {
    setCapabilities(null);
    setFeedback(null);
    setCapabilities(await getCapabilities());
  }, []);

  React.useEffect(() => {
    void refreshCapabilities();
  }, [refreshCapabilities]);

  const ready = capabilities?.available === true;
  const status = capabilities === null
    ? t('remote.checking')
    : ready
      ? t('remote.ir_ready')
      : t(statusKeys[capabilities.status as Exclude<IrCapabilityStatus, 'available'>]);

  const send = async (button: RemoteButton) => {
    if (!ready || sending !== null)
      return;

    setSending(button.key);
    setFeedback(null);
    try {
      // The stored command is already in the shape the emitter takes, so it
      // goes straight through — nothing between the database and the LED.
      await transmit(button.command);
      setFeedback({ kind: 'success', text: t('remote.sent', { key: labelFor(t, button) }) });
    }
    catch {
      setFeedback({ kind: 'error', text: t('remote.transmit_failed') });
    }
    finally {
      setSending(null);
    }
  };

  return (
    <View className="gap-4">
      <View className="gap-3 rounded-2xl border border-border bg-card p-4">
        <View className="flex-row items-center gap-3">
          <View className="size-11 items-center justify-center rounded-xl bg-primary-50">
            <HugeiconsIcon icon={RemoteControlIcon} size={23} color={colors.primary[600]} strokeWidth={2.2} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-lg font-bold text-foreground">
              {selected ? `${selected.brand} ${selected.model}` : t('remote.pick_title')}
            </Text>
            <Text selectable className={`text-xs ${ready ? 'text-green-700' : 'text-muted-foreground'}`}>{status}</Text>
          </View>
          {capabilities === null ? <ActivityIndicator color={colors.primary[600]} /> : null}
        </View>

        {ready
          ? (
              <Text selectable className="text-xs text-muted-foreground">
                {capabilities.carrierFrequencyRanges.length
                  ? formatRanges(capabilities)
                  : t('remote.no_frequency_ranges')}
              </Text>
            )
          : capabilities
            ? <Button label={t('remote.retry')} variant="outline" size="sm" onPress={refreshCapabilities} />
            : null}

        {selected
          ? (
              <View className="gap-2">
                {/* Unverified codes come from a public database nobody has tested
                    against this appliance — say so rather than let a dead button
                    look like a broken emitter. */}
                {selected.verified ? null : <Text className="text-xs text-orange-700">{t('remote.unverified_warning')}</Text>}
                <Button label={t('remote.change')} variant="outline" size="sm" onPress={() => setSelected(null)} />
              </View>
            )
          : null}
      </View>

      {selected === null
        ? (
            <RemoteList
              deviceType={deviceType}
              onDeviceType={setDeviceType}
              query={remotes}
              onSelect={setSelected}
            />
          )
        : remote.isPending
          ? <ActivityIndicator className="py-8" color={colors.primary[600]} />
          : remote.data
            ? <RemotePad remote={remote.data} disabled={!ready} sending={sending} onPress={send} />
            : (
                <View className="items-center gap-2 rounded-2xl border border-border bg-card p-6">
                  <Text className="text-center text-muted-foreground">{t('remote.load_failed')}</Text>
                  <Button label={t('remote.retry')} variant="outline" size="sm" onPress={() => void remote.refetch()} />
                </View>
              )}

      {feedback
        ? (
            <Text
              accessibilityLiveRegion="polite"
              selectable
              className={`text-center text-sm font-semibold ${feedback.kind === 'error' ? 'text-red-700' : 'text-green-700'}`}
            >
              {feedback.text}
            </Text>
          )
        : null}
    </View>
  );
}

/** Known keys get a translated label; anything learned falls back to what it was stored as. */
function labelFor(t: (key: string, options?: Record<string, unknown>) => string, button: RemoteButton) {
  return t(`remote.keys.${button.key}`, { defaultValue: button.label });
}

function RemoteList({ deviceType, onDeviceType, query, onSelect }: {
  deviceType: RemoteDeviceType;
  onDeviceType: (type: RemoteDeviceType) => void;
  // Structural rather than `ReturnType<typeof useRemotes>`: the hook is
  // overloaded, and `ReturnType` picks the wrong signature.
  query: { data: RemoteSummary[] | undefined; isPending: boolean; isError: boolean; refetch: () => unknown };
  onSelect: (remote: RemoteSummary) => void;
}) {
  const { t } = useTranslation();

  if (query.isPending)
    return <ActivityIndicator className="py-8" color={colors.primary[600]} />;

  if (query.isError) {
    return (
      <View className="items-center gap-2 rounded-2xl border border-border bg-card p-6">
        <Text className="text-center text-muted-foreground">{t('remote.load_failed')}</Text>
        <Button label={t('remote.retry')} variant="outline" size="sm" onPress={() => void query.refetch()} />
      </View>
    );
  }

  return (
    <RemotePicker
      deviceType={deviceType}
      onDeviceType={onDeviceType}
      remotes={query.data ?? []}
      onSelect={onSelect}
    />
  );
}

function RemotePad({ remote, disabled, sending, onPress }: {
  remote: RemoteDetail;
  disabled: boolean;
  sending: string | null;
  onPress: (button: RemoteButton) => void;
}) {
  const { t } = useTranslation();

  const byKey = React.useMemo(
    () => new Map(remote.buttons.map(button => [button.key, button])),
    [remote.buttons],
  );

  // Rows the handset has nothing for are dropped, so a set-top box without
  // colour keys does not draw a blank strip where they would be.
  const rows = LAYOUT.filter(row => row.some(key => !isGap(key) && byKey.has(key)));
  const extras = remote.buttons.filter(button => !LAID_OUT.has(button.key));

  return (
    <View className="gap-2 rounded-2xl border border-border bg-card p-4">
      {rows.map(row => (
        <View key={row.join(':')} className="flex-row gap-2">
          {row.map((key) => {
            const button = isGap(key) ? undefined : byKey.get(key);
            if (!button)
              return <View key={key} className="h-12 flex-1" />;

            return (
              <RemoteKey
                key={key}
                label={labelFor(t, button)}
                disabled={disabled || sending !== null}
                pending={sending === key}
                power={key === 'power'}
                onPress={() => onPress(button)}
              />
            );
          })}
        </View>
      ))}

      {extras.length > 0
        ? (
            <View className="mt-2 gap-2 border-t border-border pt-3">
              <Text className="text-xs font-bold tracking-widest text-muted-foreground uppercase">{t('remote.more_keys')}</Text>
              <View className="flex-row flex-wrap gap-2">
                {extras.map(button => (
                  <View key={button.key} className="min-w-[30%] grow basis-0">
                    <RemoteKey
                      label={labelFor(t, button)}
                      disabled={disabled || sending !== null}
                      pending={sending === button.key}
                      power={false}
                      onPress={() => onPress(button)}
                    />
                  </View>
                ))}
              </View>
            </View>
          )
        : null}
    </View>
  );
}

function RemoteKey({ label, disabled, pending, power, onPress }: {
  label: string;
  disabled: boolean;
  pending: boolean;
  power: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`h-12 flex-1 items-center justify-center rounded-xl border ${power ? 'border-red-200 bg-red-50' : 'border-border bg-surface'} active:bg-primary-50 disabled:opacity-50`}
    >
      {pending
        ? <ActivityIndicator size="small" color={colors.primary[600]} />
        : power
          ? <HugeiconsIcon icon={CirclePowerIcon} size={21} color="#DC2626" strokeWidth={2.2} />
          : <Text className="text-center text-xs font-bold text-foreground">{label}</Text>}
    </Pressable>
  );
}

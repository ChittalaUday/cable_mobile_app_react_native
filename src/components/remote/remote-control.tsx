import type { RemoteButton, RemoteCapture, RemoteDeviceType, RemoteSummary } from '@/lib/api/types';
import type { IrCapabilities, IrCapabilityStatus } from '@/lib/ir-blaster';
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  RemoteControlIcon,
  RepeatIcon,
  SatelliteDishIcon,
  Tv01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { AnimatePresence, MotiView } from 'moti';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { ActivityIndicator, Button, colors, Pressable, Text, View } from '@/components/ui';
import { useRemote, useRemotes } from '@/lib/hooks/api/use-remotes';
import { captureToCommand, getCapabilities, transmit } from '@/lib/ir-blaster';

import { labelFor } from './keys';
import { RemoteCapturesView } from './remote-captures';
import { PAD } from './remote-key';
import { RemotePad } from './remote-pad';
import { RemotePicker } from './remote-picker';

const statusKeys: Record<Exclude<IrCapabilityStatus, 'available'>, 'remote.hardware_error' | 'remote.module_unavailable' | 'remote.no_emitter' | 'remote.service_unavailable' | 'remote.unsupported_platform'> = {
  'hardware-error': 'remote.hardware_error',
  'module-unavailable': 'remote.module_unavailable',
  'no-emitter': 'remote.no_emitter',
  'service-unavailable': 'remote.service_unavailable',
  'unsupported-platform': 'remote.unsupported_platform',
};

type Feedback = { id: number; kind: 'error' | 'success'; text: string };

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
  const [activeTab, setActiveTab] = React.useState<'captures' | 'pad'>('pad');
  const [sending, setSending] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<Feedback | null>(null);

  const remotes = useRemotes({ variables: { deviceType } });
  const remote = useRemote({ variables: { id: selected?.id ?? '' }, enabled: selected !== null });

  const handleSelect = React.useCallback((next: RemoteSummary | null) => {
    setSelected(next);
    setActiveTab('pad');
    setFeedback(null);
  }, []);

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

  const say = (kind: Feedback['kind'], text: string) =>
    setFeedback({ id: Date.now(), kind, text });

  /**
   * One send path for a moulded key and a raw capture alike.
   *
   * `key` is what the pad and the capture list both watch to draw the spinner,
   * so it has to be derived the same way on both sides — they used to disagree
   * on the fallback and a capture without a mapped key span the wrong button.
   */
  const run = async (key: string, label: string, command: () => Parameters<typeof transmit>[0]) => {
    if (!ready || sending !== null)
      return;

    setSending(key);
    setFeedback(null);
    try {
      await transmit(command());
      say('success', t('remote.sent', { key: label }));
    }
    catch {
      say('error', t('remote.transmit_failed'));
    }
    finally {
      setSending(null);
    }
  };

  const send = (button: RemoteButton) =>
    // The stored command is already in the shape the emitter takes, so it goes
    // straight through — nothing between the database and the LED.
    run(button.key, labelFor(t, button.key, button.label), () => button.command);

  const sendCapture = (capture: RemoteCapture) =>
    run(
      capture.buttonKey || capture.buttonName,
      labelFor(t, capture.buttonKey, capture.buttonName),
      () => captureToCommand(capture),
    );

  const captures = remote.data?.captures ?? [];
  const hasCaptures = captures.length > 0;
  const hasButtons = (remote.data?.buttons.length ?? 0) > 0;

  return (
    <View className="gap-4">
      <StatusBar
        capabilities={capabilities}
        ready={ready}
        selected={selected}
        status={status}
        onRetry={refreshCapabilities}
        onChange={() => handleSelect(null)}
      />

      {selected === null
        ? (
            <RemoteList
              deviceType={deviceType}
              onDeviceType={setDeviceType}
              query={remotes}
              onSelect={handleSelect}
            />
          )
        : remote.isPending
          ? <ActivityIndicator className="py-10" color={colors.primary[600]} />
          : remote.data
            ? (
                <View className="gap-3">
                  {/* Unverified codes come from a public database nobody has tested
                      against this appliance — say so rather than let a dead button
                      look like a broken emitter. */}
                  {selected.verified ? null : <UnverifiedNotice />}

                  {hasCaptures && hasButtons
                    ? (
                        <View className="flex-row rounded-2xl bg-muted p-1">
                          <TabButton
                            label={t('remote.pad_tab')}
                            active={activeTab === 'pad'}
                            onPress={() => setActiveTab('pad')}
                          />
                          <TabButton
                            label={`${t('remote.captures_tab')} (${captures.length})`}
                            active={activeTab === 'captures'}
                            onPress={() => setActiveTab('captures')}
                          />
                        </View>
                      )
                    : null}

                  {activeTab === 'captures' && hasCaptures
                    ? (
                        <RemoteCapturesView
                          captures={captures}
                          disabled={!ready}
                          sending={sending}
                          onPress={sendCapture}
                        />
                      )
                    : (
                        <RemotePad
                          remote={remote.data}
                          disabled={!ready}
                          sending={sending}
                          onPress={send}
                        />
                      )}
                </View>
              )
            : (
                <ErrorCard onRetry={() => void remote.refetch()} />
              )}

      <Toast feedback={feedback} onDone={() => setFeedback(null)} />
    </View>
  );
}

/**
 * The one line that says whether a press can do anything at all.
 *
 * Kept at the top and kept short, because on a screen this tall it is the only
 * thing that explains a pad full of keys that do nothing.
 */
function StatusBar({ capabilities, ready, selected, status, onRetry, onChange }: {
  capabilities: IrCapabilities | null;
  onChange: () => void;
  onRetry: () => void;
  ready: boolean;
  selected: RemoteSummary | null;
  status: string;
}) {
  const { t } = useTranslation();

  return (
    <View className="gap-3 rounded-3xl border border-border bg-card p-4">
      <View className="flex-row items-center gap-3">
        <View
          className="size-11 items-center justify-center rounded-2xl"
          style={{ backgroundColor: ready ? colors.success[50] : colors.neutral[100] }}
        >
          <HugeiconsIcon
            icon={selected?.deviceType === 'stb' ? SatelliteDishIcon : selected ? Tv01Icon : RemoteControlIcon}
            size={22}
            color={ready ? colors.success[600] : colors.neutral[500]}
            strokeWidth={2.2}
          />
        </View>

        <View className="min-w-0 flex-1">
          <Text className="text-[17px] font-bold text-foreground" numberOfLines={1}>
            {selected ? selected.model : t('remote.pick_title')}
          </Text>
          <View className="flex-row items-center gap-1.5">
            {capabilities === null
              ? null
              : (
                  <View
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: ready ? colors.success[500] : colors.danger[500] }}
                  />
                )}
            <Text
              selectable
              numberOfLines={1}
              className={`min-w-0 flex-1 text-xs ${ready ? 'text-success-700' : 'text-muted-foreground'}`}
            >
              {selected ? `${selected.brand} · ${status}` : status}
            </Text>
          </View>
        </View>

        {capabilities === null ? <ActivityIndicator color={colors.primary[600]} /> : null}

        {selected
          ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('remote.change')}
                onPress={onChange}
                className="size-9 items-center justify-center rounded-xl border border-border bg-surface active:bg-muted"
              >
                <HugeiconsIcon icon={RepeatIcon} size={16} color={colors.neutral[600]} strokeWidth={2.2} />
              </Pressable>
            )
          : null}
      </View>

      {capabilities?.available
        ? (
            <Text selectable className="text-[11px] text-muted-foreground">
              {capabilities.carrierFrequencyRanges.length
                ? formatRanges(capabilities)
                : t('remote.no_frequency_ranges')}
            </Text>
          )
        : capabilities
          ? <Button label={t('remote.retry')} variant="outline" size="sm" onPress={onRetry} />
          : null}
    </View>
  );
}

function UnverifiedNotice() {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-start gap-2.5 rounded-2xl border border-warning-200 bg-warning-50 p-3">
      <HugeiconsIcon icon={Alert02Icon} size={16} color={colors.warning[700]} strokeWidth={2.4} />
      <Text className="min-w-0 flex-1 text-xs/5 text-warning-800">
        {t('remote.unverified_warning')}
      </Text>
    </View>
  );
}

function TabButton({ label, active, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className="flex-1"
    >
      <MotiView
        animate={{ opacity: active ? 1 : 0 }}
        transition={{ type: 'timing', duration: 160 }}
        className="absolute inset-0 rounded-xl bg-card"
        style={{
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 1 },
          elevation: 2,
        }}
      />
      <View className="items-center justify-center py-2.5">
        <Text className={`text-[13px] font-bold ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * Confirmation that floats over the pad instead of trailing beneath it.
 *
 * The pad is taller than the screen, so a line at the bottom told the user
 * nothing about the power key they had just pressed at the top.
 */
function Toast({ feedback, onDone }: { feedback: Feedback | null; onDone: () => void }) {
  React.useEffect(() => {
    if (feedback === null)
      return;
    const timer = setTimeout(onDone, feedback.kind === 'error' ? 3200 : 1600);
    return () => clearTimeout(timer);
  }, [feedback, onDone]);

  return (
    <View pointerEvents="none" className="absolute inset-x-0 top-0 items-center">
      <AnimatePresence>
        {feedback
          ? (
              <MotiView
                key={feedback.id}
                from={{ opacity: 0, translateY: -14, scale: 0.94 }}
                animate={{ opacity: 1, translateY: 0, scale: 1 }}
                exit={{ opacity: 0, translateY: -10, scale: 0.96 }}
                transition={{ type: 'spring', damping: 17, stiffness: 260, mass: 0.5 }}
                className="flex-row items-center gap-2 rounded-full px-4 py-2.5"
                style={{
                  backgroundColor: feedback.kind === 'error' ? colors.danger[600] : PAD.bodyTop,
                  shadowColor: '#000',
                  shadowOpacity: 0.22,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 5 },
                  elevation: 8,
                }}
              >
                <HugeiconsIcon
                  icon={feedback.kind === 'error' ? Alert02Icon : CheckmarkCircle02Icon}
                  size={15}
                  color="#FFFFFF"
                  strokeWidth={2.4}
                />
                <Text
                  accessibilityLiveRegion="polite"
                  selectable
                  className="text-[13px] font-semibold text-white"
                >
                  {feedback.text}
                </Text>
              </MotiView>
            )
          : null}
      </AnimatePresence>
    </View>
  );
}

function ErrorCard({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="items-center gap-2 rounded-3xl border border-border bg-card p-8">
      <Text className="text-center text-sm text-muted-foreground">{t('remote.load_failed')}</Text>
      <Button label={t('remote.retry')} variant="outline" size="sm" onPress={onRetry} />
    </View>
  );
}

function RemoteList({ deviceType, onDeviceType, query, onSelect }: {
  deviceType: RemoteDeviceType;
  onDeviceType: (type: RemoteDeviceType) => void;
  // Structural rather than `ReturnType<typeof useRemotes>`: the hook is
  // overloaded, and `ReturnType` picks the wrong signature.
  query: { data: RemoteSummary[] | undefined; isPending: boolean; isError: boolean; refetch: () => unknown };
  onSelect: (remote: RemoteSummary) => void;
}) {
  if (query.isPending)
    return <ActivityIndicator className="py-10" color={colors.primary[600]} />;

  if (query.isError)
    return <ErrorCard onRetry={() => void query.refetch()} />;

  return (
    <RemotePicker
      deviceType={deviceType}
      onDeviceType={onDeviceType}
      remotes={query.data ?? []}
      onSelect={onSelect}
    />
  );
}

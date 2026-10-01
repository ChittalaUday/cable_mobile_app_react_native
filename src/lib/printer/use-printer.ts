import type { PairedPrinter, PrinterStatus } from './native';
import * as React from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { storage } from '@/lib/storage';
import { getNativeBtPrinter } from './native';

const LAST_PRINTER_KEY = 'printer.last-address';

/** Where the printer handshake has got to. Drives what the Done step shows. */
export type PrinterPhase
  = | 'unsupported'
    | 'checking'
    | 'needs-permission'
    | 'disabled'
    | 'idle'
    | 'connecting'
    | 'connected'
    | 'printing'
    | 'failed';

export type Printer = {
  phase: PrinterPhase;
  devices: PairedPrinter[];
  connectedAddress: string | null;
  error: string | null;
  /** The address used last time, offered first so a round is one tap per receipt. */
  lastAddress: string | null;
  refresh: () => Promise<void>;
  connect: (address: string) => Promise<boolean>;
  print: (bytes: Uint8Array) => Promise<boolean>;
  disconnect: () => Promise<void>;
};

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message !== '' ? error.message : fallback;
}

/**
 * Android 12+ needs `BLUETOOTH_CONNECT` at runtime. Asked for at the moment the
 * collector chooses to print, not at launch, so the prompt arrives with a
 * reason attached.
 */
async function askForBluetooth(): Promise<boolean> {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 31)
    return true;

  const granted = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
  ]);

  return granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * The Bluetooth printer, as one piece of state a screen can render.
 *
 * Holds the phase rather than a pile of booleans because the Done step has to
 * say exactly one thing at a time — asking for permission, listing printers,
 * connecting, or printing — and a set of independent flags makes "permission
 * denied while printing" representable when it is not.
 */
export function usePrinter(): Printer {
  const native = React.useMemo(() => getNativeBtPrinter(), []);
  const [phase, setPhase] = React.useState<PrinterPhase>(native === null ? 'unsupported' : 'checking');
  const [devices, setDevices] = React.useState<PairedPrinter[]>([]);
  const [connectedAddress, setConnectedAddress] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const lastAddress = React.useMemo(() => storage.getString(LAST_PRINTER_KEY) ?? null, []);

  const refresh = React.useCallback(async () => {
    if (native === null) {
      setPhase('unsupported');
      return;
    }

    setError(null);

    try {
      const status: PrinterStatus = await native.getStatus();

      if (!status.supported) {
        setPhase('unsupported');
        return;
      }

      if (!status.enabled) {
        setPhase('disabled');
        return;
      }

      if (!status.permitted && !await askForBluetooth()) {
        setPhase('needs-permission');
        return;
      }

      setDevices(await native.getPairedDevices());
      setConnectedAddress(status.connectedAddress);
      setPhase(status.connectedAddress === null ? 'idle' : 'connected');
    }
    catch (failure) {
      setError(messageOf(failure, 'Could not reach Bluetooth.'));
      setPhase('failed');
    }
  }, [native]);

  const connect = React.useCallback(async (address: string) => {
    if (native === null)
      return false;

    setPhase('connecting');
    setError(null);

    try {
      await native.connect(address);
      // Remembered so the next receipt on the round is one tap, not a list.
      storage.set(LAST_PRINTER_KEY, address);
      setConnectedAddress(address);
      setPhase('connected');
      return true;
    }
    catch (failure) {
      setError(messageOf(failure, 'Could not reach the printer.'));
      setPhase('failed');
      return false;
    }
  }, [native]);

  const print = React.useCallback(async (bytes: Uint8Array) => {
    if (native === null)
      return false;

    setPhase('printing');
    setError(null);

    try {
      await native.write(bytes);
      setPhase('connected');
      return true;
    }
    catch (failure) {
      setError(messageOf(failure, 'The printer stopped responding.'));
      setPhase('failed');
      return false;
    }
  }, [native]);

  const disconnect = React.useCallback(async () => {
    if (native === null)
      return;

    await native.disconnect();
    setConnectedAddress(null);
    setPhase('idle');
  }, [native]);

  return { phase, devices, connectedAddress, error, lastAddress, refresh, connect, print, disconnect };
}

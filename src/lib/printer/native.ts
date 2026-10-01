import { requireOptionalNativeModule } from 'expo';

export type PairedPrinter = {
  address: string;
  name: string;
  /** The device reports the imaging class. A hint for sorting, not a filter. */
  isLikelyPrinter: boolean;
};

export type PrinterStatus = {
  supported: boolean;
  enabled: boolean;
  permitted: boolean;
  connectedAddress: string | null;
};

export type NativeBtPrinter = {
  getStatus: () => Promise<PrinterStatus>;
  getPairedDevices: () => Promise<PairedPrinter[]>;
  connect: (address: string) => Promise<void>;
  write: (bytes: Uint8Array) => Promise<void>;
  disconnect: () => Promise<void>;
};

/**
 * The printer bridge, or null where there is not one.
 *
 * Optional on purpose: the module is Android-only, and it is absent in Expo Go
 * and in Jest. Every caller has to handle null anyway for iOS, so there is no
 * second code path for "not built in yet".
 */
export function getNativeBtPrinter() {
  return requireOptionalNativeModule<NativeBtPrinter>('BtPrinter');
}

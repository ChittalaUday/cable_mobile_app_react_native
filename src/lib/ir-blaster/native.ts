import type { IrCapabilities } from '@/lib/ir-blaster/types';
import { requireOptionalNativeModule } from 'expo';

export type NativeIrBlaster = {
  getCapabilities: () => Promise<IrCapabilities>;
  transmit: (carrierFrequencyHz: number, pattern: number[]) => Promise<void>;
};

export function getNativeIrBlaster() {
  return requireOptionalNativeModule<NativeIrBlaster>('IrBlaster');
}

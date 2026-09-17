import type { RemoteCapture } from '@/lib/api/types';
import type {
  IrBlasterErrorCode,
  IrCapabilities,
  IrCapabilityStatus,
  IrCommand,
} from '@/lib/ir-blaster/types';
import { Platform } from 'react-native';

import { encodeIrCommand } from '@/lib/ir-blaster/encode';
import { getNativeIrBlaster } from '@/lib/ir-blaster/native';
import { IrBlasterError } from '@/lib/ir-blaster/types';

export { encodeIrCommand } from '@/lib/ir-blaster/encode';
export * from '@/lib/ir-blaster/types';

/**
 * Converts a stored raw signal capture to an emitter-ready IrCommand.
 */
export function captureToCommand(capture: RemoteCapture): IrCommand {
  const proto = capture.protocol.toLowerCase();
  if (proto === 'nec') {
    const addr = capture.address.startsWith('0x') ? Number.parseInt(capture.address, 16) : Number(capture.address);
    return {
      protocol: 'nec',
      address: Number.isNaN(addr) ? 0 : addr,
      command: capture.commandNumber,
    };
  }
  if (capture.rawTimings && capture.rawTimings.length > 0) {
    return {
      protocol: 'raw',
      carrierFrequencyHz: 38000,
      pattern: capture.rawTimings.map(t => Math.abs(t)),
    };
  }
  return {
    protocol: 'nec',
    address: 0,
    command: capture.commandNumber,
  };
}

const nativeErrorCodes: IrBlasterErrorCode[] = [
  'ERR_IR_SERVICE_UNAVAILABLE',
  'ERR_IR_NO_EMITTER',
  'ERR_IR_CAPABILITY_QUERY_FAILED',
  'ERR_IR_INVALID_COMMAND',
  'ERR_IR_UNSUPPORTED_FREQUENCY',
  'ERR_IR_PATTERN_TOO_LONG',
  'ERR_IR_TRANSMIT_FAILED',
];

function unavailable(status: IrCapabilityStatus): IrCapabilities {
  return { available: false, carrierFrequencyRanges: [], status };
}

function asTransmitError(error: unknown) {
  if (error instanceof IrBlasterError)
    return error;

  if (error && typeof error === 'object' && 'code' in error) {
    const code = error.code;
    if (typeof code === 'string' && nativeErrorCodes.includes(code as IrBlasterErrorCode)) {
      const message = 'message' in error && typeof error.message === 'string'
        ? error.message
        : 'IR transmission failed';
      return new IrBlasterError(code as IrBlasterErrorCode, message);
    }
  }
  return new IrBlasterError('ERR_IR_TRANSMIT_FAILED', 'IR transmission failed');
}

export async function getCapabilities(): Promise<IrCapabilities> {
  if (Platform.OS !== 'android')
    return unavailable('unsupported-platform');

  const nativeModule = getNativeIrBlaster();
  if (!nativeModule)
    return unavailable('module-unavailable');

  try {
    return await nativeModule.getCapabilities();
  }
  catch {
    return unavailable('hardware-error');
  }
}

export async function transmit(command: IrCommand): Promise<void> {
  if (Platform.OS !== 'android')
    throw new IrBlasterError('ERR_IR_UNSUPPORTED_PLATFORM', 'IR transmission is available only on Android');

  const nativeModule = getNativeIrBlaster();
  if (!nativeModule)
    throw new IrBlasterError('ERR_IR_MODULE_UNAVAILABLE', 'IR native module is unavailable; rebuild the app');

  const signal = encodeIrCommand(command);
  try {
    await nativeModule.transmit(signal.carrierFrequencyHz, signal.pattern);
  }
  catch (error) {
    throw asTransmitError(error);
  }
}

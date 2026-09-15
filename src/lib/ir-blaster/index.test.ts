import { Platform } from 'react-native';

import { getCapabilities, transmit } from '@/lib/ir-blaster';
import { getNativeIrBlaster } from '@/lib/ir-blaster/native';

jest.mock('@/lib/ir-blaster/native', () => ({
  getNativeIrBlaster: jest.fn(),
}));

const nativeModule = {
  getCapabilities: jest.fn(),
  transmit: jest.fn(),
};

const getNativeMock = jest.mocked(getNativeIrBlaster);

describe('iR blaster facade', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    getNativeMock.mockReturnValue(nativeModule);
  });

  it('reports unsupported platforms without loading native code', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });

    await expect(getCapabilities()).resolves.toEqual({
      available: false,
      carrierFrequencyRanges: [],
      status: 'unsupported-platform',
    });
    await expect(transmit({ protocol: 'nec', address: 0, command: 0 }))
      .rejects
      .toMatchObject({ code: 'ERR_IR_UNSUPPORTED_PLATFORM' });
  });

  it('reports a missing native module', async () => {
    getNativeMock.mockReturnValue(null);

    await expect(getCapabilities()).resolves.toEqual({
      available: false,
      carrierFrequencyRanges: [],
      status: 'module-unavailable',
    });
    await expect(transmit({ protocol: 'nec', address: 0, command: 0 }))
      .rejects
      .toMatchObject({ code: 'ERR_IR_MODULE_UNAVAILABLE' });
  });

  it('returns all device CarrierFrequencyRange values', async () => {
    nativeModule.getCapabilities.mockResolvedValue({
      available: true,
      carrierFrequencyRanges: [
        { minHz: 30_000, maxHz: 40_000 },
        { minHz: 56_000, maxHz: 60_000 },
      ],
      status: 'available',
    });

    await expect(getCapabilities()).resolves.toEqual({
      available: true,
      carrierFrequencyRanges: [
        { minHz: 30_000, maxHz: 40_000 },
        { minHz: 56_000, maxHz: 60_000 },
      ],
      status: 'available',
    });
  });

  it('encodes protocol commands before native transmission', async () => {
    nativeModule.transmit.mockResolvedValue(undefined);

    await transmit({ protocol: 'nec', address: 1, command: 2 });

    expect(nativeModule.transmit).toHaveBeenCalledWith(
      38_000,
      expect.arrayContaining([9000, 4500, 560, 1690]),
    );
  });

  it('preserves recognized native error codes', async () => {
    nativeModule.transmit.mockRejectedValue({
      code: 'ERR_IR_NO_EMITTER',
      message: 'This device has no IR emitter',
    });

    await expect(transmit({ protocol: 'nec', address: 0, command: 0 }))
      .rejects
      .toMatchObject({ code: 'ERR_IR_NO_EMITTER' });
  });

  it('normalizes unknown native failures', async () => {
    nativeModule.transmit.mockRejectedValue(new Error('vendor failure'));

    await expect(transmit({ protocol: 'raw', carrierFrequencyHz: 38_000, pattern: [1] }))
      .rejects
      .toMatchObject({ code: 'ERR_IR_TRANSMIT_FAILED' });
  });

  it('maps capability query failures to hardware error status', async () => {
    nativeModule.getCapabilities.mockRejectedValue(new Error('service died'));

    await expect(getCapabilities()).resolves.toEqual({
      available: false,
      carrierFrequencyRanges: [],
      status: 'hardware-error',
    });
  });
});

import type { IrCommand } from '@/lib/ir-blaster/types';
import { encodeIrCommand } from '@/lib/ir-blaster/encode';

describe('encodeIrCommand', () => {
  it('passes raw database signals through without sharing the pattern array', () => {
    const pattern = [9000, 4500, 560, 560];
    const signal = encodeIrCommand({ protocol: 'raw', carrierFrequencyHz: 38_000, pattern });

    expect(signal).toEqual({ carrierFrequencyHz: 38_000, pattern });
    expect(signal.pattern).not.toBe(pattern);
  });

  it('encodes NEC address and command bytes LSB-first with complements', () => {
    const signal = encodeIrCommand({ protocol: 'nec', address: 0x01, command: 0x02 });

    expect(signal.carrierFrequencyHz).toBe(38_000);
    expect(signal.pattern.slice(0, 8)).toEqual([9000, 4500, 560, 1690, 560, 560, 560, 560]);
    expect(signal.pattern.slice(18, 24)).toEqual([560, 560, 560, 1690, 560, 1690]);
    expect(signal.pattern.at(-1)).toBe(560);
  });

  it('encodes extended NEC without complementing the 16-bit address', () => {
    const signal = encodeIrCommand({ protocol: 'nec-extended', address: 0x0100, command: 0 });

    expect(signal.pattern.slice(18, 22)).toEqual([560, 1690, 560, 560]);
  });

  it('encodes Samsung frames with their 16-bit address and header', () => {
    const signal = encodeIrCommand({ protocol: 'samsung', address: 1, command: 0 });

    expect(signal.carrierFrequencyHz).toBe(38_000);
    expect(signal.pattern.slice(0, 6)).toEqual([4500, 4500, 560, 1690, 560, 560]);
  });

  it('encodes Sony SIRC payloads LSB-first', () => {
    const signal = encodeIrCommand({ protocol: 'sony-sirc', bits: 12, data: 1 });

    expect(signal.carrierFrequencyHz).toBe(40_000);
    expect(signal.pattern).toEqual([
      2400,
      600,
      1200,
      600,
      600,
      600,
      600,
      600,
      600,
      600,
      600,
      600,
      600,
      600,
      600,
      600,
      600,
      600,
      600,
      600,
      600,
      600,
      600,
      600,
      600,
      600,
    ]);
  });

  it('encodes RC5 commands using Manchester timing', () => {
    const signal = encodeIrCommand({ protocol: 'rc5', address: 0, command: 0, toggle: 0 });

    expect(signal.carrierFrequencyHz).toBe(36_000);
    expect(signal.pattern.slice(0, 6)).toEqual([889, 889, 889, 1778, 889, 889]);
    expect(signal.pattern.reduce((total, duration) => total + duration, 0)).toBe(24_892);
  });

  it('encodes RC6 mode 0 with a double-width toggle bit', () => {
    const signal = encodeIrCommand({ protocol: 'rc6', address: 0, command: 0, toggle: 1 });

    expect(signal.carrierFrequencyHz).toBe(36_000);
    expect(signal.pattern.slice(0, 4)).toEqual([2666, 889, 444, 888]);
    expect(signal.pattern.reduce((total, duration) => total + duration, 0)).toBe(23_091);
  });

  it('uses a custom frequency and adds complete repeat frames', () => {
    const once = encodeIrCommand({ protocol: 'samsung', address: 0, command: 0 });
    const repeated = encodeIrCommand({
      protocol: 'samsung',
      address: 0,
      command: 0,
      carrierFrequencyHz: 37_500,
      repeatCount: 1,
    });

    expect(repeated.carrierFrequencyHz).toBe(37_500);
    expect(repeated.pattern.length).toBe(once.pattern.length * 2 + 1);
  });
});

describe('iR command validation', () => {
  it.each([
    { protocol: 'nec', address: 256, command: 0 },
    { protocol: 'nec', address: 0, command: -1 },
    { protocol: 'nec-extended', address: 65_536, command: 0 },
    { protocol: 'samsung', address: 0, command: 256 },
    { protocol: 'sony-sirc', bits: 13, data: 0 },
    { protocol: 'sony-sirc', bits: 20, data: 1_048_576 },
    { protocol: 'rc5', address: 32, command: 0, toggle: 0 },
    { protocol: 'rc5', address: 0, command: 128, toggle: 0 },
    { protocol: 'rc6', address: 0, command: 0, toggle: 2 },
    { protocol: 'nec', address: 0, command: 0, repeatCount: -1 },
    { protocol: 'nec', address: 0, command: 0, repeatCount: 101 },
    { protocol: 'raw', carrierFrequencyHz: 38_000 },
    { protocol: 'unknown' },
  ])('rejects an invalid protocol command: $protocol', (command) => {
    expect(() => encodeIrCommand(command as unknown as IrCommand)).toThrow(
      expect.objectContaining({ code: 'ERR_IR_INVALID_COMMAND' }),
    );
  });

  it.each([
    { carrierFrequencyHz: 0, pattern: [1] },
    { carrierFrequencyHz: 38_000.5, pattern: [1] },
    { carrierFrequencyHz: Number.NaN, pattern: [1] },
    { carrierFrequencyHz: 38_000, pattern: [] },
    { carrierFrequencyHz: 38_000, pattern: [0] },
    { carrierFrequencyHz: 38_000, pattern: [-1] },
    { carrierFrequencyHz: 38_000, pattern: [1.5] },
    { carrierFrequencyHz: 38_000, pattern: [2_147_483_648] },
  ])('rejects an invalid raw signal: %#', (command) => {
    expect(() => encodeIrCommand({ protocol: 'raw', ...command })).toThrow(
      expect.objectContaining({ code: 'ERR_IR_INVALID_COMMAND' }),
    );
  });

  it('accepts the largest valid total duration', () => {
    expect(encodeIrCommand({
      protocol: 'raw',
      carrierFrequencyHz: 38_000,
      pattern: [1_000_000, 999_999],
    }).pattern).toEqual([1_000_000, 999_999]);
  });

  it('rejects a pattern at Android\'s two-second limit', () => {
    expect(() => encodeIrCommand({
      protocol: 'raw',
      carrierFrequencyHz: 38_000,
      pattern: [1_000_000, 1_000_000],
    })).toThrow(expect.objectContaining({ code: 'ERR_IR_PATTERN_TOO_LONG' }));
  });
});

import type { IrCommand, IrSignal } from '@/lib/ir-blaster/types';
import { IrBlasterError } from '@/lib/ir-blaster/types';

type Level = { mark: boolean; duration: number };

const ANDROID_INT_MAX = 2_147_483_647;
const MAX_PATTERN_DURATION = 2_000_000;
const MAX_PATTERN_ENTRIES = 10_000;
const MAX_REPEAT_COUNT = 100;

function invalid(message: string): never {
  throw new IrBlasterError('ERR_IR_INVALID_COMMAND', message);
}

function integer(name: string, value: number, [min, max]: [number, number]) {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    invalid(`${name} must be an integer from ${min} to ${max}`);
}

function validateSignal(signal: IrSignal) {
  integer('carrierFrequencyHz', signal.carrierFrequencyHz, [1, ANDROID_INT_MAX]);
  if (!Array.isArray(signal.pattern) || signal.pattern.length === 0 || signal.pattern.length > MAX_PATTERN_ENTRIES)
    invalid(`pattern must contain 1 to ${MAX_PATTERN_ENTRIES} durations`);

  let total = 0;
  for (const duration of signal.pattern) {
    integer('pattern duration', duration, [1, ANDROID_INT_MAX]);
    total += duration;
    if (total >= MAX_PATTERN_DURATION)
      throw new IrBlasterError('ERR_IR_PATTERN_TOO_LONG', 'pattern must be shorter than 2 seconds');
  }
}

function validateCommand(command: IrCommand) {
  if (!command || typeof command !== 'object')
    invalid('command must be an object');

  if (command.protocol !== 'raw') {
    integer('repeatCount', command.repeatCount ?? 0, [0, MAX_REPEAT_COUNT]);
    if (command.carrierFrequencyHz !== undefined)
      integer('carrierFrequencyHz', command.carrierFrequencyHz, [1, ANDROID_INT_MAX]);
  }

  switch (command.protocol) {
    case 'raw':
      if (!Array.isArray(command.pattern))
        invalid('pattern must be an array');
      return;
    case 'nec':
      integer('address', command.address, [0, 0xFF]);
      integer('command', command.command, [0, 0xFF]);
      return;
    case 'nec-extended':
    case 'samsung':
      integer('address', command.address, [0, 0xFFFF]);
      integer('command', command.command, [0, 0xFF]);
      return;
    case 'sony-sirc':
      if (![12, 15, 20].includes(command.bits))
        invalid('bits must be 12, 15, or 20');
      integer('data', command.data, [0, 2 ** command.bits - 1]);
      return;
    case 'rc5':
      integer('address', command.address, [0, 0x1F]);
      integer('command', command.command, [0, 0x7F]);
      integer('toggle', command.toggle, [0, 1]);
      return;
    case 'rc6':
      integer('address', command.address, [0, 0xFF]);
      integer('command', command.command, [0, 0xFF]);
      integer('toggle', command.toggle, [0, 1]);
      return;
    default:
      invalid('unsupported IR protocol');
  }
}

function appendLevel(levels: Level[], mark: boolean, duration: number) {
  const last = levels.at(-1);
  if (last?.mark === mark)
    last.duration += duration;
  else
    levels.push({ mark, duration });
}

function bitsLsb(value: number, count: number) {
  return Array.from({ length: count }, (_, bit) => (value >> bit) & 1);
}

function bitsMsb(value: number, count: number) {
  return Array.from({ length: count }, (_, bit) => (value >> (count - bit - 1)) & 1);
}

function pulseDistance(header: number[], bytes: number[]) {
  return [
    ...header,
    ...bytes.flatMap(byte => bitsLsb(byte, 8).flatMap(bit => [560, bit ? 1690 : 560])),
    560,
  ];
}

function manchester(bits: number[], options: { halfBit: number; prefix?: Level[]; wideBit?: number }) {
  const { halfBit, prefix = [], wideBit = -1 } = options;
  const levels = [...prefix];
  bits.forEach((bit, index) => {
    const duration = index === wideBit ? halfBit * 2 : halfBit;
    appendLevel(levels, bit === 1, duration);
    appendLevel(levels, bit !== 1, duration);
  });
  return levels.map(level => level.duration);
}

function repeat(pattern: number[], repeatCount: number, period: number) {
  const result = [...pattern];
  const frameDuration = pattern.reduce((total, duration) => total + duration, 0);
  for (let index = 0; index < repeatCount; index++) {
    const gap = Math.max(1, period - frameDuration);
    if (result.length % 2 === 0)
      result[result.length - 1]! += gap;
    else
      result.push(gap);
    result.push(...pattern);
  }
  return result;
}

export function encodeIrCommand(command: IrCommand): IrSignal {
  validateCommand(command);
  if (command.protocol === 'raw') {
    const signal = { carrierFrequencyHz: command.carrierFrequencyHz, pattern: [...command.pattern] };
    validateSignal(signal);
    return signal;
  }

  let carrierFrequencyHz = 38_000;
  let frame: number[];
  let period = 110_000;

  switch (command.protocol) {
    case 'nec':
      frame = pulseDistance(
        [9000, 4500],
        [command.address, command.address ^ 0xFF, command.command, command.command ^ 0xFF],
      );
      break;
    case 'nec-extended':
      frame = pulseDistance(
        [9000, 4500],
        [command.address & 0xFF, command.address >> 8, command.command, command.command ^ 0xFF],
      );
      break;
    case 'samsung':
      frame = pulseDistance(
        [4500, 4500],
        [command.address & 0xFF, command.address >> 8, command.command, command.command ^ 0xFF],
      );
      period = 108_000;
      break;
    case 'sony-sirc':
      carrierFrequencyHz = 40_000;
      frame = [2400, 600, ...bitsLsb(command.data, command.bits).flatMap(bit => [bit ? 1200 : 600, 600])];
      period = 45_000;
      break;
    case 'rc5': {
      carrierFrequencyHz = 36_000;
      const bits = [
        1,
        command.command < 64 ? 1 : 0,
        command.toggle,
        ...bitsMsb(command.address, 5),
        ...bitsMsb(command.command & 0x3F, 6),
      ];
      frame = manchester(bits, { halfBit: 889 });
      period = 114_000;
      break;
    }
    case 'rc6': {
      carrierFrequencyHz = 36_000;
      const bits = [1, 0, 0, 0, command.toggle, ...bitsMsb(command.address, 8), ...bitsMsb(command.command, 8)];
      frame = manchester(bits, {
        halfBit: 444,
        prefix: [{ mark: true, duration: 2666 }, { mark: false, duration: 889 }],
        wideBit: 4,
      });
      period = 107_000;
      break;
    }
  }

  const signal = {
    carrierFrequencyHz: command.carrierFrequencyHz ?? carrierFrequencyHz,
    pattern: repeat(frame, command.repeatCount ?? 0, period),
  };
  validateSignal(signal);
  return signal;
}

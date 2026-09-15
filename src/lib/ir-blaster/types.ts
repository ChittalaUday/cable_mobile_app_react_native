export type IrSignal = {
  carrierFrequencyHz: number;
  pattern: number[];
};

type CommonOptions = {
  carrierFrequencyHz?: number;
  repeatCount?: number;
};

export type RawIrCommand = {
  protocol: 'raw';
  carrierFrequencyHz: number;
  pattern: number[];
};

export type ProtocolIrCommand
  = | ({ protocol: 'nec'; address: number; command: number } & CommonOptions)
    | ({ protocol: 'nec-extended'; address: number; command: number } & CommonOptions)
    | ({ protocol: 'samsung'; address: number; command: number } & CommonOptions)
    | ({ protocol: 'sony-sirc'; bits: 12 | 15 | 20; data: number } & CommonOptions)
    | ({ protocol: 'rc5'; address: number; command: number; toggle: 0 | 1 } & CommonOptions)
    | ({ protocol: 'rc6'; address: number; command: number; toggle: 0 | 1 } & CommonOptions);

export type IrCommand = RawIrCommand | ProtocolIrCommand;

export type IrBlasterErrorCode
  = | 'ERR_IR_UNSUPPORTED_PLATFORM'
    | 'ERR_IR_MODULE_UNAVAILABLE'
    | 'ERR_IR_SERVICE_UNAVAILABLE'
    | 'ERR_IR_NO_EMITTER'
    | 'ERR_IR_CAPABILITY_QUERY_FAILED'
    | 'ERR_IR_INVALID_COMMAND'
    | 'ERR_IR_UNSUPPORTED_FREQUENCY'
    | 'ERR_IR_PATTERN_TOO_LONG'
    | 'ERR_IR_TRANSMIT_FAILED';

export class IrBlasterError extends Error {
  readonly code: IrBlasterErrorCode;

  constructor(code: IrBlasterErrorCode, message: string) {
    super(message);
    this.name = 'IrBlasterError';
    this.code = code;
  }
}

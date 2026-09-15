# Android IR Blaster Design

## Goal

Add an Android-only Expo native module that lets TypeScript discover a device's consumer IR capability and transmit commands supplied by the app or backend. The initial command formats are NEC, extended NEC, Samsung, Sony SIRC, RC5, RC6 mode 0, and raw carrier-frequency patterns.

## Scope

The implementation is a local Expo module under `modules/`. It uses Android's `ConsumerIrManager`; no third-party IR dependency, built-in remote-code database, remote-learning feature, UI, or direct edits to generated `android/` or `ios/` projects are included.

The module includes `android.permission.TRANSMIT_IR`, an install-time normal permission, and declares `android.hardware.consumerir` with `required="false"` so devices without an emitter can still install the app. It requires a native development or production build and does not support Expo Go.

## TypeScript Contract

The package exports:

- `getCapabilities(): Promise<IrCapabilities>` to report platform support, emitter availability, and inclusive carrier-frequency ranges without throwing for an ordinary unsupported device.
- `transmit(command: IrCommand): Promise<void>` to validate, encode, and synchronously hand a signal to Android.
- `encodeIrCommand(command: ProtocolIrCommand): IrSignal` as a pure helper for deterministic testing and inspection.

`IrCommand` is a discriminated union:

- `raw`: `carrierFrequencyHz` plus an alternating mark/space `pattern` in microseconds.
- `nec`: 8-bit address and 8-bit command.
- `nec-extended`: 16-bit address and 8-bit command.
- `samsung`: 16-bit address and 8-bit command.
- `sony-sirc`: a numeric payload and `bits` of 12, 15, or 20.
- `rc5`: 5-bit address, 7-bit command, and one-bit toggle.
- `rc6`: mode-0 8-bit address, 8-bit command, and one-bit toggle.

Protocol commands accept optional `carrierFrequencyHz` and `repeatCount`; otherwise each encoder uses its protocol default. Raw commands carry their full timing data from the database or TypeScript. `repeatCount` means additional complete frames. The combined pattern, including protocol-defined inter-frame gaps, must remain below Android's two-second limit.

All numeric inputs must be finite integers in the ranges defined above. Pattern entries must be positive integers, alternate mark/space beginning with a mark, fit Android integers, and have a positive total duration below two seconds. Unknown object keys are ignored at runtime, but missing or invalid required values fail before reaching native code.

## Native Contract

The Kotlin module exposes only two asynchronous functions:

- `getCapabilities` obtains `ConsumerIrManager`, checks `hasIrEmitter()`, and maps each Android `ConsumerIrManager.CarrierFrequencyRange` to an inclusive `{ minHz, maxHz }` record.
- `transmit(carrierFrequencyHz, pattern)` repeats trust-boundary validation, confirms an emitter exists, verifies the requested frequency against reported ranges when the query succeeds, and calls `ConsumerIrManager.transmit` away from the JavaScript thread.

Keeping protocol encoding in TypeScript means new encoders do not require changing the hardware bridge. Kotlin remains the final safety boundary because TypeScript validation can be bypassed.

The manifest contribution lives inside the local module and is merged by Expo autolinking/prebuild. Existing native project directories are not edited.

## Capability and Error Model

`IrCapabilities` has an `available` boolean, a `status`, and `carrierFrequencyRanges`. Status is one of `available`, `unsupported-platform`, `module-unavailable`, `service-unavailable`, `no-emitter`, or `hardware-error`.

`transmit` rejects with `IrBlasterError`, preserving one of these stable codes:

- `ERR_IR_UNSUPPORTED_PLATFORM`
- `ERR_IR_MODULE_UNAVAILABLE`
- `ERR_IR_SERVICE_UNAVAILABLE`
- `ERR_IR_NO_EMITTER`
- `ERR_IR_CAPABILITY_QUERY_FAILED`
- `ERR_IR_INVALID_COMMAND`
- `ERR_IR_UNSUPPORTED_FREQUENCY`
- `ERR_IR_PATTERN_TOO_LONG`
- `ERR_IR_TRANSMIT_FAILED`

Expected absence is not retried. Android service, security, argument, and runtime failures are caught and mapped without exposing stack traces or device-specific exception messages as the public contract. A carrier-frequency query returning null is treated as a capability-query failure; transmission may not proceed because support cannot be verified safely.

The API can detect OS and service failures, but Android provides no feedback confirming that the physical IR LED emitted or that the target device received a command. A damaged emitter that Android reports as successful is therefore outside detectable failure handling.

## Testing

TypeScript tests are written first and use known timing/bit-order vectors for each protocol. They cover custom frequencies, repetition, input bounds, empty and malformed patterns, the two-second boundary, unavailable platforms/modules, capability mapping, and native error normalization.

Kotlin tests cover the pure native validator and error mapping. The Android module is compiled as part of the app build, and final verification runs its focused tests, the TypeScript tests, `pnpm type-check`, and `pnpm lint`. Physical transmission still requires a real IR-equipped Android device and a receiving appliance; emulator success cannot prove emitted output.

## Deliberate Limits

The first version does not ship a brand/model code catalog, learn signals, queue or schedule commands, infer protocols, or confirm appliance state. Codes remain backend/app data. Add another protocol as a pure TypeScript encoder when stored codes require it; raw mode covers unsupported protocols in the meantime.

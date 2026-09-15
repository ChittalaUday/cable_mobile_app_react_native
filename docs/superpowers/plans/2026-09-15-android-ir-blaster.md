# Android IR Blaster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add a typed Android IR transmitter supporting common protocols and database-provided raw signals with safe capability and failure handling.

**Architecture:** A local Expo module is the final Kotlin trust boundary around `ConsumerIrManager`. Pure TypeScript encoders produce one `{ carrierFrequencyHz, pattern }` shape for NEC, extended NEC, Samsung, Sony SIRC, RC5, RC6 mode 0, and raw signals; the public facade normalizes platform and native errors.

**Tech Stack:** Expo SDK 54 Modules API, Kotlin, Android `ConsumerIrManager`, TypeScript, Jest, JUnit 4.

**Spec:** `docs/superpowers/specs/2026-09-15-android-ir-blaster-design.md`

## Global Constraints

- Do not edit generated `android/` or `ios/` project files.
- Do not add a remote-code database, UI, learning, scheduling, protocol inference, or appliance-state confirmation.
- Keep IR optional for installation by declaring `android.hardware.consumerir` with `android:required="false"`.
- Every transmitted pattern must contain positive integer microsecond durations and total less than `2_000_000` microseconds.
- The native boundary must independently validate values supplied by JavaScript.
- Preserve unrelated staged and unstaged user changes.

---

### Task 1: Pure TypeScript command encoding

**Files:**
- Create: `src/lib/ir-blaster/types.ts`
- Create: `src/lib/ir-blaster/encode.ts`
- Test: `src/lib/ir-blaster/encode.test.ts`

**Interfaces:**
- Produces: `IrCommand`, `ProtocolIrCommand`, `IrSignal`, and `encodeIrCommand(command: IrCommand): IrSignal`.
- `IrCommand` discriminates on `protocol`: `raw`, `nec`, `nec-extended`, `samsung`, `sony-sirc`, `rc5`, or `rc6`.

- [x] **Step 1: Write failing protocol-vector tests**

Test known header, bit-order, payload width, default frequency, frequency override, and repetition behavior. Use compact expected arrays built from literal protocol timings, for example:

```ts
const nec = encodeIrCommand({ protocol: 'nec', address: 0, command: 0 });
expect(nec.carrierFrequencyHz).toBe(38_000);
expect(nec.pattern.slice(0, 10)).toEqual([
  9000, 4500, 560, 560, 560, 560, 560, 560, 560, 560,
]);

expect(encodeIrCommand({ protocol: 'sony-sirc', bits: 12, data: 1 })).toMatchObject({
  carrierFrequencyHz: 40_000,
  pattern: [2400, 600, 1200, 600],
});
```

Add focused vectors for extended NEC, Samsung, RC5 Manchester encoding, and RC6 mode-0 trailer-bit timing. Assert that a custom `carrierFrequencyHz` replaces only the default frequency.

- [x] **Step 2: Run the tests and verify RED**

Run: `pnpm exec jest src/lib/ir-blaster/encode.test.ts --runInBand`

Expected: FAIL because `@/lib/ir-blaster/encode` does not exist.

- [x] **Step 3: Implement the smallest pure encoders**

Define exact command types with bounded fields:

```ts
export type IrSignal = { carrierFrequencyHz: number; pattern: number[] };
export type CommonOptions = { carrierFrequencyHz?: number; repeatCount?: number };
export type IrCommand =
  | ({ protocol: 'raw'; carrierFrequencyHz: number; pattern: number[] })
  | ({ protocol: 'nec'; address: number; command: number } & CommonOptions)
  | ({ protocol: 'nec-extended'; address: number; command: number } & CommonOptions)
  | ({ protocol: 'samsung'; address: number; command: number } & CommonOptions)
  | ({ protocol: 'sony-sirc'; bits: 12 | 15 | 20; data: number } & CommonOptions)
  | ({ protocol: 'rc5'; address: number; command: number; toggle: 0 | 1 } & CommonOptions)
  | ({ protocol: 'rc6'; address: number; command: number; toggle: 0 | 1 } & CommonOptions);
export type ProtocolIrCommand = Exclude<IrCommand, { protocol: 'raw' }>;
```

Use small private helpers for LSB-first pulse-distance bits and Manchester half-bit levels. Merge adjacent equal levels before converting levels to alternating durations. Append protocol-correct inter-frame gaps for `repeatCount`, then validate the final signal once.

- [x] **Step 4: Run the protocol-vector tests and verify GREEN**

Run: `pnpm exec jest src/lib/ir-blaster/encode.test.ts --runInBand`

Expected: PASS.

- [x] **Step 5: Commit the encoder**

```bash
git add src/lib/ir-blaster/types.ts src/lib/ir-blaster/encode.ts src/lib/ir-blaster/encode.test.ts
git commit -m "feat: encode common IR protocols"
```

### Task 2: TypeScript trust-boundary validation

**Files:**
- Modify: `src/lib/ir-blaster/encode.ts`
- Test: `src/lib/ir-blaster/encode.test.ts`

**Interfaces:**
- Consumes: `IrCommand` and `IrSignal` from Task 1.
- Produces: validated signals or `IrBlasterError` with `ERR_IR_INVALID_COMMAND` / `ERR_IR_PATTERN_TOO_LONG`.

- [x] **Step 1: Add failing table-driven edge-case tests**

Cover non-finite, fractional, negative, and out-of-range protocol fields; invalid SIRC widths; invalid toggle values; negative repeat counts; empty raw patterns; zero, negative, fractional, and `Int.MAX_VALUE`-overflowing durations; invalid frequencies; and totals of `1_999_999` versus `2_000_000` microseconds.

```ts
expect(() => encodeIrCommand({
  protocol: 'raw',
  carrierFrequencyHz: 38_000,
  pattern: [1_000_000, 1_000_000],
})).toThrow(expect.objectContaining({ code: 'ERR_IR_PATTERN_TOO_LONG' }));
```

- [x] **Step 2: Run the validation tests and verify RED**

Run: `pnpm exec jest src/lib/ir-blaster/encode.test.ts --runInBand`

Expected: FAIL on the first invalid input that is currently accepted.

- [x] **Step 3: Add one shared signal validator and bounded field checks**

Create `IrBlasterError` in `types.ts`, use `Number.isSafeInteger`, cap Kotlin-bound integers at `2_147_483_647`, require `carrierFrequencyHz > 0`, and sum durations without overflow. Keep protocol ranges next to their encoder branches.

- [x] **Step 4: Run the validation tests and verify GREEN**

Run: `pnpm exec jest src/lib/ir-blaster/encode.test.ts --runInBand`

Expected: PASS.

- [x] **Step 5: Commit validation**

```bash
git add src/lib/ir-blaster/types.ts src/lib/ir-blaster/encode.ts src/lib/ir-blaster/encode.test.ts
git commit -m "feat: validate IR commands"
```

### Task 3: Android Expo module and native validation

**Files:**
- Create: `modules/ir-blaster/expo-module.config.json`
- Create: `modules/ir-blaster/android/build.gradle`
- Create: `modules/ir-blaster/android/src/main/AndroidManifest.xml`
- Create: `modules/ir-blaster/android/src/main/java/expo/modules/irblaster/IrBlasterModule.kt`
- Create: `modules/ir-blaster/android/src/main/java/expo/modules/irblaster/IrSignalValidator.kt`
- Test: `modules/ir-blaster/android/src/test/java/expo/modules/irblaster/IrSignalValidatorTest.kt`

**Interfaces:**
- Produces native module `IrBlaster` with `getCapabilities(): Promise<NativeIrCapabilities>` and `transmit(carrierFrequencyHz: number, pattern: number[]): Promise<void>`.
- Native statuses: `available`, `service-unavailable`, `no-emitter`, `hardware-error`.

- [x] **Step 1: Generate the Android-only local-module skeleton, then remove sample behavior**

Run:

```bash
EXPO_NONINTERACTIVE=1 npx create-expo-module@latest ir-blaster --local --name IrBlaster --package expo.modules.irblaster --platform android --features AsyncFunction
```

Keep only the generated build/autolinking structure; remove sample constants/functions before adding production behavior.

- [x] **Step 2: Write a failing JUnit validator test**

Test the same integer, empty-pattern, and two-second boundary rules as TypeScript, with assertions such as:

```kotlin
assertEquals(
  IrValidationFailure.PATTERN_TOO_LONG,
  IrSignalValidator.validate(38_000, intArrayOf(1_000_000, 1_000_000))
)
assertNull(IrSignalValidator.validate(38_000, intArrayOf(999_999, 1_000_000)))
```

- [x] **Step 3: Run the native test and verify RED**

Run: `cd android && ./gradlew :ir-blaster:testDebugUnitTest --tests expo.modules.irblaster.IrSignalValidatorTest`

Expected: FAIL because `IrSignalValidator` does not exist.

- [x] **Step 4: Implement native validation and the hardware wrapper**

Use `appContext.reactContext?.getSystemService(Context.CONSUMER_IR_SERVICE) as? ConsumerIrManager`. `getCapabilities` checks service presence, `hasIrEmitter()`, and maps each `ConsumerIrManager.CarrierFrequencyRange` to inclusive `minHz`/`maxHz` values. `transmit` validates, repeats capability checks, rejects a frequency outside every reported range, then calls the synchronous Android transmitter inside an Expo `AsyncFunction`.

Map exceptions to the stable codes from the spec with Expo `CodedException` subclasses. Treat a null range result as `ERR_IR_CAPABILITY_QUERY_FAILED`; never guess that a custom frequency is supported.

Add to the module manifest:

```xml
<uses-permission android:name="android.permission.TRANSMIT_IR" />
<uses-feature android:name="android.hardware.consumerir" android:required="false" />
```

- [x] **Step 5: Run native tests and compile the module**

Run:

```bash
cd android
./gradlew :ir-blaster:testDebugUnitTest :ir-blaster:compileDebugKotlin
```

Expected: PASS and BUILD SUCCESSFUL.

- [x] **Step 6: Commit the native module**

```bash
git add modules/ir-blaster
git commit -m "feat: add Android IR transmitter module"
```

### Task 4: Public TypeScript facade and native error normalization

**Files:**
- Create: `src/lib/ir-blaster/native.ts`
- Create: `src/lib/ir-blaster/index.ts`
- Test: `src/lib/ir-blaster/index.test.ts`

**Interfaces:**
- Consumes: `encodeIrCommand`, `IrCommand`, and native module `IrBlaster`.
- Produces: public `getCapabilities(): Promise<IrCapabilities>` and `transmit(command: IrCommand): Promise<void>`.

- [x] **Step 1: Write failing facade tests**

Mock only the unavoidable native boundary. Verify unsupported iOS/web, missing native module, no emitter, successful capability mapping with multiple ranges, encoded arguments passed to native, and every native code normalized into `IrBlasterError`.

```ts
await expect(getCapabilities()).resolves.toEqual({
  available: false,
  status: 'no-emitter',
  carrierFrequencyRanges: [],
});
await expect(transmit({ protocol: 'nec', address: 0, command: 1 }))
  .rejects.toMatchObject({ code: 'ERR_IR_NO_EMITTER' });
```

- [x] **Step 2: Run facade tests and verify RED**

Run: `pnpm exec jest src/lib/ir-blaster/index.test.ts --runInBand`

Expected: FAIL because the public facade does not exist.

- [x] **Step 3: Implement the minimal facade**

Use `Platform.OS` and Expo's optional native-module lookup so importing the file is safe on unsupported platforms. Return capability statuses for expected absence. Encode first, call native once, preserve recognized native error codes, and map unrecognized rejections to `ERR_IR_TRANSMIT_FAILED`.

- [x] **Step 4: Run facade and encoder tests and verify GREEN**

Run: `pnpm exec jest src/lib/ir-blaster/index.test.ts src/lib/ir-blaster/encode.test.ts --runInBand`

Expected: PASS.

- [x] **Step 5: Commit the facade**

```bash
git add src/lib/ir-blaster
git commit -m "feat: expose typed IR blaster API"
```

### Task 5: Integration verification

**Files:**
- Modify only files required by the local-module generator if autolinking needs them.

**Interfaces:**
- Verifies all outputs from Tasks 1–4 together.

- [x] **Step 1: Confirm Expo autolinking sees the module**

Run: `npx expo-modules-autolinking resolve --platform android`

Expected: output includes `expo.modules.irblaster.IrBlasterModule` from `modules/ir-blaster`.

- [x] **Step 2: Run focused and project checks**

Run:

```bash
pnpm exec jest src/lib/ir-blaster --runInBand
pnpm type-check
pnpm lint
cd android && ./gradlew :ir-blaster:testDebugUnitTest :ir-blaster:compileDebugKotlin
```

Expected: all commands succeed without new warnings.

- [x] **Step 3: Review the final diff**

Run: `git diff --check HEAD~3..HEAD && git status --short`

Confirm the diff contains only the IR module, its TypeScript API/tests, and generated local-module registration files. Leave unrelated user changes untouched.

# Remote Tabs Design

## Goal

Expose the existing Android IR transmitter as a practical remote-control tab for both admin and staff users.

## Design

Use one shared `RemoteControl` component. Admin receives a normal Expo Router tab route; staff keeps its existing in-screen tab bar and renders the same component as its fifth tab. This avoids an unrelated staff navigation migration.

The initial remote is a clearly labeled sample NEC set-top-box preset stored in TypeScript. Each key contains an `IrCommand`, so the same component can later receive commands decoded from a database response without changing the native bridge.

On mount the component calls `getCapabilities()`. It shows loading, available, unsupported platform, missing module/emitter, and hardware-error states. Controls remain disabled until an emitter is available. A key press calls `transmit()`, prevents overlapping sends, reports failures without exposing native exception text, and remains retryable.

The screen shows the reported `CarrierFrequencyRange` values and warns that sample codes may not match a real box. All new user-facing copy is localized in English and Telugu.

## Scope

- Shared remote UI and sample NEC command map.
- Admin and staff tab integration.
- Capability, transmission, error, pending, and retry behavior.
- English and Telugu translations and focused Jest tests.

No backend endpoint, preset selector, code learning, device persistence, or staff navigation migration is included.

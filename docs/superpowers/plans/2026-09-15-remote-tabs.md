# Remote Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one tested IR remote screen and expose it as a tab to admin and staff users.

**Architecture:** A shared component consumes the existing `getCapabilities()` and `transmit()` boundary. A typed sample NEC preset supplies the first button grid; admin routes to it while staff renders it in the existing in-screen tab system.

**Tech Stack:** Expo SDK 54, Expo Router 6, React Native, TypeScript, i18next, Jest, React Native Testing Library

**Spec:** `docs/superpowers/specs/2026-09-15-remote-tabs-design.md`

## Global Constraints

- Do not add dependencies or edit generated `android/` or `ios/` files.
- Use `@/` imports and existing UI primitives.
- Disable transmission unless capabilities report an available emitter.
- Translate new copy in English and Telugu.
- Preserve the current staff navigation structure.

---

### Task 1: Shared remote behavior

**Files:**
- Create: `src/components/remote/remote-control.test.tsx`
- Create: `src/components/remote/remote-control.tsx`
- Create: `src/components/remote/sample-remote.ts`
- Modify: `src/translations/en.json`
- Modify: `src/translations/te.json`

**Interfaces:**
- Consumes: `getCapabilities(): Promise<IrCapabilities>` and `transmit(command: IrCommand): Promise<void>` from `@/lib/ir-blaster`.
- Produces: `RemoteControl`, plus a typed `SAMPLE_REMOTE` whose keys contain `IrCommand` values.

- [ ] **Step 1: Write failing component tests**

Cover capability loading, disabled unavailable controls, the exact sample Power command sent through `transmit`, recoverable transmission failure, and Telugu labels. Mock only the hardware boundary with complete `IrCapabilities` results.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm test -- --runInBand src/components/remote/remote-control.test.tsx`

Expected: FAIL because `RemoteControl` does not exist.

- [ ] **Step 3: Implement the minimum shared screen**

Add the sample NEC key map and a screen that queries capability once, formats all returned carrier ranges, disables controls while unavailable or transmitting, sends the selected command, and shows localized safe error/retry states.

- [ ] **Step 4: Add and sort translations**

Add a `remote` object to both locale files, including button labels, capability statuses, frequency text, sample warning, retry, and transmission failure. Run `pnpm run lint:translations`.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `pnpm test -- --runInBand src/components/remote/remote-control.test.tsx`

Expected: PASS.

### Task 2: Admin and staff tab integration

**Files:**
- Create: `src/app/admin/(tabs)/remote.tsx`
- Modify: `src/app/admin/(tabs)/_layout.tsx`
- Modify: `src/app/staff/index.tsx`

**Interfaces:**
- Consumes: `RemoteControl` from `@/components/remote/remote-control`.
- Produces: admin route `/admin/remote` and a fifth staff tab labeled Remote.

- [ ] **Step 1: Add the admin route and static tab registration**

Render `RemoteControl` from the route and register it with the installed `RemoteControlIcon` while retaining the existing JavaScript tabs used by this app.

- [ ] **Step 2: Add the staff tab without restructuring navigation**

Add `Remote` to `staffTabs` and render `RemoteControl` only for that selected index. Keep existing placeholder behavior for the other staff tabs.

- [ ] **Step 3: Verify the whole change**

Run: `pnpm run type-check && pnpm run lint && pnpm run lint:translations && pnpm test -- --runInBand`

Expected: all commands exit successfully.

/** Mirrors `src/shared/constants/remotes.ts` in cable-backend. */

/** What kind of appliance a stored remote drives. */
export const REMOTE_DEVICE_TYPES = ['tv', 'stb'] as const;
export type RemoteDeviceType = (typeof REMOTE_DEVICE_TYPES)[number];

/**
 * Where a handset's codes came from, which is how far to trust them.
 *
 * `library` is imported from a public IR database; `learned` was captured from
 * a real handset against real hardware.
 */
export const REMOTE_SOURCES = ['library', 'learned'] as const;
export type RemoteSource = (typeof REMOTE_SOURCES)[number];

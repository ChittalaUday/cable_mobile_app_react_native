/** Mirrors `src/shared/constants/geo.ts` in cable-backend. */

export const LOCATION_SOURCES = ['system', 'admin', 'user', 'import'] as const;
export type LocationSource = (typeof LOCATION_SOURCES)[number];

export const LOCATION_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type LocationStatus = (typeof LOCATION_STATUSES)[number];

/** What a caller may set. `rejected` is the outcome of a review, not an edit. */
export const LOCATION_WRITABLE_STATUSES = ['pending', 'approved'] as const satisfies readonly LocationStatus[];
export type LocationWritableStatus = (typeof LOCATION_WRITABLE_STATUSES)[number];

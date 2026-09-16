/** Mirrors `src/shared/constants/tenancy.ts` in cable-backend. */

export const MEMBERSHIP_STATUSES = ['active', 'invited', 'suspended'] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

/** What the staff form may set; suspending is its own action. */
export const MEMBERSHIP_SETTABLE_STATUSES = ['active', 'invited'] as const satisfies readonly MembershipStatus[];
export type MembershipSettableStatus = (typeof MEMBERSHIP_SETTABLE_STATUSES)[number];

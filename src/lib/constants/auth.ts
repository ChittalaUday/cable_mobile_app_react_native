/** Mirrors `src/shared/constants/auth.ts` in cable-backend. */

/** How a one-time code reaches the subscriber. */
export const OTP_CHANNELS = ['whatsapp', 'sms'] as const;
export type OtpChannel = (typeof OTP_CHANNELS)[number];

/** The roles a staff record may hold. */
export const STAFF_ROLES = ['admin', 'staff'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

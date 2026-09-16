/** Mirrors `src/shared/constants/crm.ts` in cable-backend. */

/** Whether a catalogue row is offered. */
export const ENTITY_STATUSES = ['active', 'inactive'] as const;
export type EntityStatus = (typeof ENTITY_STATUSES)[number];

/** A subscriber's standing. `pending` is signed up but not yet connected. */
export const CUSTOMER_STATUSES = ['active', 'inactive', 'pending'] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const PACKAGE_TYPES = ['base', 'bouquet', 'addon', 'ala_carte', 'combo'] as const;
export type PackageType = (typeof PACKAGE_TYPES)[number];

export const CHANNEL_RESOLUTIONS = ['SD', 'HD', '4K'] as const;
export type ChannelResolution = (typeof CHANNEL_RESOLUTIONS)[number];

export const BILLING_CYCLES = ['monthly', 'quarterly', 'semi_annual', 'annual'] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

export const SUBSCRIPTION_STATUSES = ['active', 'inactive', 'suspended', 'cancelled'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** Whether a customer's resolved location came off their record or a subscription. */
export const CUSTOMER_LOCATION_SOURCES = ['customer', 'subscription'] as const;
export type CustomerLocationSource = (typeof CUSTOMER_LOCATION_SOURCES)[number];

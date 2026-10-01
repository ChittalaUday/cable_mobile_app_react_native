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

/** What a complaint is about. */
export const TICKET_CATEGORIES = [
  'no_signal',
  'poor_quality',
  'billing',
  'installation',
  'relocation',
  'disconnection',
  'other',
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed', 'cancelled'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

/** Statuses a ticket is no longer worked on in. */
export const TICKET_CLOSED_STATUSES = ['resolved', 'closed', 'cancelled'] as const;
export type TicketClosedStatus = (typeof TICKET_CLOSED_STATUSES)[number];

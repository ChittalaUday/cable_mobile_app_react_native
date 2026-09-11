/**
 * Tenant — a cable network operator entity that scopes all data in the app.
 * Every user, customer, account, payment, ticket, package, and service provider
 * belongs to exactly one tenant.
 */

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  phone: string;
  email: string;
  logoUrl: string | null;
  address: string | null;
  website: string | null;
  gstNumber: string | null;
  description: string | null;
  isActive: boolean;
};

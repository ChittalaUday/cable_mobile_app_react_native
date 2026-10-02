/**
 * Represents a single physical connection or hardware account (STB, Broadband, IPTV).
 */
export type ConnectionAccount = {
  id: string;
  customerId: string;
  /**
   * The subscription this connection bills against. Absent when the row was
   * synthesised from a service name because the customer has no service account
   * yet — `id` is a display key and is not always one of these.
   */
  subscriptionId?: string;
  serviceType: string;
  serviceTypeName: string;
  provider: string;
  providerName: string;
  /** Provider logo and site, when the operator has set them (http(s) only). */
  providerLogoUrl?: string;
  providerWebsiteUrl?: string;
  stbNumber?: string;
  vcNumber?: string;
  ipAddress?: string;
  packageName: string;
  /** This connection's balance: positive is owed, negative is advance. */
  balance: number;
  currency?: string;
  status: 'active' | 'expired' | 'suspended' | 'pending';
  expiryDate?: string;
  locationLabel?: string; // e.g. "Living Room", "Bedroom 1", "Office"
  speedMbps?: number;
};

/**
 * Consolidated customer model representing a subscriber person and all their associated connections.
 */
export type ConsolidatedCustomer = {
  id: string;
  customerCode?: string | null;
  name: string;
  phone: string;
  email?: string;
  address: string;
  status: 'active' | 'inactive' | 'pending';
  connections: ConnectionAccount[];
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Represents a single physical connection or hardware account (STB, Broadband, IPTV).
 */
export type ConnectionAccount = {
  id: string;
  customerId: string;
  serviceType: string;
  serviceTypeName: string;
  provider: string;
  providerName: string;
  stbNumber?: string;
  vcNumber?: string;
  ipAddress?: string;
  packageName: string;
  monthlyPrice: number;
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
  name: string;
  phone: string;
  email?: string;
  address: string;
  status: 'active' | 'inactive' | 'pending';
  connections: ConnectionAccount[];
  createdAt?: string;
  updatedAt?: string;
};

import type { ConnectionAccount, ConsolidatedCustomer } from './customer-connection';

/**
 * Connection item inside customer doc or account record.
 */
export type RawConnectionItem = {
  id?: string;
  serviceType?: string;
  serviceTypeName?: string;
  provider?: string;
  providerName?: string;
  stbSerialNumber?: string;
  vcNumber?: string;
  packages?: string[];
  monthlyPrice?: number;
  status?: string;
  expiryDate?: string;
  locationLabel?: string;
};

/**
 * Verified Customer document schema stored in `customers/{id}`.
 */
export type RawCustomerDoc = {
  id?: string;
  customerCode?: string;
  tenantId?: string;
  name?: string;
  phone?: string;
  address?: string;
  email?: string;
  accountIds?: string[];
  activeServices?: string[];
  connections?: RawConnectionItem[];
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Verified Customer Account document schema stored in `customer_accounts/{id}`.
 */
export type RawAccountDoc = {
  id?: string;
  accountNumber?: string;
  tenantId?: string;
  customerId?: string;
  lcoCustomerId?: string;
  serviceType?: string;
  serviceTypeName?: string;
  provider?: string;
  providerId?: string;
  providerName?: string;
  stbSerialNumber?: string;
  vcNumber?: string;
  packages?: string[];
  packageIds?: string[];
  monthlyPrice?: number;
  status?: string;
  msoShareDue?: number;
  expiryDate?: string;
  locationLabel?: string;
  speedMbps?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type AccountDoc = RawAccountDoc;
export type CustomerDoc = RawCustomerDoc;

/**
 * Verified Payment document schema stored in `payments/{id}`.
 */
export type PaymentDoc = {
  id?: string;
  tenantId?: string;
  amount?: number;
  totalAmount?: number;
  paidAmount?: number;
  paidAt?: string;
  paymentDate?: string;
  subscriberName?: string;
  customerName?: string;
  subscriberId?: string;
  customerId?: string;
  collectorId?: string;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Verified Staff document schema.
 */
export type StaffDoc = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  tenantId?: string;
};

/**
 * Verified Ticket document schema stored in `tickets/{id}`.
 */
export type TicketDoc = {
  id?: string;
  assignedTo?: string;
  status?: string;
  subject?: string;
  resolvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type { ConnectionAccount, ConsolidatedCustomer };

/**
 * Service package / plan document stored in `packages/{id}`.
 * Referenced by customer accounts via `packageIds`, surfaced on the customer list as the service.
 */
export type PackageDoc = {
  id: string;
  tenantId?: string;
  name: string;
  description?: string;
  serviceType: 'cable_tv' | 'internet' | 'fiber' | 'iptv' | 'combo';
  monthlyPrice: number;
  setupFee?: number;
  /** Billing cycle length in months (1 = monthly, 3 = quarterly …). */
  durationMonths: number;
  channelCount?: number;
  speedMbps?: number;
  dataLimitGb?: number;
  provider?: string;
  providerName?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type PackagePayload = Omit<PackageDoc, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>;

import type { OtpChannel, StaffRole } from '@/lib/constants/auth';
import type {
  BillingCycle,
  ChannelResolution,
  CustomerLocationSource,
  CustomerStatus,
  EntityStatus,
  PackageType,
  SubscriptionStatus,
} from '@/lib/constants/crm';
import type { LocationSource, LocationStatus, LocationWritableStatus } from '@/lib/constants/geo';
import type {
  EquipmentOwnership,
  InventoryLookupType,
  InventoryRequestStatus,
  InventoryRequestType,
  InventoryStatus,
  StockMovementType,
  TrackingType,
} from '@/lib/constants/inventory';
import type { RemoteDeviceType, RemoteSource } from '@/lib/constants/remotes';
import type { MembershipSettableStatus, MembershipStatus } from '@/lib/constants/tenancy';
import type { IrCommand } from '@/lib/ir-blaster';

export type Status = EntityStatus;

/**
 * The icon a tenant picked for a service, as a name the app resolves.
 *
 * There is no fixed set of service types: a tenant defines its own services, so
 * "Cable TV" and "Internet + IPTV" are rows rather than enum members, and the
 * icon is what tells them apart in a list. See `lib/service-icons.ts`.
 */
export type ServiceIcon = string;

/**
 * The largest `limit` the API accepts — `MAX_PAGE_SIZE` in `config/constants.ts`.
 *
 * Asking for more is a 400, not a clamp, so anything that wants "all of it"
 * pages instead.
 */
export const MAX_PAGE_SIZE = 100;

export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export type QueryOptions = Record<string, boolean | number | string | null | undefined>;

export type ApiUser = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  photoUrl: string | null;
  isSuperAdmin: boolean;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
};

export type Membership = {
  tenantId: string;
  /** What the tenant picker shows — the id on its own is an unreadable UUID. */
  tenantName: string;
  roleId: string;
};

export type AuthResponse = AuthTokens & {
  user: ApiUser;
  memberships: Membership[];
};

export type LoginRequest = {
  identifier: string;
  password?: string;
};

export type OtpRequest = {
  phone: string;
  channel?: OtpChannel;
};

export type OtpRequestResponse = {
  status: 'accepted';
  channel: string;
  expiresInSeconds: number;
};

export type OtpVerifyRequest = {
  phone: string;
  code: string;
};

export type CustomerAddress = {
  id: string;
  addressType: string;
  locationId: string | null;
  flatOrDoorNo: string | null;
  buildingOrApartment: string | null;
  streetOrRoad: string | null;
  landmark: string | null;
  area: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
};

export type CustomerSubscription = {
  id: string;
  serviceAccountNumber: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string | null;
  billingCycle: BillingCycle;
  price: string;
  installationAddress: string | null;
  service: { id: string; name: string; slug: string; icon: ServiceIcon | null };
  provider: { id: string; name: string; slug: string };
  package: { id: string; name: string; slug: string; packageType: string };
};

export type CustomerProfile = {
  id: string;
  customerCode: string | null;
  status: CustomerStatus;
  outstandingBalance: string;
  alternatePhone: string | null;
  whatsappNumber: string | null;
  areaId: string | null;
  locationId: string | null;
  address: CustomerAddress | null;
  subscriptions: CustomerSubscription[];
  summary: {
    subscriptions: number;
    activeSubscriptions: number;
    services: string[];
    outstandingBalance: string;
  };
};

/**
 * One row of the staff customer list.
 *
 * The breadcrumb and the service rollup arrive already resolved, so a row needs
 * no follow-up call to `/locations/:id` or `/packages/:id` to render.
 */
export type CustomerListItem = {
  id: string;
  customerCode: string | null;
  name: string | null;
  phone: string | null;
  status: CustomerStatus;
  outstandingBalance: string;
  locationId: string | null;
  /** `Mandapeta / TIDCO Apartments / Group C / C59 / Ground Floor / 6`. */
  locationPath: string | null;
  subscriptions: number;
  activeSubscriptions: number;
  services: string[];
  createdAt: string;
  alternatePhone: string | null;
  whatsappNumber: string | null;
  address: string | null;
  locations: {
    locationId: string;
    path: string;
    codes: string[];
    source: CustomerLocationSource;
  }[];
  serviceAccounts: {
    subscriptionId: string;
    accountNumber: string;
    installationAddress: string | null;
    locationId: string;
    locationPath: string | null;
    service?: string;
  }[];
  equipment: {
    id: string;
    subscriptionId: string;
    type: string;
    brand: string | null;
    model: string | null;
    serialNumber: string | null;
    vcNumber: string | null;
    macAddress: string | null;
    barcode: string | null;
    status: string;
  }[];
  matchedFields?: string[];
  score?: number;
};

/**
 * A page of customers.
 *
 * Keyset, not page numbers: pass `nextCursor` back until it is `null`. `total`
 * arrives on the first page only — it cannot usefully change while one operator
 * scrolls, and the server will not pay for it twice.
 */
export type CustomerPage = {
  items: CustomerListItem[];
  total: number | null;
  limit: number;
  nextCursor: string | null;
};

export type CustomerEquipment = {
  id: string;
  subscriptionId: string;
  name: string;
  serialNumber: string | null;
  status: string;
  assignedAt: string;
  returnedAt: string | null;
};

export type CustomerTransaction = {
  id: string;
  transactionNo: string;
  transactionDate: string;
  transactionType: string;
  serviceAccountNumber: string;
  debit: string;
  credit: string;
  closingBalance: string;
  remarks: string | null;
};

/**
 * Everything a customer details page draws, from ONE request.
 *
 * Each subscription already carries its service, provider and package, so the
 * screen never fans out to `/packages/:id` or `/service-providers/:id`.
 */
export type CustomerDetail = {
  id: string;
  customerCode: string | null;
  name: string | null;
  phone: string | null;
  alternatePhone: string | null;
  whatsappNumber: string | null;
  status: CustomerStatus;
  outstandingBalance: string;
  userId: string | null;
  locationId: string | null;
  locationPath: string | null;
  address: string | null;
  notes: string | null;
  subscriptions: CustomerSubscription[];
  equipment: CustomerEquipment[];
  recentTransactions: CustomerTransaction[];
  summary: {
    subscriptions: number;
    activeSubscriptions: number;
    services: string[];
    monthlyValue: string;
    outstandingBalance: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type MeResponse = {
  user: ApiUser;
  sessionId: string;
  deviceId: string;
  memberships: Membership[];
  customer: CustomerProfile | null;
};

export type Service = {
  id: string;
  name: string;
  slug: string;
  icon: ServiceIcon | null;
  description: string | null;
  status: Status;
  metadata: Record<string, unknown> | null;
  providerCount: number;
  providers?: ServiceProvider[];
  createdAt: string;
  updatedAt: string;
};

export type CreateServiceInput = {
  name: string;
  icon?: ServiceIcon | null;
  /** Omit it: the API derives one from `name`. */
  slug?: string;
  description?: string;
  metadata?: Record<string, unknown>;
};

export type UpdateServiceInput = Omit<Partial<CreateServiceInput>, 'slug' | 'description'> & {
  description?: string | null;
  status?: Status;
};

export type ServiceProvider = {
  id: string;
  serviceId: string;
  serviceName: string;
  /** The icon of the service it supplies, so a provider list reads the same. */
  serviceIcon: ServiceIcon | null;
  packageCount?: number;
  name: string;
  slug: string;
  code: string | null;
  description: string | null;
  contact: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  status: Status;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateServiceProviderInput = {
  serviceId: string;
  name: string;
  /** Omit it: the API derives one from `name`. */
  slug?: string;
  code?: string;
  description?: string;
  contact?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  isDefault?: boolean;
};

export type UpdateServiceProviderInput = Omit<
  Partial<CreateServiceProviderInput>,
  'serviceId' | 'slug' | 'description' | 'code' | 'contact' | 'metadata'
> & {
  /** `null` clears the field; `undefined` leaves it alone. */
  code?: string | null;
  description?: string | null;
  contact?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  status?: Status;
};

export type Package = {
  id: string;
  serviceProviderId: string;
  serviceProviderName: string;
  serviceId: string;
  serviceName: string;
  serviceIcon: ServiceIcon | null;
  name: string;
  slug: string;
  packageType: PackageType;
  price: string;
  discount: string;
  msoShare: string;
  taxRate: string;
  billingCycle: BillingCycle;
  description: string | null;
  metadata: Record<string, unknown> | null;
  status: Status;
  channelCount: number;
  /**
   * The breadcrumbs this package is sold in, when it is narrower than its
   * provider. Empty — the normal case — means it goes wherever the provider
   * does. One provider may sell the same package name twice for two areas at
   * two prices, and this is what tells the two rows apart.
   */
  coverageAreas: string[];
  createdAt: string;
  updatedAt: string;
};

/** The `channel_resolution` enum — a channel is one of exactly these three. */

export type Channel = {
  id: string;
  serviceProviderId: string;
  channelNumber: number;
  name: string;
  slug: string;
  genre: string;
  languages: string[];
  resolution: ChannelResolution;
  isFta: boolean;
  broadcaster: string | null;
  price: string;
  logoUrl: string | null;
  status: Status;
};

export type PackageDetail = Package & {
  channels: (Pick<Channel, 'id' | 'channelNumber' | 'name' | 'slug' | 'genre' | 'resolution' | 'isFta'> & {
    isMandatory: boolean;
  })[];
};

export type CreatePackageInput = {
  serviceProviderId: string;
  name: string;
  /** Omit it: the API derives one from `name`. */
  slug?: string;
  packageType?: PackageType;
  /** Money crosses the wire as a decimal string — never a JSON number. */
  price?: string;
  billingCycle?: BillingCycle;
  discount?: string;
  description?: string;
  metadata?: Record<string, unknown>;
};

/** `serviceProviderId` is absent on purpose — the API refuses to re-point a package. */
export type UpdatePackageInput = Omit<Partial<CreatePackageInput>, 'serviceProviderId' | 'slug' | 'description'> & {
  /** `null` clears it. */
  description?: string | null;
  status?: Status;
};

export type LocationCategory = {
  id: string;
  name: string;
  slug: string;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type LocationSchema = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  levels: {
    id: string;
    categoryId: string;
    categorySlug: string;
    categoryName: string;
    depth: number;
    isTerminal: boolean;
    config: Record<string, unknown>;
  }[];
  createdAt: string;
  updatedAt: string;
};

export type Location = {
  id: string;
  schemaId: string;
  categoryId: string;
  parentId: string | null;
  name: string;
  code: string | null;
  source: LocationSource;
  status: LocationStatus;
  isActive: boolean;
  latitude: string | null;
  longitude: string | null;
  metadata: Record<string, unknown> | null;
  aliases: string[];
  depth: number;
  path: string;
  pathIds: string[];
  /** Direct children — what a row means by "5 sub-locations". */
  childCount: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * One step from the root down to a node.
 *
 * `siblingIndex` is what makes a deep node reachable in a paged tree: it says
 * which page of its own level the step sits on.
 */
export type LocationAncestor = Location & { siblingIndex: number };

export type CreateLocationInput = {
  name: string;
  categoryId?: string;
  schemaId?: string;
  parentId?: string | null;
  code?: string;
  status?: LocationWritableStatus;
  metadata?: Record<string, unknown> | null;
  aliases?: string[];
};

export type Coverage = {
  id: string;
  serviceId: string;
  serviceProviderId: string | null;
  /** Set on the narrowest kind of row: this one package, here. */
  packageId: string | null;
  locationId: string;
  locationPath: string;
  isAvailable: boolean;
  note: string | null;
};

export type Availability = {
  locationId: string;
  services: (Pick<Service, 'id' | 'name' | 'slug' | 'icon'> & {
    providers: (Pick<ServiceProvider, 'id' | 'name' | 'slug' | 'isDefault'> & {
      packages: Pick<Package, 'id' | 'name' | 'slug' | 'packageType' | 'price' | 'billingCycle'>[];
    })[];
  })[];
};

/* ── Staff, teams and area grants (backend §6.4) ──────────────────────────── */

/** `customer` is absent on purpose: a subscriber is not made from these screens. */

/** Enough of a node to render a grant without a follow-up call to `/locations`. */
export type LocationRef = {
  id: string;
  name: string;
  /** Root-first breadcrumb, e.g. "Mandapeta / Sai Nagar". */
  path: string;
};

/**
 * One person's job at this operator — a membership, not an account.
 *
 * `id` is the membership id, which is the only handle that means anything
 * inside a tenant: identity is global, so the same person may work here and
 * subscribe somewhere else. Deleting one ends the job, not the login.
 */
export type StaffMember = {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  roleId: StaffRole;
  status: MembershipStatus;
  team: { id: string; name: string; slug: string } | null;
  /** Runs their crew. Optional, and only meaningful while they are on one. */
  isTeamLeader: boolean;
  /** Areas granted to this person directly — the crew never limits these. */
  locations: LocationRef[];
  /** What they actually reach through the crew: its whole patch, or their share. */
  inheritedLocations: LocationRef[];
  /**
   * Which parts of the crew's patch this person covers.
   *
   * **Empty means all of it, not none.** The narrowing table subtracts, so
   * absence is the permissive case — the one thing to get right when rendering
   * this.
   */
  teamAreas: LocationRef[];
  createdAt: string;
  updatedAt: string;
};

export type Team = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: Status;
  memberCount: number;
  locations: LocationRef[];
  createdAt: string;
  updatedAt: string;
};

export type CreateStaffInput = {
  name: string;
  /** One of `email` or `phone` is required — it is how they sign in. */
  email?: string;
  phone?: string;
  /** Only for a brand new account; an existing one sets its own. */
  password?: string;
  roleId?: StaffRole;
  status?: MembershipSettableStatus;
  teamId?: string | null;
  locationIds?: string[];
};

export type UpdateStaffInput = Partial<{
  name: string;
  roleId: StaffRole;
  status: MembershipStatus;
  teamId: string | null;
  /** Cleared automatically when they leave the crew. */
  isTeamLeader: boolean;
}>;

/** A crew member as the team screen lists them. */
export type TeamMember = {
  id: string;
  userId: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  roleId: StaffRole;
  status: MembershipStatus;
  isTeamLeader: boolean;
  locations: LocationRef[];
  /** Their share of the crew's patch — empty means all of it. */
  teamAreas: LocationRef[];
};

export type CreateTeamInput = {
  name: string;
  slug?: string;
  description?: string | null;
  status?: Status;
  locationIds?: string[];
};

export type UpdateTeamInput = Partial<{
  name: string;
  description: string | null;
  status: Status;
}>;

// ==========================================
// INVENTORY TYPES
// ==========================================

export type LowStockItem = {
  id: string;
  name: string;
  code: string | null;
  availableStock: number;
  totalStock: number;
};

export type RecentMovement = {
  id: string;
  movementType: StockMovementType;
  itemName: string;
  itemCode: string | null;
  targetName: string | null;
  fromLocationName?: string | null;
  toLocationName?: string | null;
  quantity: number;
  performedByName: string | null;
  createdAt: string;
};

export type InventoryLocation = {
  id: string;
  name: string;
  code: string | null;
  itemCount?: number;
};

export type InventoryDashboard = {
  locationId?: string | null;
  locationName?: string | null;
  totalItems: number;
  inStock: number;
  issued: number;
  inTransit: number;
  lowStockItems: LowStockItem[];
  recentMovements: RecentMovement[];
};

export type StockItem = {
  id: string;
  name: string;
  code: string | null;
  brand: string | null;
  model: string | null;
  itemType: string;
  trackingType: TrackingType;
  isBundle: boolean;
  defaultOwnership: EquipmentOwnership;
  defaultSalePrice: string;
  defaultDepositAmount: string;
  defaultRentalPrice: string;
  isReturnable: boolean;
  icon: string | null;
  description: string | null;
  totalStock: number;
  availableStock: number;
  issuedStock: number;
  inTransitStock: number;
  locationId: string | null;
  locationName: string | null;
};

export type CatalogItemPayload = Pick<StockItem, 'name'>
  & Partial<Pick<StockItem, 'code' | 'brand' | 'model' | 'defaultSalePrice' | 'defaultDepositAmount'>>;

export type ApprovalRequestPayload = {
  requestType: string;
  targetItemId?: string;
  proposedData?: Partial<CatalogItemPayload>;
  reason: string;
};

export type SerializedUnit = {
  id: string;
  serialNumber: string | null;
  vcNumber: string | null;
  macAddress: string | null;
  barcode: string | null;
  inventoryStatus: InventoryStatus;
  locationName: string | null;
  staffName: string | null;
};

export type BundleComponent = {
  componentId: string;
  name: string;
  code: string | null;
  quantity: number;
  isOptional: boolean;
};

export type ItemDetails = StockItem & {
  units: SerializedUnit[];
  bundleComponents: BundleComponent[];
};

export type IssueEquipmentPayload = {
  customerId: string;
  subscriptionId?: string;
  catalogId: string;
  equipmentId?: string;
  serialNumber?: string;
  ownershipType?: EquipmentOwnership;
  chargedAmount?: string;
  depositAmount?: string;
  notes?: string;
};

export type IssueEquipmentResponse = {
  id: string;
  equipmentId: string;
  customerId: string;
  customerName: string;
  customerCode: string | null;
  subscriptionId: string | null;
  itemName: string;
  itemCode: string | null;
  serialNumber: string | null;
  status: string;
  ownershipType: EquipmentOwnership;
  assignedAt: string;
};

export type ApprovalRequest = {
  id: string;
  requestedBy: string;
  requestedByName: string | null;
  requestType: InventoryRequestType;
  targetItemId: string | null;
  targetItemName: string | null;
  proposedData: Record<string, unknown> | null;
  reason: string;
  status: InventoryRequestStatus;
  reviewedBy: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
};

export type StockMovement = {
  id: string;
  equipmentId: string;
  movementType: string;
  itemName: string;
  itemCode: string | null;
  serialNumber: string | null;
  fromLocationName: string | null;
  toLocationName: string | null;
  fromStaffName: string | null;
  toStaffName: string | null;
  performedByName: string | null;
  quantity: number;
  notes: string | null;
  createdAt: string;
};

export type InventoryLookupItem = {
  type: InventoryLookupType;
  id: string;
  catalogId: string;
  itemName: string;
  itemCode: string | null;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  barcode: string | null;
  vcNumber: string | null;
  macAddress: string | null;
  inventoryStatus: string | null;
  locationId: string | null;
  locationName: string | null;
  defaultSalePrice: string;
  defaultDepositAmount: string;
  availableStock: number;
};

export type CustomerEquipmentRecord = {
  id: string;
  customerId: string;
  customerName: string;
  customerCode: string | null;
  subscriptionId: string | null;
  equipmentId: string;
  itemName: string;
  itemCode: string | null;
  serialNumber: string | null;
  barcode: string | null;
  vcNumber: string | null;
  macAddress: string | null;
  status: string;
  ownershipType: string;
  chargedAmount: string;
  depositAmount: string;
  assignedAt: string;
};

export type InwardStockPayload = {
  catalogId: string;
  locationId?: string;
  quantity?: number;
  serialNumbers?: string[];
  costPrice?: string;
  depositAmount?: string;
  notes?: string;
};

export type TransferStockPayload = {
  equipmentId?: string;
  catalogId?: string;
  fromLocationId?: string;
  toLocationId?: string;
  toStaffId?: string;
  quantity?: number;
  notes?: string;
};

// ── IR remotes ────────────────────────────────────────────────────────────────

/**
 * Where a stored handset's codes came from, which is what says how far to trust
 * them: `library` is imported from a public IR database, `learned` was captured
 * from a real handset.
 */

/**
 * One button, carrying its command in exactly the shape `transmit()` takes.
 *
 * There is no translation step between the API and the emitter on purpose — the
 * backend stores what the encoder accepts, so a button press passes `command`
 * straight through.
 */
export type RemoteButton = {
  key: string;
  label: string;
  command: IrCommand;
};

/** A row in the remote picker. The code set is left out until one is opened. */
export type RemoteSummary = {
  id: string;
  deviceType: RemoteDeviceType;
  brand: string;
  model: string;
  source: RemoteSource;
  /** False until somebody has fired these codes at the real appliance. */
  verified: boolean;
  notes: string | null;
  /** False for the shared library, true for a handset this tenant captured. */
  isTenantOwned: boolean;
  buttonCount: number;
};

export type RemoteDetail = Omit<RemoteSummary, 'buttonCount'> & {
  buttons: RemoteButton[];
};

/**
 * The shared vocabularies, re-exported from where they are now defined.
 *
 * Callers have always imported these names from `@/lib/api/types`; the values
 * and types now come from `@/lib/constants/*` so the runtime array and the type
 * cannot disagree. See `src/lib/constants/README.md`.
 */
export type { OtpChannel, StaffRole } from '@/lib/constants/auth';
export type {
  BillingCycle,
  ChannelResolution,
  CustomerLocationSource,
  CustomerStatus,
  EntityStatus,
  PackageType,
  SubscriptionStatus,
} from '@/lib/constants/crm';
export type { LocationSource, LocationStatus, LocationWritableStatus } from '@/lib/constants/geo';
export type {
  EquipmentOwnership,
  InventoryLookupType,
  InventoryRequestStatus,
  InventoryRequestType,
  InventoryStatus,
  StockMovementType,
  TrackingType,
} from '@/lib/constants/inventory';
export type { RemoteDeviceType, RemoteSource } from '@/lib/constants/remotes';
export type { MembershipSettableStatus, MembershipStatus } from '@/lib/constants/tenancy';

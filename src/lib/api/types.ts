export type Status = 'active' | 'inactive';

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
  channel?: 'whatsapp' | 'sms';
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
  status: 'active' | 'inactive' | 'suspended' | 'cancelled';
  startDate: string;
  endDate: string | null;
  billingCycle: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  price: string;
  installationAddress: string | null;
  service: { id: string; name: string; slug: string; icon: ServiceIcon | null };
  provider: { id: string; name: string; slug: string };
  package: { id: string; name: string; slug: string; packageType: string };
};

export type CustomerProfile = {
  id: string;
  customerCode: string | null;
  status: 'active' | 'inactive' | 'pending';
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
  packageType: 'base' | 'bouquet' | 'addon' | 'ala_carte' | 'combo';
  price: string;
  discount: string;
  msoShare: string;
  taxRate: string;
  billingCycle: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
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
export type ChannelResolution = 'SD' | 'HD' | '4K';

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
  packageType?: 'base' | 'bouquet' | 'addon' | 'ala_carte' | 'combo';
  /** Money crosses the wire as a decimal string — never a JSON number. */
  price?: string;
  billingCycle?: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
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
  source: 'system' | 'admin' | 'user' | 'import';
  status: 'pending' | 'approved' | 'rejected';
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
  status?: 'pending' | 'approved';
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

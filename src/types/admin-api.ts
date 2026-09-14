export type Status = 'active' | 'inactive';

export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export type Service = {
  id: string;
  name: string;
  slug: string;
  serviceType: 'cable' | 'broadband' | 'iptv' | 'ott' | 'voip' | 'other';
  description: string | null;
  status: Status;
  metadata: Record<string, unknown> | null;
  providerCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ServiceProvider = {
  id: string;
  serviceId: string;
  serviceName: string;
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

export type Package = {
  id: string;
  serviceProviderId: string;
  serviceProviderName: string;
  serviceId: string;
  serviceName: string;
  name: string;
  slug: string;
  packageType: 'base' | 'addon' | 'bouquet' | 'broadband' | 'combo' | 'custom';
  price: string;
  discount: string;
  msoShare: string;
  taxRate: string;
  billingCycle: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  description: string | null;
  metadata: Record<string, unknown> | null;
  status: Status;
  channelCount: number;
  createdAt: string;
  updatedAt: string;
};

export type Channel = {
  id: string;
  serviceProviderId: string;
  channelNumber: number;
  name: string;
  slug: string;
  genre: string;
  languages: string[];
  resolution: string;
  isFta: boolean;
  broadcaster: string | null;
  price: string;
  logoUrl: string | null;
  status: Status;
};

export type PackageDetail = Package & {
  channels: (Pick<Channel, 'id' | 'channelNumber' | 'name' | 'slug' | 'genre' | 'resolution' | 'isFta'> & { isMandatory: boolean })[];
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
  createdAt: string;
  updatedAt: string;
};

export type Coverage = {
  id: string;
  serviceId: string;
  serviceProviderId: string | null;
  locationId: string;
  locationPath: string;
  isAvailable: boolean;
  note: string | null;
};

export type Availability = {
  locationId: string;
  services: (Pick<Service, 'id' | 'name' | 'slug' | 'serviceType'> & {
    providers: (Pick<ServiceProvider, 'id' | 'name' | 'slug' | 'isDefault'> & {
      packages: Pick<Package, 'id' | 'name' | 'slug' | 'packageType' | 'price' | 'billingCycle'>[];
    })[];
  })[];
};

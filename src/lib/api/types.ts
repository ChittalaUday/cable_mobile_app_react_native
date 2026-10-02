import type { ApiBody, ApiResponse } from '@/lib/api/contracts';
import type {
  EntityStatus,
} from '@/lib/constants/crm';

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

export type Page<T> = Omit<ApiResponse<'/api/v1/packages'>, 'items'> & { items: T[] };

export type ApiUser = MeResponse['user'];

export type AuthTokens = Pick<AuthResponse, 'accessToken' | 'refreshToken' | 'expiresIn' | 'tokenType'>;

export type Membership = MeResponse['memberships'][number];

export type AuthResponse = ApiResponse<'/api/v1/auth/otp/verify', 'post', 200>;

export type LoginRequest = ApiBody<'/api/v1/auth/login', 'post'>;

export type OtpRequest = ApiBody<'/api/v1/auth/otp/request', 'post'>;

/** What GET /auth/config says this deployment allows. */
export type LoginConfig = ApiResponse<'/api/v1/auth/config', 'get', 200>;

/** A password was accepted, but an emailed code has to finish the sign-in. */
export type OtpChallengeResponse = Extract<ApiResponse<'/api/v1/auth/login', 'post', 200>, { status: 'otp_required' }>;

export type OtpRequestResponse = ApiResponse<'/api/v1/auth/otp/request', 'post', 202>;

export type OtpVerifyRequest = ApiBody<'/api/v1/auth/otp/verify', 'post'>;

export type CustomerAddress = NonNullable<CustomerProfile['address']>;

export type CustomerSubscription = CustomerDetail['subscriptions'][number];

export type CustomerProfile = NonNullable<MeResponse['customer']>;

/**
 * One row of the staff customer list.
 *
 * The breadcrumb and the service rollup arrive already resolved, so a row needs
 * no follow-up call to `/locations/:id` or `/packages/:id` to render.
 */
export type CustomerListItem = CustomerPage['items'][number];

/**
 * A page of customers.
 *
 * Keyset, not page numbers: pass `nextCursor` back until it is `null`. `total`
 * arrives on the first page only — it cannot usefully change while one operator
 * scrolls, and the server will not pay for it twice.
 */
export type CustomerPage = ApiResponse<'/api/v1/customers', 'get', 200>;

export type CustomerEquipment = CustomerDetail['equipment'][number];

export type CustomerTransaction = CustomerDetail['recentTransactions'][number];

/**
 * Everything a customer details page draws, from ONE request.
 *
 * Each subscription already carries its service, provider and package, so the
 * screen never fans out to `/packages/:id` or `/service-providers/:id`.
 */
export type CustomerDetail = ApiResponse<'/api/v1/customers/{id}', 'get', 200>;

export type MeResponse = ApiResponse<'/api/v1/auth/me', 'get', 200>;

export type Service = ApiResponse<'/api/v1/services/{id}', 'get', 200>;

export type CreateServiceInput = ApiBody<'/api/v1/services', 'post'>;

export type UpdateServiceInput = ApiBody<'/api/v1/services/{id}', 'patch'>;

export type ServiceProvider = ApiResponse<'/api/v1/service-providers/{id}', 'get', 200>;

export type CreateServiceProviderInput = ApiBody<'/api/v1/service-providers', 'post'>;

export type UpdateServiceProviderInput = ApiBody<'/api/v1/service-providers/{id}', 'patch'>;

export type Package = ApiResponse<'/api/v1/packages', 'post', 201>;

/** The `channel_resolution` enum — a channel is one of exactly these three. */

export type Channel = ApiResponse<'/api/v1/channels', 'get', 200>['items'][number];

export type PackageDetail = ApiResponse<'/api/v1/packages/{id}', 'get', 200>;

export type CreatePackageInput = ApiBody<'/api/v1/packages', 'post'>;

/** `serviceProviderId` is absent on purpose — the API refuses to re-point a package. */
export type UpdatePackageInput = ApiBody<'/api/v1/packages/{id}', 'patch'>;

export type LocationCategory = ApiResponse<'/api/v1/location-categories', 'get', 200>[number];

export type LocationSchema = ApiResponse<'/api/v1/location-schemas', 'get', 200>[number];

export type Location = ApiResponse<'/api/v1/locations/{id}', 'get', 200>;

/**
 * One step from the root down to a node.
 *
 * `siblingIndex` is what makes a deep node reachable in a paged tree: it says
 * which page of its own level the step sits on.
 */
export type LocationAncestor = ApiResponse<'/api/v1/locations/{id}/ancestors', 'get', 200>[number];

export type CreateLocationInput = ApiBody<'/api/v1/locations', 'post'>;

export type Coverage = ApiResponse<'/api/v1/services/{id}/coverage', 'get', 200>[number];

export type Availability = ApiResponse<'/api/v1/locations/{id}/available-services', 'get', 200>;

/* ── Staff, teams and area grants (backend §6.4) ──────────────────────────── */

/** `customer` is absent on purpose: a subscriber is not made from these screens. */

/** Enough of a node to render a grant without a follow-up call to `/locations`. */
export type LocationRef = StaffMember['locations'][number];

/**
 * One person's job at this operator — a membership, not an account.
 *
 * `id` is the membership id, which is the only handle that means anything
 * inside a tenant: identity is global, so the same person may work here and
 * subscribe somewhere else. Deleting one ends the job, not the login.
 */
export type StaffMember = ApiResponse<'/api/v1/staff/{id}', 'get', 200>;

export type Team = ApiResponse<'/api/v1/teams/{id}', 'get', 200>;

export type CreateStaffInput = ApiBody<'/api/v1/staff', 'post'>;

export type UpdateStaffInput = ApiBody<'/api/v1/staff/{id}', 'patch'>;

/** A crew member as the team screen lists them. */
export type TeamMember = ApiResponse<'/api/v1/teams/{id}/members', 'get', 200>[number];

export type CreateTeamInput = ApiBody<'/api/v1/teams', 'post'>;

export type UpdateTeamInput = ApiBody<'/api/v1/teams/{id}', 'patch'>;

// ==========================================
// INVENTORY TYPES
// ==========================================

export type LowStockItem = InventoryDashboard['lowStockItems'][number];

export type RecentMovement = InventoryDashboard['recentMovements'][number];

export type InventoryLocation = ApiResponse<'/api/v1/inventory/locations', 'get', 200>[number];

export type InventoryDashboard = ApiResponse<'/api/v1/inventory/dashboard', 'get', 200>;

export type StockItem = ApiResponse<'/api/v1/inventory/stock', 'get', 200>[number];

export type CatalogItemPayload = ApiBody<'/api/v1/inventory/catalog', 'post'>;

export type ApprovalRequestPayload = ApiBody<'/api/v1/inventory/approval-requests', 'post'>;

export type SerializedUnit = ItemDetails['units'][number];

export type BundleComponent = ItemDetails['bundleComponents'][number];

export type ItemDetails = ApiResponse<'/api/v1/inventory/stock/{id}', 'get', 200>;

export type IssueEquipmentPayload = ApiBody<'/api/v1/inventory/issue', 'post'>;

export type IssueEquipmentResponse = ApiResponse<'/api/v1/inventory/issue', 'post', 201>;

export type ApprovalRequest = ApiResponse<'/api/v1/inventory/approval-requests', 'get', 200>[number];

export type StockMovement = ApiResponse<'/api/v1/inventory/movements', 'get', 200>[number];

export type InventoryLookupItem = ApiResponse<'/api/v1/inventory/lookup', 'get', 200>[number];

export type CustomerEquipmentRecord = ApiResponse<'/api/v1/inventory/customer-equipment', 'get', 200>[number];

export type InwardStockPayload = ApiBody<'/api/v1/inventory/inward', 'post'>;

export type TransferStockPayload = ApiBody<'/api/v1/inventory/transfer', 'post'>;

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
export type RemoteButton = RemoteDetail['buttons'][number];

/** A row in the remote picker. The code set is left out until one is opened. */
export type RemoteSummary = ApiResponse<'/api/v1/remotes', 'get', 200>[number];

export type RemoteCapture = ApiResponse<'/api/v1/remotes/{id}/captures', 'get', 200>[number];

export type RemoteDetail = ApiResponse<'/api/v1/remotes/{id}', 'get', 200>;

export type { OtpChannel, StaffRole } from '@/lib/constants/auth';
/**
 * The shared vocabularies, re-exported from where they are now defined.
 *
 * Callers have always imported these names from `@/lib/api/types`; the values
 * and types now come from `@/lib/constants/*` so the runtime array and the type
 * cannot disagree. See `src/lib/constants/README.md`.
 */
export type { CollectionOutcome, PaymentEntryMethod, PaymentMethod } from '@/lib/constants/billing';
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
} from '@/lib/constants/inventory';
export type {
  NotificationCategory,
  NotificationChannel,
  NotificationDelivery,
  NotificationStatus,
} from '@/lib/constants/notify';
export type { RemoteDeviceType, RemoteSource } from '@/lib/constants/remotes';
export type { MembershipSettableStatus, MembershipStatus } from '@/lib/constants/tenancy';

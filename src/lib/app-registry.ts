import type { PermissionKey } from '@/constants/permissions';
import type { AppRegistryItem, RegistryItemType } from '@/types/access';
import { PERMISSIONS as P } from '@/constants/permissions';

type Entry = [key: string, type: RegistryItemType, title: string, route: string, permission: PermissionKey, icon: string, keywords: string[], description?: string];

/**
 * What global search can open. Shipped with the app rather than fetched: the
 * routes are the app's own, so the list changes when the app does. Each role
 * only sees routes under its own layout (staff cannot open `/admin/*`), and
 * `useAppSearch` drops anything the signed-in user lacks the permission for.
 */
function SHARED(base: '/admin' | '/staff'): Entry[] {
  return [
    ['customers', 'screen', 'Customers', `${base}/(tabs)/customers`, P.CUSTOMERS_VIEW, 'users', ['subscribers', 'book', 'accounts'], 'Search and open subscriber accounts'],
    ['add-customer', 'action', 'Add Customer', `${base}/customers/add`, P.CUSTOMERS_CREATE, 'user-plus', ['new', 'register', 'subscriber'], 'Register a new subscriber'],
    ['collect-payment', 'action', 'Collect Payment', `${base}/(tabs)/customers`, P.PAYMENTS_COLLECT, 'dollar-sign', ['cash', 'upi', 'recharge', 'bill'], 'Pick a customer to collect from'],
    ['receipts', 'screen', 'Receipts', `${base}/receipts`, P.PAYMENTS_VIEW, 'credit-card', ['payments', 'collections', 'history'], 'Receipts issued'],
    ['visits', 'screen', 'Visits', `${base}/visits`, P.VISITS_VIEW, 'map-pin', ['visit', 'not home', 'door', 'round'], 'Doors visited, paid or not'],
    ['complaints', 'screen', 'Complaints', `${base}/tickets`, P.TICKETS_VIEW, 'alert-circle', ['tickets', 'faults', 'issues'], 'Faults raised and who holds them'],
    ['inventory', 'screen', 'Inventory', `${base}/inventory`, P.INVENTORY_VIEW, 'package', ['stock', 'equipment', 'stb', 'router'], 'Stock, issues and returns'],
    ['issue-equipment', 'action', 'Issue Equipment', `${base}/inventory/issue`, P.INVENTORY_ISSUE, 'package-add', ['fit', 'install', 'stb', 'scan', 'serial'], 'Scan or pick a box to fit at a customer'],
    ['send-notification', 'action', 'Send Notification', `${base}/notifications/send`, P.NOTIFICATIONS_SEND, 'alert-circle', ['message', 'notify', 'broadcast'], 'Send a message'],
  ];
}

const ADMIN_ONLY: Entry[] = [
  ['payments', 'screen', 'Payments & Collections', '/admin/(tabs)/payments', P.PAYMENTS_VIEW, 'credit-card', ['collections', 'revenue', 'dues'], 'Daily collection batches and staff dues'],
  ['plans', 'screen', 'Plans', '/admin/plans', P.PLANS_VIEW, 'package', ['plans', 'tariff', 'pricing', 'discount', 'subscription'], 'What customers are sold and billed'],
  ['add-plan', 'action', 'Add Plan', '/admin/plans/add-edit', P.PLANS_CREATE, 'package-add', ['new', 'create', 'plan', 'tariff'], 'Create a plan over provider packages'],
  ['edit-plans', 'action', 'Edit Plans', '/admin/plans', P.PLANS_UPDATE, 'package-edit', ['update', 'change', 'reprice', 'discount', 'plan'], 'Change a plan’s price, discount or packages'],
  ['delete-plans', 'action', 'Delete Plans', '/admin/plans', P.PLANS_DELETE, 'package-delete', ['remove', 'retire', 'plan'], 'Retire a plan'],
  ['packages', 'screen', 'Provider Packages', '/admin/packages', P.PACKAGES_VIEW, 'package', ['tariff', 'mso', 'package', 'bouquet'], 'The provider’s packages and rates behind each plan'],
  ['add-package', 'action', 'Add Package', '/admin/packages/add-edit', P.PACKAGES_CREATE, 'package-add', ['new', 'create', 'package'], 'Add a provider package'],
  ['edit-packages', 'action', 'Edit Packages', '/admin/packages', P.PACKAGES_UPDATE, 'package-edit', ['update', 'change', 'package', 'channels'], 'Change a package’s provider rate or channels'],
  ['delete-packages', 'action', 'Delete Packages', '/admin/packages', P.PACKAGES_DELETE, 'package-delete', ['remove', 'retire', 'package'], 'Retire a provider package'],
  ['analytics', 'report', 'Analytics', '/admin/analytics', P.REPORTS_VIEW, 'bar-chart', ['reports', 'revenue', 'growth'], 'Revenue, growth and staff activity'],
  ['staff', 'screen', 'Staff & Teams', '/admin/staff', P.STAFF_VIEW, 'users', ['employees', 'crew', 'team', 'collectors'], 'People, crews and their areas'],
  ['locations', 'screen', 'Locations', '/admin/locations', P.LOCATIONS_VIEW, 'settings', ['areas', 'villages', 'coverage'], 'Hierarchy and coverage nodes'],
  ['services', 'screen', 'Services', '/admin/services', P.SERVICES_VIEW, 'settings', ['broadband', 'cable', 'providers'], 'Service types and providers'],
  ['settings', 'setting', 'Theme & language', '/admin/profile', P.SETTINGS_VIEW, 'settings', ['language', 'theme', 'dark', 'profile'], 'In your profile'],
  ['upi-accounts', 'setting', 'UPI accounts', '/admin/settings/upi', P.SETTINGS_UPDATE, 'settings', ['upi', 'qr', 'payments'], 'Where customers pay by UPI'],
];

const STAFF_ONLY: Entry[] = [
  ['my-collections', 'screen', 'My Collections', '/staff/(tabs)/payments', P.PAYMENTS_VIEW, 'credit-card', ['round', 'collected', 'today'], 'Every receipt you have issued'],
];

export function registryFor(role: string | null | undefined): AppRegistryItem[] {
  const entries = role === 'admin' || role === 'super_admin'
    ? [...SHARED('/admin'), ...ADMIN_ONLY]
    : role === 'staff'
      ? [...SHARED('/staff'), ...STAFF_ONLY]
      : [];

  return entries.map(([key, type, title, route, requiredPermission, icon, keywords, description], order) => ({
    id: key,
    key,
    type,
    title,
    description,
    route,
    icon,
    keywords,
    requiredPermission,
    searchable: true,
    enabled: true,
    order,
  }));
}

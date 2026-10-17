type NotificationRouteInput = {
  type?: unknown;
  data?: Record<string, unknown> | null;
};

const PAYMENT_TYPES = new Set([
  'payment.recorded',
  'payment.refunded',
  'payment.marked_due',
  'payment.automation_stopped',
]);

const TIMELINE_TYPES = new Set([
  'visit.marked',
  'complaint.fixed',
]);

const CUSTOMER_TYPES = new Set([
  'customer.created',
  'customer.updated',
  'customer.deactivated',
  'subscription.created',
  'subscription.plan_changed',
  'subscription.suspended',
  'subscription.resumed',
  'equipment.issued',
  'equipment.returned',
  'equipment.replaced',
  'box_activated',
  'box_renewed',
  'box_refreshed',
]);

function text(data: Record<string, unknown>, key: string): string | null {
  const value = data[key];
  return typeof value === 'string' && value !== '' ? value : null;
}

/** The one routing contract shared by inbox rows, foreground banners and tray pushes. */
export function notificationRoute(input: NotificationRouteInput): string | null {
  const data = input.data ?? {};
  const explicit = text(data, 'route');
  if (explicit !== null)
    return explicit;

  const type = typeof input.type === 'string' ? input.type : text(data, 'type');
  if (type === null)
    return null;

  if (PAYMENT_TYPES.has(type)) {
    const collectionId = text(data, 'collectionId');
    return collectionId === null ? null : `/admin/receipts/${encodeURIComponent(collectionId)}`;
  }

  if (TIMELINE_TYPES.has(type)) {
    const customerId = text(data, 'customerId');
    return customerId === null ? null : `/admin/customers/${encodeURIComponent(customerId)}?tab=timeline`;
  }

  if (CUSTOMER_TYPES.has(type)) {
    const customerId = text(data, 'customerId');
    return customerId === null ? null : `/admin/customers/${encodeURIComponent(customerId)}`;
  }

  if (type === 'data_synced')
    return '/admin/automations';

  if (type.startsWith('error.')) {
    const runId = text(data, 'runId');
    return runId === null ? null : `/admin/automations/${encodeURIComponent(runId)}`;
  }

  return null;
}

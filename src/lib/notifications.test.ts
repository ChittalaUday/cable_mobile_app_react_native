import notifee from '@notifee/react-native';
import {
  notificationRoute,
  onNotificationOpened,
  syncPushToken,
} from './notifications';

type OpenMessage = { data?: Record<string, string> };
type OpenHandler = (message: OpenMessage) => void;

const mockOnNotificationOpenedApp = jest.fn<() => void, [unknown, OpenHandler]>(() => () => {});
const mockGetInitialNotification = jest.fn<Promise<OpenMessage | null>, [unknown]>(async () => null);

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: { requestPermission: jest.fn() },
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
  AuthorizationStatus: { DENIED: 0, AUTHORIZED: 1 },
}));
jest.mock('@react-native-firebase/messaging', () => ({
  getMessaging: jest.fn(() => ({})),
  getToken: jest.fn(async () => 'fcm-token'),
  onTokenRefresh: jest.fn(),
  onMessage: jest.fn(),
  onNotificationOpenedApp: (messaging: unknown, handler: OpenHandler) => mockOnNotificationOpenedApp(messaging, handler),
  getInitialNotification: (messaging: unknown) => mockGetInitialNotification(messaging),
  setBackgroundMessageHandler: jest.fn(),
  isDeviceRegisteredForRemoteMessages: jest.fn(() => true),
  registerDeviceForRemoteMessages: jest.fn(),
  getAPNSToken: jest.fn(),
}));
jest.mock('@/lib/api/client', () => ({ client: { post: jest.fn(async () => ({})) } }));
jest.mock('@/lib/api/query-client', () => ({ handleRealtimeSync: jest.fn() }));

const requestPermission = notifee.requestPermission as jest.Mock;

describe('notification routes', () => {
  it.each([
    ['payment.recorded', { collectionId: 'collection-1' }, '/admin/receipts/collection-1'],
    ['payment.refunded', { collectionId: 'collection-1' }, '/admin/receipts/collection-1'],
    ['payment.marked_due', { collectionId: 'collection-1' }, '/admin/receipts/collection-1'],
    ['payment.automation_stopped', { collectionId: 'collection-1' }, '/admin/receipts/collection-1'],
    ['visit.marked', { customerId: 'customer-1', visitId: 'visit-1' }, '/admin/customers/customer-1?tab=timeline'],
    ['complaint.fixed', { customerId: 'customer-1', visitId: 'visit-1' }, '/admin/customers/customer-1?tab=timeline'],
    ['customer.updated', { customerId: 'customer-1' }, '/admin/customers/customer-1'],
    ['subscription.plan_changed', { customerId: 'customer-1' }, '/admin/customers/customer-1'],
    ['equipment.replaced', { customerId: 'customer-1' }, '/admin/customers/customer-1'],
    ['box_activated', { customerId: 'customer-1' }, '/admin/customers/customer-1'],
    ['box_renewed', { customerId: 'customer-1' }, '/admin/customers/customer-1'],
    ['box_refreshed', { customerId: 'customer-1' }, '/admin/customers/customer-1'],
    ['data_synced', {}, '/admin/automations'],
    ['error.job', { runId: 'run-1' }, '/admin/automations/run-1'],
  ])('maps %s to its admin screen', (type, data, route) => {
    expect(notificationRoute({ type, data })).toBe(route);
  });

  it('does not invent a target when the required id is missing', () => {
    expect(notificationRoute({ type: 'payment.recorded', data: {} })).toBeNull();
    expect(notificationRoute({ type: 'visit.marked', data: { customerId: 42 } })).toBeNull();
    expect(notificationRoute({ type: 'unknown', data: { customerId: 'customer-1' } })).toBeNull();
  });

  it('opens a tray push from its type and ids when the backend sent no route', async () => {
    const handler = jest.fn();
    const unsubscribe = jest.fn();
    mockOnNotificationOpenedApp.mockImplementationOnce((_messaging, callback) => {
      callback({ data: { type: 'payment.recorded', collectionId: 'collection-1' } });
      return unsubscribe;
    });

    expect(onNotificationOpened(handler)).toBe(unsubscribe);
    await Promise.resolve();

    expect(handler).toHaveBeenCalledWith('/admin/receipts/collection-1');
  });
});

describe('syncPushToken', () => {
  it('asks for permission once while a sync is already running', async () => {
    let answer!: (value: { authorizationStatus: number }) => void;
    requestPermission.mockImplementationOnce(() => new Promise((resolve) => {
      answer = resolve;
    }));

    // The prompt itself backgrounds and foregrounds the app, so callers pile up.
    const first = syncPushToken();
    const second = syncPushToken();
    const third = syncPushToken();
    expect(requestPermission).toHaveBeenCalledTimes(1);

    answer({ authorizationStatus: 1 });
    await Promise.all([first, second, third]);

    requestPermission.mockResolvedValueOnce({ authorizationStatus: 1 });
    await syncPushToken();
    expect(requestPermission).toHaveBeenCalledTimes(2);
  });
});

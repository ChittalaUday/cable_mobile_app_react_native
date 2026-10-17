import type { RemoteMessage } from '@react-native-firebase/messaging';
import { act, renderHook } from '@testing-library/react-native';
import { showMessage } from 'react-native-flash-message';
import { useNotificationSync } from '@/lib/hooks/common/use-notification-sync';

const mockPush = jest.fn();
const mockInvalidate = jest.fn<Promise<void>, [unknown]>(async () => undefined);
let foregroundHandler: ((message: RemoteMessage) => void) | null = null;

jest.mock('expo-router', () => ({
  router: {
    push: (route: string) => {
      mockPush(route);
    },
  },
}));
jest.mock('react-native-flash-message', () => ({ showMessage: jest.fn() }));
jest.mock('@/lib/api', () => ({
  queryClient: {
    invalidateQueries: (options: unknown) => {
      mockInvalidate(options);
      return Promise.resolve();
    },
  },
}));
jest.mock('@/lib/api/query-client', () => ({ handleRealtimeSync: jest.fn(() => false) }));
jest.mock('@/lib/hooks/stores/use-auth-store', () => ({
  useAuthStore: { use: { status: () => 'signIn', tenantId: () => 'tenant-1' } },
}));
jest.mock('@/lib/hooks/api/use-notifications', () => ({
  usePendingInApp: () => ({ data: undefined, refetch: jest.fn(async () => undefined) }),
  useMarkRead: () => ({ mutateAsync: jest.fn(async () => undefined) }),
}));
jest.mock('@/lib/notifications', () => ({
  clearDeliveredNotifications: jest.fn(async () => undefined),
  isPushUsable: jest.fn(() => true),
  onForegroundMessage: jest.fn((handler: (message: RemoteMessage) => void) => {
    foregroundHandler = handler;
    return jest.fn();
  }),
  onNotificationOpened: jest.fn(() => jest.fn()),
  onPushTokenRefresh: jest.fn(() => jest.fn()),
  registerNotificationChannels: jest.fn(async () => undefined),
  showsInApp: jest.fn((delivery: string | undefined) => delivery === 'both' || delivery === 'in_app'),
  syncPushToken: jest.fn(async () => undefined),
}));

beforeEach(() => {
  foregroundHandler = null;
  mockPush.mockReset();
  mockInvalidate.mockClear();
  jest.mocked(showMessage).mockReset();
});

it('shows a tappable foreground banner and refreshes the bell count', () => {
  renderHook(() => useNotificationSync());

  act(() => foregroundHandler?.({
    data: {
      category: 'billing',
      delivery: 'both',
      type: 'payment.recorded',
      customerId: 'customer-1',
      collectionId: 'collection-1',
    },
    notification: { title: 'Payment collected', body: 'Ramesh collected ₹500' },
  } as RemoteMessage));

  expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({
    message: 'Payment collected',
    description: 'Ramesh collected ₹500',
  }));
  expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['notifications'] });

  const shown = jest.mocked(showMessage).mock.calls[0]?.[0];
  expect(shown?.onPress).toEqual(expect.any(Function));
  act(() => shown?.onPress?.());
  expect(mockPush).toHaveBeenCalledWith('/admin/receipts/collection-1');
});

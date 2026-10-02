import notifee from '@notifee/react-native';
import { syncPushToken } from './notifications';

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
  onNotificationOpenedApp: jest.fn(),
  getInitialNotification: jest.fn(),
  setBackgroundMessageHandler: jest.fn(),
  isDeviceRegisteredForRemoteMessages: jest.fn(() => true),
  registerDeviceForRemoteMessages: jest.fn(),
  getAPNSToken: jest.fn(),
}));
jest.mock('@/lib/api/client', () => ({ client: { post: jest.fn(async () => ({})) } }));
jest.mock('@/lib/api/query-client', () => ({ handleRealtimeSync: jest.fn() }));

const requestPermission = notifee.requestPermission as jest.Mock;

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

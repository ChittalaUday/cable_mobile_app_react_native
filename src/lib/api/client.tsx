import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';
import Env from 'env';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import { Dimensions, Platform } from 'react-native';
import { getTenantId, getToken, removeToken, setToken } from '@/lib/auth/utils';
import { getItem, setItem } from '@/lib/storage';

/**
 * `localhost` on a phone is the phone, not the machine running the API — which
 * is why a device build fails every request with a bare "Network Error" while
 * the simulator is fine.
 *
 * In development the host is taken from wherever Metro is being served, so it
 * follows the laptop onto whatever network it is on. Nobody has to keep an IP
 * address up to date in a `.env`, and production is untouched.
 */
export function devHostUrl(url: string): string {
  const host = Constants.expoConfig?.hostUri?.split(':')[0];

  if (!__DEV__ || host === undefined || host === '')
    return url;

  return url.replace(/\/\/(?:localhost|127\.0\.0\.1)(?=[:/]|$)/, `//${host}`);
}

/**
 * What the API records against this install.
 *
 * Every one of these is optional server-side, which is how `x-device-model` and
 * `x-os-version` went missing for so long without anything failing: the columns
 * simply stayed null. They are sent on every request — including the
 * unauthenticated ones — because the device is registered before anybody signs
 * in, and together they are the fingerprint a blocked device is recognised by.
 */
function deviceHeaders(): Record<string, string> {
  const screen = Dimensions.get('screen');
  const headers: Record<string, string> = {
    'X-Platform': Platform.OS,
    'X-Screen-Resolution': `${Math.round(screen.width * screen.scale)}x${Math.round(screen.height * screen.scale)}`,
  };

  // Native lookups, so each one is absent on web and may be null on a simulator.
  const model = Device.modelName;
  if (model != null && model !== '')
    headers['X-Device-Model'] = model;

  const manufacturer = Device.manufacturer;
  if (manufacturer != null && manufacturer !== '')
    headers['X-Device-Manufacturer'] = manufacturer;

  // The release version ("14", "17.0"), not Android's API level — which is what
  // `Platform.Version` would give, and is only used as a last resort on web.
  const osVersion = Device.osVersion ?? String(Platform.Version);
  if (osVersion !== '')
    headers['X-OS-Version'] = osVersion;

  if (Device.totalMemory != null && Device.totalMemory > 0)
    headers['X-Device-Ram-Mb'] = String(Math.round(Device.totalMemory / 1024 / 1024));

  return headers;
}

const DEVICE_ID_KEY = 'auth.device-id';
const deviceId = getItem<string>(DEVICE_ID_KEY) ?? Crypto.randomUUID();
setItem(DEVICE_ID_KEY, deviceId);

export const client = axios.create({
  baseURL: devHostUrl(Env.EXPO_PUBLIC_API_URL),
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-App-Version': Env.EXPO_PUBLIC_VERSION,
    'X-Device-Id': deviceId,
    ...deviceHeaders(),
  },
  timeout: 15_000,
});

client.interceptors.request.use((config) => {
  const token = getToken()?.access;
  if (token)
    config.headers.Authorization = `Bearer ${token}`;

  // Required of anyone who belongs to more than one tenant: without it the API
  // cannot tell which one a request acts in, and answers 400 TENANT_HEADER_MISSING.
  const tenantId = getTenantId();
  if (tenantId)
    config.headers['X-Tenant-Id'] = tenantId;

  return config;
});

let refreshRequest: Promise<string> | null = null;
let sessionExpired = () => {};

export function setSessionExpiredHandler(handler: () => void) {
  sessionExpired = handler;
}

// Axios types the rejection handler's argument as `any`; naming the shape is what
// makes `.response.data.code` and the retry flag below checkable.
type RetriableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

client.interceptors.response.use(response => response, async (error: AxiosError<{ code?: string }>) => {
  const request = error.config as RetriableRequest | undefined;
  const refresh = getToken()?.refresh;
  if (error.response?.data?.code !== 'AUTH_TOKEN_EXPIRED' || !request || request._retry || !refresh)
    throw error;

  request._retry = true;
  refreshRequest ??= axios
    .post<{ accessToken: string; refreshToken: string }>(
      `${devHostUrl(Env.EXPO_PUBLIC_API_URL)}/auth/refresh`,
      { refreshToken: refresh },
    )
    .then(({ data }) => {
      setToken({ access: data.accessToken, refresh: data.refreshToken });
      return data.accessToken;
    })
    .catch((refreshError) => {
      removeToken();
      sessionExpired();
      throw refreshError;
    })
    .finally(() => { refreshRequest = null; });

  request.headers.Authorization = `Bearer ${await refreshRequest}`;
  return client(request);
});

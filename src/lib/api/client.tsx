import axios from 'axios';
import Env from 'env';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { getTenantId, getToken, removeToken, setToken } from '@/lib/auth/utils';
import { getItem, setItem } from '@/lib/storage';

const DEVICE_ID_KEY = 'auth.device-id';
const deviceId = getItem<string>(DEVICE_ID_KEY) ?? Crypto.randomUUID();
setItem(DEVICE_ID_KEY, deviceId);

export const client = axios.create({
  baseURL: Env.EXPO_PUBLIC_API_URL,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-App-Version': Env.EXPO_PUBLIC_VERSION,
    'X-Device-Id': deviceId,
    'X-Platform': Platform.OS,
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

client.interceptors.response.use(response => response, async (error) => {
  const request = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
  const refresh = getToken()?.refresh;
  if (error.response?.data?.code !== 'AUTH_TOKEN_EXPIRED' || !request || request._retry || !refresh)
    throw error;

  request._retry = true;
  refreshRequest ??= axios
    .post(`${Env.EXPO_PUBLIC_API_URL}/auth/refresh`, { refreshToken: refresh })
    .then(({ data }) => {
      setToken({ access: data.accessToken, refresh: data.refreshToken });
      return data.accessToken as string;
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

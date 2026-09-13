import { getItem, removeItem, setItem } from '@/lib/storage';

const TOKEN = 'token';
const TENANT = 'auth.tenant-id';

export type TokenType = {
  access: string;
  refresh: string;
};

export const getToken = () => getItem<TokenType>(TOKEN);
export const removeToken = () => removeItem(TOKEN);
export const setToken = (value: TokenType) => setItem<TokenType>(TOKEN, value);

/**
 * The tenant the user is acting in, mirrored out of the auth store.
 *
 * It lives here rather than being read from the store because the API client
 * cannot import the store — the store imports the client. Storage also means the
 * header is correct on the very first request after a cold start, before
 * `hydrate()` has finished asking the server who we are.
 */
export const getTenantId = () => getItem<string>(TENANT);
export const removeTenantId = () => removeItem(TENANT);
export const setTenantId = (value: string) => setItem<string>(TENANT, value);

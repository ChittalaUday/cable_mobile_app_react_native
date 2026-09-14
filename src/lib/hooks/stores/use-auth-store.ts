import type { ApiUser, AuthResponse, Membership, MeResponse, OtpRequestResponse } from '@/lib/api/types';
import type { UserRole } from '@/lib/utils/user-role';
import { create } from 'zustand';
import { USER_ROLES } from '@/constants';
import { client, setSessionExpiredHandler } from '@/lib/api/client';
import { getTenantId, getToken, removeTenantId, removeToken, setTenantId, setToken } from '@/lib/auth/utils';
import { createSelectors } from '@/lib/utils';

export type { UserRole } from '@/lib/utils/user-role';

export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phone: string | null;
  phoneNumber: string | null;
  isSuperAdmin: boolean;
  isAnonymous: false;
};

type AuthState = {
  error: string | null;
  role: UserRole | null;
  tenantId: string | null;
  tenantIds: string[];
  memberships: Membership[];
  status: 'idle' | 'signOut' | 'signIn';
  user: AuthUser | null;
  hydrate: () => () => void;
  signIn: (identifier: string, password: string) => Promise<void>;
  requestOtp: (phone: string) => Promise<number>;
  verifyOtp: (phone: string, code: string) => Promise<void>;
  switchTenant: (tenantId: string) => void;
  /** Drop back to the picker without signing out. */
  clearTenant: () => void;
  signOut: () => Promise<void>;
  signOutEverywhere: () => Promise<void>;
};

function toAuthUser(user: ApiUser): AuthUser {
  return {
    uid: user.id,
    email: user.email,
    displayName: user.name,
    photoURL: user.photoUrl,
    phone: user.phone,
    phoneNumber: user.phone,
    isSuperAdmin: Boolean(user.isSuperAdmin),
    isAnonymous: false,
  };
}

/**
 * Did the server actually reject the session, or did the request just fail?
 *
 * Only the first is a reason to throw the refresh token away. A timeout, a 5xx
 * or a phone with no signal are not: the refresh token is good for 30 days, and
 * deleting it on a bad connection is what signs people out for no reason.
 *
 * An expired *access* token never reaches here — the client refreshes and
 * retries first, and only clears the token when that refresh is itself
 * rejected.
 */
function isSessionRejected(error: unknown): boolean {
  const status = (error as { response?: { status?: number } }).response?.status;
  return status === 401 || status === 403;
}

/**
 * Role belongs to the MEMBERSHIP, not the user: the same person is admin of one
 * operator and customer of another, so this has to be read off the tenant the
 * app is currently acting in — never off `memberships[0]`.
 */
function roleFor(isSuperAdmin: boolean, membership?: Membership): UserRole | null {
  if (isSuperAdmin)
    return USER_ROLES.SUPER_ADMIN;
  // No tenant chosen yet is not a role. Defaulting to `customer` here would let
  // a screen render a customer dashboard for an admin who has simply not
  // answered the picker.
  if (!membership)
    return null;
  if (membership.roleId === USER_ROLES.ADMIN || membership.roleId === USER_ROLES.STAFF || membership.roleId === USER_ROLES.CUSTOMER)
    return membership.roleId;
  return USER_ROLES.CUSTOMER;
}

const signedOut = {
  error: null,
  role: null,
  tenantId: null,
  tenantIds: [],
  memberships: [],
  status: 'signOut' as const,
  user: null,
};

/**
 * The tenant a session opens in, or `null` to make the app ask.
 *
 * One membership is not a choice, so it is taken. Several is, and the app must
 * not pick for the operator: acting in the wrong network is invisible until it
 * has already written a customer, a payment or a package into it.
 *
 * `remembered` is the operator's OWN previous answer on this device, so honouring
 * it at launch is not an auto-select. It is dropped on sign-out with the token,
 * and ignored if the membership behind it is gone.
 */
function openingTenantId(memberships: Membership[], remembered: string | null): string | null {
  if (memberships.length === 1)
    return memberships[0]!.tenantId;
  if (remembered !== null && memberships.some(item => item.tenantId === remembered))
    return remembered;
  return null;
}

function sessionState(user: ApiUser, memberships: Membership[], tenantId: string | null) {
  return {
    error: null,
    memberships,
    role: roleFor(Boolean(user.isSuperAdmin), memberships.find(item => item.tenantId === tenantId)),
    status: 'signIn' as const,
    tenantId,
    tenantIds: memberships.map(item => item.tenantId),
    user: toAuthUser(user),
  };
}

function authenticatedState(session: AuthResponse) {
  setToken({ access: session.accessToken, refresh: session.refreshToken });

  const { user, memberships } = session;

  // A fresh sign-in asks every time it is ambiguous — `null`, not whatever the
  // last person to use this device happened to choose.
  return sessionState(user, memberships, openingTenantId(memberships, null));
}

/**
 * Asks the API who we are, using whatever token is on the device.
 *
 * Returns the teardown the caller's effect needs: a late answer to a launch the
 * user has already navigated away from must not write state.
 */
function restoreSession(set: (partial: Partial<AuthState>) => void) {
  let cancelled = false;

  if (!getToken()) {
    set(signedOut);
    return () => {
      cancelled = true;
    };
  }

  set({ error: null, status: 'idle' });

  client.get<MeResponse>('/auth/me').then(({ data: { user, memberships } }) => {
    if (cancelled)
      return;

    set(sessionState(user, memberships, openingTenantId(memberships, getTenantId() ?? null)));
  }).catch((error) => {
    if (cancelled)
      return;

    const message = error instanceof Error ? error.message : 'Could not restore session.';

    if (isSessionRejected(error)) {
      removeToken();
      set({ ...signedOut, error: message });
      return;
    }

    // Keep the token and stay `idle`: the session is probably fine, the network
    // is not. The app offers a retry rather than a login form.
    set({ error: message });
  });

  return () => {
    cancelled = true;
  };
}

const _useAuthStore = create<AuthState>((set, get) => ({
  ...signedOut,
  status: 'idle',

  hydrate: () => restoreSession(set),

  signIn: async (identifier, password) => {
    set({ error: null });
    try {
      const response = await client.post<AuthResponse>('/auth/login', { identifier: identifier.trim(), password });
      set(authenticatedState(response.data));
    }
    catch (error) {
      removeToken();
      set({ ...signedOut, error: error instanceof Error ? error.message : 'Sign in failed.' });
      throw error;
    }
  },

  requestOtp: async (phone) => {
    set({ error: null });
    const response = await client.post<OtpRequestResponse>('/auth/otp/request', { phone });
    return response.data.expiresInSeconds;
  },

  verifyOtp: async (phone, code) => {
    set({ error: null });
    try {
      const response = await client.post<AuthResponse>('/auth/otp/verify', { phone, code });
      set(authenticatedState(response.data));
    }
    catch (error) {
      set({ error: error instanceof Error ? error.message : 'Code verification failed.' });
      throw error;
    }
  },

  switchTenant: (tenantId) => {
    const { memberships, user } = get();
    const membership = memberships.find(item => item.tenantId === tenantId);
    if (!membership || !user)
      return;

    set({ tenantId, role: roleFor(user.isSuperAdmin, membership) });
  },

  clearTenant: () => {
    if (get().memberships.length > 1)
      set({ tenantId: null, role: null });
  },

  signOut: async () => {
    try {
      if (getToken())
        await client.post('/auth/logout');
    }
    finally {
      removeToken();
      set(signedOut);
    }
  },

  signOutEverywhere: async () => {
    try {
      await client.post('/auth/logout-all');
    }
    finally {
      removeToken();
      set(signedOut);
    }
  },
}));

setSessionExpiredHandler(() => {
  removeToken();
  _useAuthStore.setState(signedOut);
});

let mirroredTenantId: string | null | undefined;
_useAuthStore.subscribe(({ tenantId }) => {
  if (tenantId === mirroredTenantId)
    return;

  mirroredTenantId = tenantId;
  if (tenantId)
    setTenantId(tenantId);
  else
    removeTenantId();
});

export const useAuthStore = createSelectors(_useAuthStore);

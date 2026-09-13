import type { ApiUser, AuthResponse, Membership } from '@/lib/api/routes/auth';
import type { UserRole } from '@/lib/utils/user-role';
import { create } from 'zustand';
import { USER_ROLES } from '@/constants';
import { setSessionExpiredHandler } from '@/lib/api/client';
import { authApi } from '@/lib/api/routes/auth';
import { getToken, removeTenantId, removeToken, setTenantId, setToken } from '@/lib/auth/utils';
import { createSelectors } from '@/lib/utils';

export type { UserRole } from '@/lib/utils/user-role';

export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phone: string | null;
  phoneNumber: string | null;
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
    isAnonymous: false,
  };
}

function roleFor(user: ApiUser, membership?: Membership): UserRole {
  if (user.isSuperAdmin)
    return USER_ROLES.SUPER_ADMIN;
  if (membership?.roleId === USER_ROLES.ADMIN || membership?.roleId === USER_ROLES.STAFF || membership?.roleId === USER_ROLES.CUSTOMER)
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

async function authenticatedState(session: AuthResponse) {
  setToken({ access: session.accessToken, refresh: session.refreshToken });
  try {
    const { user, memberships } = await authApi.me();
    const membership = memberships[0];
    return {
      error: null,
      memberships,
      role: roleFor(user, membership),
      status: 'signIn' as const,
      tenantId: membership?.tenantId ?? null,
      tenantIds: memberships.map(item => item.tenantId),
      user: toAuthUser(user),
    };
  }
  catch (error) {
    removeToken();
    throw error;
  }
}

const _useAuthStore = create<AuthState>((set, get) => ({
  ...signedOut,
  status: 'idle',

  hydrate: () => {
    let cancelled = false;
    if (!getToken()) {
      set(signedOut);
      return () => {
        cancelled = true;
      };
    }

    authApi.me().then(({ user, memberships }) => {
      if (cancelled)
        return;
      const membership = memberships[0];
      set({
        error: null,
        memberships,
        role: roleFor(user, membership),
        status: 'signIn',
        tenantId: membership?.tenantId ?? null,
        tenantIds: memberships.map(item => item.tenantId),
        user: toAuthUser(user),
      });
    }).catch((error) => {
      if (cancelled)
        return;
      removeToken();
      set({ ...signedOut, error: error instanceof Error ? error.message : 'Could not restore session.' });
    });

    return () => {
      cancelled = true;
    };
  },

  signIn: async (identifier, password) => {
    set({ error: null });
    try {
      const session = await authApi.login(identifier, password);
      set(await authenticatedState(session));
    }
    catch (error) {
      removeToken();
      set({ ...signedOut, error: error instanceof Error ? error.message : 'Sign in failed.' });
      throw error;
    }
  },

  requestOtp: async (phone) => {
    set({ error: null });
    const response = await authApi.requestOtp(phone);
    return response.expiresInSeconds;
  },

  verifyOtp: async (phone, code) => {
    set({ error: null });
    try {
      const session = await authApi.verifyOtp(phone, code);
      set(await authenticatedState(session));
    }
    catch (error) {
      set({ error: error instanceof Error ? error.message : 'Code verification failed.' });
      throw error;
    }
  },

  switchTenant: (tenantId) => {
    const membership = get().memberships.find(item => item.tenantId === tenantId);
    const user = get().user;
    if (!membership || !user)
      return;
    set({ tenantId, role: roleFor({
      id: user.uid,
      email: user.email,
      phone: user.phone,
      name: user.displayName,
      photoUrl: user.photoURL,
      isSuperAdmin: get().role === USER_ROLES.SUPER_ADMIN,
    }, membership) });
  },

  signOut: async () => {
    try {
      if (getToken())
        await authApi.logout();
    }
    finally {
      removeToken();
      set(signedOut);
    }
  },

  signOutEverywhere: async () => {
    try {
      await authApi.logoutEverywhere();
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

/**
 * Mirror the active tenant into storage for the API client's request header.
 *
 * One subscription rather than a `setTenantId` beside every `set({ tenantId })`:
 * the call site that gets forgotten is the one that breaks `switchTenant`
 * silently, because the app looks right and only the server disagrees.
 */
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

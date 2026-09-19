import type { ApiUser, AuthResponse, Membership, MeResponse, OtpChallengeResponse, OtpChannel, OtpRequestResponse } from '@/lib/api/types';
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
  /**
   * Resolves to null once signed in, or to a challenge when the server wants an
   * emailed code as well. The password alone is not always the whole sign-in.
   */
  signIn: (identifier: string, password: string) => Promise<OtpChallengeResponse | null>;
  requestOtp: (phone: string, channel?: OtpChannel) => Promise<SentCode>;
  verifyOtp: (phone: string, code: string) => Promise<void>;
  /** Exchange a Google ID token from the native sign-in for a session. */
  signInWithGoogle: (idToken: string) => Promise<void>;
  /** Resend the emailed code for a sign-in already part-way through. */
  resendEmailCode: (challengeToken: string) => Promise<SentCode>;
  verifyEmailCode: (challengeToken: string, code: string) => Promise<void>;
  switchTenant: (tenantId: string, persist?: boolean) => void;
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

/** The backend's base resend cooldown, used only when it does not send its own. */
const OTP_BASE_COOLDOWN_SECONDS = 60;

/** A code was sent: how long it lives, how long until another, and where it went. */
export type SentCode = {
  expiresInSeconds: number;
  nextCooldownSeconds: number;
  /** The channel it actually left on, which is not always the one asked for. */
  channel: string;
};

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
  const initialTenant = memberships.length === 1 ? memberships[0]!.tenantId : null;
  if (initialTenant) {
    setTenantId(initialTenant);
  }
  else {
    removeTenantId();
  }

  // A fresh sign-in asks every time it is ambiguous — `null`, not whatever the
  // last person to use this device happened to choose.
  return sessionState(user, memberships, initialTenant);
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

    const storedTenant = getTenantId() ?? null;
    const initialTenant = openingTenantId(memberships, storedTenant);
    if (storedTenant && !memberships.some(m => m.tenantId === storedTenant)) {
      removeTenantId();
    }

    set(sessionState(user, memberships, initialTenant));
  }).catch((error) => {
    if (cancelled)
      return;

    const message = error instanceof Error ? error.message : 'Could not restore session.';

    if (isSessionRejected(error)) {
      removeToken();
      removeTenantId();
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

function sentCode(response: { data: OtpRequestResponse }): SentCode {
  return {
    expiresInSeconds: response.data.expiresInSeconds,
    // A server older than the escalating ladder sends no rung. Falling back to
    // its base cooldown beats counting the resend button down from NaN.
    nextCooldownSeconds: response.data.nextCooldownSeconds ?? OTP_BASE_COOLDOWN_SECONDS,
    channel: response.data.channel,
  };
}

const _useAuthStore = create<AuthState>((set, get) => ({
  ...signedOut,
  status: 'idle',

  hydrate: () => restoreSession(set),

  signIn: async (identifier, password) => {
    set({ error: null });
    try {
      const response = await client.post<AuthResponse | OtpChallengeResponse>(
        '/auth/login',
        { identifier: identifier.trim(), password },
      );

      // The password was right but the sign-in is not finished, so no tokens
      // are stored and the caller is handed the challenge to carry on with.
      if ('status' in response.data)
        return response.data;

      set(authenticatedState(response.data));
      return null;
    }
    catch (error) {
      removeToken();
      set({ ...signedOut, error: error instanceof Error ? error.message : 'Sign in failed.' });
      throw error;
    }
  },

  requestOtp: async (phone, channel) => {
    set({ error: null });
    return sentCode(await client.post<OtpRequestResponse>('/auth/otp/request', { phone, ...(channel ? { channel } : {}) }));
  },

  resendEmailCode: async (challengeToken) => {
    set({ error: null });
    return sentCode(await client.post<OtpRequestResponse>('/auth/otp/request', { challengeToken }));
  },

  verifyEmailCode: async (challengeToken, code) => {
    set({ error: null });
    try {
      const response = await client.post<AuthResponse>('/auth/otp/verify', { challengeToken, code });
      set(authenticatedState(response.data));
    }
    catch (error) {
      set({ error: error instanceof Error ? error.message : 'Code verification failed.' });
      throw error;
    }
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

  signInWithGoogle: async (idToken) => {
    set({ error: null });
    try {
      const response = await client.post<AuthResponse>('/auth/google', { idToken });
      set(authenticatedState(response.data));
    }
    catch (error) {
      set({ error: error instanceof Error ? error.message : 'Sign in failed.' });
      throw error;
    }
  },

  switchTenant: (tenantId, persist = true) => {
    const { memberships, user } = get();
    const membership = memberships.find(item => item.tenantId === tenantId);
    if (!membership || !user)
      return;

    if (persist) {
      setTenantId(tenantId);
    }
    else {
      removeTenantId();
    }

    set({ tenantId, role: roleFor(user.isSuperAdmin, membership) });
  },

  clearTenant: () => {
    if (get().memberships.length > 1) {
      removeTenantId();
      set({ tenantId: null, role: null });
    }
  },

  signOut: async () => {
    try {
      if (getToken())
        await client.post('/auth/logout');
    }
    finally {
      removeToken();
      removeTenantId();
      set(signedOut);
    }
  },

  signOutEverywhere: async () => {
    try {
      await client.post('/auth/logout-all');
    }
    finally {
      removeToken();
      removeTenantId();
      set(signedOut);
    }
  },
}));

setSessionExpiredHandler(() => {
  removeToken();
  removeTenantId();
  _useAuthStore.setState(signedOut);
});

export const useAuthStore = createSelectors(_useAuthStore);

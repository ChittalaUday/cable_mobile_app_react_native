import type { User } from 'firebase/auth';

import type { UserRole } from '@/lib/utils/user-role';
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { createUserWithEmailAndPassword, signOut as firebaseSignOut, getAdditionalUserInfo, GoogleAuthProvider, onAuthStateChanged, signInAnonymously, signInWithCredential, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { create } from 'zustand';
import { COLLECTIONS, ERROR_MESSAGES, USER_ROLES } from '@/constants';
import { auth, db } from '@/lib/firebase';
import { useAccessStore } from '@/lib/hooks/use-access-store';
import { createSelectors } from '@/lib/utils';
import { parseUserRole } from '@/lib/utils/user-role';

export type { UserRole } from '@/lib/utils/user-role';

type AuthState = {
  error: string | null;
  role: UserRole | null;
  tenantId: string | null;
  tenantIds: string[];
  needsProfileCompletion: boolean;
  status: 'idle' | 'signOut' | 'signIn';
  user: User | null;
  hydrate: () => () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  switchTenant: (tenantId: string) => void;
  completeProfile: (profile: { phone: string; address: string }) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
};

type Profile = { role: UserRole; tenantId: string | null; tenantIds: string[]; needsProfileCompletion: boolean };

async function profileFor(user: User): Promise<Profile> {
  if (user.isAnonymous)
    return { role: USER_ROLES.CUSTOMER, tenantId: null, tenantIds: [], needsProfileCompletion: false };
  try {
    const data = (await getDoc(doc(db, COLLECTIONS.USERS, user.uid))).data();
    const role = parseUserRole(data?.role);
    const tenantIds: string[] = Array.isArray(data?.tenantIds)
      ? data.tenantIds
      : data?.tenantId
        ? [data.tenantId]
        : [];
    const tenantId = (data?.tenantId as string) || tenantIds[0] || null;
    return { role, tenantId, tenantIds, needsProfileCompletion: role === USER_ROLES.CUSTOMER && (!data?.phone || !data?.address) };
  }
  catch (error) {
    console.warn('Failed to fetch user profile from Firestore:', error);
    return { role: USER_ROLES.CUSTOMER, tenantId: null, tenantIds: [], needsProfileCompletion: false };
  }
}

function newUserDoc({ name, email, photoURL, tenantId = null }: { name: string | null; email: string | null; photoURL: string | null; tenantId?: string | null }) {
  const tenantIds = tenantId ? [tenantId] : [];
  return {
    role: USER_ROLES.CUSTOMER,
    roleIds: [USER_ROLES.CUSTOMER],
    tenantId,
    tenantIds,
    name,
    email,
    photoURL,
    phone: null,
    address: null,
    updatedAt: serverTimestamp(),
  };
}

let accessUnsubscribe: (() => void) | null = null;

const _useAuthStore = create<AuthState>((set, get) => ({
  error: null,
  role: null,
  tenantId: null,
  tenantIds: [],
  needsProfileCompletion: false,
  status: 'idle',
  user: null,
  switchTenant: (tenantId: string) => {
    const currentTenantIds = get().tenantIds;
    if (currentTenantIds.length === 0 || currentTenantIds.includes(tenantId)) {
      set({ tenantId });
    }
  },
  hydrate: () => onAuthStateChanged(auth, async (user) => {
    if (accessUnsubscribe) {
      accessUnsubscribe();
      accessUnsubscribe = null;
    }
    if (!user) {
      useAccessStore.getState().clear();
      return set({ error: null, role: null, tenantId: null, tenantIds: [], needsProfileCompletion: false, status: 'signOut', user: null });
    }
    try {
      accessUnsubscribe = useAccessStore.getState().subscribe(user.uid);
      const { role, tenantId, tenantIds, needsProfileCompletion } = await profileFor(user);
      set({ error: null, role, tenantId, tenantIds, needsProfileCompletion, status: 'signIn', user });
    }
    catch (error) {
      useAccessStore.getState().clear();
      set({ error: error instanceof Error ? error.message : ERROR_MESSAGES.ACCOUNT_ACCESS_UNAVAILABLE, role: null, tenantId: null, tenantIds: [], needsProfileCompletion: false, status: 'signOut', user: null });
      await firebaseSignOut(auth);
    }
  }),
  signIn: async (email, password) => {
    set({ error: null });
    await signInWithEmailAndPassword(auth, email.trim(), password);
  },
  signUp: async (email, password) => {
    set({ error: null });
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await setDoc(doc(db, COLLECTIONS.USERS, credential.user.uid), newUserDoc({ name: null, email: credential.user.email, photoURL: null }));
  },
  signInWithGoogle: async () => {
    set({ error: null });
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response))
      return;
    const { idToken, user: googleUser } = response.data;
    if (!idToken)
      throw new Error(ERROR_MESSAGES.GOOGLE_TOKEN_MISSING);
    const credential = await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
    if (getAdditionalUserInfo(credential)?.isNewUser) {
      await setDoc(doc(db, COLLECTIONS.USERS, credential.user.uid), newUserDoc({
        name: googleUser.name,
        email: googleUser.email,
        photoURL: googleUser.photo,
      }));
    }
  },
  completeProfile: async ({ phone, address }) => {
    const user = get().user;
    if (!user)
      throw new Error('Not signed in.');
    await setDoc(doc(db, 'users', user.uid), { phone, address, updatedAt: serverTimestamp() }, { merge: true });
    set({ needsProfileCompletion: false });
  },
  continueAsGuest: async () => {
    set({ error: null });
    await signInAnonymously(auth);
  },
  signOut: async () => firebaseSignOut(auth),
}));

export const useAuthStore = createSelectors(_useAuthStore);

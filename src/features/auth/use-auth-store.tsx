import type { User } from 'firebase/auth';

import type { UserRole } from './user-role';
import { createUserWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { create } from 'zustand';
import { auth, db } from '@/lib/firebase';
import { createSelectors } from '@/lib/utils';
import { parseUserRole } from './user-role';

export type { UserRole } from './user-role';

type AuthState = {
  error: string | null;
  role: UserRole | null;
  status: 'idle' | 'signOut' | 'signIn';
  user: User | null;
  hydrate: () => () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
};

async function roleFor(user: User): Promise<UserRole> {
  if (user.isAnonymous)
    return 'subscriber';
  return parseUserRole((await getDoc(doc(db, 'users', user.uid))).data()?.role);
}

const _useAuthStore = create<AuthState>(set => ({
  error: null,
  role: null,
  status: 'idle',
  user: null,
  hydrate: () => onAuthStateChanged(auth, async (user) => {
    if (!user)
      return set({ error: null, role: null, status: 'signOut', user: null });
    try {
      set({ error: null, role: await roleFor(user), status: 'signIn', user });
    }
    catch (error) {
      set({ error: error instanceof Error ? error.message : 'Account access unavailable', role: null, status: 'signOut', user: null });
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
    await setDoc(doc(db, 'users', credential.user.uid), { role: 'subscriber', updatedAt: serverTimestamp() });
  },
  continueAsGuest: async () => {
    set({ error: null });
    await signInAnonymously(auth);
  },
  signOut: async () => firebaseSignOut(auth),
}));

export const useAuthStore = createSelectors(_useAuthStore);

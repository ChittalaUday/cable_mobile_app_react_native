import type { User } from 'firebase/auth';

import type { UserRole } from '@/lib/utils/user-role';
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { createUserWithEmailAndPassword, signOut as firebaseSignOut, getAdditionalUserInfo, GoogleAuthProvider, onAuthStateChanged, signInAnonymously, signInWithCredential, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { create } from 'zustand';
import { auth, db } from '@/lib/firebase';
import { createSelectors } from '@/lib/utils';
import { parseUserRole } from '@/lib/utils/user-role';

export type { UserRole } from '@/lib/utils/user-role';

type AuthState = {
  error: string | null;
  role: UserRole | null;
  needsProfileCompletion: boolean;
  status: 'idle' | 'signOut' | 'signIn';
  user: User | null;
  hydrate: () => () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  completeProfile: (profile: { phone: string; address: string }) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
};

type Profile = { role: UserRole; needsProfileCompletion: boolean };

async function profileFor(user: User): Promise<Profile> {
  if (user.isAnonymous)
    return { role: 'subscriber', needsProfileCompletion: false };
  const data = (await getDoc(doc(db, 'users', user.uid))).data();
  const role = parseUserRole(data?.role);
  return { role, needsProfileCompletion: role === 'subscriber' && (!data?.phone || !data?.address) };
}

function newUserDoc({ name, email, photoURL }: { name: string | null; email: string | null; photoURL: string | null }) {
  return {
    role: 'subscriber',
    name,
    email,
    photoURL,
    phone: null,
    address: null,
    updatedAt: serverTimestamp(),
  };
}

const _useAuthStore = create<AuthState>((set, get) => ({
  error: null,
  role: null,
  needsProfileCompletion: false,
  status: 'idle',
  user: null,
  hydrate: () => onAuthStateChanged(auth, async (user) => {
    if (!user)
      return set({ error: null, role: null, needsProfileCompletion: false, status: 'signOut', user: null });
    try {
      const { role, needsProfileCompletion } = await profileFor(user);
      set({ error: null, role, needsProfileCompletion, status: 'signIn', user });
    }
    catch (error) {
      set({ error: error instanceof Error ? error.message : 'Account access unavailable', role: null, needsProfileCompletion: false, status: 'signOut', user: null });
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
    await setDoc(doc(db, 'users', credential.user.uid), newUserDoc({ name: null, email: credential.user.email, photoURL: null }));
  },
  signInWithGoogle: async () => {
    set({ error: null });
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response))
      return;
    const { idToken, user: googleUser } = response.data;
    if (!idToken)
      throw new Error('Google sign-in did not return a token.');
    const credential = await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
    if (getAdditionalUserInfo(credential)?.isNewUser) {
      await setDoc(doc(db, 'users', credential.user.uid), newUserDoc({
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

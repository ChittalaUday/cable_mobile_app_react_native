import type { Persistence } from 'firebase/auth';
import * as FirebaseAuth from '@firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

import Env from '../../env';

const app = getApps().length
  ? getApp()
  : initializeApp({
      apiKey: Env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: Env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: Env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: Env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: Env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: Env.EXPO_PUBLIC_FIREBASE_APP_ID,
    });

const getReactNativePersistence = (FirebaseAuth as unknown as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
}).getReactNativePersistence;

export const auth = FirebaseAuth.initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
export const db = getFirestore(app);

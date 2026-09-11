import type { AppRegistryItem } from '@/types/access';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { create } from 'zustand';

import { COLLECTIONS } from '@/constants';
import { db } from '@/lib/firebase';
import { createSelectors } from '@/lib/utils';

type AppRegistryState = {
  items: AppRegistryItem[];
  isLoading: boolean;
  error: string | null;
  fetchRegistry: () => Promise<void>;
};

const _useAppRegistryStore = create<AppRegistryState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchRegistry: async () => {
    if (get().items.length > 0)
      return;
    set({ isLoading: true, error: null });
    try {
      const snapshot = await getDocs(
        query(collection(db, COLLECTIONS.APP_REGISTRY), where('enabled', '==', true)),
      );
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as AppRegistryItem);
      items.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
      set({ items, isLoading: false });
    }
    catch (error) {
      console.warn('Failed to fetch app registry:', error);
      set({ error: error instanceof Error ? error.message : 'Registry fetch failed', isLoading: false });
    }
  },
}));

export const useAppRegistryStore = createSelectors(_useAppRegistryStore);

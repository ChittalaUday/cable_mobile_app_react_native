import type { AppRegistryItem } from '@/types/access';
import { create } from 'zustand';
import { createSelectors } from '@/lib/utils';

type AppRegistryState = {
  items: AppRegistryItem[];
  isLoading: boolean;
  error: string | null;
  fetchRegistry: () => Promise<void>;
};

const _useAppRegistryStore = create<AppRegistryState>(() => ({
  items: [],
  isLoading: false,
  error: null,
  fetchRegistry: async () => {},
}));

export const useAppRegistryStore = createSelectors(_useAppRegistryStore);

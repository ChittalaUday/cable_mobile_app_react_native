import type { Tenant } from '@/lib/utils/tenant';
import { doc, getDoc } from 'firebase/firestore';
import { create } from 'zustand';

import { COLLECTIONS } from '@/constants';
import { db } from '@/lib/firebase';
import { createSelectors } from '@/lib/utils';

type TenantState = {
  tenant: Tenant | null;
  tenantId: string | null;
  isLoading: boolean;
  error: string | null;
  hydrate: (tenantId: string) => Promise<void>;
  clear: () => void;
};

const _useTenantStore = create<TenantState>((set, get) => ({
  tenant: null,
  tenantId: null,
  isLoading: false,
  error: null,

  hydrate: async (tenantId: string) => {
    // Skip if already loaded for this tenant
    if (get().tenantId === tenantId && get().tenant)
      return;

    set({ isLoading: true, error: null, tenantId });
    try {
      const snapshot = await getDoc(doc(db, COLLECTIONS.TENANTS, tenantId));
      if (!snapshot.exists()) {
        set({ error: 'Tenant not found', isLoading: false, tenant: null });
        return;
      }
      const data = snapshot.data();
      const tenant: Tenant = {
        id: snapshot.id,
        name: data.name ?? '',
        slug: data.slug ?? '',
        phone: data.phone ?? '',
        email: data.email ?? '',
        logoUrl: data.logoUrl ?? null,
        address: data.address ?? null,
        website: data.website ?? null,
        gstNumber: data.gstNumber ?? null,
        description: data.description ?? null,
        isActive: data.isActive ?? true,
      };
      set({ tenant, isLoading: false });
    }
    catch (error) {
      console.warn('Failed to fetch tenant:', error);
      set({ error: error instanceof Error ? error.message : 'Tenant load failed', isLoading: false });
    }
  },

  clear: () => set({ tenant: null, tenantId: null, isLoading: false, error: null }),
}));

export const useTenantStore = createSelectors(_useTenantStore);

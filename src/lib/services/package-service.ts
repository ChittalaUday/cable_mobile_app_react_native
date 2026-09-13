import type { PackageDoc, PackagePayload } from '@/types/service';

import { addDoc, collection, deleteDoc, doc, getDocs, limit, query, updateDoc, where } from 'firebase/firestore';
import { COLLECTIONS } from '@/constants';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/hooks/use-auth-store';
import { stripUndefined } from '@/lib/utils';

const DEFAULT_TENANT = 'satya_cable_network';
const PAGE_CAP = 500;

function tenantOf(override?: string) {
  return override ?? useAuthStore.getState().tenantId ?? DEFAULT_TENANT;
}

/**
 * Bulk-imported packages use the MSO export shape (`packageName`/`price`/
 * `isActive`, service type `cable`) while packages created in-app use the
 * fields in `PackageDoc`. Read both so the catalogue shows every plan.
 */
type RawPackage = Partial<PackageDoc> & {
  packageName?: string;
  price?: number;
  isActive?: boolean;
};

const SERVICE_TYPE_ALIASES: Record<string, PackageDoc['serviceType']> = {
  cable: 'cable_tv',
  cable_tv: 'cable_tv',
  broadband: 'internet',
  internet: 'internet',
  apfiber: 'fiber',
  fiber: 'fiber',
  iptv: 'iptv',
  combo: 'combo',
};

function normalise(id: string, raw: RawPackage): PackageDoc {
  return {
    ...raw,
    id,
    name: raw.name ?? raw.packageName ?? id,
    serviceType: SERVICE_TYPE_ALIASES[String(raw.serviceType ?? '').toLowerCase()] ?? 'cable_tv',
    monthlyPrice: raw.monthlyPrice ?? raw.price ?? 0,
    durationMonths: raw.durationMonths ?? 1,
    active: raw.active ?? raw.isActive ?? true,
  };
}

export const packageService = {
  /**
   * Tenant-scoped read, falling back to an unconstrained query so that
   * imported documents without a `tenantId` are still listed.
   */
  async list(tenantIdOverride?: string): Promise<PackageDoc[]> {
    const tenantId = tenantOf(tenantIdOverride);
    const packagesRef = collection(db, COLLECTIONS.PACKAGES);

    let docs: { id: string; data: () => unknown }[] = [];
    try {
      const scoped = await getDocs(query(packagesRef, where('tenantId', '==', tenantId), limit(PAGE_CAP)));
      docs = scoped.docs;
    }
    catch (error) {
      console.warn('Tenant-filtered package read failed, falling back:', error);
    }

    if (docs.length === 0) {
      const all = await getDocs(query(packagesRef, limit(PAGE_CAP)));
      docs = all.docs;
    }

    return docs
      .map(d => normalise(d.id, d.data() as RawPackage))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async create(payload: PackagePayload, tenantIdOverride?: string): Promise<PackageDoc> {
    const tenantId = tenantOf(tenantIdOverride);
    const nowIso = new Date().toISOString();
    const data = { ...payload, tenantId, createdAt: nowIso, updatedAt: nowIso };
    const ref = await addDoc(collection(db, COLLECTIONS.PACKAGES), stripUndefined(data));
    return { id: ref.id, ...data };
  },

  async update(id: string, patch: Partial<PackagePayload>): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.PACKAGES, id), stripUndefined({ ...patch, updatedAt: new Date().toISOString() }));
  },

  async remove(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.PACKAGES, id));
  },
};

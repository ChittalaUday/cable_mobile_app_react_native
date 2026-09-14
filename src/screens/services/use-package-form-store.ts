import { create } from 'zustand';

type BillingCycle = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

/**
 * The package form, held across two screens.
 *
 * "Add / Edit Package" and "Package Channels" are separate routes, so the draft
 * cannot live in either one's local state. It is deliberately not React Query
 * cache: this is an unsaved draft, not a server value.
 */
export type PackageFormState = {
  providerId: string;
  providerName: string;
  packageName: string;
  price: string;
  billingCycle: BillingCycle;
  description: string;
  isActive: boolean;
  selectedChannelIds: string[];
  /** The lineup as the server has it, so a save can skip an unchanged PUT. */
  initialChannelIds: string[];
  editingPackageId: string | null;
  /** Guards the one-shot hydrate from `GET /packages/:id` against re-runs. */
  hydratedPackageId: string | null;

  initNewPackage: (provider?: { id: string; name: string }) => void;
  initEditPackage: (pkg: {
    id: string;
    name: string;
    price: number | string;
    billingCycle?: string;
    description?: string;
    active?: boolean;
    providerId: string;
    providerName: string;
  }) => void;
  /** Called once when `GET /packages/:id` lands, to fill in the saved lineup. */
  hydrateChannels: (packageId: string, channelIds: string[]) => void;
  setProvider: (provider: { id: string; name: string }) => void;
  setField: <K extends 'packageName' | 'price' | 'billingCycle' | 'description' | 'isActive'>(
    key: K,
    value: PackageFormState[K],
  ) => void;
  toggleChannel: (channelId: string) => void;
  reset: () => void;
};

const DEFAULT_STATE = {
  providerId: '',
  providerName: '',
  packageName: '',
  price: '',
  billingCycle: 'monthly' as BillingCycle,
  description: '',
  isActive: true,
  selectedChannelIds: [] as string[],
  initialChannelIds: [] as string[],
  editingPackageId: null as string | null,
  hydratedPackageId: null as string | null,
};

export const usePackageFormStore = create<PackageFormState>(set => ({
  ...DEFAULT_STATE,

  initNewPackage: provider =>
    set({
      ...DEFAULT_STATE,
      providerId: provider?.id ?? '',
      providerName: provider?.name ?? '',
      // A brand-new package has no saved lineup, so it is hydrated already.
      hydratedPackageId: 'new',
    }),

  initEditPackage: pkg =>
    set({
      ...DEFAULT_STATE,
      providerId: pkg.providerId,
      providerName: pkg.providerName,
      packageName: pkg.name,
      price: String(pkg.price ?? ''),
      billingCycle: (pkg.billingCycle as BillingCycle) ?? 'monthly',
      description: pkg.description ?? '',
      isActive: pkg.active ?? true,
      editingPackageId: pkg.id,
    }),

  hydrateChannels: (packageId, channelIds) =>
    set(state => (state.hydratedPackageId === packageId
      ? state
      : {
          ...state,
          selectedChannelIds: channelIds,
          initialChannelIds: channelIds,
          hydratedPackageId: packageId,
        })),

  // Switching provider drops the lineup: channels belong to one provider, and
  // the API rejects a bouquet that mixes them.
  setProvider: provider =>
    set(state => (state.providerId === provider.id
      ? state
      : {
          ...state,
          providerId: provider.id,
          providerName: provider.name,
          selectedChannelIds: [],
        })),

  setField: (key, value) => set(state => ({ ...state, [key]: value })),

  toggleChannel: channelId =>
    set(state => ({
      ...state,
      selectedChannelIds: state.selectedChannelIds.includes(channelId)
        ? state.selectedChannelIds.filter(id => id !== channelId)
        : [...state.selectedChannelIds, channelId],
    })),

  reset: () => set(DEFAULT_STATE),
}));

/** Same ids in any order means the lineup does not need a PUT. */
export function sameChannels(a: string[], b: string[]): boolean {
  if (a.length !== b.length)
    return false;
  const set = new Set(a);
  return b.every(id => set.has(id));
}

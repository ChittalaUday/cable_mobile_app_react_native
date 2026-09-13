import type { PermissionScope } from '@/constants/permissions';
import type { UserAccessDoc } from '@/types/access';
import { create } from 'zustand';
import { createSelectors } from '@/lib/utils';

type AccessState = {
  userAccess: UserAccessDoc | null;
  permissions: Record<string, PermissionScope>;
  isLoading: boolean;
  clear: () => void;
};

const emptyAccess = { userAccess: null, permissions: {}, isLoading: false };

const _useAccessStore = create<AccessState>(set => ({
  ...emptyAccess,
  clear: () => set(emptyAccess),
}));

export const useAccessStore = createSelectors(_useAccessStore);

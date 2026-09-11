import type { PermissionScope } from '@/constants/permissions';
import type { UserAccessDoc } from '@/types/access';
import { doc, onSnapshot } from 'firebase/firestore';
import { create } from 'zustand';

import { COLLECTIONS } from '@/constants';
import { db } from '@/lib/firebase';
import { createSelectors } from '@/lib/utils';

type AccessState = {
  userAccess: UserAccessDoc | null;
  permissions: Record<string, PermissionScope>;
  locationIds: Record<string, boolean>;
  areaIds: Record<string, boolean>;
  teamId: string | null;
  version: number;
  isLoading: boolean;
  error: string | null;
  subscribe: (uid: string) => () => void;
  clear: () => void;
};

const _useAccessStore = create<AccessState>(set => ({
  userAccess: null,
  permissions: {},
  locationIds: {},
  areaIds: {},
  teamId: null,
  version: 0,
  isLoading: true,
  error: null,

  subscribe: (uid: string) => {
    set({ isLoading: true, error: null });
    const unsubscribe = onSnapshot(
      doc(db, COLLECTIONS.USER_ACCESS, uid),
      (snapshot) => {
        if (!snapshot.exists()) {
          set({
            userAccess: null,
            permissions: {},
            locationIds: {},
            teamId: null,
            version: 0,
            isLoading: false,
            error: null,
          });
          return;
        }

        const data = snapshot.data() as UserAccessDoc;
        set({
          userAccess: data,
          permissions: data.permissions || {},
          locationIds: data.locationIds || {},
          areaIds: data.areaIds || {},
          teamId: data.teamId || null,
          version: data.version || 1,
          isLoading: false,
          error: null,
        });
      },
      (error) => {
        console.warn('Failed to listen to userAccess:', error);
        set({ error: error.message, isLoading: false });
      },
    );

    return unsubscribe;
  },

  clear: () => set({
    userAccess: null,
    permissions: {},
    locationIds: {},
    areaIds: {},
    teamId: null,
    version: 0,
    isLoading: false,
    error: null,
  }),
}));

export const useAccessStore = createSelectors(_useAccessStore);

/* eslint-disable max-lines-per-function */
import type { RoleDoc, UserAccessDoc, UserProfileDoc } from '@/types/access';
import { PERMISSIONS } from '@/constants/permissions';
import { compileUserAccess, evaluateScopeAccess, mergeScopes } from './access-compiler';

describe('access-compiler', () => {
  describe('mergeScopes', () => {
    it('picks the broader scope in hierarchy', () => {
      expect(mergeScopes('OWN', 'ASSIGNED')).toBe('ASSIGNED');
      expect(mergeScopes('ASSIGNED', 'TEAM')).toBe('TEAM');
      expect(mergeScopes('TEAM', 'AREA')).toBe('AREA');
      expect(mergeScopes('AREA', 'LOCATION')).toBe('LOCATION');
      expect(mergeScopes('LOCATION', 'ALL')).toBe('ALL');
    });
  });

  describe('compileUserAccess', () => {
    const mockRoles: RoleDoc[] = [
      {
        id: 'staff',
        name: 'Staff',
        system: true,
        enabled: true,
        permissions: {
          [PERMISSIONS.CUSTOMERS_VIEW]: { scope: 'LOCATION' },
          [PERMISSIONS.COMPLAINTS_VIEW]: { scope: 'ASSIGNED' },
          [PERMISSIONS.COMPLAINTS_RESOLVE]: { scope: 'ASSIGNED' },
        },
      },
      {
        id: 'admin',
        name: 'Admin',
        system: true,
        enabled: true,
        permissions: {
          [PERMISSIONS.CUSTOMERS_VIEW]: { scope: 'ALL' },
          [PERMISSIONS.CUSTOMERS_CREATE]: { scope: 'ALL' },
          [PERMISSIONS.REPORTS_VIEW]: { scope: 'ALL' },
        },
      },
    ];

    it('merges permissions across assigned roles and takes highest scope', () => {
      const user: UserProfileDoc = {
        uid: 'user_1',
        roleIds: ['staff', 'admin'],
        locationIds: ['loc_01', 'loc_02'],
        areaIds: ['area_01'],
        teamId: 'team_a',
        tenantIds: ['tenant_satya'],
      };

      const access = compileUserAccess(user, mockRoles, 1);

      expect(access.uid).toBe('user_1');
      expect(access.version).toBe(1);
      expect(access.permissions[PERMISSIONS.CUSTOMERS_VIEW]).toBe('ALL');
      expect(access.permissions[PERMISSIONS.COMPLAINTS_VIEW]).toBe('ASSIGNED');
      expect(access.permissions[PERMISSIONS.REPORTS_VIEW]).toBe('ALL');
      expect(access.locationIds).toEqual({ loc_01: true, loc_02: true });
      expect(access.areaIds).toEqual({ area_01: true });
      expect(access.teamId).toBe('team_a');
    });

    it('applies DENY user override', () => {
      const user: UserProfileDoc = {
        uid: 'user_2',
        roleIds: ['admin'],
        permissionOverrides: {
          [PERMISSIONS.CUSTOMERS_CREATE]: { effect: 'DENY' },
        },
      };

      const access = compileUserAccess(user, mockRoles, 2);

      expect(access.permissions[PERMISSIONS.CUSTOMERS_VIEW]).toBe('ALL');
      expect(access.permissions[PERMISSIONS.CUSTOMERS_CREATE]).toBeUndefined();
    });

    it('applies ALLOW user override', () => {
      const user: UserProfileDoc = {
        uid: 'user_3',
        roleIds: ['staff'],
        permissionOverrides: {
          [PERMISSIONS.REPORTS_EXPORT]: { effect: 'ALLOW', scope: 'ALL' },
        },
      };

      const access = compileUserAccess(user, mockRoles, 1);

      expect(access.permissions[PERMISSIONS.REPORTS_EXPORT]).toBe('ALL');
    });
  });

  describe('evaluateScopeAccess', () => {
    const sampleAccess: UserAccessDoc = {
      uid: 'user_1',
      version: 1,
      locationIds: { loc_01: true },
      areaIds: { area_01: true },
      teamId: 'team_a',
      permissions: {
        [PERMISSIONS.CUSTOMERS_VIEW]: 'LOCATION' as const,
        [PERMISSIONS.COMPLAINTS_RESOLVE]: 'ASSIGNED' as const,
        [PERMISSIONS.REPORTS_VIEW]: 'ALL' as const,
        [PERMISSIONS.INVENTORY_VIEW]: 'OWN' as const,
        [PERMISSIONS.ASSETS_VIEW]: 'TEAM' as const,
        [PERMISSIONS.AREAS_VIEW]: 'AREA' as const,
      },
    };

    it('returns false if userAccess is null or permission is not granted', () => {
      expect(evaluateScopeAccess(null, PERMISSIONS.CUSTOMERS_VIEW)).toBe(false);
      expect(evaluateScopeAccess(sampleAccess, PERMISSIONS.CUSTOMERS_DELETE)).toBe(false);
    });

    it('grants ALL scope without restriction', () => {
      expect(evaluateScopeAccess(sampleAccess, PERMISSIONS.REPORTS_VIEW)).toBe(true);
    });

    it('evaluates LOCATION scope correctly', () => {
      expect(evaluateScopeAccess(sampleAccess, PERMISSIONS.CUSTOMERS_VIEW, { locationId: 'loc_01' })).toBe(true);
      expect(evaluateScopeAccess(sampleAccess, PERMISSIONS.CUSTOMERS_VIEW, { locationId: 'loc_99' })).toBe(false);
    });

    it('evaluates AREA scope correctly', () => {
      expect(evaluateScopeAccess(sampleAccess, PERMISSIONS.AREAS_VIEW, { areaId: 'area_01' })).toBe(true);
      expect(evaluateScopeAccess(sampleAccess, PERMISSIONS.AREAS_VIEW, { areaId: 'area_99' })).toBe(false);
    });

    it('evaluates ASSIGNED scope correctly', () => {
      expect(evaluateScopeAccess(sampleAccess, PERMISSIONS.COMPLAINTS_RESOLVE, { assignedTo: 'user_1' })).toBe(true);
      expect(evaluateScopeAccess(sampleAccess, PERMISSIONS.COMPLAINTS_RESOLVE, { assignedTo: 'other_user' })).toBe(false);
    });

    it('evaluates OWN scope correctly', () => {
      expect(evaluateScopeAccess(sampleAccess, PERMISSIONS.INVENTORY_VIEW, { createdBy: 'user_1' })).toBe(true);
      expect(evaluateScopeAccess(sampleAccess, PERMISSIONS.INVENTORY_VIEW, { createdBy: 'other_user' })).toBe(false);
    });

    it('evaluates TEAM scope correctly', () => {
      expect(evaluateScopeAccess(sampleAccess, PERMISSIONS.ASSETS_VIEW, { teamId: 'team_a' })).toBe(true);
      expect(evaluateScopeAccess(sampleAccess, PERMISSIONS.ASSETS_VIEW, { teamId: 'team_b' })).toBe(false);
    });
  });
});

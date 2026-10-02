import type { ApiQuery, ApiResponse } from '@/lib/api/contracts';
import type {
  CreateStaffInput,
  CreateTeamInput,
  LocationRef,
  Page,
  StaffMember,
  Team,
  TeamMember,
  UpdateStaffInput,
  UpdateTeamInput,
} from '@/lib/api/types';
import { createMutation, createQuery } from 'react-query-kit';
import { client } from '@/lib/api/client';
import { MAX_PAGE_SIZE } from '@/lib/api/types';

/**
 * Staff, crews, and the areas granted to either (backend §6.4).
 *
 * Every route here needs a `staff.*` permission, which only the `admin` role
 * holds — the screens live under `/admin`, whose layout already turns anyone
 * else away before a request is made.
 */

/**
 * Whether two grant sets are the same, ignoring order.
 *
 * Both `PUT .../locations` routes REPLACE the whole set, so sending one that
 * has not changed rewrites every row and drops the affected people's cached
 * permissions for nothing. Order carries no meaning — the server returns them
 * however the join came back — so comparing the arrays element by element would
 * report a change on every reload.
 */
export function sameAreas(a: readonly LocationRef[], b: readonly LocationRef[]): boolean {
  if (a.length !== b.length)
    return false;

  const left = new Set(a.map(area => area.id));

  return b.every(area => left.has(area.id));
}

/**
 * What one crew member covers, in the single line a roster row has for it.
 *
 * The inversion this exists to hide: an EMPTY `teamAreas` means the member
 * covers the crew's whole patch, not none of it. Rendering the raw array would
 * show a blank where the most permissive case belongs — the one mistake this
 * model invites, in the one place it would be seen most.
 */
export function teamCoverageLabel(member: Pick<TeamMember, 'teamAreas'>): string {
  if (member.teamAreas.length === 0)
    return 'All team areas';

  return member.teamAreas.map(area => area.name).join(', ');
}

export type StaffQueryVariables = ApiQuery<'/api/v1/staff'> | void;

export const useStaff = createQuery<Page<StaffMember>, StaffQueryVariables, Error>({
  queryKey: ['staff'],
  fetcher: async (variables) => {
    const response = await client.get<ApiResponse<'/api/v1/staff', 'get', 200>>('/staff', {
      params: { limit: MAX_PAGE_SIZE, ...variables },
    });
    return response.data;
  },
  staleTime: 60 * 1000,
});

export const useStaffMember = createQuery<StaffMember, { id: string }, Error>({
  queryKey: ['staff', 'detail'],
  fetcher: async ({ id }) => {
    const response = await client.get<ApiResponse<'/api/v1/staff/{id}', 'get', 200>>(`/staff/${id}`);
    return response.data;
  },
});

export const useCreateStaff = createMutation<StaffMember, { payload: CreateStaffInput }, Error>({
  mutationFn: async ({ payload }) => {
    const response = await client.post<ApiResponse<'/api/v1/staff', 'post', 201>>('/staff', payload);
    return response.data;
  },
});

export const useUpdateStaff = createMutation<StaffMember, { id: string; patch: UpdateStaffInput }, Error>({
  mutationFn: async ({ id, patch }) => {
    const response = await client.patch<ApiResponse<'/api/v1/staff/{id}', 'patch', 200>>(`/staff/${id}`, patch);
    return response.data;
  },
});

export const useDeleteStaff = createMutation<void, { id: string }, Error>({
  mutationFn: async ({ id }) => {
    await client.delete(`/staff/${id}`);
  },
});

/** A set, not a diff: send the whole list of areas every time. */
export const useSetStaffLocations = createMutation<StaffMember, { id: string; locationIds: string[] }, Error>({
  mutationFn: async ({ id, locationIds }) => {
    const response = await client.put<ApiResponse<'/api/v1/staff/{id}/locations', 'put', 200>>(`/staff/${id}/locations`, { locationIds });
    return response.data;
  },
});

/**
 * Narrows one member to part of their crew's patch.
 *
 * An empty `locationIds` is not "no areas" — it removes the narrowing and puts
 * them back on everything the crew holds. Every id must sit inside one of the
 * crew's own areas or the API answers 400.
 */
export const useSetStaffTeamAreas = createMutation<StaffMember, { id: string; locationIds: string[] }, Error>({
  mutationFn: async ({ id, locationIds }) => {
    const response = await client.put<ApiResponse<'/api/v1/staff/{id}/team-areas', 'put', 200>>(`/staff/${id}/team-areas`, { locationIds });
    return response.data;
  },
});

export const useTeamMembers = createQuery<TeamMember[], { id: string }, Error>({
  queryKey: ['teams', 'members'],
  fetcher: async ({ id }) => {
    const response = await client.get<ApiResponse<'/api/v1/teams/{id}/members', 'get', 200>>(`/teams/${id}/members`);
    return response.data;
  },
});

export const useTeams = createQuery<Page<Team>, ApiQuery<'/api/v1/teams'> | void, Error>({
  queryKey: ['teams'],
  fetcher: async (variables) => {
    const response = await client.get<ApiResponse<'/api/v1/teams', 'get', 200>>('/teams', {
      params: { limit: MAX_PAGE_SIZE, ...variables },
    });
    return response.data;
  },
  staleTime: 60 * 1000,
});

export const useTeam = createQuery<Team, { id: string }, Error>({
  queryKey: ['teams', 'detail'],
  fetcher: async ({ id }) => {
    const response = await client.get<ApiResponse<'/api/v1/teams/{id}', 'get', 200>>(`/teams/${id}`);
    return response.data;
  },
});

export const useCreateTeam = createMutation<Team, { payload: CreateTeamInput }, Error>({
  mutationFn: async ({ payload }) => {
    const response = await client.post<ApiResponse<'/api/v1/teams', 'post', 201>>('/teams', payload);
    return response.data;
  },
});

export const useUpdateTeam = createMutation<Team, { id: string; patch: UpdateTeamInput }, Error>({
  mutationFn: async ({ id, patch }) => {
    const response = await client.patch<ApiResponse<'/api/v1/teams/{id}', 'patch', 200>>(`/teams/${id}`, patch);
    return response.data;
  },
});

export const useDeleteTeam = createMutation<void, { id: string }, Error>({
  mutationFn: async ({ id }) => {
    await client.delete(`/teams/${id}`);
  },
});

/** Grants the whole crew an area at once — every member reaches it immediately. */
export const useSetTeamLocations = createMutation<Team, { id: string; locationIds: string[] }, Error>({
  mutationFn: async ({ id, locationIds }) => {
    const response = await client.put<ApiResponse<'/api/v1/teams/{id}/locations', 'put', 200>>(`/teams/${id}/locations`, { locationIds });
    return response.data;
  },
});

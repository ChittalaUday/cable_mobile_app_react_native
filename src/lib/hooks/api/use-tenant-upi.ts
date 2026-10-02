import type { ApiBody, ApiQuery, ApiResponse } from '@/lib/api/contracts';
import { createMutation, createQuery } from 'react-query-kit';
import { client } from '@/lib/api/client';
import { queryClient } from '@/lib/api/query-client';

/** One handle the operator collects into. Mirrors `UpiAccountResponse`. */
export type UpiAccount = ApiResponse<'/api/v1/tenants/me/upi-accounts', 'get', 200>[number];

export type UpiAccountPayload = ApiBody<'/api/v1/tenants/me/upi-accounts', 'post'>;

/**
 * The tenant's UPI handles, default first.
 *
 * Gated on `payments.collect` server-side rather than a tenant grant, so the
 * collector standing at the door can read the handle they have to show without
 * being handed the rest of the tenant record.
 */
export const useTenantUpiAccounts = createQuery<UpiAccount[], ApiQuery<'/api/v1/tenants/me/upi-accounts'> | void, Error>({
  queryKey: ['tenant-upi'],
  fetcher: async (variables) => {
    const response = await client.get<ApiResponse<'/api/v1/tenants/me/upi-accounts', 'get', 200>>('/tenants/me/upi-accounts', {
      params: variables || {},
    });
    return response.data;
  },
  // Changes about as often as the bank account does. Long, because a collector
  // on a round should not spend data re-fetching a string that never moves.
  staleTime: 30 * 60 * 1000,
});

async function refreshUpiAccounts(): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: ['tenant-upi'] });
}

export const useAddUpiAccount = createMutation<UpiAccount, { payload: UpiAccountPayload }, Error>({
  mutationFn: async ({ payload }) => (await client.post<ApiResponse<'/api/v1/tenants/me/upi-accounts', 'post', 201>>('/tenants/me/upi-accounts', payload)).data,
  onSuccess: refreshUpiAccounts,
});

export const useUpdateUpiAccount = createMutation<
  UpiAccount,
  { id: string; patch: ApiBody<'/api/v1/tenants/me/upi-accounts/{upiAccountId}', 'patch'> },
  Error
>({
  mutationFn: async ({ id, patch }) => (
    await client.patch<ApiResponse<'/api/v1/tenants/me/upi-accounts/{upiAccountId}', 'patch', 200>>(`/tenants/me/upi-accounts/${id}`, patch)
  ).data,
  onSuccess: refreshUpiAccounts,
});

export const useRemoveUpiAccount = createMutation<void, { id: string }, Error>({
  mutationFn: async ({ id }) => {
    await client.delete(`/tenants/me/upi-accounts/${id}`);
  },
  onSuccess: refreshUpiAccounts,
});

/** The handle a screen should show: the one chosen, else the tenant's default. */
export function chooseUpiAccount(accounts: UpiAccount[] | undefined, chosenId: string | null): UpiAccount | null {
  const live = accounts ?? [];

  return live.find(account => account.id === chosenId)
    ?? live.find(account => account.isDefault)
    ?? live[0]
    ?? null;
}

import type { ApiQuery, ApiResponse } from '@/lib/api/contracts';
import type {
  ApprovalRequest,
  ApprovalRequestPayload,
  CatalogItemPayload,
  CustomerEquipmentRecord,
  InventoryDashboard,
  InventoryLocation,
  InventoryLookupItem,
  InwardStockPayload,
  IssueEquipmentPayload,
  IssueEquipmentResponse,
  ItemDetails,
  StockItem,
  StockMovement,
  TransferStockPayload,
} from '@/lib/api/types';
import { createMutation, createQuery } from 'react-query-kit';
import { client } from '@/lib/api/client';
import { handleRealtimeSync } from '@/lib/api/query-client';

function refreshInventory() {
  handleRealtimeSync({ sync: 'inventory' });
}

export type StockListParams = ApiQuery<'/api/v1/inventory/stock'>;

export const useInventoryDashboard = createQuery<
  InventoryDashboard,
  { locationId?: string } | void,
  Error
>({
  queryKey: ['inventory', 'dashboard'],
  fetcher: async (variables) => {
    const response = await client.get<ApiResponse<'/api/v1/inventory/dashboard', 'get', 200>>('/inventory/dashboard', {
      params: variables || {},
    });
    return response.data;
  },
  staleTime: 30 * 1000,
});

export const useInventoryStock = createQuery<StockItem[], StockListParams | void, Error>({
  queryKey: ['inventory', 'stock'],
  fetcher: async (variables) => {
    const response = await client.get<ApiResponse<'/api/v1/inventory/stock', 'get', 200>>('/inventory/stock', {
      params: variables || {},
    });
    return response.data;
  },
  staleTime: 30 * 1000,
});

export const useInventoryItem = createQuery<ItemDetails, { id: string }, Error>({
  queryKey: ['inventory', 'item'],
  fetcher: async ({ id }) => {
    const response = await client.get<ApiResponse<'/api/v1/inventory/stock/{id}', 'get', 200>>(`/inventory/stock/${id}`);
    return response.data;
  },
  staleTime: 60 * 1000,
});

export const useIssueEquipment = createMutation<
  IssueEquipmentResponse,
  { payload: IssueEquipmentPayload },
  Error
>({
  mutationFn: async ({ payload }) => {
    const response = await client.post<ApiResponse<'/api/v1/inventory/issue', 'post', 201>>('/inventory/issue', payload);
    return response.data;
  },
  onSuccess: refreshInventory,
});

export const useCreateCatalogItem = createMutation<ApiResponse<'/api/v1/inventory/catalog', 'post', 201>, { payload: CatalogItemPayload }, Error>({
  mutationFn: async ({ payload }) => {
    const response = await client.post<ApiResponse<'/api/v1/inventory/catalog', 'post', 201>>('/inventory/catalog', payload);
    return response.data;
  },
  onSuccess: refreshInventory,
});

export const useCreateApprovalRequest = createMutation<
  ApiResponse<'/api/v1/inventory/approval-requests', 'post', 201>,
  { payload: ApprovalRequestPayload },
  Error
>({
  mutationFn: async ({ payload }) => {
    const response = await client.post<ApiResponse<'/api/v1/inventory/approval-requests', 'post', 201>>('/inventory/approval-requests', payload);
    return response.data;
  },
  onSuccess: refreshInventory,
});

export const useApprovalRequests = createQuery<ApprovalRequest[], void, Error>({
  queryKey: ['inventory', 'requests'],
  fetcher: async () => {
    const response = await client.get<ApiResponse<'/api/v1/inventory/approval-requests', 'get', 200>>('/inventory/approval-requests');
    return response.data;
  },
  staleTime: 30 * 1000,
});

export const useReviewApprovalRequest = createMutation<
  ApprovalRequest,
  { id: string; patch: { status: 'approved' | 'rejected'; reviewNotes?: string } },
  Error
>({
  mutationFn: async ({ id, patch }) => {
    const response = await client.patch<ApiResponse<'/api/v1/inventory/approval-requests/{id}', 'patch', 200>>(`/inventory/approval-requests/${id}`, patch);
    return response.data;
  },
  onSuccess: refreshInventory,
});

export const useInventoryMovements = createQuery<StockMovement[], void, Error>({
  queryKey: ['inventory', 'movements'],
  fetcher: async () => {
    const response = await client.get<ApiResponse<'/api/v1/inventory/movements', 'get', 200>>('/inventory/movements');
    return response.data;
  },
  staleTime: 30 * 1000,
});

export const useInventoryLocations = createQuery<InventoryLocation[], void, Error>({
  queryKey: ['inventory', 'locations'],
  fetcher: async () => {
    const response = await client.get<ApiResponse<'/api/v1/inventory/locations', 'get', 200>>('/inventory/locations');
    return response.data;
  },
  staleTime: 60 * 1000,
});

export async function lookupInventory(q: string): Promise<InventoryLookupItem[]> {
  const response = await client.get<ApiResponse<'/api/v1/inventory/lookup', 'get', 200>>('/inventory/lookup', {
    params: { q },
  });
  return response.data;
}

export const useInventoryLookup = createQuery<
  InventoryLookupItem[],
  { q: string },
  Error
>({
  queryKey: ['inventory', 'lookup'],
  fetcher: async ({ q }) => {
    return lookupInventory(q);
  },
  staleTime: 10 * 1000,
});

export const useCustomerEquipment = createQuery<
  CustomerEquipmentRecord[],
  { customerId?: string; limit?: number } | void,
  Error
>({
  queryKey: ['inventory', 'customer-equipment'],
  fetcher: async (variables) => {
    const response = await client.get<ApiResponse<'/api/v1/inventory/customer-equipment', 'get', 200>>('/inventory/customer-equipment', {
      params: variables || {},
    });
    return response.data;
  },
  staleTime: 30 * 1000,
});

export const useInwardStock = createMutation<
  ApiResponse<'/api/v1/inventory/inward', 'post', 201>,
  { payload: InwardStockPayload },
  Error
>({
  mutationFn: async ({ payload }) => {
    const response = await client.post<ApiResponse<'/api/v1/inventory/inward', 'post', 201>>('/inventory/inward', payload);
    return response.data;
  },
  onSuccess: refreshInventory,
});

export const useTransferStock = createMutation<
  ApiResponse<'/api/v1/inventory/transfer', 'post', 201>,
  { payload: TransferStockPayload },
  Error
>({
  mutationFn: async ({ payload }) => {
    const response = await client.post<ApiResponse<'/api/v1/inventory/transfer', 'post', 201>>('/inventory/transfer', payload);
    return response.data;
  },
  onSuccess: refreshInventory,
});

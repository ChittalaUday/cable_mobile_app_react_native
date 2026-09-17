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

export type StockListParams = {
  locationId?: string;
  status?: 'all' | 'in_stock' | 'low_stock';
  search?: string;
};

export const useInventoryDashboard = createQuery<
  InventoryDashboard,
  { locationId?: string } | void,
  Error
>({
  queryKey: ['inventory', 'dashboard'],
  fetcher: async (variables) => {
    const response = await client.get<InventoryDashboard>('/inventory/dashboard', {
      params: variables || {},
    });
    return response.data;
  },
  staleTime: 30 * 1000,
});

export const useInventoryStock = createQuery<StockItem[], StockListParams | void, Error>({
  queryKey: ['inventory', 'stock'],
  fetcher: async (variables) => {
    const response = await client.get<StockItem[]>('/inventory/stock', {
      params: variables || {},
    });
    return response.data;
  },
  staleTime: 30 * 1000,
});

export const useInventoryItem = createQuery<ItemDetails, { id: string }, Error>({
  queryKey: ['inventory', 'item'],
  fetcher: async ({ id }) => {
    const response = await client.get<ItemDetails>(`/inventory/stock/${id}`);
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
    const response = await client.post<IssueEquipmentResponse>('/inventory/issue', payload);
    return response.data;
  },
});

export const useCreateCatalogItem = createMutation<StockItem, { payload: CatalogItemPayload }, Error>({
  mutationFn: async ({ payload }) => {
    const response = await client.post<StockItem>('/inventory/catalog', payload);
    return response.data;
  },
});

export const useCreateApprovalRequest = createMutation<
  ApprovalRequest,
  { payload: ApprovalRequestPayload },
  Error
>({
  mutationFn: async ({ payload }) => {
    const response = await client.post<ApprovalRequest>('/inventory/approval-requests', payload);
    return response.data;
  },
});

export const useApprovalRequests = createQuery<ApprovalRequest[], void, Error>({
  queryKey: ['inventory', 'requests'],
  fetcher: async () => {
    const response = await client.get<ApprovalRequest[]>('/inventory/approval-requests');
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
    const response = await client.patch<ApprovalRequest>(`/inventory/approval-requests/${id}`, patch);
    return response.data;
  },
});

export const useInventoryMovements = createQuery<StockMovement[], void, Error>({
  queryKey: ['inventory', 'movements'],
  fetcher: async () => {
    const response = await client.get<StockMovement[]>('/inventory/movements');
    return response.data;
  },
  staleTime: 30 * 1000,
});

export const useInventoryLocations = createQuery<InventoryLocation[], void, Error>({
  queryKey: ['inventory', 'locations'],
  fetcher: async () => {
    const response = await client.get<InventoryLocation[]>('/inventory/locations');
    return response.data;
  },
  staleTime: 60 * 1000,
});

export async function lookupInventory(q: string): Promise<InventoryLookupItem[]> {
  const response = await client.get<InventoryLookupItem[]>('/inventory/lookup', {
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
    const response = await client.get<CustomerEquipmentRecord[]>('/inventory/customer-equipment', {
      params: variables || {},
    });
    return response.data;
  },
  staleTime: 30 * 1000,
});

export const useInwardStock = createMutation<
  { success: boolean; quantity: number; movementId?: string },
  { payload: InwardStockPayload },
  Error
>({
  mutationFn: async ({ payload }) => {
    const response = await client.post<{ success: boolean; quantity: number; movementId?: string }>('/inventory/inward', payload);
    return response.data;
  },
});

export const useTransferStock = createMutation<
  { success: boolean; equipmentId: string; movementId: string },
  { payload: TransferStockPayload },
  Error
>({
  mutationFn: async ({ payload }) => {
    const response = await client.post<{ success: boolean; equipmentId: string; movementId: string }>('/inventory/transfer', payload);
    return response.data;
  },
});

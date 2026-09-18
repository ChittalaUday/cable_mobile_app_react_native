/** Mirrors `src/shared/constants/inventory.ts` in cable-backend. */

/** Whether a catalogue item is tracked unit by unit or counted in bulk. */
export const EQUIPMENT_OWNERSHIPS = ['tenant_provided', 'customer_owned', 'rental', 'deposit'] as const;
export type EquipmentOwnership = (typeof EQUIPMENT_OWNERSHIPS)[number];

/** Where a unit physically is, in stock terms. */
export const INVENTORY_STATUSES = [
  'available',
  'with_staff',
  'allocated',
  'faulty',
  'under_repair',
  'retired',
  'sold',
  'lost',
] as const;
export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];

export const CUSTOMER_EQUIPMENT_STATUSES = [
  'active',
  'standby',
  'faulty',
  'returned',
  'replaced',
  'lost_unreturned',
  'written_off',
] as const;
export type CustomerEquipmentStatus = (typeof CUSTOMER_EQUIPMENT_STATUSES)[number];

export const EQUIPMENT_RETURN_CONDITIONS = [
  'working',
  'damaged',
  'missing_accessories',
  'faulty',
] as const;
export type EquipmentReturnCondition = (typeof EQUIPMENT_RETURN_CONDITIONS)[number];

export const DEPOSIT_REFUND_STATUSES = [
  'not_applicable',
  'pending',
  'refunded',
  'forfeited',
  'adjusted_against_dues',
] as const;
export type DepositRefundStatus = (typeof DEPOSIT_REFUND_STATUSES)[number];

export const STOCK_MOVEMENT_TYPES = [
  'inward',
  'transfer',
  'van_checkout',
  'van_checkin',
  'customer_issue',
  'customer_return',
  'swap',
  'repair_out',
  'repair_return',
  'scrap',
  'adjustment',
] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export const INVENTORY_REQUEST_TYPES = ['create_item', 'update_item', 'delete_item', 'adjust_stock'] as const;
export type InventoryRequestType = (typeof INVENTORY_REQUEST_TYPES)[number];

export const INVENTORY_REQUEST_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type InventoryRequestStatus = (typeof INVENTORY_REQUEST_STATUSES)[number];

/** What a reviewer may set. `pending` is where a request starts, not an outcome. */
export const INVENTORY_REVIEW_OUTCOMES = ['approved', 'rejected'] as const satisfies readonly InventoryRequestStatus[];
export type InventoryReviewOutcome = (typeof INVENTORY_REVIEW_OUTCOMES)[number];

/** How a stock list is narrowed. A view filter, never a stored value. */
export const STOCK_LEVEL_FILTERS = ['all', 'in_stock', 'low_stock'] as const;
export type StockLevelFilter = (typeof STOCK_LEVEL_FILTERS)[number];

/** Whether a scanned code matched a physical unit or a catalogue entry. */
export const INVENTORY_LOOKUP_TYPES = ['equipment', 'catalog'] as const;
export type InventoryLookupType = (typeof INVENTORY_LOOKUP_TYPES)[number];

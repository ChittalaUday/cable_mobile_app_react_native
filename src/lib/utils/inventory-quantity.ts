/** Refuse pasted decimals and partially numeric text rather than truncating them. */
export function inventoryQuantity(value: string, maximum: number): number | null {
  if (!/^\d+$/.test(value.trim()))
    return null;
  const quantity = Number(value);
  return Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= maximum ? quantity : null;
}

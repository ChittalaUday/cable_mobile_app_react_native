import { inventoryQuantity } from './inventory-quantity';

it.each(['1.9', '2junk', 'NaN', 'Infinity', '-1', '0', '1001', '100000000000000000000'])('rejects unsafe stock quantity %s', (value) => {
  expect(inventoryQuantity(value, 1000)).toBeNull();
});
it.each(['1', '1000'])('accepts bounded integer stock quantity %s', (value) => {
  expect(inventoryQuantity(value, 1000)).toBe(Number(value));
});
it('enforces a one-unit serialized stock transfer', () => {
  expect(inventoryQuantity('2', 1)).toBeNull();
  expect(inventoryQuantity('1', 1)).toBe(1);
});

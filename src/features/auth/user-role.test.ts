import { parseUserRole } from './user-role';

it('accepts only supported account roles', () => {
  expect(parseUserRole('admin')).toBe('admin');
  expect(parseUserRole('staff')).toBe('staff');
  expect(parseUserRole('subscriber')).toBe('subscriber');
  expect(() => parseUserRole('owner')).toThrow('Missing or invalid account role');
});

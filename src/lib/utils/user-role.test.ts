import { parseUserRole } from './user-role';

describe('parseUserRole', () => {
  it.each(['admin', 'staff', 'customer', 'super_admin'])('accepts valid role %p', (role) => {
    expect(parseUserRole(role)).toBe(role);
  });

  it.each([null, undefined, '', 'subscriber', 'invalid_role', 42])('rejects invalid value %p', (invalid) => {
    expect(() => parseUserRole(invalid)).toThrow('Missing or invalid account role');
  });
});

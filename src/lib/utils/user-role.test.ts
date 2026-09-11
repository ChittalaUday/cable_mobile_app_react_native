import { parseUserRole } from './user-role';

describe('parseUserRole', () => {
  it.each(['admin', 'staff', 'subscriber'])('accepts valid role %p', (role) => {
    expect(parseUserRole(role)).toBe(role);
  });

  it.each([null, undefined, '', 'superadmin', 42])('rejects invalid value %p', (invalid) => {
    expect(() => parseUserRole(invalid)).toThrow('Missing or invalid account role');
  });
});

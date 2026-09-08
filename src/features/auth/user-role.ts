export type UserRole = 'admin' | 'staff' | 'subscriber';

export function parseUserRole(value: unknown): UserRole {
  if (value === 'admin' || value === 'staff' || value === 'subscriber')
    return value;
  throw new Error('Missing or invalid account role');
}

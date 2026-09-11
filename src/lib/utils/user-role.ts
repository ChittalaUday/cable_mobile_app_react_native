import { USER_ROLES } from '@/constants';

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export function parseUserRole(value: unknown): UserRole {
  if (
    value === USER_ROLES.SUPER_ADMIN
    || value === USER_ROLES.ADMIN
    || value === USER_ROLES.STAFF
    || value === USER_ROLES.CUSTOMER
  ) {
    return value;
  }
  throw new Error('Missing or invalid account role');
}

import type { Search01Icon } from '@hugeicons/core-free-icons';
import {
  Add01Icon,
  AlertCircleIcon,
  Analytics01Icon,
  CreditCardIcon,
  Delete02Icon,
  PackageIcon,
  PencilEdit02Icon,

  Settings02Icon,
  UserAdd01Icon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';

/** The registry names icons by string; this is what each one draws. */
export const ICON_MAP: Record<string, typeof Search01Icon> = {
  'users': UserGroupIcon,
  'user-plus': UserAdd01Icon,
  'alert-circle': AlertCircleIcon,
  'plus-circle': Add01Icon,
  'credit-card': CreditCardIcon,
  'dollar-sign': CreditCardIcon,
  'bar-chart': Analytics01Icon,
  'settings': Settings02Icon,
  'package': PackageIcon,
  'package-add': PackageIcon,
  'package-edit': PencilEdit02Icon,
  'package-delete': Delete02Icon,
};

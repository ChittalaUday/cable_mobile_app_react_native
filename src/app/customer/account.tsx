import * as React from 'react';

import { CustomerDetailScreen } from '@/components/customer/customer-detail-screen';
import { useCustomers } from '@/lib/hooks/api/use-customers';

/**
 * The subscriber's own record: lines, boxes on loan, and what has been paid.
 *
 * The id is looked up rather than passed in, because `GET /customers` at OWN
 * scope answers with exactly one row — this caller — and the home screen has
 * already fetched and cached it.
 */
export default function CustomerAccountRoute() {
  const { data } = useCustomers();
  const customerId = data?.pages[0]?.items[0]?.id;

  return <CustomerDetailScreen customerId={customerId} role="customer" />;
}

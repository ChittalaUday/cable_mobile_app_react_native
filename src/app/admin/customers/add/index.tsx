import { useRouter } from 'expo-router';
import * as React from 'react';
import { AddCustomerModal } from '@/components/admin/add-customer-modal';
import { View } from '@/components/ui';

/**
 * Add Customer, as a route rather than a sheet over the list.
 *
 * It hosts the same form the customers list opens, so there is one place where
 * a subscriber is registered and one payload that reaches `POST /customers`.
 * On success it goes straight to the new subscriber's page, because Issue
 * Equipment and Collect Payment both start there. Hardware is deliberately not
 * a field on this form: fitting a box books its serial and moves it out of
 * stock, which is the inventory flow's job and not a text input's.
 */
export function AddCustomerScreen({ basePath = '/admin' }: { basePath?: '/admin' | '/staff' }) {
  const router = useRouter();

  return (
    <View className="flex-1 bg-surface">
      <AddCustomerModal
        visible
        onClose={() => router.back()}
        onSuccess={created => router.replace(`${basePath}/customers/${created.id}`)}
      />
    </View>
  );
}

export default AddCustomerScreen;

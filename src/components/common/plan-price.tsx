import * as React from 'react';
import { Text } from '@/components/ui';
import { planRupees } from '@/lib/utils/admin-format';

/**
 * A plan's price as customers are shown it: the list price struck through, then
 * what one cycle actually charges — "~~₹300~~ ₹250". No discount, just the amount.
 */
export function PlanPrice({ price, amount, className = 'text-sm font-extrabold text-foreground', testID }: {
  price: string;
  amount: string;
  className?: string;
  testID?: string;
}) {
  const discounted = Number(price) > Number(amount);

  return (
    <Text className={className} testID={testID} numberOfLines={1}>
      {discounted
        ? <Text className="font-semibold text-muted-foreground line-through">{planRupees(price)}</Text>
        : null}
      {discounted ? ' ' : ''}
      {planRupees(amount)}
    </Text>
  );
}

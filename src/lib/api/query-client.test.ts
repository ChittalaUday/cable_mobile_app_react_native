import { focusManager } from '@tanstack/react-query';
import { AppState } from 'react-native';
import * as queryClientModule from './query-client';

type RealtimeSync = (data: Record<string, unknown> | undefined) => boolean;

const handleRealtimeSync = (queryClientModule as unknown as {
  handleRealtimeSync?: RealtimeSync;
}).handleRealtimeSync;

afterEach(() => {
  queryClientModule.queryClient.clear();
});

describe('realtime cache sync', () => {
  it('invalidates every customer view after a customer change', () => {
    expect(handleRealtimeSync).toEqual(expect.any(Function));
    if (handleRealtimeSync === undefined)
      return;

    for (const key of ['customers', 'customer', 'admin-dashboard', 'staff-dashboard'])
      queryClientModule.queryClient.setQueryData([key], { old: true });

    expect(handleRealtimeSync({ sync: 'customers' })).toBe(true);

    for (const key of ['customers', 'customer', 'admin-dashboard', 'staff-dashboard'])
      expect(queryClientModule.queryClient.getQueryState([key])?.isInvalidated).toBe(true);
  });

  it('invalidates receipts, customer balances and inventory after a payment', () => {
    expect(handleRealtimeSync).toEqual(expect.any(Function));
    if (handleRealtimeSync === undefined)
      return;

    for (const key of ['payments', 'payment', 'customers', 'customer', 'inventory', 'admin-dashboard', 'staff-dashboard'])
      queryClientModule.queryClient.setQueryData([key], { old: true });

    expect(handleRealtimeSync({ sync: 'payments' })).toBe(true);

    for (const key of ['payments', 'payment', 'customers', 'customer', 'inventory', 'admin-dashboard', 'staff-dashboard'])
      expect(queryClientModule.queryClient.getQueryState([key])?.isInvalidated).toBe(true);
  });

  it('invalidates stock and customer equipment after an inventory change', () => {
    expect(handleRealtimeSync).toEqual(expect.any(Function));
    if (handleRealtimeSync === undefined)
      return;

    for (const key of ['inventory', 'customers', 'customer', 'admin-dashboard', 'staff-dashboard'])
      queryClientModule.queryClient.setQueryData([key], { old: true });

    expect(handleRealtimeSync({ sync: 'inventory' })).toBe(true);

    for (const key of ['inventory', 'customers', 'customer', 'admin-dashboard', 'staff-dashboard'])
      expect(queryClientModule.queryClient.getQueryState([key])?.isInvalidated).toBe(true);
  });
});

describe('app focus', () => {
  it('counts coming back to the foreground as focus, so stale screens refetch', () => {
    const calls = (AppState.addEventListener as jest.Mock<unknown, [string, (state: string) => void]>).mock.calls;
    const listener = calls.find(([event]) => event === 'change')?.[1];
    expect(listener).toEqual(expect.any(Function));

    listener?.('background');
    expect(focusManager.isFocused()).toBe(false);
    listener?.('active');
    expect(focusManager.isFocused()).toBe(true);
  });
});

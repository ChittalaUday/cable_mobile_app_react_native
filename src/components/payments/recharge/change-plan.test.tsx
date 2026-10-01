import type { CustomerDetail } from '@/lib/api/types';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as React from 'react';
import { dialogs } from '@/components/common/dialogs';
import { useRechargeStore } from '@/lib/hooks/stores/use-recharge-store';
import i18n from '@/lib/i18n';
import { ChangePlanScreen } from './change-plan';

const mockChangePlan = jest.fn<void, [
  { customerId: string; subscriptionId: string; payload: { packageId: string } },
  { onSuccess: (made: { id: string }) => void; onError: (failure: Error) => void },
]>();
const mockAddSubscription = jest.fn<void, [
  { customerId: string; payload: { packageId: string; basedOn: string } },
  { onSuccess: (made: { id: string }) => void; onError: (failure: Error) => void },
]>();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack }),
}));

jest.mock('@/lib/hooks/api/use-customers', () => ({
  useCustomer: jest.fn(),
  useChangePlan: () => ({ mutate: mockChangePlan, isPending: false }),
  useAddSubscription: () => ({ mutate: mockAddSubscription, isPending: false }),
}));

jest.mock('@/lib/hooks/api/use-packages', () => ({
  usePackages: () => ({
    data: [
      { id: 'pkg-sub-1', name: 'Gold HD', packageType: 'base', price: '350.00', billingCycle: 'monthly', channelCount: 120, active: true },
      { id: 'pkg-platinum', name: 'Platinum', packageType: 'base', price: '550.00', billingCycle: 'monthly', channelCount: 200, active: true },
      { id: 'pkg-combo', name: 'Fibre Combo', packageType: 'combo', price: '899.00', billingCycle: 'monthly', channelCount: 200, active: true },
      { id: 'pkg-sports', name: 'Sports Pack', packageType: 'addon', price: '99.00', billingCycle: 'monthly', channelCount: 6, active: true },
      { id: 'pkg-zee', name: 'Zee Prime Telugu', packageType: 'bouquet', price: '53.00', billingCycle: 'monthly', channelCount: 9, active: true },
      { id: 'pkg-old', name: 'Retired Pack', packageType: 'base', price: '10.00', billingCycle: 'monthly', channelCount: 2, active: false },
    ],
    isPending: false,
  }),
}));

const { useCustomer } = jest.requireMock<{ useCustomer: jest.Mock }>('@/lib/hooks/api/use-customers');

const CUSTOMER = {
  id: 'cust-1',
  name: 'Kavitha Devi',
  customerCode: 'SSCN-1',
  outstandingBalance: '500.00',
  subscriptions: [{
    id: 'sub-1',
    serviceAccountNumber: 'ACT-sub-1',
    status: 'active',
    billingCycle: 'monthly',
    price: '350.00',
    outstandingBalance: '500.00',
    service: { id: 's1', name: 'Cable TV', slug: 'cable', icon: null },
    provider: { id: 'p1', name: 'ACT', slug: 'act' },
    package: { id: 'pkg-sub-1', name: 'Gold HD', slug: 'gold', packageType: 'base' },
  }],
} as unknown as CustomerDetail;

function mount() {
  useCustomer.mockReturnValue({ data: CUSTOMER, isPending: false, error: null, refetch: jest.fn() });
  return render(<ChangePlanScreen />);
}

beforeEach(async () => {
  jest.clearAllMocks();
  await i18n.changeLanguage('en');
  act(() => {
    useRechargeStore.getState().reset();
    useRechargeStore.getState().begin({ customerId: 'cust-1', subscriptionId: 'sub-1' });
  });
});

describe('the plans page', () => {
  it('pins the current plan above one tabbed plans and addons list', () => {
    mount();

    expect(screen.getByText('Current plan')).toBeTruthy();
    expect(screen.getByText('Gold HD')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Plans (2)' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Add-ons (2)' })).toBeTruthy();
    expect(screen.getByText('Packages (2)')).toBeTruthy();
    expect(screen.getAllByText('Add-ons (2)')).toHaveLength(2);
    expect(screen.getByText('Platinum')).toBeTruthy();
    expect(screen.getByText('Fibre Combo')).toBeTruthy();
    expect(screen.getByText('Sports Pack')).toBeTruthy();
    expect(screen.getByText('Zee Prime Telugu')).toBeTruthy();
    // The current plan is pinned, not repeated among switch choices.
    expect(screen.getAllByText('Gold HD')).toHaveLength(1);
    expect(screen.queryByText('Retired Pack')).toBeNull();
  });

  it('moves the active category when its tab is pressed', () => {
    mount();

    const plans = screen.getByRole('tab', { name: 'Plans (2)' });
    const addons = screen.getByRole('tab', { name: 'Add-ons (2)' });

    expect(plans.props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(addons);
    expect(addons.props.accessibilityState).toEqual({ selected: true });
  });

  it('localizes the category tabs and current-plan label in Telugu', async () => {
    await i18n.changeLanguage('te');
    mount();

    expect(screen.getByText('ప్రస్తుత ప్లాన్')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'ప్లాన్‌లు (2)' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'యాడ్-ఆన్‌లు (2)' })).toBeTruthy();
  });

  it('searches both categories at once, and says which half came up empty', () => {
    mount();

    fireEvent.changeText(screen.getByTestId('plan-search'), 'prime');

    expect(screen.getByText('Zee Prime Telugu')).toBeTruthy();
    expect(screen.queryByText('Platinum')).toBeNull();
    expect(screen.getByText('No plan matches that.')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('plan-search'), 'combo');

    expect(screen.getByText('Fibre Combo')).toBeTruthy();
    expect(screen.getByText('No addon matches that.')).toBeTruthy();
  });

  it('asks before switching the plan, then returns to the flow', async () => {
    const confirm = jest.spyOn(dialogs, 'confirm').mockResolvedValue(true);
    mount();

    fireEvent.press(screen.getByText('Platinum'));
    await waitFor(() => expect(mockChangePlan).toHaveBeenCalled());

    expect(confirm).toHaveBeenCalled();
    expect(mockChangePlan.mock.calls[0]![0]).toEqual({
      customerId: 'cust-1',
      subscriptionId: 'sub-1',
      payload: { packageId: 'pkg-platinum' },
    });

    act(() => mockChangePlan.mock.calls[0]![1].onSuccess({ id: 'sub-1' }));
    expect(mockBack).toHaveBeenCalled();

    confirm.mockRestore();
  });

  it('sends nothing when the switch is declined', async () => {
    const confirm = jest.spyOn(dialogs, 'confirm').mockResolvedValue(false);
    mount();

    fireEvent.press(screen.getByText('Platinum'));
    await waitFor(() => expect(confirm).toHaveBeenCalled());

    expect(mockChangePlan).not.toHaveBeenCalled();

    confirm.mockRestore();
  });

  it('adds an addon against the chosen line and makes it the one the flow acts on', async () => {
    mount();

    fireEvent.press(screen.getByText('Sports Pack'));

    await waitFor(() => expect(mockAddSubscription).toHaveBeenCalled());
    expect(mockAddSubscription.mock.calls[0]![0]).toEqual({
      customerId: 'cust-1',
      payload: { packageId: 'pkg-sports', basedOn: 'sub-1' },
    });

    act(() => mockAddSubscription.mock.calls[0]![1].onSuccess({ id: 'sub-9' }));
    expect(useRechargeStore.getState().subscriptionId).toBe('sub-9');
    expect(mockBack).toHaveBeenCalled();
  });
});

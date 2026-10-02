import type { CustomerDetail } from '@/lib/api/types';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as React from 'react';
import { dialogs } from '@/components/common/dialogs';
import { useRechargeStore } from '@/lib/hooks/stores/use-recharge-store';
import i18n from '@/lib/i18n';
import { ChangePlanScreen } from './change-plan';

const mockChangePlan = jest.fn<void, [
  { customerId: string; subscriptionId: string; payload: { planId: string } },
  { onSuccess: (made: { id: string }) => void; onError: (failure: Error) => void },
]>();
const mockAddSubscription = jest.fn<void, [
  { customerId: string; payload: { planId: string; basedOn: string } },
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

function mockPlan(id: string, name: string, price: string, discount: string, amount: string, billingCycle = 'monthly', status = 'active') {
  return { id, name, price, discount, amount, billingCycle, status };
}

jest.mock('@/lib/hooks/api/use-plans', () => ({
  usePlans: () => ({
    data: [
      mockPlan('plan-gold', 'Gold HD', '400.00', '50.00', '350.00'),
      mockPlan('plan-platinum', 'Platinum', '600.00', '50.00', '550.00'),
      mockPlan('plan-quarter', 'Gold 3 Months', '900.00', '200.00', '700.00', 'quarterly'),
      mockPlan('plan-sports', 'Sports Pack', '99.00', '0.00', '99.00'),
      mockPlan('plan-old', 'Retired Plan', '10.00', '0.00', '10.00', 'monthly', 'inactive'),
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
    plan: { id: 'plan-gold', name: 'Gold HD', slug: 'gold', price: '400.00', discount: '50.00', amount: '350.00', billingCycle: 'monthly' },
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
  it('pins the current plan and lists the other plans to switch to, by amount', () => {
    mount();

    expect(screen.getByText('Current plan')).toBeTruthy();
    expect(screen.getByText('ACT • ₹400 ₹350')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Plans (3)' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Add-ons (4)' })).toBeTruthy();
    expect(screen.getByText('Platinum')).toBeTruthy();
    expect(screen.getByText('₹900 ₹700')).toBeTruthy();
    // The current plan is pinned, not repeated among switch choices; a retired one is not offered.
    expect(screen.getAllByText('Gold HD')).toHaveLength(1);
    expect(screen.queryByText('Retired Plan')).toBeNull();
  });

  it('switches what a tap does when the other tab is pressed', () => {
    mount();

    const plans = screen.getByRole('tab', { name: 'Plans (3)' });
    const addons = screen.getByRole('tab', { name: 'Add-ons (4)' });

    expect(plans.props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(addons);
    expect(addons.props.accessibilityState).toEqual({ selected: true });
    // Adding a line can put the same plan on a second box.
    expect(screen.getAllByText('Gold HD')).toHaveLength(2);
  });

  it('localizes the category tabs and current-plan label in Telugu', async () => {
    await i18n.changeLanguage('te');
    mount();

    expect(screen.getByText('ప్రస్తుత ప్లాన్')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'ప్లాన్‌లు (3)' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'యాడ్-ఆన్‌లు (4)' })).toBeTruthy();
  });

  it('searches by plan name and says when nothing matches', () => {
    mount();

    fireEvent.changeText(screen.getByTestId('plan-search'), 'month');
    expect(screen.getByText('Gold 3 Months')).toBeTruthy();
    expect(screen.queryByText('Platinum')).toBeNull();

    fireEvent.changeText(screen.getByTestId('plan-search'), 'zzz');
    expect(screen.getByText('No plan matches that.')).toBeTruthy();
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
      payload: { planId: 'plan-platinum' },
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

  it('adds a plan as another line against the chosen one and makes it the one the flow acts on', async () => {
    mount();

    fireEvent.press(screen.getByRole('tab', { name: 'Add-ons (4)' }));
    fireEvent.press(screen.getByText('Sports Pack'));

    await waitFor(() => expect(mockAddSubscription).toHaveBeenCalled());
    expect(mockAddSubscription.mock.calls[0]![0]).toEqual({
      customerId: 'cust-1',
      payload: { planId: 'plan-sports', basedOn: 'sub-1' },
    });

    act(() => mockAddSubscription.mock.calls[0]![1].onSuccess({ id: 'sub-9' }));
    expect(useRechargeStore.getState().subscriptionId).toBe('sub-9');
    expect(mockBack).toHaveBeenCalled();
  });
});

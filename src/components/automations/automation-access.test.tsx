import { act, render, screen } from '@testing-library/react-native';
import * as React from 'react';
import { Text } from 'react-native';
import i18n from '@/lib/i18n';
import { AutomationAccessGate } from './automation-access';

let mockCan = false;
let mockLoading = false;

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('@/lib/hooks/common/use-permissions', () => ({
  usePermissions: () => ({ can: (key: string) => mockCan && key === 'jobs.view', isLoading: mockLoading }),
}));

beforeEach(async () => {
  mockCan = false;
  mockLoading = false;
  await act(async () => i18n.changeLanguage('en'));
});

describe('automation access gate', () => {
  it('shows the screen to jobs.view holders', () => {
    mockCan = true;
    render(<AutomationAccessGate><Text>inside</Text></AutomationAccessGate>);

    expect(screen.getByText('inside')).toBeTruthy();
  });

  it('turns a deep link without jobs.view into a forbidden message, in both languages', async () => {
    const view = render(<AutomationAccessGate><Text>inside</Text></AutomationAccessGate>);

    expect(screen.queryByText('inside')).toBeNull();
    expect(screen.getByText('You do not have access to automations.')).toBeTruthy();

    view.unmount();
    await act(async () => i18n.changeLanguage('te'));
    render(<AutomationAccessGate><Text>inside</Text></AutomationAccessGate>);

    expect(screen.getByText('ఆటోమేషన్లకు మీకు ప్రవేశం లేదు.')).toBeTruthy();
  });

  it('renders nothing while permissions are still loading', () => {
    mockLoading = true;
    render(<AutomationAccessGate><Text>inside</Text></AutomationAccessGate>);

    expect(screen.queryByText('inside')).toBeNull();
    expect(screen.queryByText('You do not have access to automations.')).toBeNull();
  });
});

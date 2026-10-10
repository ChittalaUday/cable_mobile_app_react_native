import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';
import i18n from '@/lib/i18n';
import { MoreView } from './more-view';

const mockPush = jest.fn();
const mockGranted = new Set<string>();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }) }));
jest.mock('@/lib/hooks/common/use-permissions', () => ({
  usePermissions: () => ({ can: (key: string) => mockGranted.has(key) }),
}));
jest.mock('@/lib/hooks/stores/use-auth-store', () => ({
  useAuthStore: { use: { user: () => null, role: () => 'admin', signOut: () => jest.fn() } },
}));

beforeEach(async () => {
  mockPush.mockReset();
  mockGranted.clear();
  await act(async () => i18n.changeLanguage('en'));
});

describe('the Automations entry in More', () => {
  it('is hidden without jobs.view', () => {
    mockGranted.add('jobs.run');
    render(<MoreView />);

    expect(screen.queryByText('Automations')).toBeNull();
    expect(screen.getByText('Plans')).toBeTruthy();
  });

  it('opens the automations route for jobs.view', () => {
    mockGranted.add('jobs.view');
    render(<MoreView />);
    fireEvent.press(screen.getByText('Automations'));

    expect(screen.getByText('ACT customer sync, run history and live view')).toBeTruthy();
    expect(mockPush).toHaveBeenCalledWith('/admin/automations');
  });

  it('is localized in Telugu', async () => {
    mockGranted.add('jobs.view');
    await act(async () => i18n.changeLanguage('te'));
    render(<MoreView />);

    expect(screen.getByText('ఆటోమేషన్లు')).toBeTruthy();
    expect(screen.getByText('ACT కస్టమర్ సింక్, రన్ చరిత్ర మరియు లైవ్ వ్యూ')).toBeTruthy();
    expect(screen.queryByText('Automations')).toBeNull();
  });
});

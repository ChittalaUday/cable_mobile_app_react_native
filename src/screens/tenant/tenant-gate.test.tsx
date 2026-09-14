import AppLayout from '@/app/(app)/_layout';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';
import { render, screen } from '@/lib/test-utils';

jest.mock('@/lib/auth/utils', () => ({
  getTenantId: jest.fn(),
  getToken: jest.fn(),
  removeTenantId: jest.fn(),
  removeToken: jest.fn(),
  setTenantId: jest.fn(),
  setToken: jest.fn(),
}));

jest.mock('expo-router', () => {
  const { Text } = require('react-native');
  return {
    Redirect: () => null,
    router: { replace: jest.fn() },
    // Standing in for the navigator: if the layout stops rendering one, the
    // group has no screen for `(auth)`'s sign-in redirect to land on, and the
    // app shows a blank page instead of the picker.
    Stack: () => <Text>navigator</Text>,
  };
});

const membership = (tenantId: string, tenantName: string, roleId: string) => ({ tenantId, tenantName, roleId });

function signedIn(memberships: ReturnType<typeof membership>[], tenantId: string | null) {
  useAuthStore.setState({ status: 'signIn', error: null, memberships, tenantId, user: null });
}

describe('the tenant gate', () => {
  it('keeps the navigator mounted under the picker', () => {
    signedIn([membership('a', 'Alpha Cable', 'admin'), membership('b', 'Beta Cable', 'staff')], null);

    render(<AppLayout />);

    screen.getByText('navigator');
    screen.getByText('Alpha Cable');
  });

  it('shows no picker once a tenant is chosen', () => {
    signedIn([membership('a', 'Alpha Cable', 'admin'), membership('b', 'Beta Cable', 'staff')], 'a');

    render(<AppLayout />);

    screen.getByText('navigator');
    expect(screen.queryByText('Choose a network')).toBeNull();
  });

  it('never asks when there is only one membership', () => {
    signedIn([membership('a', 'Alpha Cable', 'admin')], 'a');

    render(<AppLayout />);

    expect(screen.queryByText('Choose a network')).toBeNull();
  });

  it('says so rather than dropping a member of nothing into the subscriber app', () => {
    // A null role reads as `customer` downstream, so without this gate an admin
    // whose memberships failed to arrive lands silently in the customer app —
    // the screen looks fine and is simply the wrong one.
    signedIn([], null);

    render(<AppLayout />);

    screen.getByText('No network yet');
  });
});

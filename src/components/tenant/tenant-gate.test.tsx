import RootIndex from '@/app/index';
import { SelectTenantScreen } from '@/components/tenant/tenant-picker';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';
import { render, screen } from '@/lib/test-utils';

const mockRedirect = jest.fn();

jest.mock('@/lib/auth/utils', () => ({
  getTenantId: jest.fn(),
  getToken: jest.fn(),
  removeTenantId: jest.fn(),
  removeToken: jest.fn(),
  setTenantId: jest.fn(),
  setToken: jest.fn(),
}));

jest.mock('expo-router', () => {
  return {
    Redirect: (props: { href: string }) => {
      mockRedirect(props.href);
      return null;
    },
    router: { replace: jest.fn() },
    Stack: () => null,
  };
});

const membership = (tenantId: string, tenantName: string, roleId: string) => ({ tenantId, tenantName, roleId });

function signedIn(memberships: ReturnType<typeof membership>[], tenantId: string | null, role: 'admin' | 'staff' | 'customer' | 'super_admin' | null = null) {
  useAuthStore.setState({ status: 'signIn', error: null, memberships, tenantId, role, user: null });
}

describe('the tenant gate & selection', () => {
  beforeEach(() => {
    mockRedirect.mockClear();
  });

  it('renders tenant choices in SelectTenantScreen', () => {
    signedIn([membership('a', 'Alpha Cable', 'admin'), membership('b', 'Beta Cable', 'staff')], null);

    render(<SelectTenantScreen />);

    screen.getByText('Alpha Cable');
    screen.getByText('Beta Cable');
    screen.getByText('Choose a network');
  });

  it('says so rather than dropping a member of nothing into the subscriber app', () => {
    signedIn([], null);

    render(<SelectTenantScreen />);

    screen.getByText('No network yet');
  });

  it('redirects to /select-tenant when tenantId is null instead of defaulting to customer', () => {
    signedIn([membership('a', 'Alpha Cable', 'admin')], null);

    render(<RootIndex />);

    expect(mockRedirect).toHaveBeenCalledWith('/select-tenant');
  });

  it('redirects to /admin when admin tenant is selected', () => {
    signedIn([membership('a', 'Alpha Cable', 'admin')], 'a', 'admin');

    render(<RootIndex />);

    expect(mockRedirect).toHaveBeenCalledWith('/admin');
  });

  it('redirects to /staff when staff tenant is selected', () => {
    signedIn([membership('b', 'Beta Cable', 'staff')], 'b', 'staff');

    render(<RootIndex />);

    expect(mockRedirect).toHaveBeenCalledWith('/staff');
  });

  it('redirects to /customer when customer tenant is selected', () => {
    signedIn([membership('c', 'Cable Sub', 'customer')], 'c', 'customer');

    render(<RootIndex />);

    expect(mockRedirect).toHaveBeenCalledWith('/customer');
  });
});

import type { AppNotification } from '@/lib/hooks/api/use-notifications';
import {
  Alert02Icon,
  CheckmarkBadge02Icon,
  CloudSyncIcon,
  InvoiceIcon,
  LocationCheck02Icon,
  MoneyReceiveCircleIcon,
  MoneySendCircleIcon,
  PackageAddIcon,
  PackageProcessIcon,
  PackageReceiveIcon,
  PlayCircleIcon,
  Refresh01Icon,
  RepeatIcon,
  UserAdd01Icon,
  UserEdit01Icon,
  UserRemove01Icon,
  WifiConnected01Icon,
  WifiOff01Icon,
} from '@hugeicons/core-free-icons';
import * as React from 'react';
import { TINT } from '@/components/common/shell';
import { NotificationsScreen } from '@/components/notifications/notifications-screen';
import { fireEvent, render, screen } from '@/lib/test-utils';

const mockPush = jest.fn();
const mockMarkRead = jest.fn();
const mockMarkAllRead = jest.fn();
let mockRole: 'admin' | 'super_admin' | 'staff' | 'customer' | null = 'admin';
let mockItems: AppNotification[] = [];

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }) }));
jest.mock('@/components/ui/modal', () => ({
  Modal: ({ children }: { children: React.ReactNode }) => children,
  useModal: () => ({ ref: { current: null }, present: jest.fn(), dismiss: jest.fn() }),
}));
jest.mock('@/lib/hooks/stores/use-auth-store', () => ({
  useAuthStore: { use: { role: () => mockRole } },
}));
jest.mock('@/lib/hooks/api/use-notifications', () => ({
  useNotifications: () => ({
    data: { items: mockItems, total: mockItems.length, page: 1, limit: 50 },
    isPending: false,
    isError: false,
    isRefetching: false,
    refetch: jest.fn(),
  }),
  useUnreadCount: () => ({
    data: {
      total: mockItems.filter(item => item.readAt === null).length,
      byCategory: {},
    },
    refetch: jest.fn(),
  }),
  useMarkRead: () => ({ mutate: mockMarkRead }),
  useMarkAllRead: () => ({ mutate: mockMarkAllRead }),
}));

function notification(type: string, category: AppNotification['category'] = 'activity', overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: `notification-${type}`,
    category,
    delivery: 'in_app',
    channel: 'in_app',
    type,
    title: `Title for ${type}`,
    body: `Body for ${type}`,
    data: { customerId: 'customer-1', collectionId: 'collection-1', visitId: 'visit-1', runId: 'run-1' },
    imageUrl: null,
    status: 'sent',
    readAt: null,
    createdAt: '2026-10-13T12:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  mockRole = 'admin';
  mockItems = [];
  mockPush.mockReset();
  mockMarkRead.mockReset();
  mockMarkAllRead.mockReset();
});

const TYPES = [
  ['payment.recorded', 'billing', MoneyReceiveCircleIcon, 'green', '/admin/receipts/collection-1'],
  ['payment.refunded', 'billing', MoneySendCircleIcon, 'red', '/admin/receipts/collection-1'],
  ['payment.marked_due', 'activity', InvoiceIcon, 'orange', '/admin/receipts/collection-1'],
  ['visit.marked', 'activity', LocationCheck02Icon, 'blue', '/admin/customers/customer-1?tab=timeline'],
  ['complaint.fixed', 'activity', CheckmarkBadge02Icon, 'green', '/admin/customers/customer-1?tab=timeline'],
  ['customer.created', 'activity', UserAdd01Icon, 'orange', '/admin/customers/customer-1'],
  ['customer.updated', 'activity', UserEdit01Icon, 'orange', '/admin/customers/customer-1'],
  ['customer.deactivated', 'activity', UserRemove01Icon, 'orange', '/admin/customers/customer-1'],
  ['subscription.created', 'activity', PackageAddIcon, 'orange', '/admin/customers/customer-1'],
  ['subscription.plan_changed', 'activity', PackageProcessIcon, 'orange', '/admin/customers/customer-1'],
  ['subscription.suspended', 'activity', WifiOff01Icon, 'orange', '/admin/customers/customer-1'],
  ['subscription.resumed', 'activity', WifiConnected01Icon, 'orange', '/admin/customers/customer-1'],
  ['equipment.issued', 'activity', PackageAddIcon, 'orange', '/admin/customers/customer-1'],
  ['equipment.returned', 'activity', PackageReceiveIcon, 'orange', '/admin/customers/customer-1'],
  ['equipment.replaced', 'activity', PackageProcessIcon, 'orange', '/admin/customers/customer-1'],
  ['box_activated', 'activation', PlayCircleIcon, 'green', '/admin/customers/customer-1'],
  ['box_renewed', 'renewal', RepeatIcon, 'orange', '/admin/customers/customer-1'],
  ['box_refreshed', 'refresh', Refresh01Icon, 'blue', '/admin/customers/customer-1'],
  ['data_synced', 'sync', CloudSyncIcon, 'purple', '/admin/automations'],
  ['payment.automation_stopped', 'alert', Alert02Icon, 'red', '/admin/receipts/collection-1'],
  ['error.job', 'alert', Alert02Icon, 'red', '/admin/automations/run-1'],
] as const;

describe('notification type presentation', () => {
  it.each(TYPES)('renders and opens %s with its own icon, tint and message', (type, category, icon, tint, route) => {
    mockItems = [notification(type, category)];

    const view = render(<NotificationsScreen />);

    expect(screen.getByText(`Title for ${type}`)).toBeTruthy();
    expect(screen.getByText(`Body for ${type}`)).toBeTruthy();
    expect(view.UNSAFE_getAllByProps({ icon, color: TINT[tint].fg }).length).toBeGreaterThan(0);
    fireEvent.press(screen.getByText(`Title for ${type}`));
    expect(mockPush).toHaveBeenCalledWith(route);
  });
});

describe('notification access and navigation', () => {
  it('keeps activity notifications and their filter out of staff and customer inboxes', () => {
    mockRole = 'staff';
    mockItems = [
      notification('visit.marked'),
      notification('general.notice', 'general', { title: 'General notice' }),
    ];

    render(<NotificationsScreen />);

    expect(screen.queryByText('Title for visit.marked')).toBeNull();
    expect(screen.getByText('General notice')).toBeTruthy();
    expect(screen.queryByText('Staff activity')).toBeNull();
  });

  it('opens a read payment notification without trying to mark it again', () => {
    mockItems = [notification('payment.recorded', 'billing', { readAt: '2026-10-13T12:05:00.000Z' })];
    render(<NotificationsScreen />);

    fireEvent.press(screen.getByText('Title for payment.recorded'));

    expect(mockPush).toHaveBeenCalledWith('/admin/receipts/collection-1');
    expect(mockMarkRead).not.toHaveBeenCalled();
  });

  it('marks an unread visit and opens that customer on the timeline tab', () => {
    mockItems = [notification('visit.marked')];
    render(<NotificationsScreen />);

    fireEvent.press(screen.getByText('Title for visit.marked'));

    expect(mockMarkRead).toHaveBeenCalledWith({ id: 'notification-visit.marked' });
    expect(mockPush).toHaveBeenCalledWith('/admin/customers/customer-1?tab=timeline');
  });
});

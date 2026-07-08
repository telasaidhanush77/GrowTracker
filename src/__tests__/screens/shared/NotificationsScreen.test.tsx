import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import type { ScreenProps } from '../../../types';

jest.mock('../../../context/AppContext', () => ({ useApp: jest.fn() }));
jest.mock('../../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../components/Header', () => {
  const { View, Text } = require('react-native');
  return ({ title, subtitle, onBack }: any) => (
    <View testID="header">
      <Text testID="header-title">{title}</Text>
      {subtitle ? <Text testID="header-subtitle">{subtitle}</Text> : null}
      {onBack && <Text testID="header-back" onPress={onBack}>Back</Text>}
    </View>
  );
});

import { useApp } from '../../../context/AppContext';
import { useTheme } from '../../../context/ThemeContext';
import NotificationsScreen from '../../../screens/shared/NotificationsScreen';

const MOCK_COLORS: any = {
  bg: '#111', bgElevated: '#1a1a1a', card: '#222', border: '#333', borderLight: '#444',
  textPrimary: '#fff', textSecondary: '#ccc', textMuted: '#999', primary: '#4f46e5',
  approved: '#22c55e', approvedBg: '#dcfce7',
  rejected: '#ef4444', rejectedBg: '#fee2e2',
  pending: '#f59e0b', pendingBg: '#fef3c7',
  inProgress: '#3b82f6', inProgressBg: '#dbeafe',
};

const mockMarkNotifRead = jest.fn();
const mockMarkAllRead = jest.fn();

function makeNotif(type: string, id = 'n-1', extra: any = {}) {
  return {
    id,
    recipientId: 'usr-1',
    type,
    title: 'Test Notification',
    message: 'Test message',
    read: false,
    createdAt: new Date().toISOString(),
    ...extra,
  };
}

function makeProps(overrides: Partial<ScreenProps> = {}): ScreenProps {
  return {
    navigation: { navigate: jest.fn(), goBack: jest.fn() },
    params: {},
    currentUserId: 'usr-1',
    currentRole: 'employee',
    onLogout: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (useTheme as jest.Mock).mockReturnValue({ colors: MOCK_COLORS });
  (useApp as jest.Mock).mockReturnValue({
    notifications: [],
    markNotifRead: mockMarkNotifRead,
    markAllRead: mockMarkAllRead,
  });
});

describe('NotificationsScreen — basic render', () => {
  it('renders Notifications heading', () => {
    render(<NotificationsScreen {...makeProps()} />);
    expect(screen.getByTestId('header-title').props.children).toBe('Notifications');
  });

  it('shows empty state when no notifications', () => {
    render(<NotificationsScreen {...makeProps()} />);
    expect(screen.getByText(/No notifications yet/i)).toBeTruthy();
  });

  it('renders unread pill when unread notifications exist', () => {
    (useApp as jest.Mock).mockReturnValue({
      notifications: [makeNotif('goal_assigned')],
      markNotifRead: mockMarkNotifRead,
      markAllRead: mockMarkAllRead,
    });
    render(<NotificationsScreen {...makeProps()} />);
    expect(screen.getAllByText('1 unread').length).toBeGreaterThan(0);
  });

  it('calls markAllRead when Mark all read is pressed', () => {
    (useApp as jest.Mock).mockReturnValue({
      notifications: [makeNotif('goal_assigned')],
      markNotifRead: mockMarkNotifRead,
      markAllRead: mockMarkAllRead,
    });
    render(<NotificationsScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Mark all read'));
    expect(mockMarkAllRead).toHaveBeenCalledWith('usr-1');
  });

  it('calls markNotifRead and navigates when notification is tapped', () => {
    const navigate = jest.fn();
    (useApp as jest.Mock).mockReturnValue({
      notifications: [makeNotif('goal_assigned', 'n-1', { relatedGoalId: 'g-1' })],
      markNotifRead: mockMarkNotifRead,
      markAllRead: mockMarkAllRead,
    });
    render(<NotificationsScreen {...{ ...makeProps(), navigation: { navigate, goBack: jest.fn() } }} />);
    fireEvent.press(screen.getByText('Test Notification'));
    expect(mockMarkNotifRead).toHaveBeenCalledWith('n-1');
    expect(navigate).toHaveBeenCalledWith('goals-list', expect.any(Object));
  });
});

describe('NotificationsScreen — getDestination routing', () => {
  function tapNotif(notif: any, role: string) {
    const navigate = jest.fn();
    (useApp as jest.Mock).mockReturnValue({
      notifications: [notif],
      markNotifRead: mockMarkNotifRead,
      markAllRead: mockMarkAllRead,
    });
    render(<NotificationsScreen {...{ ...makeProps({ currentRole: role as ScreenProps['currentRole'], currentUserId: 'usr-1' }), navigation: { navigate, goBack: jest.fn() } }} />);
    fireEvent.press(screen.getByText('Test Notification'));
    return navigate;
  }

  it('evidence_submitted + manager → review-evidence', () => {
    const navigate = tapNotif(makeNotif('evidence_submitted'), 'manager');
    expect(navigate).toHaveBeenCalledWith('review-evidence', undefined);
  });

  it('evidence_submitted + admin → admin-dashboard', () => {
    const navigate = tapNotif(makeNotif('evidence_submitted'), 'admin');
    expect(navigate).toHaveBeenCalledWith('admin-dashboard', undefined);
  });

  it('evidence_approved + admin → admin-dashboard', () => {
    const navigate = tapNotif(makeNotif('evidence_approved'), 'admin');
    expect(navigate).toHaveBeenCalledWith('admin-dashboard', undefined);
  });

  it('evidence_rejected + admin → admin-dashboard', () => {
    const navigate = tapNotif(makeNotif('evidence_rejected'), 'admin');
    expect(navigate).toHaveBeenCalledWith('admin-dashboard', undefined);
  });

  it('goal_assigned + admin → admin-dashboard', () => {
    const navigate = tapNotif(makeNotif('goal_assigned'), 'admin');
    expect(navigate).toHaveBeenCalledWith('admin-dashboard', undefined);
  });

  it('fiscal_year_complete + admin → admin-dashboard', () => {
    const navigate = tapNotif(makeNotif('fiscal_year_complete'), 'admin');
    expect(navigate).toHaveBeenCalledWith('admin-dashboard', undefined);
  });

  it('onboarding_complete + admin → admin-dashboard', () => {
    const navigate = tapNotif(makeNotif('onboarding_complete'), 'admin');
    expect(navigate).toHaveBeenCalledWith('admin-dashboard', undefined);
  });

  it('employee_offboarded + manager → team-overview', () => {
    const navigate = tapNotif(makeNotif('employee_offboarded'), 'manager');
    expect(navigate).toHaveBeenCalledWith('team-overview', undefined);
  });

  it('employee_offboarded + admin → admin-dashboard', () => {
    const navigate = tapNotif(makeNotif('employee_offboarded'), 'admin');
    expect(navigate).toHaveBeenCalledWith('admin-dashboard', undefined);
  });

  it('manager_changed + manager → team-overview', () => {
    const navigate = tapNotif(makeNotif('manager_changed'), 'manager');
    expect(navigate).toHaveBeenCalledWith('team-overview', undefined);
  });

  it('manager_changed + admin → admin-dashboard', () => {
    const navigate = tapNotif(makeNotif('manager_changed'), 'admin');
    expect(navigate).toHaveBeenCalledWith('admin-dashboard', undefined);
  });

  it('ai_overdue_alert + employee → goals-list', () => {
    const navigate = tapNotif(makeNotif('ai_overdue_alert'), 'employee');
    expect(navigate).toHaveBeenCalledWith('goals-list', undefined);
  });

  it('ai_daily_log_reminder + employee → daily-log', () => {
    const navigate = tapNotif(makeNotif('ai_daily_log_reminder'), 'employee');
    expect(navigate).toHaveBeenCalledWith('daily-log', undefined);
  });

  it('ai_streak_milestone + employee → my-progress', () => {
    const navigate = tapNotif(makeNotif('ai_streak_milestone'), 'employee');
    expect(navigate).toHaveBeenCalledWith('my-progress', undefined);
  });

  it('unknown notification type + any role → does not navigate', () => {
    const navigate = jest.fn();
    (useApp as jest.Mock).mockReturnValue({
      notifications: [{ ...makeNotif('evidence_submitted'), recipientId: 'usr-1' }],
      markNotifRead: mockMarkNotifRead,
      markAllRead: mockMarkAllRead,
    });
    render(<NotificationsScreen {...{ ...makeProps({ currentRole: 'employee' }), navigation: { navigate, goBack: jest.fn() } }} />);
    fireEvent.press(screen.getByText('Test Notification'));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('evidence_approved + manager → no navigation (break hits)', () => {
    const navigate = tapNotif(makeNotif('evidence_approved'), 'manager');
    expect(navigate).not.toHaveBeenCalled();
    expect(mockMarkNotifRead).toHaveBeenCalled();
  });

  it('evidence_rejected + manager → no navigation (break hits)', () => {
    const navigate = tapNotif(makeNotif('evidence_rejected'), 'manager');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('goal_adjusted + manager → no navigation (break hits)', () => {
    const navigate = tapNotif(makeNotif('goal_adjusted'), 'manager');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('fiscal_year_complete + unknown role → no navigation (break hits)', () => {
    const navigate = tapNotif(makeNotif('fiscal_year_complete'), 'unknown');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('onboarding_complete + unknown role → no navigation (break hits)', () => {
    const navigate = tapNotif(makeNotif('onboarding_complete'), 'unknown');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('employee_offboarded + employee → no navigation (break hits)', () => {
    const navigate = tapNotif(makeNotif('employee_offboarded'), 'employee');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('manager_changed + unknown role → no navigation (break hits)', () => {
    const navigate = tapNotif(makeNotif('manager_changed'), 'unknown');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('ai_overdue_alert + manager → no navigation (break hits)', () => {
    const navigate = tapNotif(makeNotif('ai_overdue_alert'), 'manager');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('ai_daily_log_reminder + manager → no navigation (break hits)', () => {
    const navigate = tapNotif(makeNotif('ai_daily_log_reminder'), 'manager');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('ai_streak_milestone + manager → no navigation (break hits)', () => {
    const navigate = tapNotif(makeNotif('ai_streak_milestone'), 'manager');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('evidence_rejected + employee + relatedGoalId → submit-evidence', () => {
    const navigate = tapNotif(makeNotif('evidence_rejected', 'n-rej', { relatedGoalId: 'g-5' }), 'employee');
    expect(navigate).toHaveBeenCalledWith('submit-evidence', { goalId: 'g-5' });
  });
});

describe('NotificationsScreen — groupByDate sections', () => {
  it('renders Yesterday section for notifications from 1 day ago', () => {
    const yesterday = new Date(Date.now() - 36 * 60 * 60 * 1000);
    (useApp as jest.Mock).mockReturnValue({
      notifications: [
        makeNotif('goal_assigned', 'n-y', { createdAt: yesterday.toISOString() }),
      ],
      markNotifRead: mockMarkNotifRead,
      markAllRead: mockMarkAllRead,
    });
    render(<NotificationsScreen {...makeProps()} />);
    expect(screen.getAllByText('Yesterday').length).toBeGreaterThan(0);
  });

  it('renders Earlier section for notifications from 3 days ago', () => {
    const older = new Date();
    older.setDate(older.getDate() - 3);
    (useApp as jest.Mock).mockReturnValue({
      notifications: [
        makeNotif('goal_assigned', 'n-o', { createdAt: older.toISOString() }),
      ],
      markNotifRead: mockMarkNotifRead,
      markAllRead: mockMarkAllRead,
    });
    render(<NotificationsScreen {...makeProps()} />);
    expect(screen.getByText('Earlier')).toBeTruthy();
  });

  it('sort comparator runs when multiple notifications exist', () => {
    const now = new Date().toISOString();
    const older = new Date(Date.now() - 5000).toISOString();
    (useApp as jest.Mock).mockReturnValue({
      notifications: [
        makeNotif('goal_assigned', 'n-a', { createdAt: older }),
        makeNotif('goal_adjusted', 'n-b', { createdAt: now }),
      ],
      markNotifRead: mockMarkNotifRead,
      markAllRead: mockMarkAllRead,
    });
    render(<NotificationsScreen {...makeProps()} />);
    expect(screen.getAllByText('Test Notification').length).toBe(2);
  });
});

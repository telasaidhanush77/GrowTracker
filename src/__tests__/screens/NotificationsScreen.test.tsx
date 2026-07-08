import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import type { Notification, Role } from '../../types';

// ── mocks ──────────────────────────────────────────────────────

jest.mock('../../context/AppContext', () => ({ useApp: jest.fn() }));
jest.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../components/Header', () => {
  const { View, Text } = require('react-native');
  return ({ title }: any) => (
    <View testID="header">
      <Text>{title}</Text>
    </View>
  );
});

import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import NotificationsScreen from '../../screens/shared/NotificationsScreen';

const mockUseApp = useApp as jest.MockedFunction<typeof useApp>;
const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

// ── fixtures ───────────────────────────────────────────────────

const MOCK_COLORS: any = {
  bg: '#fff', bgElevated: '#f5f5f5', card: '#fafafa', border: '#e0e0e0',
  divider: '#eee', textPrimary: '#000', textSecondary: '#666', textMuted: '#999',
  employeePrimary: '#4f46e5', approved: '#22c55e', approvedBg: '#dcfce7',
  rejected: '#ef4444', pending: '#f59e0b',
};

function makeNotif(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notif-1',
    recipientId: 'emp-1',
    type: 'goal_assigned',
    title: 'New Goal Assigned',
    message: 'You have a new goal',
    read: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const MOCK_MARK_READ = jest.fn();
const MOCK_MARK_ALL_READ = jest.fn();
const MOCK_NAVIGATE = jest.fn();
const MOCK_GO_BACK = jest.fn();

const BASE_PROPS: any = {
  navigation: { navigate: MOCK_NAVIGATE, goBack: MOCK_GO_BACK },
  params: {},
  currentUserId: 'emp-1',
  currentRole: 'employee' as Role,
  onLogout: jest.fn(),
};

function setupMocks(notifications: Notification[]) {
  mockUseApp.mockReturnValue({
    notifications,
    markNotifRead: MOCK_MARK_READ,
    markAllRead: MOCK_MARK_ALL_READ,
    employees: [],
    goals: [],
    dailyLogs: [],
    emailExists: jest.fn(),
    addEmployee: jest.fn(),
    updateEmployee: jest.fn(),
    addGoal: jest.fn(),
    updateGoal: jest.fn(),
    deleteGoal: jest.fn(),
    submitEvidence: jest.fn(),
    reviewEvidence: jest.fn(),
    addNotification: jest.fn(),
    closeFiscalYear: jest.fn(),
    saveDailyLog: jest.fn(),
    removeEmployee: jest.fn(),
  } as any);

  mockUseTheme.mockReturnValue({ colors: MOCK_COLORS, isDark: false, toggleTheme: jest.fn() });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-06-19T12:00:00Z').getTime());
});

afterEach(() => {
  jest.useRealTimers();
});

// ── empty state ────────────────────────────────────────────────

describe('NotificationsScreen — empty state', () => {
  it('shows empty state when there are no notifications', () => {
    setupMocks([]);
    render(<NotificationsScreen {...BASE_PROPS} />);

    expect(screen.getByText(/No notifications/i)).toBeTruthy();
  });

  it('shows empty state when current user has no notifications', () => {
    // Notifications for a different user — should not appear
    const otherUserNotif = makeNotif({ recipientId: 'emp-2' });
    setupMocks([otherUserNotif]);
    render(<NotificationsScreen {...BASE_PROPS} />);

    expect(screen.getByText(/No notifications/i)).toBeTruthy();
  });
});

// ── notification rendering ─────────────────────────────────────

describe('NotificationsScreen — notification rendering', () => {
  it('renders the notification title', () => {
    setupMocks([makeNotif({ title: 'Goal Set' })]);
    render(<NotificationsScreen {...BASE_PROPS} />);

    expect(screen.getByText('Goal Set')).toBeTruthy();
  });

  it('renders the notification message', () => {
    setupMocks([makeNotif({ message: 'You have been assigned a new goal.' })]);
    render(<NotificationsScreen {...BASE_PROPS} />);

    expect(screen.getByText('You have been assigned a new goal.')).toBeTruthy();
  });

  it('renders a "Today" section header for a notification from today', () => {
    const todayNotif = makeNotif({ createdAt: new Date('2026-06-19T10:00:00Z').toISOString() });
    setupMocks([todayNotif]);
    render(<NotificationsScreen {...BASE_PROPS} />);

    expect(screen.getByText('Today')).toBeTruthy();
  });

  it('renders a "Yesterday" section header for a notification from yesterday', () => {
    const yesterdayNotif = makeNotif({
      createdAt: new Date('2026-06-18T10:00:00Z').toISOString(),
    });
    setupMocks([yesterdayNotif]);
    render(<NotificationsScreen {...BASE_PROPS} />);

    // Section header + timeAgo timestamp both render "Yesterday" — pick the first
    expect(screen.getAllByText('Yesterday')[0]).toBeTruthy();
  });

  it('renders an "Earlier" section header for notifications older than 2 days', () => {
    const oldNotif = makeNotif({
      createdAt: new Date('2026-06-01T10:00:00Z').toISOString(),
    });
    setupMocks([oldNotif]);
    render(<NotificationsScreen {...BASE_PROPS} />);

    expect(screen.getByText('Earlier')).toBeTruthy();
  });

  it('renders multiple notifications for the same user', () => {
    const notifs = [
      makeNotif({ id: 'n1', title: 'First' }),
      makeNotif({ id: 'n2', title: 'Second' }),
    ];
    setupMocks(notifs);
    render(<NotificationsScreen {...BASE_PROPS} />);

    expect(screen.getByText('First')).toBeTruthy();
    expect(screen.getByText('Second')).toBeTruthy();
  });
});

// ── mark all read button ───────────────────────────────────────

describe('NotificationsScreen — mark all read', () => {
  it('shows "Mark all read" button when there are unread notifications', () => {
    setupMocks([makeNotif({ read: false })]);
    render(<NotificationsScreen {...BASE_PROPS} />);

    expect(screen.getByText(/Mark all read/i)).toBeTruthy();
  });

  it('does not show "Mark all read" button when all notifications are read', () => {
    setupMocks([makeNotif({ read: true })]);
    render(<NotificationsScreen {...BASE_PROPS} />);

    expect(screen.queryByText(/Mark all read/i)).toBeNull();
  });

  it('calls markAllRead with currentUserId when button is pressed', () => {
    setupMocks([makeNotif({ read: false })]);
    render(<NotificationsScreen {...BASE_PROPS} />);

    fireEvent.press(screen.getByText(/Mark all read/i));
    expect(MOCK_MARK_ALL_READ).toHaveBeenCalledWith('emp-1');
  });

  it('shows unread count badge', () => {
    const notifs = [
      makeNotif({ id: 'n1', read: false }),
      makeNotif({ id: 'n2', read: false }),
      makeNotif({ id: 'n3', read: true }),
    ];
    setupMocks(notifs);
    render(<NotificationsScreen {...BASE_PROPS} />);

    // The screen shows unread count in the toolbar
    expect(screen.getByText('2 unread')).toBeTruthy();
  });
});

// ── notification tap → markNotifRead ──────────────────────────

describe('NotificationsScreen — marking individual notification read', () => {
  it('calls markNotifRead when a notification is tapped', () => {
    setupMocks([makeNotif({ id: 'notif-1', title: 'New Goal Assigned' })]);
    render(<NotificationsScreen {...BASE_PROPS} />);

    fireEvent.press(screen.getByText('New Goal Assigned'));
    expect(MOCK_MARK_READ).toHaveBeenCalledWith('notif-1');
  });
});

// ── navigation on notification tap (getDestination logic) ─────

describe('NotificationsScreen — navigation on tap', () => {
  it('navigates manager to review-evidence on evidence_submitted', () => {
    const managerProps = { ...BASE_PROPS, currentRole: 'manager' as Role };
    setupMocks([makeNotif({ type: 'evidence_submitted', title: 'Review Needed' })]);
    render(<NotificationsScreen {...managerProps} />);

    fireEvent.press(screen.getByText('Review Needed'));
    expect(MOCK_NAVIGATE).toHaveBeenCalledWith('review-evidence', undefined);
  });

  it('navigates employee to goals-list on evidence_approved', () => {
    setupMocks([makeNotif({ type: 'evidence_approved', title: 'Evidence Approved' })]);
    render(<NotificationsScreen {...BASE_PROPS} />);

    fireEvent.press(screen.getByText('Evidence Approved'));
    expect(MOCK_NAVIGATE).toHaveBeenCalledWith('goals-list', undefined);
  });

  it('navigates employee to submit-evidence on evidence_rejected with goalId', () => {
    setupMocks([makeNotif({
      type: 'evidence_rejected',
      title: 'Evidence Rejected',
      relatedGoalId: 'goal-42',
    })]);
    render(<NotificationsScreen {...BASE_PROPS} />);

    fireEvent.press(screen.getByText('Evidence Rejected'));
    expect(MOCK_NAVIGATE).toHaveBeenCalledWith(
      'submit-evidence',
      { goalId: 'goal-42' },
    );
  });

  it('navigates employee to goals-list on evidence_rejected without goalId', () => {
    setupMocks([makeNotif({ type: 'evidence_rejected', title: 'Evidence Rejected' })]);
    render(<NotificationsScreen {...BASE_PROPS} />);

    fireEvent.press(screen.getByText('Evidence Rejected'));
    expect(MOCK_NAVIGATE).toHaveBeenCalledWith('goals-list', undefined);
  });

  it('navigates employee to goals-list on goal_assigned', () => {
    // relatedGoalId present triggers the { filterStatus: 'not_started' } branch
    setupMocks([makeNotif({ type: 'goal_assigned', title: 'Goal Assigned', relatedGoalId: 'goal-1' })]);
    render(<NotificationsScreen {...BASE_PROPS} />);

    // Title and type-pill label both say "Goal Assigned" — press the first (the title)
    fireEvent.press(screen.getAllByText('Goal Assigned')[0]);
    expect(MOCK_NAVIGATE).toHaveBeenCalledWith('goals-list', { filterStatus: 'not_started' });
  });

  it('navigates employee to goals-list on fiscal_year_complete', () => {
    setupMocks([makeNotif({ type: 'fiscal_year_complete', title: 'FY Complete' })]);
    render(<NotificationsScreen {...BASE_PROPS} />);

    // Title and type-pill label both say "FY Complete"
    fireEvent.press(screen.getAllByText('FY Complete')[0]);
    expect(MOCK_NAVIGATE).toHaveBeenCalledWith('goals-list', undefined);
  });

  it('navigates manager to team-overview on fiscal_year_complete', () => {
    const managerProps = { ...BASE_PROPS, currentRole: 'manager' as Role };
    setupMocks([makeNotif({ type: 'fiscal_year_complete', title: 'FY Complete' })]);
    render(<NotificationsScreen {...managerProps} />);

    fireEvent.press(screen.getAllByText('FY Complete')[0]);
    expect(MOCK_NAVIGATE).toHaveBeenCalledWith('team-overview', undefined);
  });

  it('does not navigate when there is no destination for the notification type + role combo', () => {
    // evidence_submitted for an employee has no destination
    setupMocks([makeNotif({ type: 'evidence_submitted', title: 'Evidence Sub' })]);
    render(<NotificationsScreen {...BASE_PROPS} />);

    fireEvent.press(screen.getByText('Evidence Sub'));
    expect(MOCK_NAVIGATE).not.toHaveBeenCalled();
  });

  it('navigates admin to admin-dashboard on evidence_approved', () => {
    const adminProps = { ...BASE_PROPS, currentRole: 'admin' as Role };
    setupMocks([makeNotif({ type: 'evidence_approved', title: 'Approved Admin' })]);
    render(<NotificationsScreen {...adminProps} />);
    fireEvent.press(screen.getByText('Approved Admin'));
    expect(MOCK_NAVIGATE).toHaveBeenCalledWith('admin-dashboard', undefined);
  });

  it('navigates admin to admin-dashboard on evidence_rejected', () => {
    const adminProps = { ...BASE_PROPS, currentRole: 'admin' as Role };
    setupMocks([makeNotif({ type: 'evidence_rejected', title: 'Rejected Admin' })]);
    render(<NotificationsScreen {...adminProps} />);
    fireEvent.press(screen.getByText('Rejected Admin'));
    expect(MOCK_NAVIGATE).toHaveBeenCalledWith('admin-dashboard', undefined);
  });

  it('navigates admin to admin-dashboard on goal_assigned', () => {
    const adminProps = { ...BASE_PROPS, currentRole: 'admin' as Role };
    setupMocks([makeNotif({ type: 'goal_assigned', title: 'Goal Admin' })]);
    render(<NotificationsScreen {...adminProps} />);
    fireEvent.press(screen.getAllByText('Goal Admin')[0]);
    expect(MOCK_NAVIGATE).toHaveBeenCalledWith('admin-dashboard', undefined);
  });

  it('navigates admin to admin-dashboard on fiscal_year_complete', () => {
    const adminProps = { ...BASE_PROPS, currentRole: 'admin' as Role };
    setupMocks([makeNotif({ type: 'fiscal_year_complete', title: 'FY Admin' })]);
    render(<NotificationsScreen {...adminProps} />);
    fireEvent.press(screen.getAllByText('FY Admin')[0]);
    expect(MOCK_NAVIGATE).toHaveBeenCalledWith('admin-dashboard', undefined);
  });

  it('navigates employee to employee-dashboard on onboarding_complete', () => {
    setupMocks([makeNotif({ type: 'onboarding_complete', title: 'Onboarding Done' })]);
    render(<NotificationsScreen {...BASE_PROPS} />);
    fireEvent.press(screen.getByText('Onboarding Done'));
    expect(MOCK_NAVIGATE).toHaveBeenCalledWith('employee-dashboard', undefined);
  });

  it('navigates manager to team-overview on onboarding_complete', () => {
    const managerProps = { ...BASE_PROPS, currentRole: 'manager' as Role };
    setupMocks([makeNotif({ type: 'onboarding_complete', title: 'Onboarding Mgr' })]);
    render(<NotificationsScreen {...managerProps} />);
    fireEvent.press(screen.getByText('Onboarding Mgr'));
    expect(MOCK_NAVIGATE).toHaveBeenCalledWith('team-overview', undefined);
  });

  it('navigates manager to team-overview on employee_offboarded', () => {
    const managerProps = { ...BASE_PROPS, currentRole: 'manager' as Role };
    setupMocks([makeNotif({ type: 'employee_offboarded', title: 'Offboarded Mgr' })]);
    render(<NotificationsScreen {...managerProps} />);
    fireEvent.press(screen.getByText('Offboarded Mgr'));
    expect(MOCK_NAVIGATE).toHaveBeenCalledWith('team-overview', undefined);
  });

  it('navigates employee to profile on manager_changed', () => {
    setupMocks([makeNotif({ type: 'manager_changed', title: 'Manager Changed' })]);
    render(<NotificationsScreen {...BASE_PROPS} />);
    fireEvent.press(screen.getByText('Manager Changed'));
    expect(MOCK_NAVIGATE).toHaveBeenCalledWith('profile', undefined);
  });

  it('navigates manager to team-overview on manager_changed', () => {
    const managerProps = { ...BASE_PROPS, currentRole: 'manager' as Role };
    setupMocks([makeNotif({ type: 'manager_changed', title: 'Manager Changed Mgr' })]);
    render(<NotificationsScreen {...managerProps} />);
    fireEvent.press(screen.getByText('Manager Changed Mgr'));
    expect(MOCK_NAVIGATE).toHaveBeenCalledWith('team-overview', undefined);
  });

  it('navigates employee to goals-list on ai_overdue_alert', () => {
    setupMocks([makeNotif({ type: 'ai_overdue_alert', title: 'Overdue Alert' })]);
    render(<NotificationsScreen {...BASE_PROPS} />);
    fireEvent.press(screen.getAllByText('Overdue Alert')[0]);
    expect(MOCK_NAVIGATE).toHaveBeenCalledWith('goals-list', undefined);
  });

  it('navigates employee to goals-list on ai_deadline_warning', () => {
    setupMocks([makeNotif({ type: 'ai_deadline_warning', title: 'Deadline Warning' })]);
    render(<NotificationsScreen {...BASE_PROPS} />);
    fireEvent.press(screen.getAllByText('Deadline Warning')[0]);
    expect(MOCK_NAVIGATE).toHaveBeenCalledWith('goals-list', undefined);
  });

  it('navigates employee to daily-log on ai_daily_log_reminder', () => {
    setupMocks([makeNotif({ type: 'ai_daily_log_reminder', title: 'Daily Reminder' })]);
    render(<NotificationsScreen {...BASE_PROPS} />);
    fireEvent.press(screen.getByText('Daily Reminder'));
    expect(MOCK_NAVIGATE).toHaveBeenCalledWith('daily-log', undefined);
  });

  it('navigates employee to my-progress on ai_streak_milestone', () => {
    setupMocks([makeNotif({ type: 'ai_streak_milestone', title: 'Streak Milestone' })]);
    render(<NotificationsScreen {...BASE_PROPS} />);
    fireEvent.press(screen.getByText('Streak Milestone'));
    expect(MOCK_NAVIGATE).toHaveBeenCalledWith('my-progress', undefined);
  });
});

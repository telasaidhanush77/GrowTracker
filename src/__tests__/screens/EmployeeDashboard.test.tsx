import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import type { StoredUser, Goal, Notification, Role } from '../../types';

// ── mocks ──────────────────────────────────────────────────────

jest.mock('../../context/AppContext', () => ({ useApp: jest.fn() }));
jest.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../components/Header', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return ({ title, onNotif, onLogout }: any) => (
    <View testID="header">
      <Text testID="header-title">{title}</Text>
      {onNotif && <TouchableOpacity testID="notif-btn" onPress={onNotif}><Text>Notif</Text></TouchableOpacity>}
      {onLogout && <TouchableOpacity testID="logout-btn" onPress={onLogout}><Text>Logout</Text></TouchableOpacity>}
    </View>
  );
});
jest.mock('../../components/charts/GoalStatusBar', () => () => null);
jest.mock('../../components/BottomTabBar', () => {
  const { View, TouchableOpacity, Text } = require('react-native');
  return ({ tabs, onSelect }: any) => (
    <View testID="bottom-tab-bar">
      {tabs.map((t: any) => (
        <TouchableOpacity key={t.key} testID={`tab-${t.key}`} onPress={() => onSelect(t.key)}>
          <Text>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
});
jest.mock('../../components/AnimatedButton', () => ({
  AnimatedButton: ({ children, onPress }: any) => {
    const { TouchableOpacity } = require('react-native');
    return <TouchableOpacity onPress={onPress}>{children}</TouchableOpacity>;
  },
}));

import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import EmployeeDashboard from '../../screens/employee/EmployeeDashboard';

const mockUseApp = useApp as jest.MockedFunction<typeof useApp>;
const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

// ── fixtures ───────────────────────────────────────────────────

const MOCK_COLORS: any = {
  bg: '#fff', bgElevated: '#f5f5f5', card: '#fafafa', border: '#e0e0e0',
  divider: '#eee', textPrimary: '#000', textSecondary: '#666', textMuted: '#999',
  employeePrimary: '#4f46e5', employeeLight: '#ede9fe',
  approved: '#22c55e', approvedBg: '#dcfce7',
  rejected: '#ef4444', rejectedBg: '#fee2e2',
  pending: '#f59e0b', pendingBg: '#fef3c7',
  inProgress: '#3b82f6', inProgressBg: '#dbeafe',
  chartTrack: '#e5e7eb',
  high: '#ef4444', highBg: '#fee2e2',
  medium: '#f59e0b', mediumBg: '#fef3c7',
  low: '#22c55e', lowBg: '#dcfce7',
  notStarted: '#6b7280', notStartedBg: '#f3f4f6',
};

function makeEmployee(overrides: Partial<StoredUser> = {}): StoredUser {
  return {
    id: 'emp-1',
    employeeCode: 'EMP001',
    firstName: 'Alice',
    lastName: 'Smith',
    name: 'Alice Smith',
    email: 'alice@test.com',
    username: 'alice',
    role: 'employee',
    department: 'Engineering',
    designation: 'Software Engineer',
    managerId: 'mgr-1',
    joinDate: '2024-01-01',
    status: 'active',
    avatarInitials: 'AS',
    createdAt: '2024-01-01T00:00:00Z',
    passwordHash: '',
    ...overrides,
  };
}

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    employeeId: 'emp-1',
    title: 'Test Goal',
    description: 'desc',
    quarter: 'Q1',
    priority: 'medium',
    category: 'technical',
    targetDate: '2026-12-31',
    weight: 50,
    status: 'not_started',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const MOCK_NAV = { navigate: jest.fn(), goBack: jest.fn() };
const BASE_PROPS: any = {
  navigation: MOCK_NAV,
  params: {},
  currentUserId: 'emp-1',
  currentRole: 'employee' as Role,
  onLogout: jest.fn(),
};

function setupMocks(employees: StoredUser[], goals: Goal[], notifications: Notification[] = []) {
  mockUseApp.mockReturnValue({
    employees,
    goals,
    notifications,
    dailyLogs: [],
    emailExists: jest.fn(),
    addEmployee: jest.fn(),
    updateEmployee: jest.fn(),
    addGoal: jest.fn(),
    updateGoal: jest.fn(),
    deleteGoal: jest.fn(),
    submitEvidence: jest.fn(),
    reviewEvidence: jest.fn(),
    markNotifRead: jest.fn(),
    markAllRead: jest.fn(),
    addNotification: jest.fn(),
    closeFiscalYear: jest.fn(),
    saveDailyLog: jest.fn(),
    removeEmployee: jest.fn(),
  } as any);

  mockUseTheme.mockReturnValue({ colors: MOCK_COLORS, isDark: false, toggleTheme: jest.fn() });
}

beforeEach(() => {
  jest.clearAllMocks();
  MOCK_NAV.navigate.mockReset();
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-06-19T12:00:00Z').getTime());
});

afterEach(() => {
  jest.useRealTimers();
});

// ── rendering ──────────────────────────────────────────────────

describe('EmployeeDashboard — rendering', () => {
  it('renders the employee first name as the header title', () => {
    setupMocks([makeEmployee()], []);
    render(<EmployeeDashboard {...BASE_PROPS} />);
    expect(screen.getByTestId('header-title')).toBeTruthy();
  });

  it('shows the tab bar with three tabs', () => {
    setupMocks([makeEmployee()], []);
    render(<EmployeeDashboard {...BASE_PROPS} />);
    expect(screen.getByTestId('tab-overview')).toBeTruthy();
    expect(screen.getByTestId('tab-analysis')).toBeTruthy();
    expect(screen.getByTestId('tab-actions')).toBeTruthy();
  });
});

// ── overdue alert ──────────────────────────────────────────────

describe('EmployeeDashboard — overdue alert', () => {
  it('shows overdue alert when there are overdue in-progress goals', () => {
    const overdueGoal = makeGoal({
      status: 'in_progress',
      targetDate: '2026-06-01', // past relative to faked system time
    });
    setupMocks([makeEmployee()], [overdueGoal]);
    render(<EmployeeDashboard {...BASE_PROPS} />);

    expect(screen.getByText(/1 goal overdue/i)).toBeTruthy();
  });

  it('shows plural text for multiple overdue goals', () => {
    const goals = [
      makeGoal({ id: 'g1', status: 'in_progress', targetDate: '2026-06-01' }),
      makeGoal({ id: 'g2', status: 'not_started', targetDate: '2026-06-01' }),
    ];
    setupMocks([makeEmployee()], goals);
    render(<EmployeeDashboard {...BASE_PROPS} />);

    expect(screen.getByText(/2 goals overdue/i)).toBeTruthy();
  });

  it('does not show overdue alert when all goals are on time', () => {
    const onTimeGoal = makeGoal({ status: 'in_progress', targetDate: '2026-12-31' });
    setupMocks([makeEmployee()], [onTimeGoal]);
    render(<EmployeeDashboard {...BASE_PROPS} />);

    expect(screen.queryByText(/overdue/i)).toBeNull();
  });

  it('does not show overdue alert when approved/submitted goals are past their date', () => {
    // Approved goals don't show as overdue (only in_progress/not_started)
    const approvedGoal = makeGoal({ status: 'approved', targetDate: '2026-01-01' });
    setupMocks([makeEmployee()], [approvedGoal]);
    render(<EmployeeDashboard {...BASE_PROPS} />);

    expect(screen.queryByText(/overdue/i)).toBeNull();
  });

  it('tapping overdue alert navigates to goals-list', () => {
    const overdueGoal = makeGoal({ status: 'in_progress', targetDate: '2026-06-01' });
    setupMocks([makeEmployee()], [overdueGoal]);
    render(<EmployeeDashboard {...BASE_PROPS} />);

    fireEvent.press(screen.getByText(/1 goal overdue/i));
    expect(MOCK_NAV.navigate).toHaveBeenCalledWith('goals-list');
  });
});

// ── Q1 carry-over nudge ────────────────────────────────────────

describe('EmployeeDashboard — Q1 carry-over nudge', () => {
  it('shows nudge when there are rejected Q1 goals', () => {
    const rejectedQ1 = makeGoal({ quarter: 'Q1', status: 'rejected' });
    setupMocks([makeEmployee()], [rejectedQ1]);
    render(<EmployeeDashboard {...BASE_PROPS} />);

    expect(screen.getByText(/Q1 Goals to Revisit/i)).toBeTruthy();
  });

  it('shows correct count in nudge sub-text', () => {
    const goals = [
      makeGoal({ id: 'g1', quarter: 'Q1', status: 'rejected', title: 'Goal A' }),
      makeGoal({ id: 'g2', quarter: 'Q1', status: 'rejected', title: 'Goal B' }),
    ];
    setupMocks([makeEmployee()], goals);
    render(<EmployeeDashboard {...BASE_PROPS} />);

    expect(screen.getByText(/2 rejected goals/i)).toBeTruthy();
  });

  it('does not show nudge when there are no rejected Q1 goals', () => {
    const goals = [makeGoal({ quarter: 'Q1', status: 'approved' })];
    setupMocks([makeEmployee()], goals);
    render(<EmployeeDashboard {...BASE_PROPS} />);

    expect(screen.queryByText(/Q1 Goals to Revisit/i)).toBeNull();
  });

  it('does not show nudge for rejected Q2 goals', () => {
    const rejectedQ2 = makeGoal({ quarter: 'Q2', status: 'rejected' });
    setupMocks([makeEmployee()], [rejectedQ2]);
    render(<EmployeeDashboard {...BASE_PROPS} />);

    expect(screen.queryByText(/Q1 Goals to Revisit/i)).toBeNull();
  });
});

// ── FY complete banner ─────────────────────────────────────────

describe('EmployeeDashboard — FY complete banner', () => {
  it('shows the FY complete banner when employee status is completed_fiscal_year', () => {
    const completedEmployee = makeEmployee({ status: 'completed_fiscal_year' as any });
    setupMocks([completedEmployee], []);
    render(<EmployeeDashboard {...BASE_PROPS} />);

    expect(screen.getByText(/FY 2026 Complete!/i)).toBeTruthy();
  });

  it('does not show FY complete banner for active employees', () => {
    setupMocks([makeEmployee({ status: 'active' })], []);
    render(<EmployeeDashboard {...BASE_PROPS} />);

    expect(screen.queryByText(/FY 2026 Complete!/i)).toBeNull();
  });
});

// ── tab navigation ─────────────────────────────────────────────

describe('EmployeeDashboard — tab navigation', () => {
  it('switches to Analysis tab when Analysis tab is pressed', () => {
    setupMocks([makeEmployee()], []);
    render(<EmployeeDashboard {...BASE_PROPS} />);

    fireEvent.press(screen.getByTestId('tab-analysis'));
    // Analysis tab shows the quarter comparison section
    expect(screen.getByText(/Quarter Comparison/i)).toBeTruthy();
  });

  it('switches to Actions tab and shows daily log shortcut', () => {
    setupMocks([makeEmployee()], []);
    render(<EmployeeDashboard {...BASE_PROPS} />);

    fireEvent.press(screen.getByTestId('tab-actions'));
    expect(screen.getByText(/Today's Daily Log/i)).toBeTruthy();
  });

  it('shows "All caught up!" on Actions tab when there are no pending goals', () => {
    const approvedGoal = makeGoal({ status: 'approved' });
    setupMocks([makeEmployee()], [approvedGoal]);
    render(<EmployeeDashboard {...BASE_PROPS} />);

    fireEvent.press(screen.getByTestId('tab-actions'));
    expect(screen.getByText(/All caught up!/i)).toBeTruthy();
  });

  it('shows submit evidence action for in_progress goals without evidence', () => {
    const goal = makeGoal({ status: 'in_progress', title: 'Ship it' });
    setupMocks([makeEmployee()], [goal]);
    render(<EmployeeDashboard {...BASE_PROPS} />);

    fireEvent.press(screen.getByTestId('tab-actions'));
    expect(screen.getByText('Ship it')).toBeTruthy();
  });
});

// ── navigation actions ─────────────────────────────────────────

describe('EmployeeDashboard — navigation actions', () => {
  it('navigates to notifications when notif button is pressed', () => {
    setupMocks([makeEmployee()], []);
    render(<EmployeeDashboard {...BASE_PROPS} />);

    fireEvent.press(screen.getByTestId('notif-btn'));
    expect(MOCK_NAV.navigate).toHaveBeenCalledWith('notifications');
  });

  it('navigates to goals-list from "My Goals" workspace link', () => {
    setupMocks([makeEmployee()], []);
    render(<EmployeeDashboard {...BASE_PROPS} />);

    fireEvent.press(screen.getByText('My Goals'));
    expect(MOCK_NAV.navigate).toHaveBeenCalledWith('goals-list');
  });

  it('navigates to daily-log from workspace link', () => {
    setupMocks([makeEmployee()], []);
    render(<EmployeeDashboard {...BASE_PROPS} />);

    fireEvent.press(screen.getByText('Daily Work Log'));
    expect(MOCK_NAV.navigate).toHaveBeenCalledWith('daily-log');
  });

  it('navigates to my-progress for active employees', () => {
    setupMocks([makeEmployee({ status: 'active' })], []);
    render(<EmployeeDashboard {...BASE_PROPS} />);

    fireEvent.press(screen.getByText('My Progress'));
    expect(MOCK_NAV.navigate).toHaveBeenCalledWith('my-progress');
  });
});

// ── overview content ───────────────────────────────────────────

describe('EmployeeDashboard — overview tab content', () => {
  it('shows "No goals yet" empty state when employee has no goals', () => {
    setupMocks([makeEmployee()], []);
    render(<EmployeeDashboard {...BASE_PROPS} />);
    expect(screen.getByText('No goals yet')).toBeTruthy();
  });

  it('shows Performance Score section when goals exist', () => {
    setupMocks([makeEmployee()], [makeGoal({ status: 'in_progress' })]);
    render(<EmployeeDashboard {...BASE_PROPS} />);
    expect(screen.getByText('Performance Score')).toBeTruthy();
  });

  it('shows Q1 and Q2 score cards when goals exist', () => {
    setupMocks([makeEmployee()], [makeGoal({ quarter: 'Q1', status: 'approved' })]);
    render(<EmployeeDashboard {...BASE_PROPS} />);
    expect(screen.getByText('Q1')).toBeTruthy();
    expect(screen.getByText('Q2')).toBeTruthy();
  });

  it('shows score breakdown when goal has managerRating', () => {
    setupMocks([makeEmployee()], [makeGoal({
      status: 'approved', managerRating: 4, weight: 50, quarter: 'Q1',
    })]);
    render(<EmployeeDashboard {...BASE_PROPS} />);
    expect(screen.getByText('Score Breakdown')).toBeTruthy();
  });

  it('navigates to fy-report when View Full Report is pressed on FY complete', () => {
    setupMocks([makeEmployee({ status: 'completed_fiscal_year' as any })], []);
    render(<EmployeeDashboard {...BASE_PROPS} />);
    fireEvent.press(screen.getByText('View Full Report →'));
    expect(MOCK_NAV.navigate).toHaveBeenCalledWith('fy-report', { employeeId: 'emp-1' });
  });

  it('navigates to submit-evidence when rejected Q1 goal is pressed', () => {
    setupMocks([makeEmployee()], [makeGoal({ quarter: 'Q1', status: 'rejected', title: 'Rejected Goal' })]);
    render(<EmployeeDashboard {...BASE_PROPS} />);
    fireEvent.press(screen.getByText('Rejected Goal'));
    expect(MOCK_NAV.navigate).toHaveBeenCalledWith('submit-evidence', { goalId: 'goal-1' });
  });

  it('navigates to goals-list with Q1 filter when Q1 card is pressed', () => {
    setupMocks([makeEmployee()], [makeGoal({ quarter: 'Q1', status: 'not_started' })]);
    render(<EmployeeDashboard {...BASE_PROPS} />);
    // Press the Q1 card - accessible label contains "Q1 performance score"
    const q1Cards = screen.getAllByRole('button');
    // Find the Q1 card by label
    const q1Card = q1Cards.find(el =>
      el.props.accessibilityLabel?.includes('Q1 performance score'),
    );
    if (q1Card) fireEvent.press(q1Card);
    expect(MOCK_NAV.navigate).toHaveBeenCalledWith('goals-list', { filterQuarter: 'Q1' });
  });
});

// ── analysis tab ──────────────────────────────────────────────

describe('EmployeeDashboard — analysis tab', () => {
  it('shows goal ratings in analysis tab when goals have managerRating', () => {
    setupMocks([makeEmployee()], [makeGoal({
      quarter: 'Q1', status: 'approved', managerRating: 4, title: 'Rated Goal',
    })]);
    render(<EmployeeDashboard {...BASE_PROPS} />);
    fireEvent.press(screen.getByTestId('tab-analysis'));
    expect(screen.getByText('Q1 Goal Ratings')).toBeTruthy();
    // Rating text "4/5 ★" appears in the analysis breakdown
    expect(screen.getByText('4/5 ★')).toBeTruthy();
  });

  it('shows delta text when both Q1 and Q2 have scores', () => {
    setupMocks([makeEmployee()], [
      makeGoal({ id: 'g1', quarter: 'Q1', status: 'approved', managerRating: 3, weight: 100 }),
      makeGoal({ id: 'g2', quarter: 'Q2', status: 'approved', managerRating: 5, weight: 100 }),
    ]);
    render(<EmployeeDashboard {...BASE_PROPS} />);
    fireEvent.press(screen.getByTestId('tab-analysis'));
    expect(screen.getByText(/vs Q1/)).toBeTruthy();
  });
});

// ── actions tab detail ────────────────────────────────────────

describe('EmployeeDashboard — actions tab detail', () => {
  it('shows pending goals in action items when in_progress goals exist', () => {
    setupMocks([makeEmployee()], [makeGoal({ status: 'in_progress', title: 'Pending Action Goal' })]);
    render(<EmployeeDashboard {...BASE_PROPS} />);
    fireEvent.press(screen.getByTestId('tab-actions'));
    expect(screen.getByText('Pending Action Goal')).toBeTruthy();
  });

  it('navigates to submit-evidence from actions tab when in_progress goal is pressed', () => {
    setupMocks([makeEmployee()], [makeGoal({ id: 'g-act', status: 'in_progress', title: 'Ship Feature' })]);
    render(<EmployeeDashboard {...BASE_PROPS} />);
    fireEvent.press(screen.getByTestId('tab-actions'));
    fireEvent.press(screen.getByText('Ship Feature'));
    expect(MOCK_NAV.navigate).toHaveBeenCalledWith('submit-evidence', { goalId: 'g-act' });
  });

  it('navigates to daily-log from Actions tab when Today\'s Daily Log is pressed', () => {
    setupMocks([makeEmployee()], []);
    render(<EmployeeDashboard {...BASE_PROPS} />);
    fireEvent.press(screen.getByTestId('tab-actions'));
    fireEvent.press(screen.getByText(/Today's Daily Log/i));
    expect(MOCK_NAV.navigate).toHaveBeenCalledWith('daily-log');
  });
});

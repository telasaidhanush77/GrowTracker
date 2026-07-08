import React from 'react';
import { render, screen } from '@testing-library/react-native';

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../context/AppContext', () => ({ useApp: jest.fn() }));
jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../context/ToastContext', () => ({ useToast: jest.fn() }));
jest.mock('../../components/Header', () => () => null);
jest.mock('../../components/BottomTabBar', () => () => null);
jest.mock('../../components/AnimatedButton', () => ({
  AnimatedButton: ({ children, onPress }: any) => {
    const { TouchableOpacity } = require('react-native');
    return require('react').createElement(TouchableOpacity, { onPress }, children);
  },
}));
jest.mock('../../components/charts/ProgressRing', () => () => null);
jest.mock('../../components/charts/GoalStatusBar', () => () => null);
jest.mock('../../components/charts/MiniBarChart', () => () => null);

import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

import GoalsList from '../../screens/employee/GoalsList';
import NotificationsScreen from '../../screens/shared/NotificationsScreen';
import ReviewEvidence from '../../screens/manager/ReviewEvidence';

// ── Shared mocks ──────────────────────────────────────────────────────────────

const MOCK_COLORS: any = {
  bg: '#fff', bgElevated: '#f5f5f5', card: '#fafafa', border: '#e0e0e0',
  textPrimary: '#111', textSecondary: '#555', textMuted: '#999',
  adminPrimary: '#dc2626', adminLight: '#fee2e2',
  managerPrimary: '#0891b2', managerLight: '#cffafe',
  employeePrimary: '#4f46e5', employeeLight: '#ede9fe',
  primary: '#4f46e5',
  approved: '#22c55e', approvedBg: '#dcfce7',
  rejected: '#ef4444', rejectedBg: '#fee2e2',
  pending: '#f59e0b', pendingBg: '#fffbeb',
};

const mockNavigation = { goBack: jest.fn(), navigate: jest.fn() };

const MOCK_USER: any = {
  id: 'emp-1', name: 'Alice Brown', email: 'alice@test.com', role: 'employee',
  managerId: 'mgr-1', department: 'Engineering', designation: 'Engineer',
  avatarInitials: 'AB', employeeCode: 'EMP-001',
};

function makeGoal(overrides: Partial<any> = {}): any {
  return {
    id: `goal-${Math.random().toString(36).slice(2)}`,
    employeeId: 'emp-1',
    quarter: 'Q1',
    weight: 20,
    status: 'not_started',
    title: 'Sample Goal',
    description: 'Do the thing',
    category: 'technical',
    priority: 'medium',
    targetDate: '2026-12-31',
    ...overrides,
  };
}

function makeNotification(overrides: Partial<any> = {}): any {
  return {
    id: `n-${Math.random().toString(36).slice(2)}`,
    recipientId: 'emp-1',
    type: 'goal_assigned',
    title: 'Goal Assigned',
    message: 'You have a new goal.',
    read: false,
    createdAt: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (useTheme as jest.Mock).mockReturnValue({ colors: MOCK_COLORS, isDark: false });
  (useToast as jest.Mock).mockReturnValue({ showToast: jest.fn() });
});

// ══════════════════════════════════════════════════════════════════════════════
// GoalsList
// ══════════════════════════════════════════════════════════════════════════════

function renderGoalsList(goals: any[] = []) {
  (useAuth as jest.Mock).mockReturnValue({ currentUser: MOCK_USER });
  (useApp as jest.Mock).mockReturnValue({
    goals,
    employees: [MOCK_USER],
    notifications: [],
    updateGoal: jest.fn(),
  });
  return render(
    <GoalsList
      navigation={mockNavigation as any}
      params={{}}
      currentUserId="emp-1"
      currentRole="employee"
      onLogout={jest.fn()}
    />,
  );
}

describe('GoalsList — empty list', () => {
  it('shows empty-state message when there are no goals', () => {
    renderGoalsList([]);
    expect(screen.getByText(/no.*goal/i)).toBeTruthy();
  });
});

describe('GoalsList — single item', () => {
  it('renders exactly one goal card for a single goal', () => {
    renderGoalsList([makeGoal({ title: 'Only Goal' })]);
    expect(screen.getByText('Only Goal')).toBeTruthy();
  });

  it('renders the single goal\'s title and category', () => {
    renderGoalsList([makeGoal({ title: 'Build the API', weight: 30 })]);
    expect(screen.getByText('Build the API')).toBeTruthy();
    expect(screen.getByText('Technical')).toBeTruthy();
  });
});

describe('GoalsList — large list', () => {
  it('renders 50 goals without crashing', () => {
    const goals = Array.from({ length: 50 }, (_, i) =>
      makeGoal({ id: `g-${i}`, title: `Goal ${i + 1}` }),
    );
    renderGoalsList(goals);
    // FlatList windowing: verify first visible item renders without crashing
    expect(screen.getByText('Goal 1')).toBeTruthy();
    expect(screen.getAllByText(/Goal \d+/).length).toBeGreaterThan(0);
  });

  it('renders 50 goals with mixed statuses without crashing', () => {
    const statuses = ['not_started', 'in_progress', 'submitted', 'approved', 'rejected'];
    const goals = Array.from({ length: 50 }, (_, i) =>
      makeGoal({ id: `g-${i}`, title: `Goal ${i + 1}`, status: statuses[i % statuses.length] }),
    );
    renderGoalsList(goals);
    // Rejected goals sort first — Goal 5 is the first rejected goal, always visible
    expect(screen.getByText('Goal 5')).toBeTruthy();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// NotificationsScreen
// ══════════════════════════════════════════════════════════════════════════════

function renderNotifications(notifications: any[] = []) {
  (useApp as jest.Mock).mockReturnValue({
    notifications,
    markNotifRead: jest.fn(),
    markAllRead: jest.fn(),
  });
  return render(
    <NotificationsScreen
      navigation={mockNavigation as any}
      params={{}}
      currentUserId="emp-1"
      currentRole="employee"
      onLogout={jest.fn()}
    />,
  );
}

describe('NotificationsScreen — empty list', () => {
  it('shows empty-state message when there are no notifications', () => {
    renderNotifications([]);
    expect(screen.getByText(/no notification/i)).toBeTruthy();
  });
});

describe('NotificationsScreen — single notification', () => {
  it('renders a single notification without crashing', () => {
    renderNotifications([makeNotification({ title: 'Hello', message: 'World' })]);
    expect(screen.getByText('Hello')).toBeTruthy();
    expect(screen.getByText('World')).toBeTruthy();
  });
});

describe('NotificationsScreen — large list', () => {
  it('renders 100 notifications without crashing', () => {
    const notifs = Array.from({ length: 100 }, (_, i) =>
      makeNotification({ id: `n-${i}`, title: `Notif ${i + 1}`, message: `Message ${i + 1}` }),
    );
    renderNotifications(notifs);
    // SectionList windowing: verify first visible items render without crashing
    expect(screen.getByText('Notif 1')).toBeTruthy();
    expect(screen.getAllByText(/Notif \d+/).length).toBeGreaterThan(0);
  });

  it('renders 100 notifications with mixed read state without crashing', () => {
    const notifs = Array.from({ length: 100 }, (_, i) =>
      makeNotification({ id: `n-${i}`, title: `Notif ${i + 1}`, read: i % 2 === 0 }),
    );
    renderNotifications(notifs);
    expect(screen.getByText('Notif 1')).toBeTruthy();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ReviewEvidence — pending list
// ══════════════════════════════════════════════════════════════════════════════

function makeEmployee(id: string): any {
  return {
    id, name: `Employee ${id}`, email: `emp${id}@test.com`,
    role: 'employee', managerId: 'mgr-1', department: 'Engineering',
    avatarInitials: id.toUpperCase().slice(0, 2),
  };
}

function makePendingGoal(id: string, employeeId: string): any {
  return {
    id, employeeId, quarter: 'Q2', weight: 10, status: 'submitted',
    title: `Goal ${id}`, description: 'Submit auth impl',
    category: 'technical', priority: 'medium', targetDate: '2026-06-01',
    evidence: {
      description: 'Done.', submittedAt: '2026-06-01T00:00:00Z',
      links: [], selfRating: 3,
    },
  };
}

function renderReviewEvidenceList(goals: any[], employees: any[]) {
  (useToast as jest.Mock).mockReturnValue({ showToast: jest.fn() });
  (useApp as jest.Mock).mockReturnValue({
    employees,
    goals,
    reviewEvidence: jest.fn(),
    addNotification: jest.fn(),
  });
  return render(
    <ReviewEvidence
      navigation={mockNavigation as any}
      params={{}}
      currentUserId="mgr-1"
      currentRole="manager"
      onLogout={jest.fn()}
    />,
  );
}

describe('ReviewEvidence — pending list', () => {
  it('shows empty-state when there are no pending submissions', () => {
    renderReviewEvidenceList([], []);
    expect(screen.getByText(/No pending submissions/i)).toBeTruthy();
  });

  it('renders a single pending submission without crashing', () => {
    const emp = makeEmployee('e1');
    const goal = makePendingGoal('g1', 'e1');
    renderReviewEvidenceList([goal], [emp]);
    expect(screen.getByText('Goal g1')).toBeTruthy();
  });

  it('renders 20 pending submissions without crashing', () => {
    const employees = Array.from({ length: 20 }, (_, i) => makeEmployee(`e${i}`));
    const goals = Array.from({ length: 20 }, (_, i) => makePendingGoal(`g${i}`, `e${i}`));
    renderReviewEvidenceList(goals, employees);
    // FlatList windowing: verify first visible item renders without crashing
    expect(screen.getByText('Goal g0')).toBeTruthy();
    expect(screen.getAllByText(/Goal g\d+/).length).toBeGreaterThan(0);
  });
});

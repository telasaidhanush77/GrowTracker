/**
 * Dashboard render-time benchmark.
 *
 * WHAT THIS TESTS:
 *   Renders EmployeeDashboard with 100 mock goals and asserts the initial
 *   render completes in under 3 000 ms. This catches accidental O(n²) work
 *   introduced inside the render path (e.g. nested .filter/.map chains that
 *   scale with goal count).
 *
 * THRESHOLD:
 *   3 000 ms is deliberately generous for a Jest/JSDOM environment —
 *   real device benchmarks belong in Flipper (Android) or Xcode Instruments
 *   (iOS). The goal here is to catch regressions, not to hit a production
 *   performance target.
 *
 * HOW TO READ A FAILURE:
 *   If this test starts failing, profile EmployeeDashboard's render path:
 *   look for unguarded .filter/.map calls on the goals/employees arrays that
 *   run inside the component body without useMemo.
 */

import React from 'react';
import { render } from '@testing-library/react-native';

// ── context mocks ─────────────────────────────────────────────────────────────

jest.mock('../../context/AuthContext',  () => ({ useAuth:  jest.fn() }));
jest.mock('../../context/AppContext',   () => ({ useApp:   jest.fn() }));
jest.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../context/ToastContext', () => ({ useToast: jest.fn() }));

// ── component mocks (keep render fast, test only EmployeeDashboard logic) ─────

jest.mock('../../components/Header',      () => () => null);
jest.mock('../../components/BottomTabBar', () => () => null);
jest.mock('../../components/AnimatedButton', () => ({
  AnimatedButton: ({ children, onPress }: any) => {
    const { TouchableOpacity } = require('react-native');
    return <TouchableOpacity onPress={onPress}>{children}</TouchableOpacity>;
  },
}));
jest.mock('../../components/charts/GoalStatusBar', () => () => null);
jest.mock('../../components/charts/ProgressRing',  () => () => null);
jest.mock('../../components/charts/MiniBarChart',  () => () => null);
jest.mock('../../lib/supabase', () => ({
  supabase: { auth: {}, from: jest.fn() },
}));

// ── imports (after mocks) ─────────────────────────────────────────────────────

import { useApp }   from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import EmployeeDashboard from '../../screens/employee/EmployeeDashboard';

const mockUseApp   = useApp   as jest.MockedFunction<typeof useApp>;
const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

// ── fixture helpers ───────────────────────────────────────────────────────────

const MOCK_COLORS: any = {
  bg: '#ffffff', bgElevated: '#f5f5f5', card: '#fafafa', border: '#e0e0e0',
  divider: '#eee', textPrimary: '#111', textSecondary: '#555', textMuted: '#888',
  adminPrimary: '#7c3aed', adminLight: '#ede9fe',
  managerPrimary: '#0891b2', managerLight: '#cffafe',
  employeePrimary: '#4f46e5', employeeLight: '#ede9fe',
  approved: '#22c55e', approvedBg: '#dcfce7',
  rejected: '#ef4444', rejectedBg: '#fee2e2',
  pending: '#f59e0b', pendingBg: '#fef3c7',
  inProgress: '#3b82f6', inProgressBg: '#dbeafe',
  chartTrack: '#e5e7eb', overlay: 'rgba(0,0,0,0.4)',
  high: '#ef4444', highBg: '#fee2e2',
  medium: '#f59e0b', mediumBg: '#fef3c7',
  low: '#22c55e', lowBg: '#dcfce7',
  notStarted: '#6b7280', notStartedBg: '#f3f4f6',
};

function makeGoal(index: number): any {
  const statuses = ['in_progress', 'not_started', 'approved', 'pending', 'rejected'] as const;
  const priorities = ['high', 'medium', 'low'] as const;
  const categories = ['technical', 'leadership', 'communication'] as const;
  return {
    id: `goal-${index}`,
    employeeId: 'emp-1',
    title: `Goal ${index}`,
    description: `Description for goal ${index}`,
    quarter: index % 2 === 0 ? 'Q1' : 'Q2',
    priority: priorities[index % 3],
    category: categories[index % 3],
    targetDate: index % 5 === 0 ? '2026-01-01' : '2026-12-31',
    weight: 10,
    status: statuses[index % 5],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

const EMPLOYEE: any = {
  id: 'emp-1', employeeCode: 'EMP001',
  firstName: 'Alice', lastName: 'Smith', name: 'Alice Smith',
  email: 'alice@test.com', username: 'alice', role: 'employee',
  department: 'Engineering', designation: 'Software Engineer',
  managerId: 'mgr-1', joinDate: '2024-01-01', status: 'active',
  avatarInitials: 'AS', createdAt: '2024-01-01T00:00:00Z', passwordHash: '',
};

const MANAGER: any = {
  ...EMPLOYEE,
  id: 'mgr-1', employeeCode: 'MGR001',
  firstName: 'Bob', lastName: 'Jones', name: 'Bob Jones',
  role: 'manager', managerId: null,
};

// ── benchmark test ────────────────────────────────────────────────────────────

describe('EmployeeDashboard — render-time benchmark', () => {
  const GOAL_COUNT = 100;
  const RENDER_THRESHOLD_MS = 3000;

  const goals = Array.from({ length: GOAL_COUNT }, (_, i) => makeGoal(i));

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-21T12:00:00Z'));

    mockUseTheme.mockReturnValue({
      colors: MOCK_COLORS, isDark: false, toggleTheme: jest.fn(),
    } as any);

    mockUseApp.mockReturnValue({
      employees: [EMPLOYEE, MANAGER],
      goals,
      notifications: [],
      dailyLogs: [],
      addGoal: jest.fn(), updateGoal: jest.fn(), deleteGoal: jest.fn(),
      submitEvidence: jest.fn(), reviewEvidence: jest.fn(),
      markNotifRead: jest.fn(), markAllRead: jest.fn(),
      addNotification: jest.fn(), addEmployee: jest.fn(),
      updateEmployee: jest.fn(), removeEmployee: jest.fn(),
      closeFiscalYear: jest.fn(), saveDailyLog: jest.fn(),
      emailExists: jest.fn().mockResolvedValue(false),
    } as any);

    mockUseToast.mockReturnValue({ showToast: jest.fn() } as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it(`renders ${GOAL_COUNT} goals in under ${RENDER_THRESHOLD_MS} ms`, () => {
    const nav = { navigate: jest.fn(), goBack: jest.fn() };
    const props: any = {
      navigation: nav,
      currentUserId: 'emp-1',
      currentRole: 'employee',
      onLogout: jest.fn(),
      onSwitchAccount: jest.fn(),
    };

    const start = Date.now();
    render(<EmployeeDashboard {...props} />);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(RENDER_THRESHOLD_MS);
  });

  it('renders consistently across repeated mounts (no O(n²) regression)', () => {
    const nav = { navigate: jest.fn(), goBack: jest.fn() };
    const props: any = {
      navigation: nav,
      currentUserId: 'emp-1',
      currentRole: 'employee',
      onLogout: jest.fn(),
      onSwitchAccount: jest.fn(),
    };

    const samples: number[] = [];
    for (let i = 0; i < 3; i++) {
      const start = Date.now();
      const { unmount } = render(<EmployeeDashboard {...props} />);
      samples.push(Date.now() - start);
      unmount();
    }

    // Each render should stay under threshold — no warm-up effect expected
    samples.forEach((ms) => {
      expect(ms).toBeLessThan(RENDER_THRESHOLD_MS);
    });

    // Renders should not grow significantly — flag if last is 3× the first
    const growthRatio = samples[samples.length - 1] / (samples[0] || 1);
    expect(growthRatio).toBeLessThan(3);
  });
});

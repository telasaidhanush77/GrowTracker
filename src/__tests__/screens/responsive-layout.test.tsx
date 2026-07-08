/**
 * Responsive layout structural tests across five target device sizes.
 *
 * WHAT THESE TESTS VERIFY:
 *   - Each screen renders without throwing when Dimensions is set to each size
 *   - Screens that contain long content expose a ScrollView in the component tree
 *   - Key text labels, inputs, and buttons are present in the tree
 *
 * WHAT THESE TESTS CANNOT VERIFY (requires a real layout engine / Detox / Maestro):
 *   - Actual pixel-level overflow
 *   - Text truncation from numberOfLines
 *   - Element dimensions or absolute positions
 *
 * Use these tests to catch crashes and missing elements early; use E2E tests
 * (e2e/) to catch visual regressions on real devices.
 */

import React from 'react';
import { Dimensions, ScrollView, TextInput } from 'react-native';
import { render, screen } from '@testing-library/react-native';

// ── context mocks ────────────────────────────────────────────────
jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../context/AppContext',  () => ({ useApp: jest.fn() }));
jest.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));

// ── shared component mocks ───────────────────────────────────────
jest.mock('../../components/Header', () => {
  const { View, Text } = require('react-native');
  return ({ title }: any) => (
    <View testID="header">
      <Text>{title}</Text>
    </View>
  );
});
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
jest.mock('../../components/charts/GoalStatusBar',  () => () => null);
jest.mock('../../components/charts/ProgressRing',   () => () => null);
jest.mock('../../components/charts/MiniBarChart',   () => () => null);

// ── supabase (reachable only when context is NOT mocked) ─────────
jest.mock('../../lib/supabase', () => ({ supabase: { auth: {}, from: jest.fn() } }));

import { useAuth }  from '../../context/AuthContext';
import { useApp }   from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';

import SplashScreen      from '../../screens/auth/SplashScreen';
import LoginScreen       from '../../screens/auth/LoginScreen';
import SignUpScreen      from '../../screens/auth/SignUpScreen';
import EmployeeDashboard from '../../screens/employee/EmployeeDashboard';
import DailyLogScreen    from '../../screens/employee/DailyLogScreen';

const mockUseAuth  = useAuth  as jest.MockedFunction<typeof useAuth>;
const mockUseApp   = useApp   as jest.MockedFunction<typeof useApp>;
const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

// ── device sizes under test ──────────────────────────────────────
const DEVICE_SIZES = [
  { name: 'iPhone SE (320×568)',        width: 320,  height: 568  },
  { name: 'iPhone 14 (375×812)',        width: 375,  height: 812  },
  { name: 'iPhone 14 Plus (414×896)',   width: 414,  height: 896  },
  { name: 'Android small (360×640)',    width: 360,  height: 640  },
  { name: 'Android large (412×915)',    width: 412,  height: 915  },
] as const;

// ── shared fixtures ──────────────────────────────────────────────
const MOCK_COLORS: any = {
  bg: '#fff', bgElevated: '#f5f5f5', card: '#fafafa', border: '#e0e0e0',
  divider: '#eee', textPrimary: '#000', textSecondary: '#666', textMuted: '#999',
  adminPrimary: '#7c3aed', adminLight: '#ede9fe',
  managerPrimary: '#0891b2', managerLight: '#cffafe',
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

const MOCK_NAV = { navigate: jest.fn(), goBack: jest.fn() };

const BASE_SCREEN_PROPS: any = {
  navigation: MOCK_NAV,
  params: {},
  currentUserId: 'emp-1',
  currentRole: 'employee',
  onLogout: jest.fn(),
};

function setupTheme() {
  mockUseTheme.mockReturnValue({ colors: MOCK_COLORS, isDark: false, toggleTheme: jest.fn() });
}

function setupAuth() {
  mockUseAuth.mockReturnValue({
    login: jest.fn().mockResolvedValue({ ok: false }),
    logout: jest.fn(),
    signup: jest.fn().mockResolvedValue({ ok: false }),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    removeUser: jest.fn(),
    resetPasswordRequest: jest.fn(),
    resetPasswordVerify: jest.fn(),
    getUsernameForEmail: jest.fn(),
    session: null,
    currentUser: null,
    isLoading: false,
    isAuthenticated: false,
    users: [],
  } as any);
}

function setupApp() {
  mockUseApp.mockReturnValue({
    employees: [],
    goals: [],
    notifications: [],
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
}

function mockDimensions(width: number, height: number) {
  jest.spyOn(Dimensions, 'get').mockReturnValue({ width, height, scale: 2, fontScale: 1 });
}

// ── helpers ──────────────────────────────────────────────────────
function hasScrollView(component: ReturnType<typeof render>) {
  return component.UNSAFE_getAllByType(ScrollView).length > 0;
}

function hasTextInputs(component: ReturnType<typeof render>, minCount: number) {
  return component.UNSAFE_getAllByType(TextInput).length >= minCount;
}

// ════════════════════════════════════════════════════════════════
// SplashScreen
// ════════════════════════════════════════════════════════════════

describe('SplashScreen — responsive rendering', () => {
  beforeEach(() => {
    setupTheme();
  });

  describe.each(DEVICE_SIZES)('$name', ({ width, height }) => {
    beforeEach(() => mockDimensions(width, height));

    it('renders without throwing', () => {
      render(<SplashScreen onSelectRole={jest.fn()} />);
    });

    it('shows the app name and tagline', () => {
      render(<SplashScreen onSelectRole={jest.fn()} />);
      expect(screen.getByText('GrowTracker')).toBeTruthy();
      expect(screen.getByText(/Track growth/i)).toBeTruthy();
    });

    it('shows the role-selection prompt', () => {
      render(<SplashScreen onSelectRole={jest.fn()} />);
      expect(screen.getByText('SIGN IN AS')).toBeTruthy();
    });

    it('renders all three role cards', () => {
      render(<SplashScreen onSelectRole={jest.fn()} />);
      expect(screen.getByText('Admin')).toBeTruthy();
      expect(screen.getByText('Manager')).toBeTruthy();
      expect(screen.getByText('Employee')).toBeTruthy();
    });
  });
});

// ════════════════════════════════════════════════════════════════
// LoginScreen
// ════════════════════════════════════════════════════════════════

describe('LoginScreen — responsive rendering', () => {
  beforeEach(() => {
    setupTheme();
    setupAuth();
  });

  const LOGIN_PROPS = {
    role: 'employee' as const,
    onBack: jest.fn(),
    onForgotUsername: jest.fn(),
    onForgotPassword: jest.fn(),
    onSignUp: jest.fn(),
    onSuccess: jest.fn(),
  };

  describe.each(DEVICE_SIZES)('$name', ({ width, height }) => {
    beforeEach(() => mockDimensions(width, height));

    it('renders without throwing', () => {
      render(<LoginScreen {...LOGIN_PROPS} />);
    });

    it('has a ScrollView so content is reachable on small screens', () => {
      const component = render(<LoginScreen {...LOGIN_PROPS} />);
      expect(hasScrollView(component)).toBe(true);
    });

    it('shows the portal heading', () => {
      render(<LoginScreen {...LOGIN_PROPS} />);
      expect(screen.getByText(/Employee Portal/i)).toBeTruthy();
    });

    it('has username and password inputs in the tree', () => {
      const component = render(<LoginScreen {...LOGIN_PROPS} />);
      // At least 2 TextInputs: identifier + password
      expect(hasTextInputs(component, 2)).toBe(true);
    });

    it('has a Sign In button', () => {
      render(<LoginScreen {...LOGIN_PROPS} />);
      expect(screen.getByText('Sign In')).toBeTruthy();
    });

    it('has sign-up and forgot-password links', () => {
      render(<LoginScreen {...LOGIN_PROPS} />);
      expect(screen.getByText(/Sign Up/i)).toBeTruthy();
      // Forgot Username + Forgot Password both match /Forgot/i
      expect(screen.getAllByText(/Forgot/i).length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ════════════════════════════════════════════════════════════════
// SignUpScreen
// ════════════════════════════════════════════════════════════════

describe('SignUpScreen — responsive rendering', () => {
  beforeEach(() => {
    setupTheme();
    setupAuth();
  });

  const SIGNUP_PROPS = {
    role: 'employee' as const,
    onBack: jest.fn(),
    onSuccess: jest.fn(),
    onSignIn: jest.fn(),
  };

  describe.each(DEVICE_SIZES)('$name', ({ width, height }) => {
    beforeEach(() => mockDimensions(width, height));

    it('renders without throwing', () => {
      render(<SignUpScreen {...SIGNUP_PROPS} />);
    });

    it('has a ScrollView — form fields extend beyond small viewports', () => {
      const component = render(<SignUpScreen {...SIGNUP_PROPS} />);
      expect(hasScrollView(component)).toBe(true);
    });

    it('shows the Create Account heading', () => {
      render(<SignUpScreen {...SIGNUP_PROPS} />);
      // Both the page heading and the submit button contain "Create Account"
      expect(screen.getAllByText(/Create Account/i).length).toBeGreaterThanOrEqual(1);
    });

    it('has at least 5 inputs (first name, last name, email, username, password, confirm)', () => {
      const component = render(<SignUpScreen {...SIGNUP_PROPS} />);
      expect(hasTextInputs(component, 5)).toBe(true);
    });

    it('has the Create Account submit button', () => {
      render(<SignUpScreen {...SIGNUP_PROPS} />);
      expect(screen.getAllByText(/Create Account/i).length).toBeGreaterThanOrEqual(1);
    });

    it('has a Sign In link for users who already have an account', () => {
      render(<SignUpScreen {...SIGNUP_PROPS} />);
      expect(screen.getByText(/Sign In/i)).toBeTruthy();
    });
  });
});

// ════════════════════════════════════════════════════════════════
// EmployeeDashboard
// ════════════════════════════════════════════════════════════════

describe('EmployeeDashboard — responsive rendering', () => {
  beforeEach(() => {
    setupTheme();
    setupApp();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-20T12:00:00Z').getTime());
  });

  afterEach(() => jest.useRealTimers());

  const EMPLOYEE: any = {
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
  };

  describe.each(DEVICE_SIZES)('$name', ({ width, height }) => {
    beforeEach(() => {
      mockDimensions(width, height);
      mockUseApp.mockReturnValue({
        employees: [EMPLOYEE],
        goals: [],
        notifications: [],
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
    });

    it('renders without throwing', () => {
      render(<EmployeeDashboard {...BASE_SCREEN_PROPS} />);
    });

    it('has a ScrollView for the tab content area', () => {
      const component = render(<EmployeeDashboard {...BASE_SCREEN_PROPS} />);
      expect(hasScrollView(component)).toBe(true);
    });

    it('renders the tab bar with all navigation tabs', () => {
      render(<EmployeeDashboard {...BASE_SCREEN_PROPS} />);
      expect(screen.getByTestId('tab-overview')).toBeTruthy();
      expect(screen.getByTestId('tab-analysis')).toBeTruthy();
      expect(screen.getByTestId('tab-actions')).toBeTruthy();
    });

    it('shows key workspace links on the overview tab', () => {
      render(<EmployeeDashboard {...BASE_SCREEN_PROPS} />);
      expect(screen.getByText('My Goals')).toBeTruthy();
      expect(screen.getByText('Daily Work Log')).toBeTruthy();
    });
  });
});

// ════════════════════════════════════════════════════════════════
// DailyLogScreen
// ════════════════════════════════════════════════════════════════

describe('DailyLogScreen — responsive rendering', () => {
  beforeEach(() => {
    setupTheme();
    setupApp();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-20T12:00:00Z').getTime());
  });

  afterEach(() => jest.useRealTimers());

  describe.each(DEVICE_SIZES)('$name', ({ width, height }) => {
    beforeEach(() => mockDimensions(width, height));

    it('renders without throwing', () => {
      render(<DailyLogScreen {...BASE_SCREEN_PROPS} />);
    });

    it('has a ScrollView — task list and notes extend beyond small viewports', () => {
      const component = render(<DailyLogScreen {...BASE_SCREEN_PROPS} />);
      expect(hasScrollView(component)).toBe(true);
    });

    it('shows the Daily Log heading', () => {
      render(<DailyLogScreen {...BASE_SCREEN_PROPS} />);
      expect(screen.getByText('Daily Log')).toBeTruthy();
    });

    it('has a task description input and a notes input', () => {
      const component = render(<DailyLogScreen {...BASE_SCREEN_PROPS} />);
      // At least 2 TextInputs: task description + notes
      expect(hasTextInputs(component, 2)).toBe(true);
    });

    it('shows the Save Daily Log button', () => {
      render(<DailyLogScreen {...BASE_SCREEN_PROPS} />);
      expect(screen.getByText('Save Daily Log')).toBeTruthy();
    });

    it('shows the Tasks Completed section header', () => {
      render(<DailyLogScreen {...BASE_SCREEN_PROPS} />);
      expect(screen.getByText('Tasks Completed')).toBeTruthy();
    });
  });
});

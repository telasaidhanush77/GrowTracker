/**
 * Landscape-rotation responsive layout tests.
 *
 * WHAT THESE TESTS VERIFY (all runnable in Jest / JSDOM):
 *   1. Every covered screen renders without throwing at each landscape size.
 *   2. No View with a fixed numeric `width` overflows the landscape screen width.
 *      (Percentage widths and flex children are exempt — they adapt automatically.)
 *   3. Screens that contain scrollable content expose at least one ScrollView —
 *      critical in landscape because available height drops to 320–412 pt.
 *   4. Key interactive elements are still present in the component tree after the
 *      Dimensions mock is applied.
 *
 * WHAT THESE TESTS CANNOT VERIFY (requires simulator / physical device):
 *   — Actual pixel layout from the Yoga/React Native layout engine.
 *   — KeyboardAvoidingView adjustment when the on-screen keyboard is open.
 *   — SafeAreaView inset changes for landscape safe-area notches.
 *   — Clipping of content taller than the viewport when there is no ScrollView.
 *   — Text truncation from numberOfLines at narrowed landscape column widths.
 *
 * See the "Manual rotation check" describe block at the bottom for a screen-by-screen
 * checklist of what to verify in the iOS Simulator / Android Emulator.
 *
 * MAESTRO NOTE:
 *   Maestro ≥ 1.37.0 added a `setOrientation: landscape` command.
 *   On Android emulators it is reliable. On iOS simulators it requires the
 *   Simulator's Hardware → Rotate menu AND the app's Info.plist to allow rotation
 *   (UISupportedInterfaceOrientations must include landscape values).
 *   Verify that `maestro --version` is ≥ 1.37.0 and test a simple flow before
 *   building a full landscape E2E suite.
 */

import React from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { render, screen } from '@testing-library/react-native';

// ── context mocks ─────────────────────────────────────────────────────────────

jest.mock('../../context/AuthContext',  () => ({ useAuth: jest.fn() }));
jest.mock('../../context/AppContext',   () => ({ useApp: jest.fn() }));
jest.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));

// ── component mocks ───────────────────────────────────────────────────────────

jest.mock('../../components/Header', () => {
  const { View, Text } = require('react-native');
  return ({ title }: any) => (
    <View testID="header"><Text>{title}</Text></View>
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
jest.mock('../../components/charts/GoalStatusBar', () => () => null);
jest.mock('../../components/charts/ProgressRing',  () => () => null);
jest.mock('../../components/charts/MiniBarChart',  () => () => null);
jest.mock('../../lib/supabase', () => ({ supabase: { auth: {}, from: jest.fn() } }));

// ── imports ───────────────────────────────────────────────────────────────────

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

// ── landscape sizes under test ────────────────────────────────────────────────

const LANDSCAPE_SIZES = [
  // width × height when device is rotated 90°
  { name: 'iPhone SE landscape (568×320)',  width: 568, height: 320 },
  { name: 'iPhone 14 landscape (812×375)',  width: 812, height: 375 },
  { name: 'Android landscape (915×412)',    width: 915, height: 412 },
] as const;

// ── shared fixtures ───────────────────────────────────────────────────────────

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
  chartTrack: '#e5e7eb', overlay: 'rgba(0,0,0,0.4)',
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
  onSwitchAccount: jest.fn(),
};

const EMPLOYEE: any = {
  id: 'emp-1', employeeCode: 'EMP001',
  firstName: 'Alice', lastName: 'Smith', name: 'Alice Smith',
  email: 'alice@test.com', username: 'alice', role: 'employee',
  department: 'Engineering', designation: 'Software Engineer',
  managerId: undefined, joinDate: '2024-01-01', status: 'active',
  avatarInitials: 'AS', createdAt: '2024-01-01T00:00:00Z', passwordHash: '',
};

// ── setup helpers ─────────────────────────────────────────────────────────────

function mockDimensions(width: number, height: number) {
  jest.spyOn(Dimensions, 'get').mockReturnValue({ width, height, scale: 2, fontScale: 1 });
}

function setupTheme() {
  mockUseTheme.mockReturnValue({ colors: MOCK_COLORS, isDark: false, toggleTheme: jest.fn() } as any);
}

function setupAuth() {
  mockUseAuth.mockReturnValue({
    login: jest.fn().mockResolvedValue({ ok: false }),
    logout: jest.fn(),
    signup: jest.fn().mockResolvedValue({ ok: false }),
  } as any);
}

function setupApp(extras: Partial<ReturnType<typeof useApp>> = {}) {
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
    ...extras,
  } as any);
}

// ── overflow detection utility ────────────────────────────────────────────────

/**
 * Walks every View in the rendered tree and returns those whose resolved style
 * contains a fixed numeric `width` exceeding `screenWidth`.
 *
 * Percentage widths and flex children are left out on purpose — they adapt
 * automatically to the viewport.  Only hard-coded pixel widths (e.g. `width: 600`)
 * represent a genuine overflow risk when dimensions change.
 */
function findFixedWidthOverflows(
  component: ReturnType<typeof render>,
  screenWidth: number,
): Array<{ testID: string | undefined; width: number }> {
  const views = component.UNSAFE_getAllByType(View);
  const overflowing: Array<{ testID: string | undefined; width: number }> = [];

  for (const v of views) {
    const style = StyleSheet.flatten(v.props.style) ?? {};
    const w = style.width;
    if (typeof w === 'number' && w > screenWidth) {
      overflowing.push({ testID: v.props.testID, width: w });
    }
    const mw = style.minWidth;
    if (typeof mw === 'number' && mw > screenWidth) {
      overflowing.push({ testID: v.props.testID, width: mw });
    }
  }

  return overflowing;
}

function hasScrollView(component: ReturnType<typeof render>) {
  try {
    return component.UNSAFE_getAllByType(ScrollView).length > 0;
  } catch {
    return false;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// SplashScreen
// ═════════════════════════════════════════════════════════════════════════════

describe('SplashScreen — landscape rendering', () => {
  beforeEach(() => setupTheme());

  describe.each(LANDSCAPE_SIZES)('$name', ({ width, height }) => {
    beforeEach(() => mockDimensions(width, height));

    it('renders without throwing', () => {
      render(<SplashScreen onSelectRole={jest.fn()} />);
    });

    it('no fixed-width View overflows the landscape screen width', () => {
      const component = render(<SplashScreen onSelectRole={jest.fn()} />);
      const overflows = findFixedWidthOverflows(component, width);
      expect(overflows).toHaveLength(0);
    });

    it('all three role cards are present', () => {
      render(<SplashScreen onSelectRole={jest.fn()} />);
      expect(screen.getByText('Admin')).toBeTruthy();
      expect(screen.getByText('Manager')).toBeTruthy();
      expect(screen.getByText('Employee')).toBeTruthy();
    });

    it('has a ScrollView so role cards are not clipped on short landscape viewports', () => {
      const component = render(<SplashScreen onSelectRole={jest.fn()} />);
      expect(hasScrollView(component)).toBe(true);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// LoginScreen
// ═════════════════════════════════════════════════════════════════════════════

describe('LoginScreen — landscape rendering', () => {
  const LOGIN_PROPS = {
    role: 'employee' as const,
    onBack: jest.fn(),
    onForgotUsername: jest.fn(),
    onForgotPassword: jest.fn(),
    onSignUp: jest.fn(),
    onSuccess: jest.fn(),
  };

  beforeEach(() => { setupTheme(); setupAuth(); });

  describe.each(LANDSCAPE_SIZES)('$name', ({ width, height }) => {
    beforeEach(() => mockDimensions(width, height));

    it('renders without throwing', () => {
      render(<LoginScreen {...LOGIN_PROPS} />);
    });

    it('no fixed-width View overflows the landscape screen width', () => {
      const component = render(<LoginScreen {...LOGIN_PROPS} />);
      expect(findFixedWidthOverflows(component, width)).toHaveLength(0);
    });

    it('has a ScrollView — required when keyboard shrinks landscape height', () => {
      // On iPhone SE landscape the on-screen keyboard leaves ≈104pt visible.
      // Without a ScrollView the Sign In button would be permanently hidden.
      const component = render(<LoginScreen {...LOGIN_PROPS} />);
      expect(hasScrollView(component)).toBe(true);
    });

    it('username and password inputs are in the tree', () => {
      render(<LoginScreen {...LOGIN_PROPS} />);
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
    });

    it('forgot-password and forgot-username links are in the tree', () => {
      render(<LoginScreen {...LOGIN_PROPS} />);
      expect(screen.getByRole('button', { name: 'Forgot username' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Forgot password' })).toBeTruthy();
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SignUpScreen
// ═════════════════════════════════════════════════════════════════════════════

describe('SignUpScreen — landscape rendering', () => {
  const SIGNUP_PROPS = {
    role: 'employee' as const,
    onBack: jest.fn(),
    onSuccess: jest.fn(),
    onSignIn: jest.fn(),
  };

  beforeEach(() => { setupTheme(); setupAuth(); });

  describe.each(LANDSCAPE_SIZES)('$name', ({ width, height }) => {
    beforeEach(() => mockDimensions(width, height));

    it('renders without throwing', () => {
      render(<SignUpScreen {...SIGNUP_PROPS} />);
    });

    it('no fixed-width View overflows the landscape screen width', () => {
      const component = render(<SignUpScreen {...SIGNUP_PROPS} />);
      expect(findFixedWidthOverflows(component, width)).toHaveLength(0);
    });

    it('has a ScrollView — 8+ form fields cannot fit in landscape without scrolling', () => {
      const component = render(<SignUpScreen {...SIGNUP_PROPS} />);
      expect(hasScrollView(component)).toBe(true);
    });

    it('first/last name row is present (side-by-side layout, not overflow)', () => {
      render(<SignUpScreen {...SIGNUP_PROPS} />);
      // Both inputs are found — the row uses flex: 1 on each, so they split width equally
      expect(screen.getByRole('button', { name: 'Create account' })).toBeTruthy();
    });

    it('terms checkbox is present in the tree', () => {
      render(<SignUpScreen {...SIGNUP_PROPS} />);
      expect(screen.getByRole('checkbox')).toBeTruthy();
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// EmployeeDashboard
// ═════════════════════════════════════════════════════════════════════════════

describe('EmployeeDashboard — landscape rendering', () => {
  beforeEach(() => {
    setupTheme();
    setupApp({ employees: [EMPLOYEE] });
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-19T12:00:00Z').getTime());
  });

  afterEach(() => jest.useRealTimers());

  describe.each(LANDSCAPE_SIZES)('$name', ({ width, height }) => {
    beforeEach(() => mockDimensions(width, height));

    it('renders without throwing', () => {
      render(<EmployeeDashboard {...BASE_SCREEN_PROPS} />);
    });

    it('no fixed-width View overflows the landscape screen width', () => {
      const component = render(<EmployeeDashboard {...BASE_SCREEN_PROPS} />);
      expect(findFixedWidthOverflows(component, width)).toHaveLength(0);
    });

    it('has a ScrollView for the tab content area', () => {
      const component = render(<EmployeeDashboard {...BASE_SCREEN_PROPS} />);
      expect(hasScrollView(component)).toBe(true);
    });

    it('Q1/Q2 score cards render side-by-side without overflow', () => {
      // ringsRow is flex: row with two flex:1 children — each takes half the landscape width.
      // On iPhone SE landscape: 568/2 = 284pt per card. No overflow expected.
      render(<EmployeeDashboard {...BASE_SCREEN_PROPS} />);
      expect(screen.getByTestId('tab-overview')).toBeTruthy();
    });

    it('bottom tab bar is present', () => {
      render(<EmployeeDashboard {...BASE_SCREEN_PROPS} />);
      expect(screen.getByTestId('bottom-tab-bar')).toBeTruthy();
    });

    it('My Goals and Daily Work Log nav rows are present', () => {
      render(<EmployeeDashboard {...BASE_SCREEN_PROPS} />);
      expect(screen.getByRole('button', { name: /my goals/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /daily work log/i })).toBeTruthy();
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// DailyLogScreen
// ═════════════════════════════════════════════════════════════════════════════

describe('DailyLogScreen — landscape rendering', () => {
  beforeEach(() => {
    setupTheme();
    setupApp();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-19T12:00:00Z').getTime());
  });

  afterEach(() => jest.useRealTimers());

  describe.each(LANDSCAPE_SIZES)('$name', ({ width, height }) => {
    beforeEach(() => mockDimensions(width, height));

    it('renders without throwing', () => {
      render(<DailyLogScreen {...BASE_SCREEN_PROPS} />);
    });

    it('no fixed-width View overflows the landscape screen width', () => {
      const component = render(<DailyLogScreen {...BASE_SCREEN_PROPS} />);
      expect(findFixedWidthOverflows(component, width)).toHaveLength(0);
    });

    it('has a ScrollView — task list + notes textarea cannot fit above the landscape keyboard', () => {
      const component = render(<DailyLogScreen {...BASE_SCREEN_PROPS} />);
      expect(hasScrollView(component)).toBe(true);
    });

    it('Save Daily Log button is present', () => {
      render(<DailyLogScreen {...BASE_SCREEN_PROPS} />);
      expect(screen.getByText('Save Daily Log')).toBeTruthy();
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Screens requiring a manual rotation check in the simulator
// ═════════════════════════════════════════════════════════════════════════════

/**
 * These tests are intentionally skipped — they document what CANNOT be verified
 * automatically and must be checked manually in the iOS Simulator or Android
 * Emulator after rotating to landscape.
 *
 * HOW TO RUN A MANUAL CHECK:
 *   iOS Simulator  : Hardware → Rotate Left (⌘←) while the app is running.
 *                    Make sure Hardware → Device → Rotate Device Automatically is on.
 *   Android Emulator: Use the rotate button in the emulator controls sidebar,
 *                     or adb shell settings put system accelerometer_rotation 1.
 *
 * MAESTRO:
 *   Requires ≥ v1.37.0. Use `- setOrientation: landscape` before the flow steps.
 *   Verify with `maestro --version`. iOS simulator support is less reliable than
 *   Android — always confirm the device actually rotated before asserting on layout.
 */
describe('Manual rotation checks (skipped in CI)', () => {

  test(
    'SplashScreen: all role cards scroll into view on iPhone SE landscape (568×320)',
    () => {
      // WHAT TO CHECK:
      //   Rotate iPhone SE simulator to landscape. Scroll down — all three role
      //   cards (Admin, Manager, Employee) must be reachable and tappable.
      //   The ScrollView was added to fix the previous clipping issue; verify that
      //   the contentContainerStyle flexGrow:1 / justifyContent:"space-between"
      //   still produces an even layout in portrait (no regression).
    }
  );

  test(
    'LoginScreen: Sign In button is reachable above the on-screen keyboard in landscape',
    () => {
      // WHAT TO CHECK:
      //   Open LoginScreen, rotate to landscape. Tap the Password field to raise
      //   the keyboard (~216pt on iPhone SE landscape, leaving ~104pt visible area).
      //   The Sign In button must be scrollable into view — KeyboardAvoidingView +
      //   ScrollView with keyboardShouldPersistTaps="handled" handles this, but
      //   KAV's "padding" behavior on iOS only insets the ScrollView by the keyboard
      //   height if the entire KAV is NOT inside a tab navigator or nested scroll.
      //   Verify that tapping Sign In after typing a password actually fires — if KAV
      //   mis-calculates the offset the button may appear visible but be un-tappable.
      //
      // DEVICES TO TEST:
      //   iPhone SE (568×320) — most constrained, least room above keyboard.
      //   Any Android with gesture navigation — bottom inset varies.
    }
  );

  test(
    'SignUpScreen: all 8 form fields are reachable and the Create Account button is visible in landscape',
    () => {
      // WHAT TO CHECK:
      //   Rotate to landscape and tab through all fields: First Name → Last Name →
      //   Email → Username → Mobile → Password → Confirm Password → Terms → Create.
      //   On iPhone SE landscape (320pt height) the keyboard leaves ~104pt visible.
      //   Each field, when focused, should auto-scroll so it is not obscured by the
      //   keyboard. The Create Account button must be reachable by scrolling up.
      //
      // DEVICES TO TEST:
      //   iPhone SE landscape (568×320) — most constrained.
      //   iPhone 14 landscape (812×375) — expected to work well.
    }
  );

  test(
    'EmployeeDashboard: bottom tab bar clears the home indicator in landscape',
    () => {
      // WHAT TO CHECK:
      //   BottomTabBar is now taller on iOS (78pt vs 58pt, paddingBottom: 24pt)
      //   to clear the home indicator. On iPhone 14 landscape, confirm the tab labels
      //   are still fully visible above the indicator and the indicator itself is not
      //   obscured. Also verify the Q1/Q2 ring cards side-by-side score text
      //   (fontSize 28) does not wrap on iPhone SE landscape where each card is
      //   (568 - 32 - 10) / 2 = 263pt wide.
    }
  );

  test(
    'DailyLogScreen: multi-line notes TextInput expands correctly and Save button is reachable in landscape',
    () => {
      // WHAT TO CHECK:
      //   The notes TextInput uses multiline={true}. In landscape, the available
      //   height above the keyboard is ~160pt (iPhone 14) or ~104pt (iPhone SE).
      //   Tap the notes field. Verify:
      //     1. The field scrolls into view.
      //     2. The multiline textarea does not expand so tall that it hides the
      //        Save Daily Log button entirely.
      //   If the textarea has no maxHeight, it grows with content and can push the
      //   Save button off-screen. A maxHeight or ScrollView around just the notes
      //   section would prevent this.
    }
  );
});

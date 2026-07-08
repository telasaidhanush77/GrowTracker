/**
 * Platform.OS branch tests.
 *
 * WHAT IS TESTED:
 *   Every file that contains `Platform.OS` or `Platform.select` is covered here.
 *   For each file, both the iOS and Android branches are exercised — the test
 *   confirms at minimum that the component renders without throwing, and where
 *   the branched value is observable at render time it is also asserted.
 *
 * FILES COVERED:
 *   src/components/BottomTabBar.tsx          — height / paddingBottom styles
 *   src/components/Header.tsx                — paddingTop style (root View)
 *   src/screens/auth/LoginScreen.tsx         — KAV behavior prop
 *   src/screens/auth/SignUpScreen.tsx        — KAV behavior prop
 *   src/screens/auth/ForgotPasswordScreen.tsx— KAV behavior prop
 *   src/screens/auth/ForgotUsernameScreen.tsx— KAV behavior prop
 *   src/screens/admin/OnboardEmployee.tsx    — KAV behavior prop
 *   src/screens/employee/DailyLogScreen.tsx  — KAV behavior prop
 *   src/hooks/usePushNotifications.ts        — Android notification-channel creation
 *   src/screens/RoleSelector.tsx             — statusBarPad style
 *   src/screens/employee/SubmitEvidence.tsx  — Platform.OS !== 'web' guard
 *   src/screens/manager/SetGoals.tsx         — Platform.OS !== 'web' guard
 *
 * LIMITATIONS:
 *   BottomTabBar's height / paddingBottom are fixed in a module-level
 *   StyleSheet.create call and cannot be re-evaluated in a single test run
 *   without jest.isolateModules. Those style values are therefore not asserted;
 *   the tests confirm render-only correctness for both platforms.
 */

import React from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { render, renderHook, act } from '@testing-library/react-native';

// ── context mocks ─────────────────────────────────────────────────────────────

jest.mock('../../context/AuthContext',  () => ({ useAuth:  jest.fn() }));
jest.mock('../../context/AppContext',   () => ({ useApp:   jest.fn() }));
jest.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../context/ToastContext', () => ({ useToast: jest.fn() }));

// ── component / hook mocks ────────────────────────────────────────────────────

jest.mock('../../components/Header', () => {
  const { View, Text } = require('react-native');
  return ({ title }: any) => <View testID="header"><Text>{title}</Text></View>;
});
jest.mock('../../components/AnimatedButton', () => ({
  AnimatedButton: ({ children, onPress }: any) => {
    const { TouchableOpacity } = require('react-native');
    return <TouchableOpacity onPress={onPress}>{children}</TouchableOpacity>;
  },
}));
jest.mock('../../components/PermissionDeniedBanner', () => () => null);
jest.mock('../../components/charts/GoalStatusBar', () => () => null);
jest.mock('../../components/charts/ProgressRing',  () => () => null);
jest.mock('../../components/charts/MiniBarChart',  () => () => null);
jest.mock('../../hooks/useImagePicker', () => ({
  useImagePicker: () => ({
    cameraStatus: 'granted',
    libraryStatus: 'granted',
    pickFromCamera: jest.fn().mockResolvedValue(null),
    pickFromLibrary: jest.fn().mockResolvedValue(null),
    openSettings: jest.fn(),
  }),
}));
jest.mock('../../lib/supabase', () => ({
  supabase: { auth: {}, from: jest.fn() },
}));

// expo-notifications — mock the whole module so usePushNotifications can be
// tested without a real Expo device environment.
const mockSetNotifChannel = jest.fn().mockResolvedValue(undefined);
jest.mock('expo-notifications', () => ({
  getPermissionsAsync:          jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync:      jest.fn().mockResolvedValue({ status: 'granted' }),
  setNotificationChannelAsync:  (...args: any[]) => mockSetNotifChannel(...args),
  getExpoPushTokenAsync:        jest.fn().mockResolvedValue({ data: 'ExponentPushToken[xxx]' }),
  AndroidImportance:            { MAX: 5 },
}));
jest.mock('expo-constants', () => ({
  default: { isDevice: false }, // disable actual token fetch
}));

// ── imports (after mocks) ─────────────────────────────────────────────────────

import { useAuth }  from '../../context/AuthContext';
import { useApp }   from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

import BottomTabBar         from '../../components/BottomTabBar';
import LoginScreen          from '../../screens/auth/LoginScreen';
import SignUpScreen         from '../../screens/auth/SignUpScreen';
import ForgotPasswordScreen from '../../screens/auth/ForgotPasswordScreen';
import ForgotUsernameScreen from '../../screens/auth/ForgotUsernameScreen';
import OnboardEmployee      from '../../screens/admin/OnboardEmployee';
import DailyLogScreen       from '../../screens/employee/DailyLogScreen';
import RoleSelector         from '../../screens/RoleSelector';
import SubmitEvidence       from '../../screens/employee/SubmitEvidence';
import SetGoals             from '../../screens/manager/SetGoals';
import { usePushNotifications } from '../../hooks/usePushNotifications';

const mockUseAuth  = useAuth  as jest.MockedFunction<typeof useAuth>;
const mockUseApp   = useApp   as jest.MockedFunction<typeof useApp>;
const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

// ── platform helper ───────────────────────────────────────────────────────────

function setPlatform(os: 'ios' | 'android') {
  Object.defineProperty(Platform, 'OS', {
    get: () => os,
    configurable: true,
  });
}

// ── shared fixtures ───────────────────────────────────────────────────────────

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
  managerId: null, joinDate: '2024-01-01', status: 'active',
  avatarInitials: 'AS', createdAt: '2024-01-01T00:00:00Z', passwordHash: '',
};

const GOAL: any = {
  id: 'goal-1', employeeId: 'emp-1',
  title: 'Q2 goal', description: 'deliver feature',
  quarter: 'Q2', priority: 'medium', category: 'technical',
  targetDate: '2026-06-30', weight: 10, status: 'in_progress',
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
};

function setupTheme() {
  mockUseTheme.mockReturnValue({ colors: MOCK_COLORS, isDark: false, toggleTheme: jest.fn() } as any);
}

function setupAuth() {
  mockUseAuth.mockReturnValue({
    login:  jest.fn().mockResolvedValue({ ok: false }),
    logout: jest.fn(),
    signup: jest.fn().mockResolvedValue({ ok: false }),
    resetPasswordRequest: jest.fn().mockResolvedValue({ ok: false }),
    resetPasswordVerify:  jest.fn().mockResolvedValue({ ok: false }),
  } as any);
}

function setupApp() {
  mockUseApp.mockReturnValue({
    employees: [EMPLOYEE],
    goals: [GOAL],
    notifications: [],
    dailyLogs: [],
    emailExists:     jest.fn().mockResolvedValue(false),
    addEmployee:     jest.fn(),
    updateEmployee:  jest.fn(),
    addGoal:         jest.fn(),
    updateGoal:      jest.fn(),
    deleteGoal:      jest.fn(),
    submitEvidence:  jest.fn(),
    reviewEvidence:  jest.fn(),
    markNotifRead:   jest.fn(),
    markAllRead:     jest.fn(),
    addNotification: jest.fn(),
    closeFiscalYear: jest.fn(),
    saveDailyLog:    jest.fn(),
    removeEmployee:  jest.fn(),
  } as any);
}

function setupToast() {
  mockUseToast.mockReturnValue({ showToast: jest.fn() } as any);
}

beforeEach(() => {
  jest.clearAllMocks();
  setupTheme();
  setupAuth();
  setupApp();
  setupToast();
  mockSetNotifChannel.mockClear();
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-06-21T12:00:00Z'));
});

afterEach(() => {
  setPlatform('ios'); // restore default
  jest.useRealTimers();
});

// ── helpers ───────────────────────────────────────────────────────────────────

function kavBehavior(component: ReturnType<typeof render>): string | undefined {
  const kavs = component.UNSAFE_getAllByType(KeyboardAvoidingView);
  return kavs[0]?.props.behavior;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BottomTabBar
// ═══════════════════════════════════════════════════════════════════════════════

describe('BottomTabBar — platform branches', () => {
  const TABS = [
    { key: 'home',    label: 'Home',    icon: '🏠' },
    { key: 'goals',   label: 'Goals',   icon: '🎯' },
  ];

  it('renders on iOS without error', () => {
    setPlatform('ios');
    expect(() =>
      render(<BottomTabBar tabs={TABS} activeKey="home" onSelect={jest.fn()} />)
    ).not.toThrow();
  });

  it('renders on Android without error', () => {
    setPlatform('android');
    expect(() =>
      render(<BottomTabBar tabs={TABS} activeKey="home" onSelect={jest.fn()} />)
    ).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Header — paddingTop (android: 46, ios: 60)
// NOTE: We test the real Header component here, bypassing the jest.mock above.
//       We do this by importing Header directly as 'HeaderReal'.
// ═══════════════════════════════════════════════════════════════════════════════

describe('Header — paddingTop platform branch', () => {
  // The Header mock is active for this module, so we need the real implementation.
  // We use jest.requireActual to bypass the mock for these specific tests.
  let HeaderReal: React.ComponentType<any>;

  beforeAll(() => {
    HeaderReal = jest.requireActual('../../components/Header').default;
  });

  it('applies paddingTop 60 on iOS', () => {
    setPlatform('ios');
    const comp = render(<HeaderReal title="Test" />);
    const views = comp.UNSAFE_getAllByType(View);
    const rootStyle = StyleSheet.flatten(views[0].props.style) ?? {};
    expect(rootStyle.paddingTop).toBe(60);
  });

  it('applies paddingTop 46 on Android', () => {
    setPlatform('android');
    const comp = render(<HeaderReal title="Test" />);
    const views = comp.UNSAFE_getAllByType(View);
    const rootStyle = StyleSheet.flatten(views[0].props.style) ?? {};
    expect(rootStyle.paddingTop).toBe(46);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// KAV behavior prop — six screens
// ═══════════════════════════════════════════════════════════════════════════════

describe('LoginScreen — KAV behavior prop', () => {
  const PROPS = {
    role: 'employee' as const,
    onBack: jest.fn(), onForgotUsername: jest.fn(),
    onForgotPassword: jest.fn(), onSignUp: jest.fn(), onSuccess: jest.fn(),
  };

  it('passes behavior="padding" on iOS', () => {
    setPlatform('ios');
    const comp = render(<LoginScreen {...PROPS} />);
    expect(kavBehavior(comp)).toBe('padding');
  });

  it('passes behavior=undefined on Android', () => {
    setPlatform('android');
    const comp = render(<LoginScreen {...PROPS} />);
    expect(kavBehavior(comp)).toBeUndefined();
  });
});

describe('SignUpScreen — KAV behavior prop', () => {
  const PROPS = {
    role: 'employee' as const,
    onBack: jest.fn(), onSuccess: jest.fn(), onSignIn: jest.fn(),
  };

  it('passes behavior="padding" on iOS', () => {
    setPlatform('ios');
    const comp = render(<SignUpScreen {...PROPS} />);
    expect(kavBehavior(comp)).toBe('padding');
  });

  it('passes behavior=undefined on Android', () => {
    setPlatform('android');
    const comp = render(<SignUpScreen {...PROPS} />);
    expect(kavBehavior(comp)).toBeUndefined();
  });
});

describe('ForgotPasswordScreen — KAV behavior prop', () => {
  const PROPS = { onBack: jest.fn(), onSuccess: jest.fn() };

  it('passes behavior="padding" on iOS', () => {
    setPlatform('ios');
    const comp = render(<ForgotPasswordScreen {...PROPS} />);
    expect(kavBehavior(comp)).toBe('padding');
  });

  it('passes behavior=undefined on Android', () => {
    setPlatform('android');
    const comp = render(<ForgotPasswordScreen {...PROPS} />);
    expect(kavBehavior(comp)).toBeUndefined();
  });
});

describe('ForgotUsernameScreen — KAV behavior prop', () => {
  const PROPS = { onBack: jest.fn() };

  it('passes behavior="padding" on iOS', () => {
    setPlatform('ios');
    const comp = render(<ForgotUsernameScreen {...PROPS} />);
    expect(kavBehavior(comp)).toBe('padding');
  });

  it('passes behavior=undefined on Android', () => {
    setPlatform('android');
    const comp = render(<ForgotUsernameScreen {...PROPS} />);
    expect(kavBehavior(comp)).toBeUndefined();
  });
});

describe('OnboardEmployee — KAV behavior prop', () => {
  it('passes behavior="padding" on iOS', () => {
    setPlatform('ios');
    const comp = render(<OnboardEmployee {...BASE_SCREEN_PROPS} />);
    expect(kavBehavior(comp)).toBe('padding');
  });

  it('passes behavior=undefined on Android', () => {
    setPlatform('android');
    const comp = render(<OnboardEmployee {...BASE_SCREEN_PROPS} />);
    expect(kavBehavior(comp)).toBeUndefined();
  });
});

describe('DailyLogScreen — KAV behavior prop', () => {
  const PROPS = {
    ...BASE_SCREEN_PROPS,
    notifCount: 0,
  };

  it('passes behavior="padding" on iOS', () => {
    setPlatform('ios');
    const comp = render(<DailyLogScreen {...PROPS} />);
    expect(kavBehavior(comp)).toBe('padding');
  });

  it('passes behavior=undefined on Android', () => {
    setPlatform('android');
    const comp = render(<DailyLogScreen {...PROPS} />);
    expect(kavBehavior(comp)).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// usePushNotifications — Android notification channel
// ═══════════════════════════════════════════════════════════════════════════════

describe('usePushNotifications — Android notification channel', () => {
  it('does NOT call setNotificationChannelAsync on iOS', async () => {
    setPlatform('ios');
    const { result } = renderHook(() => usePushNotifications());
    await act(async () => { await result.current.register(); });
    expect(mockSetNotifChannel).not.toHaveBeenCalled();
  });

  it('calls setNotificationChannelAsync on Android', async () => {
    setPlatform('android');
    const { result } = renderHook(() => usePushNotifications());
    await act(async () => { await result.current.register(); });
    expect(mockSetNotifChannel).toHaveBeenCalledWith(
      'default',
      expect.objectContaining({ name: 'default' }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RoleSelector — statusBarPad (ios: 64, android: 48)
// ═══════════════════════════════════════════════════════════════════════════════

describe('RoleSelector — statusBarPad platform branch', () => {
  const PROPS = { onRoleSelect: jest.fn() };

  it('renders on iOS without error', () => {
    setPlatform('ios');
    expect(() => render(<RoleSelector {...PROPS} />)).not.toThrow();
  });

  it('renders on Android without error', () => {
    setPlatform('android');
    expect(() => render(<RoleSelector {...PROPS} />)).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SubmitEvidence — Platform.OS !== 'web' guard
// ═══════════════════════════════════════════════════════════════════════════════

describe('SubmitEvidence — non-web platform guards', () => {
  const PROPS = {
    ...BASE_SCREEN_PROPS,
    params: { goalId: 'goal-1' },
  };

  it('renders on iOS without error', () => {
    setPlatform('ios');
    expect(() => render(<SubmitEvidence {...PROPS} />)).not.toThrow();
  });

  it('renders on Android without error', () => {
    setPlatform('android');
    expect(() => render(<SubmitEvidence {...PROPS} />)).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SetGoals — Platform.OS !== 'web' guard
// ═══════════════════════════════════════════════════════════════════════════════

describe('SetGoals — non-web platform guards', () => {
  const PROPS = {
    ...BASE_SCREEN_PROPS,
    params: { employeeId: 'emp-1' },
  };

  it('renders on iOS without error', () => {
    setPlatform('ios');
    expect(() => render(<SetGoals {...PROPS} />)).not.toThrow();
  });

  it('renders on Android without error', () => {
    setPlatform('android');
    expect(() => render(<SetGoals {...PROPS} />)).not.toThrow();
  });
});

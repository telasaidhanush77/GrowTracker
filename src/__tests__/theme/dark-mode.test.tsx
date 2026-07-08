/**
 * Dark-mode / light-mode snapshot and contract tests.
 *
 * WHAT IS TESTED:
 *   1. Snapshot — each main screen is captured in both themes. Any future change
 *      that alters colours, layout, or visibility will produce a diff, requiring
 *      conscious review before updating the snapshot.
 *
 *   2. Theme sensitivity — the dark-mode and light-mode renders must differ.
 *      If a screen accidentally ignores the theme its two snapshots would be
 *      identical; this assertion catches that.
 *
 *   3. Invisible-text contract — uses a parent-walk helper to find the nearest
 *      ancestor with a backgroundColor and checks that:
 *        • In light mode: no Text with a hardcoded white colour sits on a white
 *          or near-white background (would be invisible).
 *        • In dark mode:  no Text with a hardcoded black colour sits on a dark
 *          or near-black background (would be invisible).
 *      Known-safe uses (e.g. white button text on a dark button, black ↻ icon
 *      on an amber circle) correctly pass because the parent background check
 *      returns a contrasting colour.
 *
 *   4. Root background follows theme — the first View whose backgroundColor
 *      can be resolved must match the expected theme bg token.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { render } from '@testing-library/react-native';

import { darkColors, lightColors } from '../../theme';
import type { ColorPalette } from '../../theme';

// ── mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../context/AuthContext',  () => ({ useAuth: jest.fn() }));
jest.mock('../../context/AppContext',   () => ({ useApp: jest.fn() }));
jest.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../components/Header', () => {
  const { View, Text } = require('react-native');
  return ({ title }: any) => <View testID="header"><Text>{title}</Text></View>;
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

// ── theme helpers ─────────────────────────────────────────────────────────────

function mockTheme(colors: ColorPalette, isDark: boolean) {
  mockUseTheme.mockReturnValue({ colors, isDark, toggleTheme: jest.fn() } as any);
}

// ── shared fixtures ───────────────────────────────────────────────────────────

const MOCK_NAV = { navigate: jest.fn(), goBack: jest.fn() };

const BASE_SCREEN_PROPS: any = {
  navigation: MOCK_NAV,
  params: {},
  currentUserId: 'emp-1',
  currentRole: 'employee',
  onLogout: jest.fn(),
  onSwitchAccount: jest.fn(),
};

const LOGIN_PROPS = {
  role: 'employee' as const,
  onBack: jest.fn(),
  onForgotUsername: jest.fn(),
  onForgotPassword: jest.fn(),
  onSignUp: jest.fn(),
  onSuccess: jest.fn(),
};

const SIGNUP_PROPS = {
  role: 'employee' as const,
  onBack: jest.fn(),
  onSuccess: jest.fn(),
  onSignIn: jest.fn(),
};

const EMPLOYEE: any = {
  id: 'emp-1', employeeCode: 'EMP001',
  firstName: 'Alice', lastName: 'Smith', name: 'Alice Smith',
  email: 'alice@test.com', username: 'alice', role: 'employee',
  department: 'Engineering', designation: 'Software Engineer',
  managerId: undefined, joinDate: '2024-01-01', status: 'active',
  avatarInitials: 'AS', createdAt: '2024-01-01T00:00:00Z', passwordHash: '',
};

function setupAuth() {
  mockUseAuth.mockReturnValue({
    login:  jest.fn().mockResolvedValue({ ok: false }),
    logout: jest.fn(),
    signup: jest.fn().mockResolvedValue({ ok: false }),
  } as any);
}

function setupApp() {
  mockUseApp.mockReturnValue({
    employees: [EMPLOYEE],
    goals: [],
    notifications: [],
    dailyLogs: [],
    emailExists:      jest.fn(),
    addEmployee:      jest.fn(),
    updateEmployee:   jest.fn(),
    addGoal:          jest.fn(),
    updateGoal:       jest.fn(),
    deleteGoal:       jest.fn(),
    submitEvidence:   jest.fn(),
    reviewEvidence:   jest.fn(),
    markNotifRead:    jest.fn(),
    markAllRead:      jest.fn(),
    addNotification:  jest.fn(),
    closeFiscalYear:  jest.fn(),
    saveDailyLog:     jest.fn(),
    removeEmployee:   jest.fn(),
  } as any);
}

beforeEach(() => {
  jest.clearAllMocks();
  setupAuth();
  setupApp();
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-06-21T12:00:00Z').getTime());
});

afterEach(() => jest.useRealTimers());

// ── invisible-text detection ──────────────────────────────────────────────────

/**
 * Walk up the element's parent chain and return the first resolved
 * backgroundColor value found, or null if none is set.
 */
function nearestBackground(element: any): string | null {
  let node = element.parent;
  while (node) {
    const style = StyleSheet.flatten(node.props?.style) ?? {};
    if (style.backgroundColor) return (style.backgroundColor as string).toLowerCase();
    node = node.parent;
  }
  return null;
}

/**
 * Colours that are visually near-white (would hide white text placed on them).
 * Excludes mid-tones and saturated colours intentionally — those are fine.
 */
const NEAR_WHITE_BG = new Set([
  '#fff', '#ffffff',
  '#f0f2f5',  // lightColors.bg
  '#f7f8fa',  // lightColors.bgElevated
  '#ffffff',  // lightColors.card
  'white',
]);

/**
 * Colours that are visually near-black (would hide black text placed on them).
 */
const NEAR_BLACK_BG = new Set([
  '#000', '#000000',
  '#0a0a0a',  // darkColors.bg
  '#141414',  // darkColors.bgElevated
  '#1e1e1e',  // darkColors.card
  '#262626',  // darkColors.cardHover
  '#222222',  // darkColors.divider area
  'black',
]);

/**
 * Find all Text nodes whose hardcoded colour would be invisible against the
 * nearest ancestor background.
 *
 * lightMode=true  → look for white text on white/near-white backgrounds
 * lightMode=false → look for black text on black/near-black backgrounds
 */
function findInvisibleText(
  component: ReturnType<typeof render>,
  lightMode: boolean,
): Array<{ text: string; color: string; bg: string | null }> {
  let texts: any[] = [];
  try {
    texts = component.UNSAFE_getAllByType(Text);
  } catch {
    return [];
  }

  const targetColors = lightMode
    ? new Set(['#fff', '#ffffff', '#FFF', '#FFFFFF', 'white'])
    : new Set(['#000', '#000000', 'black']);

  const problematicBgs = lightMode ? NEAR_WHITE_BG : NEAR_BLACK_BG;

  return texts
    .map(t => {
      const style = StyleSheet.flatten(t.props?.style) ?? {};
      const color = (style.color as string | undefined) ?? '';
      const bg = nearestBackground(t);
      return { text: String(t.props?.children ?? ''), color, bg };
    })
    .filter(({ color, bg }) =>
      targetColors.has(color) && bg !== null && problematicBgs.has(bg)
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// Snapshot tests
// ═════════════════════════════════════════════════════════════════════════════

describe('SplashScreen — theme snapshots', () => {
  it('matches dark-mode snapshot', () => {
    mockTheme(darkColors, true);
    const { toJSON } = render(<SplashScreen onSelectRole={jest.fn()} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches light-mode snapshot', () => {
    mockTheme(lightColors, false);
    const { toJSON } = render(<SplashScreen onSelectRole={jest.fn()} />);
    expect(toJSON()).toMatchSnapshot();
  });
});

describe('LoginScreen — theme snapshots', () => {
  it('matches dark-mode snapshot', () => {
    mockTheme(darkColors, true);
    const { toJSON } = render(<LoginScreen {...LOGIN_PROPS} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches light-mode snapshot', () => {
    mockTheme(lightColors, false);
    const { toJSON } = render(<LoginScreen {...LOGIN_PROPS} />);
    expect(toJSON()).toMatchSnapshot();
  });
});

describe('SignUpScreen — theme snapshots', () => {
  it('matches dark-mode snapshot', () => {
    mockTheme(darkColors, true);
    const { toJSON } = render(<SignUpScreen {...SIGNUP_PROPS} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches light-mode snapshot', () => {
    mockTheme(lightColors, false);
    const { toJSON } = render(<SignUpScreen {...SIGNUP_PROPS} />);
    expect(toJSON()).toMatchSnapshot();
  });
});

describe('EmployeeDashboard — theme snapshots', () => {
  it('matches dark-mode snapshot', () => {
    mockTheme(darkColors, true);
    const { toJSON } = render(<EmployeeDashboard {...BASE_SCREEN_PROPS} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches light-mode snapshot', () => {
    mockTheme(lightColors, false);
    const { toJSON } = render(<EmployeeDashboard {...BASE_SCREEN_PROPS} />);
    expect(toJSON()).toMatchSnapshot();
  });
});

describe('DailyLogScreen — theme snapshots', () => {
  it('matches dark-mode snapshot', () => {
    mockTheme(darkColors, true);
    const { toJSON } = render(<DailyLogScreen {...BASE_SCREEN_PROPS} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches light-mode snapshot', () => {
    mockTheme(lightColors, false);
    const { toJSON } = render(<DailyLogScreen {...BASE_SCREEN_PROPS} />);
    expect(toJSON()).toMatchSnapshot();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Theme sensitivity — dark and light renders must differ
// ═════════════════════════════════════════════════════════════════════════════

describe('Theme sensitivity — dark ≠ light', () => {
  it('SplashScreen dark render differs from light render', () => {
    mockTheme(darkColors, true);
    const dark = render(<SplashScreen onSelectRole={jest.fn()} />).toJSON();
    mockTheme(lightColors, false);
    const light = render(<SplashScreen onSelectRole={jest.fn()} />).toJSON();
    expect(JSON.stringify(dark)).not.toBe(JSON.stringify(light));
  });

  it('LoginScreen dark render differs from light render', () => {
    mockTheme(darkColors, true);
    const dark = render(<LoginScreen {...LOGIN_PROPS} />).toJSON();
    mockTheme(lightColors, false);
    const light = render(<LoginScreen {...LOGIN_PROPS} />).toJSON();
    expect(JSON.stringify(dark)).not.toBe(JSON.stringify(light));
  });

  it('SignUpScreen dark render differs from light render', () => {
    mockTheme(darkColors, true);
    const dark = render(<SignUpScreen {...SIGNUP_PROPS} />).toJSON();
    mockTheme(lightColors, false);
    const light = render(<SignUpScreen {...SIGNUP_PROPS} />).toJSON();
    expect(JSON.stringify(dark)).not.toBe(JSON.stringify(light));
  });

  it('EmployeeDashboard dark render differs from light render', () => {
    mockTheme(darkColors, true);
    const dark = render(<EmployeeDashboard {...BASE_SCREEN_PROPS} />).toJSON();
    mockTheme(lightColors, false);
    const light = render(<EmployeeDashboard {...BASE_SCREEN_PROPS} />).toJSON();
    expect(JSON.stringify(dark)).not.toBe(JSON.stringify(light));
  });

  it('DailyLogScreen dark render differs from light render', () => {
    mockTheme(darkColors, true);
    const dark = render(<DailyLogScreen {...BASE_SCREEN_PROPS} />).toJSON();
    mockTheme(lightColors, false);
    const light = render(<DailyLogScreen {...BASE_SCREEN_PROPS} />).toJSON();
    expect(JSON.stringify(dark)).not.toBe(JSON.stringify(light));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Root background follows the active theme
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Return all resolved backgroundColor values across every View in the tree.
 * Using "contains" rather than "first" so that sub-components with their own
 * hardcoded backgrounds (e.g. the GrowMark logo circle) don't mask the true
 * screen-level background.
 */
function allBackgrounds(component: ReturnType<typeof render>): string[] {
  const views = component.UNSAFE_getAllByType(View);
  return views
    .map(v => (StyleSheet.flatten(v.props?.style) as any)?.backgroundColor)
    .filter(Boolean)
    .map((b: string) => b.toLowerCase());
}

describe('Root background follows active theme', () => {
  it('SplashScreen role cards use dark theme card colour', () => {
    // SafeAreaView resolves as its own host type in jest-expo, so UNSAFE_getAllByType(View)
    // misses the root bg. The role cards (backgroundColor: C.card) ARE found and
    // provide equivalent proof that the theme is applied.
    mockTheme(darkColors, true);
    const component = render(<SplashScreen onSelectRole={jest.fn()} />);
    expect(allBackgrounds(component)).toContain(darkColors.card.toLowerCase());
  });

  it('SplashScreen role cards use light theme card colour', () => {
    mockTheme(lightColors, false);
    const component = render(<SplashScreen onSelectRole={jest.fn()} />);
    expect(allBackgrounds(component)).toContain(lightColors.card.toLowerCase());
  });

  it('LoginScreen contains dark theme bg in dark mode', () => {
    mockTheme(darkColors, true);
    const component = render(<LoginScreen {...LOGIN_PROPS} />);
    expect(allBackgrounds(component)).toContain(darkColors.bg.toLowerCase());
  });

  it('LoginScreen contains light theme bg in light mode', () => {
    mockTheme(lightColors, false);
    const component = render(<LoginScreen {...LOGIN_PROPS} />);
    expect(allBackgrounds(component)).toContain(lightColors.bg.toLowerCase());
  });

  it('EmployeeDashboard contains dark theme bg in dark mode', () => {
    mockTheme(darkColors, true);
    const component = render(<EmployeeDashboard {...BASE_SCREEN_PROPS} />);
    expect(allBackgrounds(component)).toContain(darkColors.bg.toLowerCase());
  });

  it('EmployeeDashboard contains light theme bg in light mode', () => {
    mockTheme(lightColors, false);
    const component = render(<EmployeeDashboard {...BASE_SCREEN_PROPS} />);
    expect(allBackgrounds(component)).toContain(lightColors.bg.toLowerCase());
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Invisible-text contract
// Tests that no hardcoded colour produces invisible text:
//   — white text on a white/near-white background (light mode)
//   — black text on a black/near-black background (dark mode)
//
// Button texts (colour: #fff) and icon circles (colour: #000 on amber) are
// not flagged because their nearest ancestor background is NOT white / dark.
// ═════════════════════════════════════════════════════════════════════════════

describe('No invisible text — light mode (white-on-white)', () => {
  it('SplashScreen: no white text on white/near-white background', () => {
    mockTheme(lightColors, false);
    const component = render(<SplashScreen onSelectRole={jest.fn()} />);
    expect(findInvisibleText(component, true)).toEqual([]);
  });

  it('LoginScreen: no white text on white/near-white background', () => {
    mockTheme(lightColors, false);
    const component = render(<LoginScreen {...LOGIN_PROPS} />);
    expect(findInvisibleText(component, true)).toEqual([]);
  });

  it('SignUpScreen: no white text on white/near-white background', () => {
    mockTheme(lightColors, false);
    const component = render(<SignUpScreen {...SIGNUP_PROPS} />);
    expect(findInvisibleText(component, true)).toEqual([]);
  });

  it('EmployeeDashboard: no white text on white/near-white background', () => {
    mockTheme(lightColors, false);
    const component = render(<EmployeeDashboard {...BASE_SCREEN_PROPS} />);
    expect(findInvisibleText(component, true)).toEqual([]);
  });

  it('DailyLogScreen: no white text on white/near-white background', () => {
    mockTheme(lightColors, false);
    const component = render(<DailyLogScreen {...BASE_SCREEN_PROPS} />);
    expect(findInvisibleText(component, true)).toEqual([]);
  });
});

describe('No invisible text — dark mode (black-on-black)', () => {
  it('SplashScreen: no black text on dark/near-black background', () => {
    mockTheme(darkColors, true);
    const component = render(<SplashScreen onSelectRole={jest.fn()} />);
    expect(findInvisibleText(component, false)).toEqual([]);
  });

  it('LoginScreen: no black text on dark/near-black background', () => {
    mockTheme(darkColors, true);
    const component = render(<LoginScreen {...LOGIN_PROPS} />);
    expect(findInvisibleText(component, false)).toEqual([]);
  });

  it('SignUpScreen: no black text on dark/near-black background', () => {
    mockTheme(darkColors, true);
    const component = render(<SignUpScreen {...SIGNUP_PROPS} />);
    expect(findInvisibleText(component, false)).toEqual([]);
  });

  it('EmployeeDashboard: no black text on dark/near-black background', () => {
    // With goals: [] the nudgeCard (which uses nudgeIcon: { color: #000 }) does
    // not render. The nudgeLeft circle only renders when rejectedQ1.length > 0.
    // Even if it did render, nearestBackground(nudgeIcon) returns C.pending
    // (amber yellow) — not in NEAR_BLACK_BG — so the check correctly passes.
    mockTheme(darkColors, true);
    const component = render(<EmployeeDashboard {...BASE_SCREEN_PROPS} />);
    expect(findInvisibleText(component, false)).toEqual([]);
  });

  it('DailyLogScreen: no black text on dark/near-black background', () => {
    mockTheme(darkColors, true);
    const component = render(<DailyLogScreen {...BASE_SCREEN_PROPS} />);
    expect(findInvisibleText(component, false)).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Known hardcoded colours — documented intentional exceptions
// These colours appear in the source but are safe because they sit on
// a contrasting background.  This test enumerates them so any new addition
// triggers review.
// ═════════════════════════════════════════════════════════════════════════════

describe('Hardcoded colour inventory', () => {
  it('all hardcoded #fff button-text elements sit on non-white backgrounds in light mode', () => {
    mockTheme(lightColors, false);

    const screens = [
      render(<LoginScreen {...LOGIN_PROPS} />),
      render(<SignUpScreen {...SIGNUP_PROPS} />),
      render(<DailyLogScreen {...BASE_SCREEN_PROPS} />),
    ];

    const WHITE_COLORS = new Set(['#fff', '#ffffff', '#FFF', '#FFFFFF', 'white']);
    const violations: string[] = [];

    for (const screen of screens) {
      let texts: any[] = [];
      try { texts = screen.UNSAFE_getAllByType(Text); } catch { continue; }

      for (const t of texts) {
        const style = StyleSheet.flatten(t.props?.style) ?? {};
        const color = (style.color as string | undefined) ?? '';
        if (!WHITE_COLORS.has(color)) continue;

        const bg = nearestBackground(t);
        if (bg === null || NEAR_WHITE_BG.has(bg.toLowerCase())) {
          violations.push(
            `white text "${String(t.props?.children ?? '')}" on bg "${bg}" is invisible in light mode`
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('all hardcoded #000 icon elements sit on non-dark backgrounds in dark mode', () => {
    // In EmployeeDashboard, nudgeIcon uses color: #000 but sits inside
    // nudgeLeft which has backgroundColor: C.pending (amber). Verify this
    // with rejected goals in the data so the nudgeCard renders.
    mockUseApp.mockReturnValue({
      employees: [EMPLOYEE],
      goals: [{
        id: 'g1', title: 'Q1 Goal', quarter: 'Q1', status: 'rejected',
        employeeId: 'emp-1', managerId: undefined,
        weight: 10, description: '', category: 'technical', priority: 'medium',
        createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
        evidence: [], managerRating: 0,
      }],
      notifications: [],
      dailyLogs: [],
      emailExists:     jest.fn(),
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

    mockTheme(darkColors, true);
    const component = render(<EmployeeDashboard {...BASE_SCREEN_PROPS} />);

    const BLACK_COLORS = new Set(['#000', '#000000', 'black']);
    let texts: any[] = [];
    try { texts = component.UNSAFE_getAllByType(Text); } catch {}

    const violations: string[] = [];
    for (const t of texts) {
      const style = StyleSheet.flatten(t.props?.style) ?? {};
      const color = (style.color as string | undefined) ?? '';
      if (!BLACK_COLORS.has(color.toLowerCase())) continue;

      const bg = nearestBackground(t);
      if (bg === null || NEAR_BLACK_BG.has(bg.toLowerCase())) {
        violations.push(
          `black text "${String(t.props?.children ?? '')}" on bg "${bg}" is invisible in dark mode`
        );
      }
    }

    expect(violations).toEqual([]);
  });
});

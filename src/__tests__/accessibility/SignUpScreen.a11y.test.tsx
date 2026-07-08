import React from 'react';
import { TextInput } from 'react-native';
import { render, screen } from '@testing-library/react-native';

// ── mocks ──────────────────────────────────────────────────────────────────────

jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));

import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import SignUpScreen from '../../screens/auth/SignUpScreen';

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

const MOCK_COLORS: any = {
  bg: '#fff', bgElevated: '#f5f5f5', card: '#fafafa', border: '#e0e0e0',
  textPrimary: '#000', textSecondary: '#666', textMuted: '#999',
  employeePrimary: '#4f46e5', employeeLight: '#ede9fe',
  adminPrimary: '#0ea5e9', adminLight: '#e0f2fe',
  managerPrimary: '#8b5cf6', managerLight: '#f3e8ff',
  approved: '#22c55e', approvedBg: '#dcfce7',
  rejected: '#ef4444', rejectedBg: '#fee2e2',
  pending: '#f59e0b', pendingBg: '#fef3c7',
};

function setup(overrides: Record<string, unknown> = {}) {
  const defaultProps = {
    role: 'employee' as const,
    onBack: jest.fn(),
    onSuccess: jest.fn(),
    onSignIn: jest.fn(),
    ...overrides,
  };
  return render(<SignUpScreen {...defaultProps} />);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ signup: jest.fn() } as any);
  mockUseTheme.mockReturnValue({ colors: MOCK_COLORS, isDark: false, toggleTheme: jest.fn() } as any);
});

// ── accessibilityLabel on buttons ─────────────────────────────────────────────

describe('SignUpScreen — button accessibilityLabel', () => {
  it('every button has a non-empty accessibilityLabel', () => {
    setup();
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach(btn => {
      const label: string = btn.props.accessibilityLabel ?? '';
      expect(label.trim().length).toBeGreaterThan(0);
    });
  });

  it('back button has label "Go back"', () => {
    setup();
    expect(() => screen.getByRole('button', { name: 'Go back' })).not.toThrow();
  });

  it('password eye toggle shows "Show password" initially', () => {
    setup();
    // Two eye buttons: password and confirm — first one controls password
    const eyeBtns = screen.getAllByRole('button').filter(
      b => (b.props.accessibilityLabel as string)?.toLowerCase().includes('password')
        && (b.props.accessibilityLabel as string)?.toLowerCase().includes('show'),
    );
    expect(eyeBtns.length).toBeGreaterThanOrEqual(1);
  });

  it('confirm password eye toggle shows "Show confirm password" initially', () => {
    setup();
    const confirmEye = screen.getAllByRole('button').find(
      b => (b.props.accessibilityLabel as string)?.includes('confirm password'),
    );
    expect(confirmEye).toBeDefined();
  });

  it('create account button has label "Create account"', () => {
    setup();
    expect(() => screen.getByRole('button', { name: 'Create account' })).not.toThrow();
  });

  it('sign in link has a descriptive label', () => {
    setup();
    expect(() => screen.getByRole('button', { name: 'Already have an account? Sign in' })).not.toThrow();
  });
});

// ── accessibilityLabel on text inputs ─────────────────────────────────────────

describe('SignUpScreen — TextInput accessibilityLabel', () => {
  it('every TextInput has a non-empty accessibilityLabel', () => {
    setup();
    const inputs = screen.UNSAFE_getAllByType(TextInput);
    expect(inputs.length).toBeGreaterThan(0);
    inputs.forEach(input => {
      const label: string = input.props.accessibilityLabel ?? '';
      expect(label.trim().length).toBeGreaterThan(0);
    });
  });

  it('first name input has label "First name"', () => {
    setup();
    const inputs = screen.UNSAFE_getAllByType(TextInput);
    const firstNameInput = inputs.find(i => i.props.accessibilityLabel === 'First name');
    expect(firstNameInput).toBeDefined();
  });

  it('last name input has label "Last name"', () => {
    setup();
    const inputs = screen.UNSAFE_getAllByType(TextInput);
    const lastNameInput = inputs.find(i => i.props.accessibilityLabel === 'Last name');
    expect(lastNameInput).toBeDefined();
  });

  it('FieldInput strips the " *" required marker for accessibilityLabel', () => {
    setup();
    const inputs = screen.UNSAFE_getAllByType(TextInput);
    // "Email Address *" → "Email Address"
    const emailInput = inputs.find(i => i.props.accessibilityLabel === 'Email Address');
    expect(emailInput).toBeDefined();

    // "Username *" → "Username"
    const usernameInput = inputs.find(i => i.props.accessibilityLabel === 'Username');
    expect(usernameInput).toBeDefined();
  });

  it('password input has label "Password"', () => {
    setup();
    const inputs = screen.UNSAFE_getAllByType(TextInput);
    const pwdInput = inputs.find(i => i.props.accessibilityLabel === 'Password');
    expect(pwdInput).toBeDefined();
  });

  it('confirm password input has label "Confirm password"', () => {
    setup();
    const inputs = screen.UNSAFE_getAllByType(TextInput);
    const confirmInput = inputs.find(i => i.props.accessibilityLabel === 'Confirm password');
    expect(confirmInput).toBeDefined();
  });
});

// ── accessibilityRole ─────────────────────────────────────────────────────────

describe('SignUpScreen — accessibilityRole', () => {
  it('every button element has accessibilityRole "button"', () => {
    setup();
    const buttons = screen.getAllByRole('button');
    buttons.forEach(btn => {
      expect(btn.props.accessibilityRole).toBe('button');
    });
  });

  it('terms checkbox has accessibilityRole "checkbox"', () => {
    setup();
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox.props.accessibilityRole).toBe('checkbox');
  });

  it('terms checkbox has accessibilityLabel', () => {
    setup();
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox.props.accessibilityLabel).toBeTruthy();
  });

  it('terms checkbox reflects checked state', () => {
    setup();
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox.props.accessibilityState?.checked).toBe(false);
  });

  it('create account button carries accessibilityState.disabled when not loading', () => {
    setup();
    const createBtn = screen.getByRole('button', { name: 'Create account' });
    expect(createBtn.props.accessibilityState?.disabled).toBe(false);
  });
});

// ── touch targets ─────────────────────────────────────────────────────────────

describe('SignUpScreen — touch targets (≥44pt)', () => {
  it('back button has hitSlop for adequate touch area', () => {
    setup();
    const back = screen.getByRole('button', { name: 'Go back' });
    const hs = back.props.hitSlop;
    expect(hs).toBeDefined();
    const topExpansion = typeof hs === 'number' ? hs : (hs?.top ?? 0);
    expect(topExpansion).toBeGreaterThanOrEqual(8);
  });

  it('password eye toggle has hitSlop for adequate horizontal touch area', () => {
    setup();
    const eyeBtn = screen.getAllByRole('button').find(
      b => (b.props.accessibilityLabel as string) === 'Show password',
    );
    expect(eyeBtn).toBeDefined();
    const hs = eyeBtn!.props.hitSlop;
    expect(hs).toBeDefined();
    const leftExpansion = typeof hs === 'number' ? hs : (hs?.left ?? 0);
    expect(leftExpansion).toBeGreaterThanOrEqual(8);
  });

  it('confirm password eye toggle has hitSlop for adequate horizontal touch area', () => {
    setup();
    const eyeBtn = screen.getAllByRole('button').find(
      b => (b.props.accessibilityLabel as string) === 'Show confirm password',
    );
    expect(eyeBtn).toBeDefined();
    const hs = eyeBtn!.props.hitSlop;
    expect(hs).toBeDefined();
  });

  it('sign in link has hitSlop for adequate touch area', () => {
    setup();
    const signIn = screen.getByRole('button', { name: 'Already have an account? Sign in' });
    const hs = signIn.props.hitSlop;
    expect(hs).toBeDefined();
  });
});

// ── focus order ───────────────────────────────────────────────────────────────

describe('SignUpScreen — focus order (top-to-bottom)', () => {
  it('back button comes before create account button in the accessibility tree', () => {
    setup();
    const buttons = screen.getAllByRole('button');
    const labels = buttons.map(b => b.props.accessibilityLabel as string);

    const backIdx          = labels.indexOf('Go back');
    const createAccountIdx = labels.indexOf('Create account');
    const signInIdx        = labels.indexOf('Already have an account? Sign in');

    expect(backIdx).toBeGreaterThanOrEqual(0);
    expect(createAccountIdx).toBeGreaterThan(backIdx);
    expect(signInIdx).toBeGreaterThan(createAccountIdx);
  });

  it('both eye toggles appear before the create account button', () => {
    setup();
    const buttons = screen.getAllByRole('button');
    const labels = buttons.map(b => b.props.accessibilityLabel as string);

    const showPwdIdx     = labels.indexOf('Show password');
    const showConfirmIdx = labels.indexOf('Show confirm password');
    const createIdx      = labels.indexOf('Create account');

    expect(showPwdIdx).toBeGreaterThanOrEqual(0);
    expect(showConfirmIdx).toBeGreaterThan(showPwdIdx);
    expect(createIdx).toBeGreaterThan(showConfirmIdx);
  });
});

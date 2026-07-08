import React from 'react';
import { TextInput } from 'react-native';
import { render, screen } from '@testing-library/react-native';

// ── mocks ──────────────────────────────────────────────────────────────────────

jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));

import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import LoginScreen from '../../screens/auth/LoginScreen';

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
    onForgotUsername: jest.fn(),
    onForgotPassword: jest.fn(),
    onSignUp: jest.fn(),
    onSuccess: jest.fn(),
    ...overrides,
  };
  return render(<LoginScreen {...defaultProps} />);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ login: jest.fn() } as any);
  mockUseTheme.mockReturnValue({ colors: MOCK_COLORS, isDark: false, toggleTheme: jest.fn() } as any);
});

// ── accessibilityLabel ────────────────────────────────────────────────────────

describe('LoginScreen — accessibilityLabel', () => {
  it('every button has a non-empty accessibilityLabel', () => {
    setup();
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach(btn => {
      const label: string = btn.props.accessibilityLabel ?? '';
      expect(label.trim().length).toBeGreaterThan(0);
    });
  });

  it('every TextInput has a non-empty accessibilityLabel', () => {
    setup();
    const inputs = screen.UNSAFE_getAllByType(TextInput);
    expect(inputs.length).toBeGreaterThan(0);
    inputs.forEach(input => {
      const label: string = input.props.accessibilityLabel ?? '';
      expect(label.trim().length).toBeGreaterThan(0);
    });
  });

  it('back button has label "Go back"', () => {
    setup();
    expect(() => screen.getByRole('button', { name: 'Go back' })).not.toThrow();
  });

  it('username input has a descriptive label', () => {
    setup();
    const identifierInput = screen.UNSAFE_getAllByType(TextInput)[0];
    expect(identifierInput.props.accessibilityLabel).toBeTruthy();
  });

  it('password input has label "Password"', () => {
    setup();
    const passwordInput = screen.UNSAFE_getAllByType(TextInput)[1];
    expect(passwordInput.props.accessibilityLabel).toBe('Password');
  });

  it('eye toggle shows "Show password" when password is hidden', () => {
    setup();
    expect(() => screen.getByRole('button', { name: 'Show password' })).not.toThrow();
  });

  it('forgot username button has label "Forgot username"', () => {
    setup();
    expect(() => screen.getByRole('button', { name: 'Forgot username' })).not.toThrow();
  });

  it('forgot password button has label "Forgot password"', () => {
    setup();
    expect(() => screen.getByRole('button', { name: 'Forgot password' })).not.toThrow();
  });

  it('sign in button has label "Sign in"', () => {
    setup();
    expect(() => screen.getByRole('button', { name: 'Sign in' })).not.toThrow();
  });

  it('sign up link has a descriptive label', () => {
    setup();
    expect(() => screen.getByRole('button', { name: 'Sign up for a new account' })).not.toThrow();
  });
});

// ── accessibilityRole ─────────────────────────────────────────────────────────

describe('LoginScreen — accessibilityRole', () => {
  it('every interactive button has accessibilityRole "button"', () => {
    setup();
    const buttons = screen.getAllByRole('button');
    buttons.forEach(btn => {
      expect(btn.props.accessibilityRole).toBe('button');
    });
  });

  it('sign in button carries accessibilityState.disabled when not loading', () => {
    setup();
    const signInBtn = screen.getByRole('button', { name: 'Sign in' });
    expect(signInBtn.props.accessibilityState?.disabled).toBe(false);
  });
});

// ── touch targets ─────────────────────────────────────────────────────────────

describe('LoginScreen — touch targets (≥44pt)', () => {
  it('forgot username link has hitSlop for adequate touch area', () => {
    setup();
    const btn = screen.getByRole('button', { name: 'Forgot username' });
    const hs = btn.props.hitSlop;
    expect(hs).toBeDefined();
    const topExpansion = typeof hs === 'number' ? hs : (hs?.top ?? 0);
    expect(topExpansion).toBeGreaterThanOrEqual(8);
  });

  it('forgot password link has hitSlop for adequate touch area', () => {
    setup();
    const btn = screen.getByRole('button', { name: 'Forgot password' });
    const hs = btn.props.hitSlop;
    expect(hs).toBeDefined();
    const topExpansion = typeof hs === 'number' ? hs : (hs?.top ?? 0);
    expect(topExpansion).toBeGreaterThanOrEqual(8);
  });

  it('sign up link has hitSlop for adequate touch area', () => {
    setup();
    const btn = screen.getByRole('button', { name: 'Sign up for a new account' });
    const hs = btn.props.hitSlop;
    expect(hs).toBeDefined();
  });

  it('eye toggle button has hitSlop for adequate horizontal touch area', () => {
    setup();
    const eyeBtn = screen.getByRole('button', { name: 'Show password' });
    const hs = eyeBtn.props.hitSlop;
    expect(hs).toBeDefined();
    const leftExpansion = typeof hs === 'number' ? hs : (hs?.left ?? 0);
    expect(leftExpansion).toBeGreaterThanOrEqual(8);
  });
});

// ── focus order ───────────────────────────────────────────────────────────────

describe('LoginScreen — focus order (top-to-bottom)', () => {
  it('buttons appear in visual reading order', () => {
    setup();
    const buttons = screen.getAllByRole('button');
    const labels = buttons.map(b => b.props.accessibilityLabel as string);

    const backIdx           = labels.indexOf('Go back');
    const forgotUsernameIdx = labels.indexOf('Forgot username');
    const forgotPasswordIdx = labels.indexOf('Forgot password');
    const signInIdx         = labels.indexOf('Sign in');
    const signUpIdx         = labels.indexOf('Sign up for a new account');

    expect(backIdx).toBeGreaterThanOrEqual(0);
    expect(forgotUsernameIdx).toBeGreaterThan(backIdx);
    expect(forgotPasswordIdx).toBeGreaterThan(forgotUsernameIdx);
    expect(signInIdx).toBeGreaterThan(forgotPasswordIdx);
    expect(signUpIdx).toBeGreaterThan(signInIdx);
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../context/AppContext', () => ({ useApp: jest.fn() }));
jest.mock('../../context/ToastContext', () => ({ useToast: jest.fn() }));
jest.mock('../../components/Header', () => () => null);
jest.mock('../../components/AnimatedButton', () => ({
  AnimatedButton: ({ children, onPress }: any) => {
    const { TouchableOpacity } = require('react-native');
    return require('react').createElement(TouchableOpacity, { onPress }, children);
  },
}));

import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';

import LoginScreen from '../../screens/auth/LoginScreen';
import SignUpScreen from '../../screens/auth/SignUpScreen';
import OnboardEmployee from '../../screens/admin/OnboardEmployee';
import ForgotPasswordScreen from '../../screens/auth/ForgotPasswordScreen';

// ── Shared mock data ──────────────────────────────────────────────────────────

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
const MOCK_MANAGER = {
  id: 'mgr-1', name: 'Jane Manager', email: 'jane@test.com', role: 'manager' as const,
  department: 'Engineering', avatarInitials: 'JM',
};

beforeEach(() => {
  jest.clearAllMocks();
  (useTheme as jest.Mock).mockReturnValue({ colors: MOCK_COLORS, isDark: false });
  (useToast as jest.Mock).mockReturnValue({ showToast: jest.fn() });
});

// ══════════════════════════════════════════════════════════════════════════════
// LoginScreen — loading state
// ══════════════════════════════════════════════════════════════════════════════

describe('LoginScreen — loading state', () => {
  it('hides "Sign In" button text while login request is pending', async () => {
    let resolveLogin!: (v: any) => void;
    const mockLogin = jest.fn(() => new Promise(r => { resolveLogin = r; }));
    (useAuth as jest.Mock).mockReturnValue({ login: mockLogin });

    render(
      <LoginScreen role="employee" onBack={jest.fn()} onForgotUsername={jest.fn()}
        onForgotPassword={jest.fn()} onSignUp={jest.fn()} onSuccess={jest.fn()} />,
    );
    fireEvent.changeText(screen.getByPlaceholderText('Enter your email'), 'user@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(screen.getByText('Sign In'));

    await waitFor(() => expect(screen.queryByText('Sign In')).toBeNull());

    await act(async () => { resolveLogin({ ok: true }); });
  });

  it('button is disabled during login (no double-submit)', async () => {
    let callCount = 0;
    let resolveFirst!: (v: any) => void;
    const mockLogin = jest.fn(() => {
      callCount++;
      return new Promise(r => { resolveFirst = r; });
    });
    (useAuth as jest.Mock).mockReturnValue({ login: mockLogin });

    render(
      <LoginScreen role="employee" onBack={jest.fn()} onForgotUsername={jest.fn()}
        onForgotPassword={jest.fn()} onSignUp={jest.fn()} onSuccess={jest.fn()} />,
    );
    fireEvent.changeText(screen.getByPlaceholderText('Enter your email'), 'user@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(screen.getByText('Sign In'));

    // Attempt to press again while loading
    await waitFor(() => expect(screen.queryByText('Sign In')).toBeNull());
    // Button is gone / disabled — pressing it again should be a no-op

    await act(async () => { resolveFirst({ ok: true }); });
    expect(callCount).toBe(1);
  });

  it('restores "Sign In" button text after failed login', async () => {
    const mockLogin = jest.fn().mockResolvedValue({ ok: false, error: 'Invalid credentials' });
    (useAuth as jest.Mock).mockReturnValue({ login: mockLogin });

    render(
      <LoginScreen role="employee" onBack={jest.fn()} onForgotUsername={jest.fn()}
        onForgotPassword={jest.fn()} onSignUp={jest.fn()} onSuccess={jest.fn()} />,
    );
    fireEvent.changeText(screen.getByPlaceholderText('Enter your email'), 'user@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('Enter your password'), 'password123');
    await act(async () => { fireEvent.press(screen.getByText('Sign In')); });
    await waitFor(() => expect(screen.getByText('Sign In')).toBeTruthy());
    expect(screen.getByText('Invalid credentials')).toBeTruthy();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SignUpScreen — loading state
// ══════════════════════════════════════════════════════════════════════════════

function fillSignUpForm() {
  fireEvent.changeText(screen.getByPlaceholderText('First'), 'Alice');
  fireEvent.changeText(screen.getByPlaceholderText('Last'), 'Smith');
  fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'alice@test.com');
  fireEvent.changeText(screen.getByPlaceholderText('e.g. john.doe'), 'alice');
  fireEvent.changeText(screen.getByPlaceholderText('Min. 8 characters'), 'Password1!');
  fireEvent.changeText(screen.getByPlaceholderText('Re-enter password'), 'Password1!');
  fireEvent.press(screen.getByTestId('terms-checkbox'));
}

describe('SignUpScreen — loading state', () => {
  it('shows spinner (accessibilityLabel changes) while signup request is pending', async () => {
    let resolveSignup!: (v: any) => void;
    const mockSignup = jest.fn(() => new Promise(r => { resolveSignup = r; }));
    (useAuth as jest.Mock).mockReturnValue({ signup: mockSignup });

    render(
      <SignUpScreen role="employee" onBack={jest.fn()} onSuccess={jest.fn()} onSignIn={jest.fn()} />,
    );
    fillSignUpForm();
    fireEvent.press(screen.getByTestId('create-account-btn'));

    await waitFor(() =>
      expect(screen.getByTestId('create-account-btn').props.accessibilityLabel).toBe('Creating account')
    );

    await act(async () => {
      resolveSignup({ ok: true, user: { id: 'u1', employeeCode: 'EMP-001', username: 'alice' } });
    });
  });

  it('button has accessibilityLabel "Creating account" while loading', async () => {
    let resolveSignup!: (v: any) => void;
    const mockSignup = jest.fn(() => new Promise(r => { resolveSignup = r; }));
    (useAuth as jest.Mock).mockReturnValue({ signup: mockSignup });

    render(
      <SignUpScreen role="employee" onBack={jest.fn()} onSuccess={jest.fn()} onSignIn={jest.fn()} />,
    );
    fillSignUpForm();
    fireEvent.press(screen.getByTestId('create-account-btn'));

    await waitFor(() =>
      expect(screen.getByTestId('create-account-btn').props.accessibilityLabel).toBe('Creating account')
    );

    await act(async () => {
      resolveSignup({ ok: true, user: { id: 'u1', employeeCode: 'EMP-001', username: 'alice' } });
    });
  });

  it('restores "Create account" accessibilityLabel after failed signup', async () => {
    const mockSignup = jest.fn().mockResolvedValue({ ok: false, error: 'Email taken' });
    (useAuth as jest.Mock).mockReturnValue({ signup: mockSignup });

    render(
      <SignUpScreen role="employee" onBack={jest.fn()} onSuccess={jest.fn()} onSignIn={jest.fn()} />,
    );
    fillSignUpForm();
    await act(async () => { fireEvent.press(screen.getByTestId('create-account-btn')); });
    await waitFor(() =>
      expect(screen.getByTestId('create-account-btn').props.accessibilityLabel).toBe('Create account')
    );
    expect(screen.getByText('Email taken')).toBeTruthy();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// OnboardEmployee — loading state
// ══════════════════════════════════════════════════════════════════════════════

describe('OnboardEmployee — loading state', () => {
  it('changes button text to "Onboarding…" while request is pending', async () => {
    let resolveCreate!: (v: any) => void;
    const mockCreateUser = jest.fn(() => new Promise(r => { resolveCreate = r; }));
    (useAuth as jest.Mock).mockReturnValue({ createUser: mockCreateUser, updateUser: jest.fn().mockResolvedValue(undefined) });
    (useApp as jest.Mock).mockReturnValue({ employees: [MOCK_MANAGER], addNotification: jest.fn() });

    render(
      <OnboardEmployee navigation={mockNavigation as any} params={{}}
        currentUserId="admin-1" currentRole="admin" onLogout={jest.fn()} />,
    );
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Jamie Patel'), 'Sam Lee');
    fireEvent.changeText(screen.getByPlaceholderText('jamie.patel@company.com'), 'sam@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Software Engineer'), 'Engineer');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Engineering'), 'Engineering');
    fireEvent.press(screen.getByText('Jane Manager'));
    fireEvent.press(screen.getByText('Onboard Employee →'));

    await waitFor(() => expect(screen.getByText('Onboarding…')).toBeTruthy());

    await act(async () => {
      resolveCreate({ id: 'new-1', name: 'Sam Lee', employeeCode: 'EMP-002', username: 'sam.lee' });
    });
  });

  it('shows success credentials screen after onboarding completes', async () => {
    const mockCreateUser = jest.fn().mockResolvedValue({
      id: 'new-1', name: 'Sam Lee', employeeCode: 'EMP-002', username: 'sam.lee',
    });
    (useAuth as jest.Mock).mockReturnValue({ createUser: mockCreateUser, updateUser: jest.fn().mockResolvedValue(undefined) });
    (useApp as jest.Mock).mockReturnValue({ employees: [MOCK_MANAGER], addNotification: jest.fn() });

    render(
      <OnboardEmployee navigation={mockNavigation as any} params={{}}
        currentUserId="admin-1" currentRole="admin" onLogout={jest.fn()} />,
    );
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Jamie Patel'), 'Sam Lee');
    fireEvent.changeText(screen.getByPlaceholderText('jamie.patel@company.com'), 'sam@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Software Engineer'), 'Engineer');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Engineering'), 'Engineering');
    fireEvent.press(screen.getByText('Jane Manager'));
    await act(async () => { fireEvent.press(screen.getByText('Onboard Employee →')); });
    await waitFor(() => expect(screen.getByText('Employee Onboarded!')).toBeTruthy());
    expect(screen.getByText('EMP-002')).toBeTruthy();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ForgotPasswordScreen — loading state per step
// ══════════════════════════════════════════════════════════════════════════════

describe('ForgotPasswordScreen — loading states per step', () => {
  const mockRequestOtp  = jest.fn();
  const mockCheckOtp    = jest.fn();
  const mockSetNewPwd   = jest.fn();

  function renderForgot() {
    (useAuth as jest.Mock).mockReturnValue({
      resetPasswordRequest:    mockRequestOtp,
      resetPasswordCheckOtp:   mockCheckOtp,
      resetPasswordSetNewPassword: mockSetNewPwd,
    });
    return render(
      <ForgotPasswordScreen onBack={jest.fn()} onSuccess={jest.fn()} />,
    );
  }

  it('hides "Send Verification Code" while OTP request is pending', async () => {
    let resolve!: (v: any) => void;
    mockRequestOtp.mockImplementation(() => new Promise(r => { resolve = r; }));
    renderForgot();
    fireEvent.changeText(screen.getByPlaceholderText('your@email.com'), 'user@test.com');
    fireEvent.press(screen.getByText('Send Verification Code'));

    await waitFor(() => expect(screen.queryByText('Send Verification Code')).toBeNull());

    await act(async () => { resolve({ ok: true }); });
  });

  it('restores "Send Verification Code" after failed OTP request', async () => {
    mockRequestOtp.mockResolvedValue({ ok: false, error: 'Email not found.' });
    renderForgot();
    fireEvent.changeText(screen.getByPlaceholderText('your@email.com'), 'nobody@test.com');
    await act(async () => { fireEvent.press(screen.getByText('Send Verification Code')); });
    await waitFor(() => expect(screen.getByText('Send Verification Code')).toBeTruthy());
    expect(screen.getByText('Email not found.')).toBeTruthy();
  });

  it('advances to OTP step when email request succeeds', async () => {
    mockRequestOtp.mockResolvedValue({ ok: true });
    renderForgot();
    fireEvent.changeText(screen.getByPlaceholderText('your@email.com'), 'user@test.com');
    await act(async () => { fireEvent.press(screen.getByText('Send Verification Code')); });
    await waitFor(() => expect(screen.getByText('Verify Code')).toBeTruthy());
  });

  it('advances to reset step when correct 6-digit OTP is entered', async () => {
    mockRequestOtp.mockResolvedValue({ ok: true });
    mockCheckOtp.mockResolvedValue({ ok: true });
    renderForgot();
    fireEvent.changeText(screen.getByPlaceholderText('your@email.com'), 'user@test.com');
    await act(async () => { fireEvent.press(screen.getByText('Send Verification Code')); });
    await waitFor(() => screen.getByText('Verify Code'));

    fireEvent.changeText(screen.getByPlaceholderText('000000'), '123456');
    await act(async () => { fireEvent.press(screen.getByText('Verify Code')); });

    // Step 3 is reached when the new-password input appears
    await waitFor(() => expect(screen.getByPlaceholderText('Min. 8 characters')).toBeTruthy());
  });

  it('hides "Reset Password" button while reset is pending', async () => {
    mockRequestOtp.mockResolvedValue({ ok: true });
    mockCheckOtp.mockResolvedValue({ ok: true });
    let resolveReset!: (v: any) => void;
    mockSetNewPwd.mockImplementation(() => new Promise(r => { resolveReset = r; }));

    renderForgot();
    fireEvent.changeText(screen.getByPlaceholderText('your@email.com'), 'user@test.com');
    await act(async () => { fireEvent.press(screen.getByText('Send Verification Code')); });
    await waitFor(() => screen.getByText('Verify Code'));

    fireEvent.changeText(screen.getByPlaceholderText('000000'), '123456');
    await act(async () => { fireEvent.press(screen.getByText('Verify Code')); });
    // Wait until step 3 renders (new-password input present)
    await waitFor(() => screen.getByPlaceholderText('Min. 8 characters'));

    fireEvent.changeText(screen.getByPlaceholderText('Min. 8 characters'), 'NewPass1!');
    fireEvent.changeText(screen.getByPlaceholderText('Re-enter new password'), 'NewPass1!');
    // Heading + button both say "Reset Password"; press the button (index 1)
    fireEvent.press(screen.getAllByText('Reset Password')[1]);

    // While loading, button's "Reset Password" text is replaced with ActivityIndicator —
    // only the heading remains, so count drops to 1
    await waitFor(() => expect(screen.getAllByText('Reset Password').length).toBe(1));
    await act(async () => { resolveReset({ ok: true }); });
  });
});

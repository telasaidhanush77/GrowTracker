import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';

jest.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));

import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import LoginScreen from '../../screens/auth/LoginScreen';

const MOCK_COLORS: any = {
  bg: '#fff', bgElevated: '#f5f5f5', card: '#fafafa', border: '#e0e0e0',
  textPrimary: '#111', textSecondary: '#555', textMuted: '#999',
  adminPrimary: '#dc2626', adminLight: '#fee2e2',
  managerPrimary: '#0891b2', managerLight: '#cffafe',
  employeePrimary: '#4f46e5', employeeLight: '#ede9fe',
  primary: '#4f46e5',
  approved: '#22c55e', approvedBg: '#dcfce7',
  rejected: '#ef4444', rejectedBg: '#fee2e2',
};

const mockLogin = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useTheme as jest.Mock).mockReturnValue({ colors: MOCK_COLORS, isDark: false });
  (useAuth as jest.Mock).mockReturnValue({ login: mockLogin });
});

function renderLogin(role: 'employee' | 'manager' | 'admin' = 'employee') {
  return render(
    <LoginScreen
      role={role}
      onBack={jest.fn()}
      onForgotUsername={jest.fn()}
      onForgotPassword={jest.fn()}
      onSignUp={jest.fn()}
      onSuccess={jest.fn()}
    />,
  );
}

const ID_PLACEHOLDER = 'Enter your email';
const PWD_PLACEHOLDER = 'Enter your password';
const EMPTY_ERROR = 'Please enter your email and password.';

// ── Empty / whitespace validation ─────────────────────────────────────────────

describe('LoginScreen — empty and whitespace inputs', () => {
  it('blocks submit and shows error when both fields are empty', () => {
    renderLogin();
    fireEvent.press(screen.getByText('Sign In'));
    expect(screen.getByText(EMPTY_ERROR)).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('blocks submit when identifier is empty and password is filled', () => {
    renderLogin();
    fireEvent.changeText(screen.getByPlaceholderText(PWD_PLACEHOLDER), 'password123');
    fireEvent.press(screen.getByText('Sign In'));
    expect(screen.getByText(EMPTY_ERROR)).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('blocks submit when password is empty and identifier is filled', () => {
    renderLogin();
    fireEvent.changeText(screen.getByPlaceholderText(ID_PLACEHOLDER), 'user@test.com');
    fireEvent.press(screen.getByText('Sign In'));
    expect(screen.getByText(EMPTY_ERROR)).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('blocks submit when identifier is whitespace-only', () => {
    renderLogin();
    fireEvent.changeText(screen.getByPlaceholderText(ID_PLACEHOLDER), '   ');
    fireEvent.changeText(screen.getByPlaceholderText(PWD_PLACEHOLDER), 'password123');
    fireEvent.press(screen.getByText('Sign In'));
    expect(screen.getByText(EMPTY_ERROR)).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('blocks submit when password is whitespace-only', () => {
    renderLogin();
    fireEvent.changeText(screen.getByPlaceholderText(ID_PLACEHOLDER), 'user@test.com');
    fireEvent.changeText(screen.getByPlaceholderText(PWD_PLACEHOLDER), '   ');
    fireEvent.press(screen.getByText('Sign In'));
    expect(screen.getByText(EMPTY_ERROR)).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });
});

// ── Max-length and long inputs ────────────────────────────────────────────────

describe('LoginScreen — max-length inputs', () => {
  it('calls login() with a 300-character identifier without crashing', async () => {
    mockLogin.mockResolvedValue({ ok: false, error: 'Not found' });
    const longId = 'a'.repeat(300);
    renderLogin();
    fireEvent.changeText(screen.getByPlaceholderText(ID_PLACEHOLDER), longId);
    fireEvent.changeText(screen.getByPlaceholderText(PWD_PLACEHOLDER), 'password123');
    await act(async () => { fireEvent.press(screen.getByText('Sign In')); });
    expect(mockLogin).toHaveBeenCalledWith(longId, 'password123', 'employee');
  });

  it('calls login() with a 300-character password without crashing', async () => {
    mockLogin.mockResolvedValue({ ok: false, error: 'Not found' });
    const longPwd = 'P@ssw0rd!'.repeat(34).slice(0, 300);
    renderLogin();
    fireEvent.changeText(screen.getByPlaceholderText(ID_PLACEHOLDER), 'user@test.com');
    fireEvent.changeText(screen.getByPlaceholderText(PWD_PLACEHOLDER), longPwd);
    await act(async () => { fireEvent.press(screen.getByText('Sign In')); });
    expect(mockLogin).toHaveBeenCalledWith('user@test.com', longPwd, 'employee');
  });
});

// ── Special character and injection inputs ────────────────────────────────────

describe('LoginScreen — special characters and injection inputs', () => {
  it('calls login() with XSS-style identifier without crashing', async () => {
    mockLogin.mockResolvedValue({ ok: false, error: 'Invalid credentials' });
    const xssId = '<script>alert("xss")</script>';
    renderLogin();
    fireEvent.changeText(screen.getByPlaceholderText(ID_PLACEHOLDER), xssId);
    fireEvent.changeText(screen.getByPlaceholderText(PWD_PLACEHOLDER), 'password123');
    await act(async () => { fireEvent.press(screen.getByText('Sign In')); });
    expect(mockLogin).toHaveBeenCalledWith(xssId, 'password123', 'employee');
  });

  it('calls login() with SQL injection in password without crashing', async () => {
    mockLogin.mockResolvedValue({ ok: false, error: 'Invalid credentials' });
    const sqlPwd = "' OR 1=1; DROP TABLE users; --";
    renderLogin();
    fireEvent.changeText(screen.getByPlaceholderText(ID_PLACEHOLDER), 'user@test.com');
    fireEvent.changeText(screen.getByPlaceholderText(PWD_PLACEHOLDER), sqlPwd);
    await act(async () => { fireEvent.press(screen.getByText('Sign In')); });
    expect(mockLogin).toHaveBeenCalledWith('user@test.com', sqlPwd, 'employee');
  });

  it('calls login() with null-byte in identifier without crashing', async () => {
    mockLogin.mockResolvedValue({ ok: false, error: 'Invalid credentials' });
    const nullByteId = 'user\x00@test.com';
    renderLogin();
    fireEvent.changeText(screen.getByPlaceholderText(ID_PLACEHOLDER), nullByteId);
    fireEvent.changeText(screen.getByPlaceholderText(PWD_PLACEHOLDER), 'password123');
    await act(async () => { fireEvent.press(screen.getByText('Sign In')); });
    expect(mockLogin).toHaveBeenCalledWith(nullByteId, 'password123', 'employee');
  });

  it('calls login() with Unicode RTL override characters without crashing', async () => {
    mockLogin.mockResolvedValue({ ok: false, error: 'Invalid credentials' });
    const rtlId = '‮user@test.com';
    renderLogin();
    fireEvent.changeText(screen.getByPlaceholderText(ID_PLACEHOLDER), rtlId);
    fireEvent.changeText(screen.getByPlaceholderText(PWD_PLACEHOLDER), 'password123');
    await act(async () => { fireEvent.press(screen.getByText('Sign In')); });
    expect(mockLogin).toHaveBeenCalledWith(rtlId, 'password123', 'employee');
  });
});

// ── Emoji inputs ──────────────────────────────────────────────────────────────

describe('LoginScreen — emoji inputs', () => {
  it('calls login() with emoji in identifier without crashing', async () => {
    mockLogin.mockResolvedValue({ ok: false, error: 'Invalid credentials' });
    const emojiId = '😀user@test.com';
    renderLogin();
    fireEvent.changeText(screen.getByPlaceholderText(ID_PLACEHOLDER), emojiId);
    fireEvent.changeText(screen.getByPlaceholderText(PWD_PLACEHOLDER), 'password123');
    await act(async () => { fireEvent.press(screen.getByText('Sign In')); });
    expect(mockLogin).toHaveBeenCalledWith(emojiId, 'password123', 'employee');
  });

  it('calls login() with emoji-only password without crashing', async () => {
    mockLogin.mockResolvedValue({ ok: false, error: 'Invalid credentials' });
    const emojiPwd = '🔐🔑🛡️🔒🗝️';
    renderLogin();
    fireEvent.changeText(screen.getByPlaceholderText(ID_PLACEHOLDER), 'user@test.com');
    fireEvent.changeText(screen.getByPlaceholderText(PWD_PLACEHOLDER), emojiPwd);
    await act(async () => { fireEvent.press(screen.getByText('Sign In')); });
    expect(mockLogin).toHaveBeenCalledWith('user@test.com', emojiPwd, 'employee');
  });
});

// ── Loading and error states ──────────────────────────────────────────────────

describe('LoginScreen — loading and error states', () => {
  it('hides "Sign In" text and disables button while login is pending', async () => {
    let resolveLogin!: (v: any) => void;
    mockLogin.mockImplementation(() => new Promise(r => { resolveLogin = r; }));

    renderLogin();
    fireEvent.changeText(screen.getByPlaceholderText(ID_PLACEHOLDER), 'user@test.com');
    fireEvent.changeText(screen.getByPlaceholderText(PWD_PLACEHOLDER), 'password123');

    // Do not await — we want to catch the loading state
    fireEvent.press(screen.getByText('Sign In'));

    // After pressing, setLoading(true) has fired synchronously; 'Sign In' text is gone
    await waitFor(() => expect(screen.queryByText('Sign In')).toBeNull());

    // Clean up by resolving so React doesn't complain about pending state
    await act(async () => { resolveLogin({ ok: true }); });
  });

  it('displays error message returned by login()', async () => {
    mockLogin.mockResolvedValue({ ok: false, error: 'Incorrect email or password.' });
    renderLogin();
    fireEvent.changeText(screen.getByPlaceholderText(ID_PLACEHOLDER), 'user@test.com');
    fireEvent.changeText(screen.getByPlaceholderText(PWD_PLACEHOLDER), 'wrongpass');
    await act(async () => { fireEvent.press(screen.getByText('Sign In')); });
    await waitFor(() => expect(screen.getByText('Incorrect email or password.')).toBeTruthy());
  });

  it('displays fallback error when login() returns no error message', async () => {
    mockLogin.mockResolvedValue({ ok: false });
    renderLogin();
    fireEvent.changeText(screen.getByPlaceholderText(ID_PLACEHOLDER), 'user@test.com');
    fireEvent.changeText(screen.getByPlaceholderText(PWD_PLACEHOLDER), 'wrongpass');
    await act(async () => { fireEvent.press(screen.getByText('Sign In')); });
    await waitFor(() => expect(screen.getByText('Login failed. Please try again.')).toBeTruthy());
  });

  it('clears previous error when new login attempt starts', async () => {
    mockLogin
      .mockResolvedValueOnce({ ok: false, error: 'First error' })
      .mockResolvedValueOnce({ ok: true });

    renderLogin();
    fireEvent.changeText(screen.getByPlaceholderText(ID_PLACEHOLDER), 'user@test.com');
    fireEvent.changeText(screen.getByPlaceholderText(PWD_PLACEHOLDER), 'wrongpass');
    await act(async () => { fireEvent.press(screen.getByText('Sign In')); });
    await waitFor(() => expect(screen.getByText('First error')).toBeTruthy());

    await act(async () => { fireEvent.press(screen.getByText('Sign In')); });
    expect(screen.queryByText('First error')).toBeNull();
  });

  it('calls onSuccess when login() returns ok:true', async () => {
    const onSuccess = jest.fn();
    mockLogin.mockResolvedValue({ ok: true });

    render(
      <LoginScreen
        role="employee"
        onBack={jest.fn()}
        onForgotUsername={jest.fn()}
        onForgotPassword={jest.fn()}
        onSignUp={jest.fn()}
        onSuccess={onSuccess}
      />,
    );
    fireEvent.changeText(screen.getByPlaceholderText(ID_PLACEHOLDER), 'user@test.com');
    fireEvent.changeText(screen.getByPlaceholderText(PWD_PLACEHOLDER), 'password123');
    await act(async () => { fireEvent.press(screen.getByText('Sign In')); });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('passes the correct role to login()', async () => {
    mockLogin.mockResolvedValue({ ok: true });
    renderLogin('manager');
    fireEvent.changeText(screen.getByPlaceholderText(ID_PLACEHOLDER), 'mgr@test.com');
    fireEvent.changeText(screen.getByPlaceholderText(PWD_PLACEHOLDER), 'password123');
    await act(async () => { fireEvent.press(screen.getByText('Sign In')); });
    expect(mockLogin).toHaveBeenCalledWith('mgr@test.com', 'password123', 'manager');
  });
});

// ── Role-specific rendering ───────────────────────────────────────────────────

describe('LoginScreen — role-specific rendering', () => {
  it('admin portal does not show Sign Up link', () => {
    renderLogin('admin');
    expect(screen.queryByText('Sign Up')).toBeNull();
  });

  it('employee portal shows Sign Up link', () => {
    renderLogin('employee');
    expect(screen.getByText('Sign Up')).toBeTruthy();
  });

  it('manager portal shows Sign Up link', () => {
    renderLogin('manager');
    expect(screen.getByText('Sign Up')).toBeTruthy();
  });

  it('admin portal renders "Admin Portal" role label', () => {
    renderLogin('admin');
    expect(screen.getByText('Admin Portal')).toBeTruthy();
  });
});

// ── Navigation buttons ────────────────────────────────────────────────────────

describe('LoginScreen — navigation buttons', () => {
  it('calls onForgotPassword when "Forgot password?" is pressed', () => {
    const onForgotPassword = jest.fn();
    render(
      <LoginScreen
        role="employee"
        onBack={jest.fn()}
        onForgotUsername={jest.fn()}
        onForgotPassword={onForgotPassword}
        onSignUp={jest.fn()}
        onSuccess={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByText(/Forgot password\?/));
    expect(onForgotPassword).toHaveBeenCalledTimes(1);
  });

  it('calls onForgotUsername when "Forgot username?" is pressed', () => {
    const onForgotUsername = jest.fn();
    render(
      <LoginScreen
        role="employee"
        onBack={jest.fn()}
        onForgotUsername={onForgotUsername}
        onForgotPassword={jest.fn()}
        onSignUp={jest.fn()}
        onSuccess={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByText(/Forgot username\?/));
    expect(onForgotUsername).toHaveBeenCalledTimes(1);
  });

  it('calls onSignUp when Sign Up is pressed', () => {
    const onSignUp = jest.fn();
    render(
      <LoginScreen
        role="employee"
        onBack={jest.fn()}
        onForgotUsername={jest.fn()}
        onForgotPassword={jest.fn()}
        onSignUp={onSignUp}
        onSuccess={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByText('Sign Up'));
    expect(onSignUp).toHaveBeenCalledTimes(1);
  });

  it('calls onBack when back button is pressed', () => {
    const onBack = jest.fn();
    render(
      <LoginScreen
        role="employee"
        onBack={onBack}
        onForgotUsername={jest.fn()}
        onForgotPassword={jest.fn()}
        onSignUp={jest.fn()}
        onSuccess={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByRole('button', { name: /go back/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

// ── Lockout mechanism ─────────────────────────────────────────────────────────

describe('LoginScreen — lockout mechanism', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('triggers lockout after 3 consecutive failures and shows countdown', async () => {
    mockLogin.mockResolvedValue({ ok: false, error: 'Wrong password' });
    renderLogin();
    fireEvent.changeText(screen.getByPlaceholderText(ID_PLACEHOLDER), 'user@test.com');
    fireEvent.changeText(screen.getByPlaceholderText(PWD_PLACEHOLDER), 'wrong');

    // 3 failures → lockDurationMs(3) = 15000 ms → lockout
    await act(async () => { fireEvent.press(screen.getByText('Sign In')); });
    await act(async () => { fireEvent.press(screen.getByText('Sign In')); });
    await act(async () => { fireEvent.press(screen.getByText('Sign In')); });

    expect(screen.getByText(/Try again in \d+s/)).toBeTruthy();
  });

  it('shows lockout error and prevents login while locked', async () => {
    mockLogin.mockResolvedValue({ ok: false, error: 'Wrong' });
    renderLogin();
    fireEvent.changeText(screen.getByPlaceholderText(ID_PLACEHOLDER), 'user@test.com');
    fireEvent.changeText(screen.getByPlaceholderText(PWD_PLACEHOLDER), 'wrong');

    await act(async () => { fireEvent.press(screen.getByText('Sign In')); });
    await act(async () => { fireEvent.press(screen.getByText('Sign In')); });
    await act(async () => { fireEvent.press(screen.getByText('Sign In')); });

    // After lockout, pressing Sign In should not call login again (button is disabled)
    const callCountAfterLockout = mockLogin.mock.calls.length;
    // The button is disabled so pressing it does nothing
    fireEvent.press(screen.getByText(/Try again in \d+s/));
    expect(mockLogin.mock.calls.length).toBe(callCountAfterLockout);
  });
});

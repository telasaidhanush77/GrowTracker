import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('../../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import SignUpScreen from '../../../screens/auth/SignUpScreen';

const MOCK_COLORS: any = {
  bg: '#111', bgElevated: '#1a1a1a', card: '#222', border: '#333',
  textPrimary: '#fff', textSecondary: '#ccc', textMuted: '#999',
  primary: '#4f46e5',
  adminPrimary: '#dc2626', adminLight: '#fee2e2',
  managerPrimary: '#7c3aed', managerLight: '#f3e8ff',
  employeePrimary: '#4f46e5', employeeLight: '#eef2ff',
  rejected: '#ef4444', rejectedBg: '#fee2e2',
};

const mockSignup = jest.fn();

function makeProps(overrides: any = {}) {
  return {
    role: 'employee' as const,
    onBack: jest.fn(),
    onSuccess: jest.fn(),
    onSignIn: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (useTheme as jest.Mock).mockReturnValue({ colors: MOCK_COLORS, isDark: true });
  (useAuth as jest.Mock).mockReturnValue({ signup: mockSignup });
});

function fillValidForm() {
  fireEvent.changeText(screen.getByPlaceholderText('First'), 'John');
  fireEvent.changeText(screen.getByPlaceholderText('Last'), 'Doe');
  fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'john@example.com');
  fireEvent.changeText(screen.getByPlaceholderText('e.g. john.doe'), 'johndoe');
  fireEvent.changeText(screen.getByPlaceholderText('Min. 8 characters'), 'Password1!');
  fireEvent.changeText(screen.getByPlaceholderText('Re-enter password'), 'Password1!');
  fireEvent.press(screen.getByTestId('terms-checkbox'));
}

describe('SignUpScreen', () => {
  it('renders Create Account form subtitle', () => {
    render(<SignUpScreen {...makeProps()} />);
    expect(screen.getByText('Fill in your details to get started')).toBeTruthy();
  });

  it('renders the Create Account button', () => {
    render(<SignUpScreen {...makeProps()} />);
    expect(screen.getByTestId('create-account-btn')).toBeTruthy();
  });

  it('shows employee role label', () => {
    render(<SignUpScreen {...makeProps({ role: 'employee' })} />);
    expect(screen.getByText('Employee')).toBeTruthy();
  });

  it('shows manager role label', () => {
    render(<SignUpScreen {...makeProps({ role: 'manager' })} />);
    expect(screen.getByText('Manager')).toBeTruthy();
  });

  it('shows admin role label', () => {
    render(<SignUpScreen {...makeProps({ role: 'admin' })} />);
    expect(screen.getByText('Admin')).toBeTruthy();
  });

  it('calls onBack when back button is pressed', () => {
    const onBack = jest.fn();
    render(<SignUpScreen {...makeProps({ onBack })} />);
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('calls onSignIn when Sign In link is pressed', () => {
    const onSignIn = jest.fn();
    render(<SignUpScreen {...makeProps({ onSignIn })} />);
    fireEvent.press(screen.getByText('Sign In'));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it('shows error when first name is empty', () => {
    render(<SignUpScreen {...makeProps()} />);
    fireEvent.press(screen.getByTestId('create-account-btn'));
    expect(screen.getByText('First and last name are required.')).toBeTruthy();
  });

  it('shows error for invalid email', () => {
    render(<SignUpScreen {...makeProps()} />);
    fireEvent.changeText(screen.getByPlaceholderText('First'), 'John');
    fireEvent.changeText(screen.getByPlaceholderText('Last'), 'Doe');
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'notanemail');
    fireEvent.press(screen.getByTestId('create-account-btn'));
    expect(screen.getByText('Please enter a valid email address.')).toBeTruthy();
  });

  it('shows error when username is empty', () => {
    render(<SignUpScreen {...makeProps()} />);
    fireEvent.changeText(screen.getByPlaceholderText('First'), 'John');
    fireEvent.changeText(screen.getByPlaceholderText('Last'), 'Doe');
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'john@example.com');
    fireEvent.press(screen.getByTestId('create-account-btn'));
    expect(screen.getByText('Username is required.')).toBeTruthy();
  });

  it('shows error when username is too short', () => {
    render(<SignUpScreen {...makeProps()} />);
    fireEvent.changeText(screen.getByPlaceholderText('First'), 'John');
    fireEvent.changeText(screen.getByPlaceholderText('Last'), 'Doe');
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'john@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. john.doe'), 'jd');
    fireEvent.press(screen.getByTestId('create-account-btn'));
    expect(screen.getByText('Username must be at least 3 characters.')).toBeTruthy();
  });

  it('shows error when password is too short', () => {
    render(<SignUpScreen {...makeProps()} />);
    fireEvent.changeText(screen.getByPlaceholderText('First'), 'John');
    fireEvent.changeText(screen.getByPlaceholderText('Last'), 'Doe');
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'john@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. john.doe'), 'johndoe');
    fireEvent.changeText(screen.getByPlaceholderText('Min. 8 characters'), 'short');
    fireEvent.press(screen.getByTestId('create-account-btn'));
    expect(screen.getByText('Password must be at least 8 characters.')).toBeTruthy();
  });

  it('shows error when password has no uppercase letter', () => {
    render(<SignUpScreen {...makeProps()} />);
    fireEvent.changeText(screen.getByPlaceholderText('First'), 'John');
    fireEvent.changeText(screen.getByPlaceholderText('Last'), 'Doe');
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'john@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. john.doe'), 'johndoe');
    fireEvent.changeText(screen.getByPlaceholderText('Min. 8 characters'), 'password1!');
    fireEvent.press(screen.getByTestId('create-account-btn'));
    expect(screen.getByText('Password must contain at least one uppercase letter.')).toBeTruthy();
  });

  it('shows error when password has no lowercase letter', () => {
    render(<SignUpScreen {...makeProps()} />);
    fireEvent.changeText(screen.getByPlaceholderText('First'), 'John');
    fireEvent.changeText(screen.getByPlaceholderText('Last'), 'Doe');
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'john@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. john.doe'), 'johndoe');
    fireEvent.changeText(screen.getByPlaceholderText('Min. 8 characters'), 'PASSWORD1!');
    fireEvent.press(screen.getByTestId('create-account-btn'));
    expect(screen.getByText('Password must contain at least one lowercase letter.')).toBeTruthy();
  });

  it('shows error when password has no special character', () => {
    render(<SignUpScreen {...makeProps()} />);
    fireEvent.changeText(screen.getByPlaceholderText('First'), 'John');
    fireEvent.changeText(screen.getByPlaceholderText('Last'), 'Doe');
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'john@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. john.doe'), 'johndoe');
    fireEvent.changeText(screen.getByPlaceholderText('Min. 8 characters'), 'Password1');
    fireEvent.press(screen.getByTestId('create-account-btn'));
    expect(screen.getByText(/Password must contain at least one special character/)).toBeTruthy();
  });

  it('shows error when passwords do not match', () => {
    render(<SignUpScreen {...makeProps()} />);
    fireEvent.changeText(screen.getByPlaceholderText('First'), 'John');
    fireEvent.changeText(screen.getByPlaceholderText('Last'), 'Doe');
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'john@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. john.doe'), 'johndoe');
    fireEvent.changeText(screen.getByPlaceholderText('Min. 8 characters'), 'Password1!');
    fireEvent.changeText(screen.getByPlaceholderText('Re-enter password'), 'Different1!');
    fireEvent.press(screen.getByTestId('create-account-btn'));
    expect(screen.getByText('Passwords do not match.')).toBeTruthy();
  });

  it('shows error when terms are not accepted', () => {
    render(<SignUpScreen {...makeProps()} />);
    fireEvent.changeText(screen.getByPlaceholderText('First'), 'John');
    fireEvent.changeText(screen.getByPlaceholderText('Last'), 'Doe');
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'john@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. john.doe'), 'johndoe');
    fireEvent.changeText(screen.getByPlaceholderText('Min. 8 characters'), 'Password1!');
    fireEvent.changeText(screen.getByPlaceholderText('Re-enter password'), 'Password1!');
    fireEvent.press(screen.getByTestId('create-account-btn'));
    expect(screen.getByText(/Please accept the Terms/)).toBeTruthy();
  });

  it('calls signup and onSuccess on valid form', async () => {
    const onSuccess = jest.fn();
    mockSignup.mockResolvedValue({
      ok: true,
      user: { id: 'u1', employeeCode: 'E001', username: 'johndoe' },
    });
    render(<SignUpScreen {...makeProps({ onSuccess })} />);
    fillValidForm();
    fireEvent.press(screen.getByTestId('create-account-btn'));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('u1', 'E001', 'johndoe'));
  });

  it('shows API error when signup fails', async () => {
    mockSignup.mockResolvedValue({ ok: false, error: 'Email already in use.' });
    render(<SignUpScreen {...makeProps()} />);
    fillValidForm();
    fireEvent.press(screen.getByTestId('create-account-btn'));
    await screen.findByText('Email already in use.');
    expect(screen.getByText('Email already in use.')).toBeTruthy();
  });

  it('shows generic error when signup fails without message', async () => {
    mockSignup.mockResolvedValue({ ok: false });
    render(<SignUpScreen {...makeProps()} />);
    fillValidForm();
    fireEvent.press(screen.getByTestId('create-account-btn'));
    await screen.findByText('Sign up failed. Please try again.');
  });

  it('auto-fills username when first name is typed and username is empty', () => {
    render(<SignUpScreen {...makeProps()} />);
    fireEvent.changeText(screen.getByPlaceholderText('First'), 'John');
    fireEvent(screen.getByPlaceholderText('First'), 'blur');
    const usernameInput = screen.getByPlaceholderText('e.g. john.doe');
    expect(usernameInput.props.value).toBe('john');
  });

  it('auto-fills username with first and last name on lastName blur', () => {
    render(<SignUpScreen {...makeProps()} />);
    fireEvent.changeText(screen.getByPlaceholderText('First'), 'John');
    fireEvent.changeText(screen.getByPlaceholderText('Last'), 'Doe');
    fireEvent(screen.getByPlaceholderText('Last'), 'blur');
    const usernameInput = screen.getByPlaceholderText('e.g. john.doe');
    expect(usernameInput.props.value).toBe('john.doe');
  });

  it('does not overwrite existing username on blur', () => {
    render(<SignUpScreen {...makeProps()} />);
    fireEvent.changeText(screen.getByPlaceholderText('First'), 'John');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. john.doe'), 'mymanualone');
    fireEvent(screen.getByPlaceholderText('First'), 'blur');
    const usernameInput = screen.getByPlaceholderText('e.g. john.doe');
    expect(usernameInput.props.value).toBe('mymanualone');
  });

  it('shows password strength bar when typing password', () => {
    render(<SignUpScreen {...makeProps()} />);
    fireEvent.changeText(screen.getByPlaceholderText('Min. 8 characters'), 'TestPass1!');
    expect(screen.getByText('Strong')).toBeTruthy();
  });

  it('shows Too short strength when password < 8 chars', () => {
    render(<SignUpScreen {...makeProps()} />);
    fireEvent.changeText(screen.getByPlaceholderText('Min. 8 characters'), 'Ab1!');
    expect(screen.getByText('Too short')).toBeTruthy();
  });

  it('shows Fair strength for lowercase-only 8-char password', () => {
    render(<SignUpScreen {...makeProps()} />);
    fireEvent.changeText(screen.getByPlaceholderText('Min. 8 characters'), 'abcdefgh');
    expect(screen.getByText('Fair')).toBeTruthy();
  });

  it('shows confirm password mismatch hint inline', () => {
    render(<SignUpScreen {...makeProps()} />);
    fireEvent.changeText(screen.getByPlaceholderText('Min. 8 characters'), 'Password1!');
    fireEvent.changeText(screen.getByPlaceholderText('Re-enter password'), 'Different!');
    expect(screen.getByText('Passwords do not match')).toBeTruthy();
  });

  it('toggles terms checkbox', () => {
    render(<SignUpScreen {...makeProps()} />);
    expect(screen.queryByText('✓')).toBeNull();
    fireEvent.press(screen.getByTestId('terms-checkbox'));
    expect(screen.getByText('✓')).toBeTruthy();
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('../../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import LoginScreen from '../../../screens/auth/LoginScreen';

const MOCK_COLORS: any = {
  bg: '#111', bgElevated: '#1a1a1a', card: '#222', border: '#333',
  textPrimary: '#fff', textSecondary: '#ccc', textMuted: '#999',
  primary: '#4f46e5',
  adminPrimary: '#dc2626', adminLight: '#fee2e2',
  managerPrimary: '#7c3aed', managerLight: '#f3e8ff',
  employeePrimary: '#4f46e5', employeeLight: '#eef2ff',
};

const mockLogin = jest.fn();

function makeProps(overrides: any = {}) {
  return {
    role: 'employee' as const,
    onBack: jest.fn(),
    onForgotUsername: jest.fn(),
    onForgotPassword: jest.fn(),
    onSignUp: jest.fn(),
    onSuccess: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (useTheme as jest.Mock).mockReturnValue({ colors: MOCK_COLORS, isDark: true });
  (useAuth as jest.Mock).mockReturnValue({ login: mockLogin });
});

describe('LoginScreen', () => {
  it('renders Sign In button', () => {
    render(<LoginScreen {...makeProps()} />);
    expect(screen.getByText('Sign In')).toBeTruthy();
  });

  it('renders email and password fields', () => {
    render(<LoginScreen {...makeProps()} />);
    expect(screen.getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(screen.getByPlaceholderText('Enter your password')).toBeTruthy();
  });

  it('shows error when fields are empty and Sign In pressed', async () => {
    render(<LoginScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Sign In'));
    await waitFor(() => expect(screen.getByText('Please enter your email and password.')).toBeTruthy());
  });

  it('calls login with valid credentials', async () => {
    mockLogin.mockResolvedValue({ ok: true });
    const onSuccess = jest.fn();
    render(<LoginScreen {...makeProps({ onSuccess })} />);
    fireEvent.changeText(screen.getByPlaceholderText('Enter your email'), 'user@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('Enter your password'), 'Password1!');
    fireEvent.press(screen.getByText('Sign In'));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(mockLogin).toHaveBeenCalledWith('user@test.com', 'Password1!', 'employee');
  });

  it('shows API error when login fails', async () => {
    mockLogin.mockResolvedValue({ ok: false, error: 'Invalid credentials' });
    render(<LoginScreen {...makeProps()} />);
    fireEvent.changeText(screen.getByPlaceholderText('Enter your email'), 'user@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('Enter your password'), 'wrongpass');
    fireEvent.press(screen.getByText('Sign In'));
    await screen.findByText('Invalid credentials');
    expect(screen.getByText('Invalid credentials')).toBeTruthy();
  });

  it('shows lockout countdown after 3 consecutive failures', async () => {
    mockLogin.mockResolvedValue({ ok: false, error: 'Wrong credentials' });
    render(<LoginScreen {...makeProps()} />);
    fireEvent.changeText(screen.getByPlaceholderText('Enter your email'), 'user@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('Enter your password'), 'badpass');

    fireEvent.press(screen.getByText('Sign In'));
    await screen.findByText('Wrong credentials');

    fireEvent.press(screen.getByText('Sign In'));
    await screen.findByText('Wrong credentials');

    fireEvent.press(screen.getByText('Sign In'));
    await waitFor(() => expect(screen.getByText(/Too many failed attempts/)).toBeTruthy());
  });

  it('shows Sign Up link for employee role', () => {
    render(<LoginScreen {...makeProps({ role: 'employee' })} />);
    expect(screen.getByText('Sign Up')).toBeTruthy();
  });

  it('hides Sign Up link for admin role', () => {
    render(<LoginScreen {...makeProps({ role: 'admin' })} />);
    expect(screen.queryByText('Sign Up')).toBeNull();
  });

  it('calls onForgotPassword when Forgot password is pressed', () => {
    const onForgotPassword = jest.fn();
    render(<LoginScreen {...makeProps({ onForgotPassword })} />);
    fireEvent.press(screen.getByText(/Forgot password/));
    expect(onForgotPassword).toHaveBeenCalledTimes(1);
  });

  it('calls onBack when back button is pressed', () => {
    const onBack = jest.fn();
    render(<LoginScreen {...makeProps({ onBack })} />);
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('calls onSignUp when Sign Up link pressed', () => {
    const onSignUp = jest.fn();
    render(<LoginScreen {...makeProps({ onSignUp })} />);
    fireEvent.press(screen.getByText('Sign Up'));
    expect(onSignUp).toHaveBeenCalledTimes(1);
  });
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('../../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));

import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import ForgotPasswordScreen from '../../../screens/auth/ForgotPasswordScreen';

const MOCK_COLORS: any = {
  bg: '#111', bgElevated: '#1a1a1a', card: '#222', border: '#333',
  textPrimary: '#fff', textSecondary: '#ccc', textMuted: '#999',
  primary: '#4f46e5', approved: '#22c55e',
  rejected: '#ef4444', rejectedBg: '#fee2e2',
};

const mockResetPasswordRequest = jest.fn();
const mockResetPasswordCheckOtp = jest.fn();
const mockResetPasswordSetNewPassword = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useTheme as jest.Mock).mockReturnValue({ colors: MOCK_COLORS, isDark: true });
  (useAuth as jest.Mock).mockReturnValue({
    resetPasswordRequest: mockResetPasswordRequest,
    resetPasswordCheckOtp: mockResetPasswordCheckOtp,
    resetPasswordSetNewPassword: mockResetPasswordSetNewPassword,
  });
});

describe('ForgotPasswordScreen', () => {
  it('renders Reset Password heading', () => {
    render(<ForgotPasswordScreen onBack={jest.fn()} onSuccess={jest.fn()} />);
    expect(screen.getByText('Reset Password')).toBeTruthy();
  });

  it('renders step 1 of 3 label', () => {
    render(<ForgotPasswordScreen onBack={jest.fn()} onSuccess={jest.fn()} />);
    expect(screen.getByText(/Step 1 of 3/)).toBeTruthy();
  });

  it('calls onBack when Back button pressed on email step', () => {
    const onBack = jest.fn();
    render(<ForgotPasswordScreen onBack={onBack} onSuccess={jest.fn()} />);
    fireEvent.press(screen.getByText(/Back/));
    expect(onBack).toHaveBeenCalled();
  });

  it('shows validation error for invalid email', async () => {
    render(<ForgotPasswordScreen onBack={jest.fn()} onSuccess={jest.fn()} />);
    fireEvent.changeText(screen.getByPlaceholderText('your@email.com'), 'notanemail');
    fireEvent.press(screen.getByText('Send Verification Code'));
    expect(screen.getByText('Please enter a valid email address.')).toBeTruthy();
    expect(mockResetPasswordRequest).not.toHaveBeenCalled();
  });

  it('calls resetPasswordRequest with valid email', async () => {
    mockResetPasswordRequest.mockResolvedValue({ ok: true });
    render(<ForgotPasswordScreen onBack={jest.fn()} onSuccess={jest.fn()} />);
    fireEvent.changeText(screen.getByPlaceholderText('your@email.com'), 'test@example.com');
    fireEvent.press(screen.getByText('Send Verification Code'));
    expect(mockResetPasswordRequest).toHaveBeenCalledWith('test@example.com');
  });

  it('shows error from API when request fails', async () => {
    mockResetPasswordRequest.mockResolvedValue({ ok: false, error: 'Email not found' });
    render(<ForgotPasswordScreen onBack={jest.fn()} onSuccess={jest.fn()} />);
    fireEvent.changeText(screen.getByPlaceholderText('your@email.com'), 'test@example.com');
    fireEvent.press(screen.getByText('Send Verification Code'));
    await screen.findByText('Email not found');
    expect(screen.getByText('Email not found')).toBeTruthy();
  });

  it('shows OTP length error when code is shorter than 6 digits', async () => {
    mockResetPasswordRequest.mockResolvedValue({ ok: true });
    render(<ForgotPasswordScreen onBack={jest.fn()} onSuccess={jest.fn()} />);
    fireEvent.changeText(screen.getByPlaceholderText('your@email.com'), 'test@example.com');
    fireEvent.press(screen.getByText('Send Verification Code'));
    await screen.findByText('Verify Code');
    fireEvent.changeText(screen.getByPlaceholderText('000000'), '123');
    fireEvent.press(screen.getByText('Verify Code'));
    expect(screen.getByText('Please enter the 6-digit code from your email.')).toBeTruthy();
  });

  it('shows error when OTP verification fails', async () => {
    mockResetPasswordRequest.mockResolvedValue({ ok: true });
    mockResetPasswordCheckOtp.mockResolvedValue({ ok: false, error: 'Invalid or expired code.' });
    render(<ForgotPasswordScreen onBack={jest.fn()} onSuccess={jest.fn()} />);
    fireEvent.changeText(screen.getByPlaceholderText('your@email.com'), 'test@example.com');
    fireEvent.press(screen.getByText('Send Verification Code'));
    await screen.findByText('Verify Code');
    fireEvent.changeText(screen.getByPlaceholderText('000000'), '123456');
    fireEvent.press(screen.getByText('Verify Code'));
    await screen.findByText('Invalid or expired code.');
    expect(screen.getByText('Invalid or expired code.')).toBeTruthy();
  });

  it('shows Start Over button on OTP step and returns to email step', async () => {
    mockResetPasswordRequest.mockResolvedValue({ ok: true });
    render(<ForgotPasswordScreen onBack={jest.fn()} onSuccess={jest.fn()} />);
    fireEvent.changeText(screen.getByPlaceholderText('your@email.com'), 'test@example.com');
    fireEvent.press(screen.getByText('Send Verification Code'));
    await screen.findByText('Verify Code');
    fireEvent.press(screen.getByText(/Start Over/));
    expect(screen.getByPlaceholderText('your@email.com')).toBeTruthy();
  });

  it('shows password too short error in reset step', async () => {
    mockResetPasswordRequest.mockResolvedValue({ ok: true });
    mockResetPasswordCheckOtp.mockResolvedValue({ ok: true });
    render(<ForgotPasswordScreen onBack={jest.fn()} onSuccess={jest.fn()} />);
    fireEvent.changeText(screen.getByPlaceholderText('your@email.com'), 'test@example.com');
    fireEvent.press(screen.getByText('Send Verification Code'));
    await screen.findByText('Verify Code');
    fireEvent.changeText(screen.getByPlaceholderText('000000'), '123456');
    fireEvent.press(screen.getByText('Verify Code'));
    await screen.findByText(/Step 3 of 3/);
    fireEvent.changeText(screen.getByPlaceholderText('Min. 8 characters'), 'short');
    fireEvent.press(screen.getAllByText('Reset Password').at(-1)!);
    expect(screen.getByText('Password must be at least 8 characters.')).toBeTruthy();
  });

  it('shows passwords do not match error in reset step', async () => {
    mockResetPasswordRequest.mockResolvedValue({ ok: true });
    mockResetPasswordCheckOtp.mockResolvedValue({ ok: true });
    render(<ForgotPasswordScreen onBack={jest.fn()} onSuccess={jest.fn()} />);
    fireEvent.changeText(screen.getByPlaceholderText('your@email.com'), 'test@example.com');
    fireEvent.press(screen.getByText('Send Verification Code'));
    await screen.findByText('Verify Code');
    fireEvent.changeText(screen.getByPlaceholderText('000000'), '123456');
    fireEvent.press(screen.getByText('Verify Code'));
    await screen.findByText(/Step 3 of 3/);
    fireEvent.changeText(screen.getByPlaceholderText('Min. 8 characters'), 'Password1!');
    fireEvent.changeText(screen.getByPlaceholderText('Re-enter new password'), 'Different1!');
    fireEvent.press(screen.getAllByText('Reset Password').at(-1)!);
    expect(screen.getByText('Passwords do not match.')).toBeTruthy();
  });

  it('shows reset API error when reset fails', async () => {
    mockResetPasswordRequest.mockResolvedValue({ ok: true });
    mockResetPasswordCheckOtp.mockResolvedValue({ ok: true });
    mockResetPasswordSetNewPassword.mockResolvedValue({ ok: false, error: 'Reset failed.' });
    render(<ForgotPasswordScreen onBack={jest.fn()} onSuccess={jest.fn()} />);
    fireEvent.changeText(screen.getByPlaceholderText('your@email.com'), 'test@example.com');
    fireEvent.press(screen.getByText('Send Verification Code'));
    await screen.findByText('Verify Code');
    fireEvent.changeText(screen.getByPlaceholderText('000000'), '123456');
    fireEvent.press(screen.getByText('Verify Code'));
    await screen.findByText(/Step 3 of 3/);
    fireEvent.changeText(screen.getByPlaceholderText('Min. 8 characters'), 'ValidPass1!');
    fireEvent.changeText(screen.getByPlaceholderText('Re-enter new password'), 'ValidPass1!');
    fireEvent.press(screen.getAllByText('Reset Password').at(-1)!);
    await screen.findByText('Reset failed.');
    expect(screen.getByText('Reset failed.')).toBeTruthy();
  });

  it('toggles password visibility eye button in reset step', async () => {
    mockResetPasswordRequest.mockResolvedValue({ ok: true });
    mockResetPasswordCheckOtp.mockResolvedValue({ ok: true });
    render(<ForgotPasswordScreen onBack={jest.fn()} onSuccess={jest.fn()} />);
    fireEvent.changeText(screen.getByPlaceholderText('your@email.com'), 'test@example.com');
    fireEvent.press(screen.getByText('Send Verification Code'));
    await screen.findByText('Verify Code');
    fireEvent.changeText(screen.getByPlaceholderText('000000'), '123456');
    fireEvent.press(screen.getByText('Verify Code'));
    await screen.findByText('Reset Password');
    fireEvent.press(screen.getByText('👁'));
    expect(screen.getByText('🙈')).toBeTruthy();
  });
});

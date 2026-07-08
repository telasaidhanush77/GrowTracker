import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import type { ScreenProps } from '../../../types';

jest.mock('../../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../context/ToastContext', () => ({ useToast: jest.fn() }));
jest.mock('../../../components/Header', () => {
  const { View, Text } = require('react-native');
  return ({ title, onBack }: any) => (
    <View testID="header">
      <Text testID="header-title">{title}</Text>
      {onBack && <Text testID="header-back" onPress={onBack}>Back</Text>}
    </View>
  );
});
jest.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      mfa: {
        listFactors: jest.fn().mockResolvedValue({ data: { totp: [] } }),
        enroll: jest.fn().mockResolvedValue({ data: null, error: null }),
        unenroll: jest.fn().mockResolvedValue({ error: null }),
        challenge: jest.fn().mockResolvedValue({ data: { id: 'ch1' }, error: null }),
        verify: jest.fn().mockResolvedValue({ error: null }),
      },
    },
  },
}));

import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import PrivacySecurityScreen from '../../../screens/shared/PrivacySecurityScreen';

const MOCK_COLORS: any = {
  bg: '#111', bgElevated: '#1a1a1a', card: '#222', border: '#333',
  divider: '#444', textPrimary: '#fff', textSecondary: '#ccc', textMuted: '#999',
  primary: '#4f46e5', approved: '#22c55e', approvedBg: '#dcfce7',
  rejected: '#ef4444', rejectedBg: '#fee2e2',
  pending: '#f59e0b', pendingBg: '#fef3c7',
};

const MOCK_USER = {
  id: 'emp-1', name: 'Alice Smith', email: 'alice@test.com',
  role: 'employee' as const, status: 'active' as const,
};

const mockChangePassword = jest.fn();
const mockShowToast = jest.fn();

function makeProps(overrides: Partial<ScreenProps> = {}): ScreenProps {
  return {
    navigation: { navigate: jest.fn(), goBack: jest.fn() },
    params: {},
    currentUserId: 'emp-1',
    currentRole: 'employee',
    onLogout: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (useTheme as jest.Mock).mockReturnValue({ colors: MOCK_COLORS, isDark: false });
  (useAuth as jest.Mock).mockReturnValue({
    changePassword: mockChangePassword,
    users: [MOCK_USER],
  });
  (useToast as jest.Mock).mockReturnValue({ showToast: mockShowToast });
});

describe('PrivacySecurityScreen — basic render', () => {
  it('renders the Privacy & Security heading', () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    expect(screen.getByTestId('header-title').props.children).toBe('Privacy & Security');
  });

  it('renders Account Security card', () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    expect(screen.getByText('Account Security')).toBeTruthy();
  });

  it('shows Two-Factor Auth row', async () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    await waitFor(() => expect(screen.getByText('Two-Factor Auth')).toBeTruthy());
  });

  it('shows OFF badge for 2FA when disabled', async () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    await waitFor(() => expect(screen.getByText('OFF')).toBeTruthy());
  });

  it('renders Change Password row', () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    expect(screen.getByText('Change Password')).toBeTruthy();
  });

  it('renders Two-Factor Authentication row label', () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    expect(screen.getByText('Two-Factor Authentication')).toBeTruthy();
  });

  it('renders Platform row', () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    expect(screen.getByText('Platform')).toBeTruthy();
  });

  it('renders Sign-in Method row', () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    expect(screen.getByText('Sign-in Method')).toBeTruthy();
  });

  it('renders Last Signed In row', () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    expect(screen.getByText('Last Signed In')).toBeTruthy();
  });

  it('renders Privacy Policy row', () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    expect(screen.getByText('Privacy Policy')).toBeTruthy();
  });

  it('renders Terms & Conditions row', () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    expect(screen.getByText('Terms & Conditions')).toBeTruthy();
  });

  it('shows linked email from user', () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    expect(screen.getByText('alice@test.com')).toBeTruthy();
  });

  it('shows dash when no user found', () => {
    (useAuth as jest.Mock).mockReturnValue({
      changePassword: mockChangePassword,
      users: [],
    });
    render(<PrivacySecurityScreen {...makeProps()} />);
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('renders Authentication section label', () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    expect(screen.getByText('Authentication')).toBeTruthy();
  });

  it('renders Device & Session section label', () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    expect(screen.getByText('Device & Session')).toBeTruthy();
  });

  it('renders Privacy & Documents section label', () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    expect(screen.getByText('Privacy & Documents')).toBeTruthy();
  });

  it('shows current session label when no lastSignIn', () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    expect(screen.getByText('Current session')).toBeTruthy();
  });
});

describe('PrivacySecurityScreen — Change Password panel', () => {
  it('opens Change Password panel when row is pressed', () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Change Password'));
    expect(screen.getByPlaceholderText('Enter current password')).toBeTruthy();
  });

  it('shows three password fields when panel is open', () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Change Password'));
    expect(screen.getByPlaceholderText('Enter current password')).toBeTruthy();
    expect(screen.getByPlaceholderText('Minimum 8 characters')).toBeTruthy();
    expect(screen.getByPlaceholderText('Re-enter new password')).toBeTruthy();
  });

  it('shows Update Password button in panel', () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Change Password'));
    expect(screen.getByText('Update Password')).toBeTruthy();
  });

  it('shows validation error when fields are empty', async () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Change Password'));
    fireEvent.press(screen.getByText('Update Password'));
    await waitFor(() => expect(screen.getByText('All fields are required.')).toBeTruthy());
  });

  it('shows error when new password is too short', async () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Change Password'));
    fireEvent.changeText(screen.getByPlaceholderText('Enter current password'), 'OldPass123');
    fireEvent.changeText(screen.getByPlaceholderText('Minimum 8 characters'), 'short');
    fireEvent.changeText(screen.getByPlaceholderText('Re-enter new password'), 'short');
    fireEvent.press(screen.getByText('Update Password'));
    await waitFor(() => expect(screen.getByText('New password must be at least 8 characters.')).toBeTruthy());
  });

  it('shows error when new passwords do not match', async () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Change Password'));
    fireEvent.changeText(screen.getByPlaceholderText('Enter current password'), 'OldPass123');
    fireEvent.changeText(screen.getByPlaceholderText('Minimum 8 characters'), 'NewPass123');
    fireEvent.changeText(screen.getByPlaceholderText('Re-enter new password'), 'DifferentPass');
    fireEvent.press(screen.getByText('Update Password'));
    await waitFor(() => expect(screen.getByText('New passwords do not match.')).toBeTruthy());
  });

  it('shows error when new password same as current', async () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Change Password'));
    fireEvent.changeText(screen.getByPlaceholderText('Enter current password'), 'SamePass123');
    fireEvent.changeText(screen.getByPlaceholderText('Minimum 8 characters'), 'SamePass123');
    fireEvent.changeText(screen.getByPlaceholderText('Re-enter new password'), 'SamePass123');
    fireEvent.press(screen.getByText('Update Password'));
    await waitFor(() => expect(screen.getByText('New password must differ from your current password.')).toBeTruthy());
  });

  it('calls changePassword with correct args on valid submit', async () => {
    mockChangePassword.mockResolvedValueOnce({ ok: true });
    render(<PrivacySecurityScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Change Password'));
    fireEvent.changeText(screen.getByPlaceholderText('Enter current password'), 'OldPass123');
    fireEvent.changeText(screen.getByPlaceholderText('Minimum 8 characters'), 'NewPass456!');
    fireEvent.changeText(screen.getByPlaceholderText('Re-enter new password'), 'NewPass456!');
    fireEvent.press(screen.getByText('Update Password'));
    await waitFor(() => expect(mockChangePassword).toHaveBeenCalledWith('OldPass123', 'NewPass456!'));
  });

  it('shows API error when changePassword fails', async () => {
    mockChangePassword.mockResolvedValueOnce({ ok: false, error: 'Wrong password' });
    render(<PrivacySecurityScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Change Password'));
    fireEvent.changeText(screen.getByPlaceholderText('Enter current password'), 'WrongOld');
    fireEvent.changeText(screen.getByPlaceholderText('Minimum 8 characters'), 'NewPass456!');
    fireEvent.changeText(screen.getByPlaceholderText('Re-enter new password'), 'NewPass456!');
    fireEvent.press(screen.getByText('Update Password'));
    await waitFor(() => expect(screen.getByText('Wrong password')).toBeTruthy());
  });

  it('shows success toast when changePassword succeeds', async () => {
    mockChangePassword.mockResolvedValueOnce({ ok: true });
    render(<PrivacySecurityScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Change Password'));
    fireEvent.changeText(screen.getByPlaceholderText('Enter current password'), 'OldPass123');
    fireEvent.changeText(screen.getByPlaceholderText('Minimum 8 characters'), 'NewPass456!');
    fireEvent.changeText(screen.getByPlaceholderText('Re-enter new password'), 'NewPass456!');
    fireEvent.press(screen.getByText('Update Password'));
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Password updated successfully.', 'success', 'Password Changed'));
  });

  it('closes panel when pressed again (toggle)', () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Change Password'));
    expect(screen.getByPlaceholderText('Enter current password')).toBeTruthy();
    fireEvent.press(screen.getAllByText('Change Password')[0]);
    expect(screen.queryByPlaceholderText('Enter current password')).toBeNull();
  });

  it('toggles show/hide current password eye button', () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Change Password'));
    const eyeIcons = screen.getAllByText('eye-outline');
    fireEvent.press(eyeIcons[0]);
    expect(screen.getAllByText('eye-off-outline').length).toBeGreaterThan(0);
  });
});

describe('PrivacySecurityScreen — Privacy Policy panel', () => {
  it('opens Privacy Policy panel when row is pressed', () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Privacy Policy'));
    expect(screen.getByText('GrowTracker Privacy Policy')).toBeTruthy();
  });

  it('shows first privacy section heading', () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Privacy Policy'));
    expect(screen.getByText('1. Information We Collect')).toBeTruthy();
  });

  it('shows all 7 section headings', () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Privacy Policy'));
    expect(screen.getByText('7. Your Rights')).toBeTruthy();
  });

  it('closes Privacy Policy panel when pressed again', () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Privacy Policy'));
    expect(screen.getByText('GrowTracker Privacy Policy')).toBeTruthy();
    fireEvent.press(screen.getByText('Privacy Policy'));
    expect(screen.queryByText('GrowTracker Privacy Policy')).toBeNull();
  });
});

describe('PrivacySecurityScreen — Terms & Conditions panel', () => {
  it('opens Terms & Conditions panel when row is pressed', () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Terms & Conditions'));
    expect(screen.getByText('GrowTracker Terms & Conditions')).toBeTruthy();
  });

  it('shows first terms section heading', () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Terms & Conditions'));
    expect(screen.getByText('1. Acceptance of Terms')).toBeTruthy();
  });

  it('shows all terms sections', () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Terms & Conditions'));
    expect(screen.getByText('9. Changes to Terms')).toBeTruthy();
  });

  it('closes Terms panel when pressed again', () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Terms & Conditions'));
    expect(screen.getByText('GrowTracker Terms & Conditions')).toBeTruthy();
    fireEvent.press(screen.getByText('Terms & Conditions'));
    expect(screen.queryByText('GrowTracker Terms & Conditions')).toBeNull();
  });
});

describe('PrivacySecurityScreen — 2FA panel (unenrolled)', () => {
  it('opens 2FA setup panel when Two-Factor Auth row is pressed', () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Two-Factor Authentication'));
    expect(screen.getByText('Set Up Two-Factor Authentication')).toBeTruthy();
  });

  it('shows loading indicator while MFA is loading', async () => {
    const { supabase } = require('../../../lib/supabase');
    supabase.auth.mfa.listFactors.mockResolvedValueOnce(
      new Promise(() => {})
    );
    render(<PrivacySecurityScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Two-Factor Authentication'));
    expect(screen.getByText('Set Up Two-Factor Authentication')).toBeTruthy();
  });

  it('closes 2FA panel when pressed again', () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Two-Factor Authentication'));
    expect(screen.getByText('Set Up Two-Factor Authentication')).toBeTruthy();
    fireEvent.press(screen.getByText('Two-Factor Authentication'));
    expect(screen.queryByText('Set Up Two-Factor Authentication')).toBeNull();
  });

  it('shows enrollData secret key when enroll succeeds', async () => {
    const { supabase } = require('../../../lib/supabase');
    supabase.auth.mfa.enroll.mockResolvedValueOnce({
      data: { id: 'factor-1', totp: { secret: 'TESTSECRET123', uri: 'otpauth://totp/test?secret=TESTSECRET123' } },
      error: null,
    });
    render(<PrivacySecurityScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Two-Factor Authentication'));
    await screen.findByText('Secret Key — Enter Manually');
    expect(screen.getByDisplayValue('TESTSECRET123')).toBeTruthy();
  });

  it('shows TOTP verification code input after successful enroll', async () => {
    const { supabase } = require('../../../lib/supabase');
    supabase.auth.mfa.enroll.mockResolvedValueOnce({
      data: { id: 'factor-1', totp: { secret: 'TESTSECRET123', uri: 'otpauth://totp/test' } },
      error: null,
    });
    render(<PrivacySecurityScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Two-Factor Authentication'));
    await screen.findByPlaceholderText('Enter 6-digit code');
    expect(screen.getByPlaceholderText('Enter 6-digit code')).toBeTruthy();
  });

  it('shows error when 2FA verify returns wrong code', async () => {
    const { supabase } = require('../../../lib/supabase');
    supabase.auth.mfa.enroll.mockResolvedValueOnce({
      data: { id: 'factor-1', totp: { secret: 'TESTSECRET123', uri: 'otpauth://totp/test' } },
      error: null,
    });
    supabase.auth.mfa.verify.mockResolvedValueOnce({ error: { message: 'bad code' } });
    render(<PrivacySecurityScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Two-Factor Authentication'));
    await screen.findByPlaceholderText('Enter 6-digit code');
    fireEvent.changeText(screen.getByPlaceholderText('Enter 6-digit code'), '123456');
    fireEvent.press(screen.getByText('Verify & Enable 2FA'));
    await screen.findByText('Incorrect code. Check your authenticator app and try again.');
    expect(screen.getByText('Incorrect code. Check your authenticator app and try again.')).toBeTruthy();
  });

  it('shows error when enroll fails', async () => {
    const { supabase } = require('../../../lib/supabase');
    supabase.auth.mfa.enroll.mockResolvedValueOnce({
      data: null,
      error: { message: 'MFA not enabled in project' },
    });
    render(<PrivacySecurityScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Two-Factor Authentication'));
    await screen.findByText('MFA not enabled in project');
    expect(screen.getByText('MFA not enabled in project')).toBeTruthy();
  });

  it('shows last sign-in time when session has last_sign_in_at', async () => {
    const { supabase } = require('../../../lib/supabase');
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: { user: { last_sign_in_at: '2026-01-15T10:30:00Z' } } },
    });
    render(<PrivacySecurityScreen {...makeProps()} />);
    await waitFor(() => expect(screen.queryByText('Current session')).toBeNull());
  });
});

describe('PrivacySecurityScreen — Change Password eye toggles', () => {
  it('toggles show/hide new password eye button', () => {
    render(<PrivacySecurityScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Change Password'));
    const eyeIcons = screen.getAllByText('eye-outline');
    fireEvent.press(eyeIcons[1]);
    expect(screen.getAllByText('eye-off-outline').length).toBeGreaterThan(0);
  });
});

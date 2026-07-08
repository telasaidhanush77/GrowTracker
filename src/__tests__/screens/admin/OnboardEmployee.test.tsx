import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import type { ScreenProps } from '../../../types';

jest.mock('../../../context/AppContext', () => ({ useApp: jest.fn() }));
jest.mock('../../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../context/ToastContext', () => ({ useToast: jest.fn() }));
jest.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../components/Header', () => {
  const { View, Text } = require('react-native');
  return ({ title, subtitle }: any) => (
    <View testID="header">
      <Text testID="header-title">{title}</Text>
      {subtitle ? <Text testID="header-subtitle">{subtitle}</Text> : null}
    </View>
  );
});
jest.mock('../../../components/AnimatedButton', () => ({
  AnimatedButton: ({ children, onPress, disabled }: any) => {
    const { TouchableOpacity } = require('react-native');
    return <TouchableOpacity onPress={onPress} disabled={disabled}>{children}</TouchableOpacity>;
  },
}));

import { useApp } from '../../../context/AppContext';
import { useTheme } from '../../../context/ThemeContext';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import OnboardEmployee from '../../../screens/admin/OnboardEmployee';

const MOCK_COLORS: any = {
  bg: '#111', bgElevated: '#1a1a1a', card: '#222', border: '#333',
  textPrimary: '#fff', textSecondary: '#ccc', textMuted: '#999',
  primary: '#4f46e5',
  adminPrimary: '#dc2626', adminLight: '#fee2e2',
  approved: '#22c55e', approvedBg: '#dcfce7',
  rejected: '#ef4444', pending: '#f59e0b', pendingBg: '#fef3c7',
};

const MANAGER = {
  id: 'mgr-1', name: 'Bob Manager', email: 'b@t.com',
  role: 'manager' as const, managerId: null,
  department: 'Eng', designation: 'Eng Mgr', joinDate: '2022-01-01',
  status: 'active' as const, avatarInitials: 'BM',
};

function makeProps(): ScreenProps {
  return {
    navigation: { navigate: jest.fn(), goBack: jest.fn() },
    params: {},
    currentUserId: 'admin-1',
    currentRole: 'admin',
    onLogout: jest.fn(),
  };
}

const mockShowToast = jest.fn();
const mockCreateUser = jest.fn();
const mockUpdateUser = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useTheme as jest.Mock).mockReturnValue({ colors: MOCK_COLORS });
  (useToast as jest.Mock).mockReturnValue({ showToast: mockShowToast });
  (useAuth as jest.Mock).mockReturnValue({
    createUser: mockCreateUser,
    updateUser: mockUpdateUser,
  });
  (useApp as jest.Mock).mockReturnValue({
    employees: [MANAGER],
    addNotification: jest.fn(),
  });
});

describe('OnboardEmployee', () => {
  it('renders "Onboard Employee" heading', () => {
    render(<OnboardEmployee {...makeProps()} />);
    expect(screen.getByTestId('header-title').props.children).toBe('Onboard Employee');
  });

  it('shows Personal Details section', () => {
    render(<OnboardEmployee {...makeProps()} />);
    expect(screen.getByText('Personal Details')).toBeTruthy();
  });

  it('shows Role & Team section', () => {
    render(<OnboardEmployee {...makeProps()} />);
    expect(screen.getByText('Role & Team')).toBeTruthy();
  });

  it('shows available manager card', () => {
    render(<OnboardEmployee {...makeProps()} />);
    expect(screen.getByText('Bob Manager')).toBeTruthy();
  });

  it('shows "No managers found" when no managers', () => {
    (useApp as jest.Mock).mockReturnValue({ employees: [], addNotification: jest.fn() });
    render(<OnboardEmployee {...makeProps()} />);
    expect(screen.getByText(/No managers found/)).toBeTruthy();
  });

  it('shows validation error when submitting empty form', async () => {
    render(<OnboardEmployee {...makeProps()} />);
    fireEvent.press(screen.getByText('Onboard Employee →'));
    expect(mockShowToast).toHaveBeenCalledWith(
      'Please fill in all fields and select a reporting manager.',
      'error',
      'Missing Fields',
    );
  });

  it('shows invalid email error with bad email', async () => {
    render(<OnboardEmployee {...makeProps()} />);
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Jamie Patel'), 'John Doe');
    fireEvent.changeText(screen.getByPlaceholderText('jamie.patel@company.com'), 'notanemail');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Software Engineer'), 'Dev');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Engineering'), 'Eng');
    fireEvent.press(screen.getByText('Bob Manager'));
    fireEvent.press(screen.getByText('Onboard Employee →'));
    expect(mockShowToast).toHaveBeenCalledWith(
      'Please enter a valid email address.',
      'error',
      'Invalid Email',
    );
  });
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('../../../context/ThemeContext', () => ({ useTheme: jest.fn() }));

import { useTheme } from '../../../context/ThemeContext';
import SplashScreen from '../../../screens/auth/SplashScreen';

const MOCK_COLORS: any = {
  bg: '#111', bgElevated: '#1a1a1a', card: '#222', border: '#333',
  textPrimary: '#fff', textSecondary: '#ccc', textMuted: '#999',
  primary: '#4f46e5', adminPrimary: '#dc2626', managerPrimary: '#7c3aed', employeePrimary: '#4f46e5',
};

beforeEach(() => {
  (useTheme as jest.Mock).mockReturnValue({ colors: MOCK_COLORS, isDark: true });
});

describe('SplashScreen', () => {
  it('renders GrowTracker title', () => {
    render(<SplashScreen onSelectRole={jest.fn()} />);
    expect(screen.getByText('GrowTracker')).toBeTruthy();
  });

  it('renders tagline', () => {
    render(<SplashScreen onSelectRole={jest.fn()} />);
    expect(screen.getByText('Track growth · Drive results')).toBeTruthy();
  });

  it('renders Admin, Manager and Employee role cards', () => {
    render(<SplashScreen onSelectRole={jest.fn()} />);
    expect(screen.getByText('Admin')).toBeTruthy();
    expect(screen.getByText('Manager')).toBeTruthy();
    expect(screen.getByText('Employee')).toBeTruthy();
  });

  it('calls onSelectRole with "admin" when Admin card pressed', () => {
    const onSelectRole = jest.fn();
    render(<SplashScreen onSelectRole={onSelectRole} />);
    fireEvent.press(screen.getByText('Admin'));
    expect(onSelectRole).toHaveBeenCalledWith('admin');
  });

  it('calls onSelectRole with "manager" when Manager card pressed', () => {
    const onSelectRole = jest.fn();
    render(<SplashScreen onSelectRole={onSelectRole} />);
    fireEvent.press(screen.getByText('Manager'));
    expect(onSelectRole).toHaveBeenCalledWith('manager');
  });

  it('calls onSelectRole with "employee" when Employee card pressed', () => {
    const onSelectRole = jest.fn();
    render(<SplashScreen onSelectRole={onSelectRole} />);
    fireEvent.press(screen.getByText('Employee'));
    expect(onSelectRole).toHaveBeenCalledWith('employee');
  });

  it('renders SIGN IN AS divider label', () => {
    render(<SplashScreen onSelectRole={jest.fn()} />);
    expect(screen.getByText('SIGN IN AS')).toBeTruthy();
  });
});

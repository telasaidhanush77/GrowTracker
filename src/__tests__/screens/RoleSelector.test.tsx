import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('../../context/AppContext', () => ({ useApp: jest.fn() }));
jest.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));

import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import RoleSelector from '../../screens/RoleSelector';

const MOCK_COLORS: any = {
  bg: '#111', bgElevated: '#1a1a1a', card: '#222', border: '#333',
  textPrimary: '#fff', textSecondary: '#ccc', textMuted: '#999',
  primary: '#4f46e5',
  adminPrimary: '#dc2626', adminLight: '#fee2e2',
  managerPrimary: '#7c3aed', managerLight: '#ede9fe',
  employeePrimary: '#4f46e5', employeeLight: '#eef2ff',
};

const MANAGER = {
  id: 'mgr-1', name: 'Bob Manager', role: 'manager' as const,
  designation: 'Eng Manager', department: 'Engineering',
  avatarInitials: 'BM',
};

const EMPLOYEE = {
  id: 'emp-1', name: 'Alice Smith', role: 'employee' as const,
  designation: 'Developer', department: 'Engineering',
  avatarInitials: 'AS',
};

beforeEach(() => {
  jest.clearAllMocks();
  (useTheme as jest.Mock).mockReturnValue({ colors: MOCK_COLORS });
  (useApp as jest.Mock).mockReturnValue({ employees: [MANAGER, EMPLOYEE] });
});

describe('RoleSelector — step 1 (role picker)', () => {
  it('renders GrowTracker branding', () => {
    render(<RoleSelector onRoleSelect={jest.fn()} />);
    expect(screen.getByText('GrowTracker')).toBeTruthy();
  });

  it('renders all three role options', () => {
    render(<RoleSelector onRoleSelect={jest.fn()} />);
    expect(screen.getByText('Admin')).toBeTruthy();
    expect(screen.getByText('Manager')).toBeTruthy();
    expect(screen.getByText('Employee')).toBeTruthy();
  });

  it('advances to user picker when role card pressed', () => {
    render(<RoleSelector onRoleSelect={jest.fn()} />);
    fireEvent.press(screen.getByText('Manager'));
    expect(screen.getByText('Select Account')).toBeTruthy();
  });
});

describe('RoleSelector — step 2 (user picker)', () => {
  it('shows manager accounts after selecting Manager', () => {
    render(<RoleSelector onRoleSelect={jest.fn()} />);
    fireEvent.press(screen.getByText('Manager'));
    expect(screen.getByText('Bob Manager')).toBeTruthy();
  });

  it('shows employee accounts after selecting Employee', () => {
    render(<RoleSelector onRoleSelect={jest.fn()} />);
    fireEvent.press(screen.getByText('Employee'));
    expect(screen.getByText('Alice Smith')).toBeTruthy();
  });

  it('calls onRoleSelect with role and userId when user card pressed', () => {
    const onRoleSelect = jest.fn();
    render(<RoleSelector onRoleSelect={onRoleSelect} />);
    fireEvent.press(screen.getByText('Manager'));
    fireEvent.press(screen.getByText('Bob Manager'));
    expect(onRoleSelect).toHaveBeenCalledWith('manager', 'mgr-1');
  });

  it('navigates back to role picker when Back pressed', () => {
    render(<RoleSelector onRoleSelect={jest.fn()} />);
    fireEvent.press(screen.getByText('Manager'));
    fireEvent.press(screen.getByText('Back'));
    expect(screen.getByText('GrowTracker')).toBeTruthy();
    expect(screen.queryByText('Select Account')).toBeNull();
  });

  it('shows admin account when Admin role selected', () => {
    render(<RoleSelector onRoleSelect={jest.fn()} />);
    fireEvent.press(screen.getByText('Admin'));
    expect(screen.getByText('System Admin')).toBeTruthy();
  });
});

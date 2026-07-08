import React from 'react';
import { render, screen } from '@testing-library/react-native';
import type { ScreenProps } from '../../../types';

jest.mock('../../../context/AppContext', () => ({ useApp: jest.fn() }));
jest.mock('../../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../components/Header', () => {
  const { View, Text } = require('react-native');
  return ({ title, subtitle }: any) => (
    <View testID="header">
      <Text testID="header-title">{title}</Text>
      {subtitle ? <Text testID="header-subtitle">{subtitle}</Text> : null}
    </View>
  );
});

import { useApp } from '../../../context/AppContext';
import { useTheme } from '../../../context/ThemeContext';
import FYReportScreen from '../../../screens/shared/FYReportScreen';

const MOCK_COLORS: any = {
  bg: '#111', bgElevated: '#1a1a1a', card: '#222', border: '#333',
  textPrimary: '#fff', textSecondary: '#ccc', textMuted: '#999',
  primary: '#4f46e5',
  approved: '#22c55e', approvedBg: '#dcfce7',
  rejected: '#ef4444', rejectedBg: '#fee2e2',
  pending: '#f59e0b',
};

const EMPLOYEE = {
  id: 'emp-1', name: 'Alice Smith', email: 'a@t.com',
  role: 'employee' as const, managerId: 'mgr-1',
  department: 'Eng', designation: 'Developer', joinDate: '2024-01-01',
  status: 'completed_fiscal_year' as const, avatarInitials: 'AS',
};

const MANAGER = {
  id: 'mgr-1', name: 'Bob Manager', email: 'b@t.com',
  role: 'manager' as const, managerId: null,
  department: 'Eng', designation: 'Eng Mgr', joinDate: '2022-01-01',
  status: 'active' as const, avatarInitials: 'BM',
};

const APPROVED_GOAL = {
  id: 'g1', employeeId: 'emp-1', title: 'Build Dashboard',
  description: 'Create the dashboard', quarter: 'Q1' as const,
  priority: 'high' as const, category: 'technical' as const,
  targetDate: '2026-06-30', weight: 50, status: 'approved' as const,
  managerRating: 4,
  evidence: { id: 'e1', description: 'Done', links: [], submittedAt: '', status: 'approved' as const },
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-06-01T00:00:00Z',
};

function makeProps(overrides: Partial<ScreenProps> = {}): ScreenProps {
  return {
    navigation: { navigate: jest.fn(), goBack: jest.fn() },
    params: { employeeId: 'emp-1' },
    currentUserId: 'admin-1',
    currentRole: 'admin',
    onLogout: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (useTheme as jest.Mock).mockReturnValue({ colors: MOCK_COLORS });
  (useApp as jest.Mock).mockReturnValue({
    employees: [EMPLOYEE, MANAGER],
    goals: [APPROVED_GOAL],
  });
});

describe('FYReportScreen', () => {
  it('renders "FY 2026 Report" heading', () => {
    render(<FYReportScreen {...makeProps()} />);
    expect(screen.getByTestId('header-title').props.children).toBe('FY 2026 Report');
  });

  it('renders employee name in subtitle', () => {
    render(<FYReportScreen {...makeProps()} />);
    expect(screen.getByTestId('header-subtitle').props.children).toBe('Alice Smith');
  });

  it('shows employee info card', () => {
    render(<FYReportScreen {...makeProps()} />);
    expect(screen.getAllByText('Alice Smith').length).toBeGreaterThan(0);
    expect(screen.getByText('Developer')).toBeTruthy();
  });

  it('shows Q1, Q2, FY score columns', () => {
    render(<FYReportScreen {...makeProps()} />);
    expect(screen.getByText('Q1 Score')).toBeTruthy();
    expect(screen.getByText('Q2 Score')).toBeTruthy();
    expect(screen.getByText('FY Score')).toBeTruthy();
  });

  it('shows goal title from Q1 goals', () => {
    render(<FYReportScreen {...makeProps()} />);
    expect(screen.getByText('Build Dashboard')).toBeTruthy();
  });

  it('shows "Employee not found" when employee missing', () => {
    (useApp as jest.Mock).mockReturnValue({ employees: [], goals: [] });
    render(<FYReportScreen {...makeProps()} />);
    expect(screen.getByText('Employee not found.')).toBeTruthy();
  });

  it('shows "No goals assigned yet" when no goals', () => {
    (useApp as jest.Mock).mockReturnValue({ employees: [EMPLOYEE, MANAGER], goals: [] });
    render(<FYReportScreen {...makeProps()} />);
    expect(screen.getByText('No goals assigned yet for FY 2026.')).toBeTruthy();
  });

  it('shows manager name in employee card', () => {
    render(<FYReportScreen {...makeProps()} />);
    expect(screen.getByText('Reports to Bob Manager')).toBeTruthy();
  });
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import type { Goal, ScreenProps } from '../../../types';

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
jest.mock('../../../components/charts/ProgressRing', () => () => null);
jest.mock('../../../components/charts/GoalStatusBar', () => () => null);

import { useApp } from '../../../context/AppContext';
import { useTheme } from '../../../context/ThemeContext';
import MyProgressScreen from '../../../screens/employee/MyProgressScreen';

const MOCK_COLORS: any = {
  bg: '#111', bgElevated: '#1a1a1a', card: '#222', border: '#333',
  textPrimary: '#fff', textSecondary: '#ccc', textMuted: '#999',
  employeePrimary: '#4f46e5',
  approved: '#22c55e', approvedBg: '#dcfce7',
  rejected: '#ef4444', rejectedBg: '#fee2e2',
  pending: '#f59e0b', pendingBg: '#fef3c7',
  inProgress: '#3b82f6', inProgressBg: '#dbeafe',
  notStarted: '#6b7280', notStartedBg: '#f3f4f6',
  chartTrack: '#e5e7eb',
};

const EMPLOYEE = {
  id: 'emp-1', name: 'Alice Smith', email: 'alice@t.com',
  role: 'employee' as const, department: 'Eng', designation: 'Dev',
  managerId: 'mgr-1', joinDate: '2024-01-01', status: 'active' as const,
  avatarInitials: 'AS',
};

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'g1', employeeId: 'emp-1', title: 'Goal 1',
    description: 'Desc', quarter: 'Q1', priority: 'medium',
    category: 'technical', targetDate: '2026-12-31',
    weight: 50, status: 'approved', managerRating: 4,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

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
  (useTheme as jest.Mock).mockReturnValue({ colors: MOCK_COLORS });
  (useApp as jest.Mock).mockReturnValue({ employees: [EMPLOYEE], goals: [] });
});

describe('MyProgressScreen', () => {
  it('renders "My Progress" heading', () => {
    render(<MyProgressScreen {...makeProps()} />);
    expect(screen.getByTestId('header-title').props.children).toBe('My Progress');
  });

  it('shows employee name in subtitle', () => {
    render(<MyProgressScreen {...makeProps()} />);
    expect(screen.getByTestId('header-subtitle').props.children).toBe('Alice Smith');
  });

  it('shows "Q1 Score", "Q2 Score", "Avg Rating" labels', () => {
    render(<MyProgressScreen {...makeProps()} />);
    expect(screen.getByText('Q1 Score')).toBeTruthy();
    expect(screen.getByText('Q2 Score')).toBeTruthy();
    expect(screen.getByText('Avg Rating')).toBeTruthy();
  });

  it('shows — for scores when no goals exist', () => {
    render(<MyProgressScreen {...makeProps()} />);
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it('shows KPI strip labels', () => {
    render(<MyProgressScreen {...makeProps()} />);
    expect(screen.getByText('Approved')).toBeTruthy();
    expect(screen.getByText('Rejected')).toBeTruthy();
  });

  it('shows resubmit button for rejected goals', () => {
    (useApp as jest.Mock).mockReturnValue({
      employees: [EMPLOYEE],
      goals: [makeGoal({ status: 'rejected', quarter: 'Q1' })],
    });
    render(<MyProgressScreen {...makeProps()} />);
    expect(screen.getByText('🔁 Resubmit Evidence')).toBeTruthy();
  });

  it('navigates to submit-evidence when resubmit is pressed', () => {
    const navigate = jest.fn();
    (useApp as jest.Mock).mockReturnValue({
      employees: [EMPLOYEE],
      goals: [makeGoal({ status: 'rejected', quarter: 'Q1' })],
    });
    render(<MyProgressScreen {...makeProps({ navigation: { navigate, goBack: jest.fn() } })} />);
    fireEvent.press(screen.getByText('🔁 Resubmit Evidence'));
    expect(navigate).toHaveBeenCalledWith('submit-evidence', { goalId: 'g1' });
  });
});

describe('MyProgressScreen — formula toggle', () => {
  it('renders the formula toggle button', () => {
    render(<MyProgressScreen {...makeProps()} />);
    expect(screen.getByText(/How is this score calculated\?/)).toBeTruthy();
  });

  it('hides the formula box by default', () => {
    render(<MyProgressScreen {...makeProps()} />);
    expect(screen.queryByText(/total quarter weight/)).toBeNull();
  });

  it('reveals the formula box when toggle is pressed', () => {
    render(<MyProgressScreen {...makeProps()} />);
    fireEvent.press(screen.getByText(/How is this score calculated\?/));
    expect(screen.getByText(/total quarter weight/)).toBeTruthy();
  });

  it('hides the formula box when toggle is pressed a second time', () => {
    render(<MyProgressScreen {...makeProps()} />);
    fireEvent.press(screen.getByText(/How is this score calculated\?/));
    fireEvent.press(screen.getByText(/How is this score calculated\?/));
    expect(screen.queryByText(/total quarter weight/)).toBeNull();
  });

  it('shows down-arrow ▼ when formula is hidden', () => {
    render(<MyProgressScreen {...makeProps()} />);
    expect(screen.getByText(/▼/)).toBeTruthy();
  });

  it('shows up-arrow ▲ when formula is revealed', () => {
    render(<MyProgressScreen {...makeProps()} />);
    fireEvent.press(screen.getByText(/How is this score calculated\?/));
    expect(screen.getByText(/▲/)).toBeTruthy();
  });
});

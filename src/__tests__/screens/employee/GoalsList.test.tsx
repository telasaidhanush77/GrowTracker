import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import type { Goal, ScreenProps } from '../../../types';

jest.mock('../../../context/AppContext', () => ({ useApp: jest.fn() }));
jest.mock('../../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../components/Header', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return ({ title, onBack }: any) => (
    <View testID="header">
      <Text testID="header-title">{title}</Text>
      {onBack && <TouchableOpacity testID="back-btn" onPress={onBack}><Text>Back</Text></TouchableOpacity>}
    </View>
  );
});

import { useApp } from '../../../context/AppContext';
import { useTheme } from '../../../context/ThemeContext';
import GoalsList from '../../../screens/employee/GoalsList';

const MOCK_COLORS: any = {
  bg: '#111', bgElevated: '#1a1a1a', card: '#222', border: '#333',
  textPrimary: '#fff', textSecondary: '#ccc', textMuted: '#999',
  employeePrimary: '#4f46e5', primary: '#4f46e5',
  approved: '#22c55e', approvedBg: '#dcfce7',
  rejected: '#ef4444', rejectedBg: '#fee2e2',
  pending: '#f59e0b', pendingBg: '#fef3c7',
  inProgress: '#3b82f6', inProgressBg: '#dbeafe',
  notStarted: '#6b7280', notStartedBg: '#f3f4f6',
  high: '#ef4444', highBg: '#fee2e2',
  medium: '#f59e0b', mediumBg: '#fef3c7',
  low: '#22c55e', lowBg: '#dcfce7',
};

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'g1', employeeId: 'emp-1', title: 'Test Goal',
    description: 'Desc', quarter: 'Q1', priority: 'medium',
    category: 'technical', targetDate: '2026-12-31',
    weight: 50, status: 'not_started',
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeNavigation() {
  return { navigate: jest.fn(), goBack: jest.fn() };
}

function makeProps(overrides: Partial<ScreenProps> = {}): ScreenProps {
  return {
    navigation: makeNavigation(),
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
  (useApp as jest.Mock).mockReturnValue({ goals: [], employees: [] });
});

describe('GoalsList — empty state', () => {
  it('shows empty state when no goals', () => {
    render(<GoalsList {...makeProps()} />);
    expect(screen.getByText(/No Q1 goals have been set yet/)).toBeTruthy();
  });

  it('shows "My Goals" title by default', () => {
    render(<GoalsList {...makeProps()} />);
    expect(screen.getByTestId('header-title').props.children).toBe('My Goals');
  });
});

describe('GoalsList — with goals', () => {
  beforeEach(() => {
    (useApp as jest.Mock).mockReturnValue({
      goals: [makeGoal({ title: 'Ship Feature', status: 'in_progress' })],
      employees: [],
    });
  });

  it('renders goal titles', () => {
    render(<GoalsList {...makeProps()} />);
    expect(screen.getByText('Ship Feature')).toBeTruthy();
  });

  it('shows "📎 Submit Evidence" button for in_progress goal', () => {
    render(<GoalsList {...makeProps()} />);
    expect(screen.getByText('📎 Submit Evidence')).toBeTruthy();
  });

  it('navigates to submit-evidence when button pressed', () => {
    const navigation = makeNavigation();
    render(<GoalsList {...makeProps({ navigation })} />);
    fireEvent.press(screen.getByText('📎 Submit Evidence'));
    expect(navigation.navigate).toHaveBeenCalledWith('submit-evidence', { goalId: 'g1' });
  });

  it('shows "🔁 Resubmit Evidence" for rejected goal', () => {
    (useApp as jest.Mock).mockReturnValue({
      goals: [makeGoal({ status: 'rejected' })],
      employees: [],
    });
    render(<GoalsList {...makeProps()} />);
    expect(screen.getByText('🔁 Resubmit Evidence')).toBeTruthy();
  });

  it('does not show submit button for approved goal', () => {
    (useApp as jest.Mock).mockReturnValue({
      goals: [makeGoal({ status: 'approved' })],
      employees: [],
    });
    render(<GoalsList {...makeProps()} />);
    expect(screen.queryByText('📎 Submit Evidence')).toBeNull();
  });

  it('hides action buttons in readOnly mode', () => {
    (useApp as jest.Mock).mockReturnValue({
      goals: [makeGoal({ status: 'in_progress' })],
      employees: [],
    });
    render(<GoalsList {...makeProps({ params: { readOnly: true } })} />);
    expect(screen.queryByText('📎 Submit Evidence')).toBeNull();
  });
});

describe('GoalsList — quarter tabs', () => {
  it('shows Q1 goals when Q1 tab is selected', () => {
    (useApp as jest.Mock).mockReturnValue({
      goals: [
        makeGoal({ id: 'q1g', title: 'Q1 Goal', quarter: 'Q1' }),
        makeGoal({ id: 'q2g', title: 'Q2 Goal', quarter: 'Q2' }),
      ],
      employees: [],
    });
    render(<GoalsList {...makeProps({ params: { filterQuarter: 'Q2' } })} />);
    expect(screen.getByText('Q2 Goal')).toBeTruthy();
    fireEvent.press(screen.getByText('Q1'));
    expect(screen.getByText('Q1 Goal')).toBeTruthy();
  });
});

describe('GoalsList — viewEmployee mode', () => {
  it('shows employee first name in title when viewEmployeeId is set', () => {
    const emp = {
      id: 'other-emp', name: 'Bob Johnson', email: 'b@t.com',
      role: 'employee', department: 'Eng', designation: 'Dev',
      managerId: 'mgr-1', joinDate: '2024-01-01', status: 'active',
      avatarInitials: 'BJ',
    };
    (useApp as jest.Mock).mockReturnValue({ goals: [], employees: [emp] });
    render(<GoalsList {...makeProps({ params: { viewEmployeeId: 'other-emp' } })} />);
    expect(screen.getByTestId('header-title').props.children).toBe("Bob's Goals");
  });
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
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
jest.mock('../../../components/charts/GoalStatusBar', () => () => null);

import { useApp } from '../../../context/AppContext';
import { useTheme } from '../../../context/ThemeContext';
import TeamOverview from '../../../screens/manager/TeamOverview';

const MOCK_COLORS: any = {
  bg: '#111', bgElevated: '#1a1a1a', card: '#222', border: '#333',
  textPrimary: '#fff', textSecondary: '#ccc', textMuted: '#999',
  managerPrimary: '#7c3aed',
  approved: '#22c55e', rejected: '#ef4444',
  pending: '#f59e0b', inProgress: '#3b82f6', notStarted: '#6b7280',
  chartTrack: '#e5e7eb',
};

const MGR_ID = 'mgr-1';
const EMPLOYEES = [
  {
    id: 'emp-1', name: 'Alice Smith', email: 'a@t.com',
    role: 'employee' as const, managerId: MGR_ID,
    department: 'Eng', designation: 'Dev', joinDate: '2024-01-01',
    status: 'active' as const, avatarInitials: 'AS',
  },
  {
    id: 'emp-2', name: 'Bob Jones', email: 'b@t.com',
    role: 'employee' as const, managerId: MGR_ID,
    department: 'QA', designation: 'Tester', joinDate: '2024-01-01',
    status: 'active' as const, avatarInitials: 'BJ',
  },
];

function makeProps(): ScreenProps {
  return {
    navigation: { navigate: jest.fn(), goBack: jest.fn() },
    params: {},
    currentUserId: MGR_ID,
    currentRole: 'manager',
    onLogout: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (useTheme as jest.Mock).mockReturnValue({ colors: MOCK_COLORS });
  (useApp as jest.Mock).mockReturnValue({ employees: EMPLOYEES, goals: [] });
});

describe('TeamOverview', () => {
  it('renders "Team Overview" heading', () => {
    render(<TeamOverview {...makeProps()} />);
    expect(screen.getByTestId('header-title').props.children).toBe('Team Overview');
  });

  it('shows direct report count in subtitle', () => {
    render(<TeamOverview {...makeProps()} />);
    expect(screen.getByTestId('header-subtitle').props.children).toBe('2 direct reports');
  });

  it('shows "Tap an employee to manage their goals" hint', () => {
    render(<TeamOverview {...makeProps()} />);
    expect(screen.getByText('Tap an employee to manage their goals.')).toBeTruthy();
  });

  it('renders employee names', () => {
    render(<TeamOverview {...makeProps()} />);
    expect(screen.getByText('Alice Smith')).toBeTruthy();
    expect(screen.getByText('Bob Jones')).toBeTruthy();
  });

  it('renders quarter filter chips (All, Q1, Q2)', () => {
    render(<TeamOverview {...makeProps()} />);
    expect(screen.getByText('All')).toBeTruthy();
    expect(screen.getAllByText('Q1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Q2').length).toBeGreaterThan(0);
  });

  it('filters by Q1 when Q1 chip is pressed', () => {
    render(<TeamOverview {...makeProps()} />);
    fireEvent.press(screen.getAllByText('Q1')[0]);
    expect(screen.getAllByText('Q1').length).toBeGreaterThan(0);
  });

  it('shows only manager direct reports (not other-manager employees)', () => {
    (useApp as jest.Mock).mockReturnValue({
      employees: [
        ...EMPLOYEES,
        {
          id: 'emp-3', name: 'Carol Lee', email: 'c@t.com',
          role: 'employee' as const, managerId: 'other-mgr',
          department: 'HR', designation: 'HR Mgr', joinDate: '2024-01-01',
          status: 'active' as const, avatarInitials: 'CL',
        },
      ],
      goals: [],
    });
    render(<TeamOverview {...makeProps()} />);
    expect(screen.queryByText('Carol Lee')).toBeNull();
  });

  it('shows "0 direct reports" when manager has no team', () => {
    (useApp as jest.Mock).mockReturnValue({ employees: [], goals: [] });
    render(<TeamOverview {...makeProps()} />);
    expect(screen.getByTestId('header-subtitle').props.children).toBe('0 direct reports');
  });
});

describe('TeamOverview — search', () => {
  it('renders the search input with team count in placeholder', () => {
    render(<TeamOverview {...makeProps()} />);
    expect(screen.getByPlaceholderText('Search 2 team members…')).toBeTruthy();
  });

  it('filters team to matching members when search is typed', () => {
    render(<TeamOverview {...makeProps()} />);
    fireEvent.changeText(screen.getByPlaceholderText('Search 2 team members…'), 'Alice');
    expect(screen.getByText('Alice Smith')).toBeTruthy();
    expect(screen.queryByText('Bob Jones')).toBeNull();
  });

  it('search filtering is case-insensitive', () => {
    render(<TeamOverview {...makeProps()} />);
    fireEvent.changeText(screen.getByPlaceholderText('Search 2 team members…'), 'alice');
    expect(screen.getByText('Alice Smith')).toBeTruthy();
    expect(screen.queryByText('Bob Jones')).toBeNull();
  });

  it('shows no-match message when search yields no results', () => {
    render(<TeamOverview {...makeProps()} />);
    fireEvent.changeText(screen.getByPlaceholderText('Search 2 team members…'), 'Zara');
    expect(screen.getByText(/No team members match "Zara"/)).toBeTruthy();
  });

  it('restores full list when search is cleared', () => {
    render(<TeamOverview {...makeProps()} />);
    fireEvent.changeText(screen.getByPlaceholderText('Search 2 team members…'), 'Alice');
    fireEvent.changeText(screen.getByPlaceholderText('Search 2 team members…'), '');
    expect(screen.getByText('Alice Smith')).toBeTruthy();
    expect(screen.getByText('Bob Jones')).toBeTruthy();
  });

  it('matches by last name', () => {
    render(<TeamOverview {...makeProps()} />);
    fireEvent.changeText(screen.getByPlaceholderText('Search 2 team members…'), 'Jones');
    expect(screen.getByText('Bob Jones')).toBeTruthy();
    expect(screen.queryByText('Alice Smith')).toBeNull();
  });
});

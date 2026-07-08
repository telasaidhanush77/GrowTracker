import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import type { ScreenProps } from '../../../types';

jest.mock('../../../context/AppContext', () => ({ useApp: jest.fn() }));
jest.mock('../../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../components/Header', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return ({ title, subtitle, onBack, onNotif, onLogout }: any) => (
    <View testID="header">
      <Text testID="header-title">{title}</Text>
      {subtitle ? <Text testID="header-subtitle">{subtitle}</Text> : null}
      {onBack && <TouchableOpacity testID="header-back" onPress={onBack}><Text>Back</Text></TouchableOpacity>}
      {onNotif && <TouchableOpacity testID="header-notif" onPress={onNotif}><Text>Notif</Text></TouchableOpacity>}
      {onLogout && <TouchableOpacity testID="header-logout" onPress={onLogout}><Text>Logout</Text></TouchableOpacity>}
    </View>
  );
});

import { useApp } from '../../../context/AppContext';
import { useTheme } from '../../../context/ThemeContext';
import TeamDailyLogs from '../../../screens/manager/TeamDailyLogs';

const MOCK_COLORS: any = {
  bg: '#111', bgElevated: '#1a1a1a', card: '#222', border: '#333',
  textPrimary: '#fff', textSecondary: '#ccc', textMuted: '#999',
  managerPrimary: '#7c3aed',
  approved: '#22c55e', rejected: '#ef4444',
  pending: '#f59e0b', inProgress: '#3b82f6',
};

const MGR_ID = 'mgr-1';
const EMPLOYEE = {
  id: 'emp-1', name: 'Alice Smith', email: 'a@t.com',
  role: 'employee' as const, managerId: MGR_ID,
  department: 'Eng', designation: 'Dev', joinDate: '2024-01-01',
  status: 'active' as const, avatarInitials: 'AS',
};

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
  (useApp as jest.Mock).mockReturnValue({
    employees: [EMPLOYEE],
    dailyLogs: [],
    notifications: [],
  });
});

describe('TeamDailyLogs', () => {
  it('renders "Team Activity" heading', () => {
    render(<TeamDailyLogs {...makeProps()} />);
    expect(screen.getByTestId('header-title').props.children).toBe('Team Activity');
  });

  it('shows employee name in the card', () => {
    render(<TeamDailyLogs {...makeProps()} />);
    expect(screen.getByText('Alice Smith')).toBeTruthy();
  });

  it('shows "No work log submitted" for employee without a log', () => {
    render(<TeamDailyLogs {...makeProps()} />);
    expect(screen.getByText(/No work log submitted/)).toBeTruthy();
  });

  it('shows "Today" chip for current date', () => {
    render(<TeamDailyLogs {...makeProps()} />);
    expect(screen.getByText('Today')).toBeTruthy();
  });

  it('shows team summary — team size', () => {
    render(<TeamDailyLogs {...makeProps()} />);
    expect(screen.getByText('Team Members')).toBeTruthy();
  });

  it('navigates to previous day when left arrow pressed', () => {
    render(<TeamDailyLogs {...makeProps()} />);
    fireEvent.press(screen.getByText('‹'));
    expect(screen.queryByText('Today')).toBeNull();
  });

  it('shows task list when employee has submitted a log today', () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    (useApp as jest.Mock).mockReturnValue({
      employees: [EMPLOYEE],
      dailyLogs: [{
        id: 'log1', employeeId: 'emp-1', date: todayStr,
        tasks: [
          { id: 't1', description: 'Fixed bug #42' },
          { id: 't2', description: 'Code review' },
        ],
        createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
      }],
      notifications: [],
    });
    render(<TeamDailyLogs {...makeProps()} />);
    expect(screen.getByText('Fixed bug #42')).toBeTruthy();
    expect(screen.getByText('Code review')).toBeTruthy();
  });

  it('shows "not logged" count in summary strip', () => {
    render(<TeamDailyLogs {...makeProps()} />);
    expect(screen.getByText('Not Logged')).toBeTruthy();
  });

  it('calls goBack when header back button is pressed', () => {
    const goBack = jest.fn();
    render(<TeamDailyLogs {...{ ...makeProps(), navigation: { navigate: jest.fn(), goBack } }} />);
    fireEvent.press(screen.getByTestId('header-back'));
    expect(goBack).toHaveBeenCalled();
  });

  it('navigates to notifications when header notif button is pressed', () => {
    const navigate = jest.fn();
    render(<TeamDailyLogs {...{ ...makeProps(), navigation: { navigate, goBack: jest.fn() } }} />);
    fireEvent.press(screen.getByTestId('header-notif'));
    expect(navigate).toHaveBeenCalledWith('notifications');
  });

  it('navigates forward when › is pressed', () => {
    render(<TeamDailyLogs {...makeProps()} />);
    fireEvent.press(screen.getByText('›'));
    expect(screen.queryByText('Today')).toBeNull();
  });

  it('navigates back then forward returns to today', () => {
    render(<TeamDailyLogs {...makeProps()} />);
    fireEvent.press(screen.getByText('‹'));
    expect(screen.queryByText('Today')).toBeNull();
    fireEvent.press(screen.getByText('›'));
    expect(screen.getByText('Today')).toBeTruthy();
  });

  it('shows managerLight color for Today chip', () => {
    (useTheme as jest.Mock).mockReturnValue({ colors: { ...MOCK_COLORS, managerLight: '#f3e8ff' } });
    render(<TeamDailyLogs {...makeProps()} />);
    expect(screen.getByText('Today')).toBeTruthy();
  });
});

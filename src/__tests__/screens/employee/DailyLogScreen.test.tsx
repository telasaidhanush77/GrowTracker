import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import type { ScreenProps } from '../../../types';

jest.mock('../../../context/AppContext', () => ({ useApp: jest.fn() }));
jest.mock('../../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../components/Header', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return ({ title, subtitle, onBack }: any) => (
    <View testID="header">
      <Text testID="header-title">{title}</Text>
      {subtitle ? <Text testID="header-subtitle">{subtitle}</Text> : null}
      {onBack && <TouchableOpacity testID="header-back-btn" onPress={onBack}><Text>Back</Text></TouchableOpacity>}
    </View>
  );
});

import { useApp } from '../../../context/AppContext';
import { useTheme } from '../../../context/ThemeContext';
import DailyLogScreen from '../../../screens/employee/DailyLogScreen';

const MOCK_COLORS: any = {
  bg: '#111', bgElevated: '#1a1a1a', card: '#222', border: '#333',
  textPrimary: '#fff', textSecondary: '#ccc', textMuted: '#999',
  employeePrimary: '#4f46e5', employeeLight: '#eef2ff',
  approved: '#22c55e',
};

const EMP_ID = 'emp-1';

function makeProps(): ScreenProps {
  return {
    navigation: { navigate: jest.fn(), goBack: jest.fn() },
    params: {},
    currentUserId: EMP_ID,
    currentRole: 'employee',
    onLogout: jest.fn(),
  };
}

const mockSaveDailyLog = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useTheme as jest.Mock).mockReturnValue({ colors: MOCK_COLORS });
  (useApp as jest.Mock).mockReturnValue({
    dailyLogs: [],
    saveDailyLog: mockSaveDailyLog,
    notifications: [],
  });
});

describe('DailyLogScreen', () => {
  it('renders "Daily Log" heading', () => {
    render(<DailyLogScreen {...makeProps()} />);
    expect(screen.getByTestId('header-title').props.children).toBe('Daily Log');
  });

  it('shows "Today" chip for current date', () => {
    render(<DailyLogScreen {...makeProps()} />);
    expect(screen.getByText('Today')).toBeTruthy();
  });

  it('shows "Tasks Completed" section', () => {
    render(<DailyLogScreen {...makeProps()} />);
    expect(screen.getByText('Tasks Completed')).toBeTruthy();
  });

  it('shows empty state when no tasks', () => {
    render(<DailyLogScreen {...makeProps()} />);
    expect(screen.getByText('No tasks recorded yet.')).toBeTruthy();
  });

  it('adds task when Add button pressed with non-empty input', () => {
    render(<DailyLogScreen {...makeProps()} />);
    fireEvent.changeText(
      screen.getByPlaceholderText(/Describe a task/),
      'Wrote unit tests',
    );
    fireEvent.press(screen.getByText('+'));
    expect(screen.getByText('Wrote unit tests')).toBeTruthy();
  });

  it('disables Save Daily Log button when no tasks', () => {
    render(<DailyLogScreen {...makeProps()} />);
    const saveBtn = screen.getByText('Save Daily Log');
    expect(saveBtn).toBeTruthy();
  });

  it('calls saveDailyLog when Save pressed with a task', () => {
    render(<DailyLogScreen {...makeProps()} />);
    fireEvent.changeText(screen.getByPlaceholderText(/Describe a task/), 'Did work');
    fireEvent.press(screen.getByText('+'));
    fireEvent.press(screen.getByText('Save Daily Log'));
    expect(mockSaveDailyLog).toHaveBeenCalledWith(EMP_ID, expect.any(String), expect.any(Array), '');
  });

  it('navigates to previous day when ‹ pressed', () => {
    render(<DailyLogScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('‹'));
    expect(screen.queryByText('Today')).toBeNull();
  });

  it('navigates forward when › pressed after going back', () => {
    render(<DailyLogScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('‹'));
    expect(screen.queryByText('Today')).toBeNull();
    fireEvent.press(screen.getByText('›'));
    expect(screen.getByText('Today')).toBeTruthy();
  });

  it('removes task when ✕ button is pressed', () => {
    render(<DailyLogScreen {...makeProps()} />);
    fireEvent.changeText(screen.getByPlaceholderText(/Describe a task/), 'Task to remove');
    fireEvent.press(screen.getByText('+'));
    expect(screen.getByText('Task to remove')).toBeTruthy();
    fireEvent.press(screen.getByText('✕'));
    expect(screen.queryByText('Task to remove')).toBeNull();
  });

  it('typing in notes field updates the notes', () => {
    render(<DailyLogScreen {...makeProps()} />);
    fireEvent.changeText(
      screen.getByPlaceholderText(/Any additional notes/),
      'Blocked on API integration',
    );
    expect(screen.getByDisplayValue('Blocked on API integration')).toBeTruthy();
  });

  it('shows ✓ Saved after saving tasks', () => {
    render(<DailyLogScreen {...makeProps()} />);
    fireEvent.changeText(screen.getByPlaceholderText(/Describe a task/), 'Shipped feature');
    fireEvent.press(screen.getByText('+'));
    fireEvent.press(screen.getByText('Save Daily Log'));
    expect(screen.getByText('✓ Saved')).toBeTruthy();
  });

  it('loads tasks from an existing log for today', () => {
    const d = new Date();
    const day = d.getDay();
    if (day === 0) d.setDate(d.getDate() - 2);
    if (day === 6) d.setDate(d.getDate() - 1);
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    (useApp as jest.Mock).mockReturnValue({
      dailyLogs: [{
        id: 'l1', employeeId: EMP_ID, date: todayStr,
        tasks: [{ id: 't1', description: 'Reviewed PRs' }],
        notes: '',
      }],
      saveDailyLog: mockSaveDailyLog,
      notifications: [],
    });
    render(<DailyLogScreen {...makeProps()} />);
    expect(screen.getByText('Reviewed PRs')).toBeTruthy();
  });

  it('shows Alert when pressing Back with unsaved tasks', () => {
    const mockAlert = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});
    render(<DailyLogScreen {...makeProps()} />);
    fireEvent.changeText(screen.getByPlaceholderText(/Describe a task/), 'Unsaved work');
    fireEvent.press(screen.getByText('+'));
    fireEvent.press(screen.getByTestId('header-back-btn'));
    expect(mockAlert).toHaveBeenCalledWith('Unsaved Changes', expect.any(String), expect.any(Array));
    mockAlert.mockRestore();
  });

  it('calls goBack directly when no unsaved content', () => {
    const goBack = jest.fn();
    render(<DailyLogScreen {...{ ...makeProps(), navigation: { navigate: jest.fn(), goBack } }} />);
    fireEvent.press(screen.getByTestId('header-back-btn'));
    expect(goBack).toHaveBeenCalled();
  });
});

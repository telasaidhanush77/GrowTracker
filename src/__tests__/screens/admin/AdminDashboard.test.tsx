import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import type { ScreenProps } from '../../../types';

jest.mock('../../../context/AppContext', () => ({ useApp: jest.fn() }));
jest.mock('../../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../context/ToastContext', () => ({ useToast: jest.fn() }));
jest.mock('../../../components/Header', () => {
  const { View, Text } = require('react-native');
  return ({ title, subtitle }: any) => (
    <View testID="header">
      <Text testID="header-title">{title}</Text>
      {subtitle ? <Text testID="header-subtitle">{subtitle}</Text> : null}
    </View>
  );
});
jest.mock('../../../components/BottomTabBar', () => {
  const { View, TouchableOpacity, Text } = require('react-native');
  return ({ tabs, onSelect }: any) => (
    <View testID="bottom-tab-bar">
      {tabs.map((t: any) => (
        <TouchableOpacity key={t.key} testID={`tab-${t.key}`} onPress={() => onSelect(t.key)}>
          <Text>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
});
jest.mock('../../../components/AnimatedButton', () => ({
  AnimatedButton: ({ children, onPress }: any) => {
    const { TouchableOpacity } = require('react-native');
    return <TouchableOpacity onPress={onPress}>{children}</TouchableOpacity>;
  },
}));

import { useApp } from '../../../context/AppContext';
import { useTheme } from '../../../context/ThemeContext';
import { useToast } from '../../../context/ToastContext';
import AdminDashboard from '../../../screens/admin/AdminDashboard';

const MOCK_COLORS: any = {
  bg: '#111', bgElevated: '#1a1a1a', card: '#222', border: '#333', divider: '#444',
  textPrimary: '#fff', textSecondary: '#ccc', textMuted: '#999',
  primary: '#4f46e5',
  adminPrimary: '#dc2626', adminLight: '#fee2e2',
  approved: '#22c55e', approvedBg: '#dcfce7',
  rejected: '#ef4444', rejectedBg: '#fee2e2',
  pending: '#f59e0b', pendingBg: '#fef3c7',
  inProgress: '#3b82f6', inProgressBg: '#dbeafe',
  notStarted: '#6b7280', notStartedBg: '#f3f4f6',
};

const ADMIN_ID = 'admin-1';
const MANAGER = {
  id: 'mgr-1', name: 'Bob Manager', email: 'b@t.com',
  role: 'manager' as const, managerId: null,
  department: 'Eng', designation: 'Eng Mgr', joinDate: '2022-01-01',
  status: 'active' as const, avatarInitials: 'BM',
};
const EMPLOYEE = {
  id: 'emp-1', name: 'Alice Smith', email: 'a@t.com',
  role: 'employee' as const, managerId: 'mgr-1',
  department: 'Eng', designation: 'Dev', joinDate: '2024-01-01',
  status: 'active' as const, avatarInitials: 'AS',
};

function makeProps(): ScreenProps {
  return {
    navigation: { navigate: jest.fn(), goBack: jest.fn() },
    params: {},
    currentUserId: ADMIN_ID,
    currentRole: 'admin',
    onLogout: jest.fn(),
    onSwitchAccount: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (useTheme as jest.Mock).mockReturnValue({ colors: MOCK_COLORS, isDark: true });
  (useToast as jest.Mock).mockReturnValue({ showToast: jest.fn() });
  (useApp as jest.Mock).mockReturnValue({
    employees: [MANAGER, EMPLOYEE],
    goals: [],
    notifications: [],
    removeEmployee: jest.fn(),
    updateEmployee: jest.fn(),
  });
});

describe('AdminDashboard', () => {
  it('renders "Admin Panel" heading', () => {
    render(<AdminDashboard {...makeProps()} />);
    expect(screen.getByTestId('header-title').props.children).toBe('Admin Panel');
  });

  it('shows Overview, Actions and People tabs', () => {
    render(<AdminDashboard {...makeProps()} />);
    expect(screen.getByTestId('tab-overview')).toBeTruthy();
    expect(screen.getByTestId('tab-actions')).toBeTruthy();
    expect(screen.getByTestId('tab-people')).toBeTruthy();
  });

  it('shows KPI stats on overview tab', () => {
    render(<AdminDashboard {...makeProps()} />);
    expect(screen.getByText('Managers')).toBeTruthy();
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
  });

  it('switches to People tab and shows employee', () => {
    render(<AdminDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-people'));
    expect(screen.getByText('Alice Smith')).toBeTruthy();
  });

  it('switches to Actions tab and shows onboard button', () => {
    render(<AdminDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-actions'));
    expect(screen.getByText('Onboard New Employee')).toBeTruthy();
  });

  it('navigates to onboard-employee when Onboard pressed', () => {
    const navigate = jest.fn();
    render(<AdminDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-actions'));
    fireEvent.press(screen.getByText('Onboard New Employee'));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows "Goal Status Distribution" on overview', () => {
    render(<AdminDashboard {...makeProps()} />);
    expect(screen.getByText('Goal Status Distribution')).toBeTruthy();
  });

  it('shows Onboarding count on overview tab', () => {
    render(<AdminDashboard {...makeProps()} />);
    expect(screen.getByText('Onboarding')).toBeTruthy();
  });

  it('shows stacked goal bar when goals exist', () => {
    (useApp as jest.Mock).mockReturnValue({
      employees: [MANAGER, EMPLOYEE],
      goals: [
        { id: 'g1', employeeId: 'emp-1', status: 'approved', weight: 20, quarter: 'Q1' },
        { id: 'g2', employeeId: 'emp-1', status: 'rejected', weight: 20, quarter: 'Q1' },
        { id: 'g3', employeeId: 'emp-1', status: 'in_progress', weight: 20, quarter: 'Q2' },
      ],
      notifications: [],
      removeEmployee: jest.fn(),
      updateEmployee: jest.fn(),
      addNotification: jest.fn(),
    });
    render(<AdminDashboard {...makeProps()} />);
    expect(screen.getByText('Goal Status At a Glance')).toBeTruthy();
    expect(screen.getByText('Goal Status Distribution')).toBeTruthy();
  });

  it('shows department roster when employees exist', () => {
    render(<AdminDashboard {...makeProps()} />);
    expect(screen.getByText('Department Roster')).toBeTruthy();
    expect(screen.getByText('Eng')).toBeTruthy();
  });

  it('shows headcount breakdown section', () => {
    render(<AdminDashboard {...makeProps()} />);
    expect(screen.getByText('Headcount Breakdown')).toBeTruthy();
  });

  it('shows recent activity when notifications exist', () => {
    (useApp as jest.Mock).mockReturnValue({
      employees: [MANAGER, EMPLOYEE],
      goals: [],
      notifications: [{
        id: 'n1', recipientId: ADMIN_ID, type: 'goal_assigned',
        title: 'Goal Set', message: 'Alice got a new goal',
        read: false, createdAt: new Date().toISOString(),
      }],
      removeEmployee: jest.fn(),
      updateEmployee: jest.fn(),
      addNotification: jest.fn(),
    });
    render(<AdminDashboard {...makeProps()} />);
    expect(screen.getByText('Recent Activity')).toBeTruthy();
    expect(screen.getByText('Alice got a new goal')).toBeTruthy();
  });

  it('shows performance overview when employees have scored approved goals', () => {
    const empWithGoals = { ...EMPLOYEE, status: 'active' as const };
    (useApp as jest.Mock).mockReturnValue({
      employees: [MANAGER, empWithGoals],
      goals: [{
        id: 'g1', employeeId: 'emp-1', status: 'approved',
        weight: 50, quarter: 'Q1', managerRating: 4,
      }],
      notifications: [],
      removeEmployee: jest.fn(),
      updateEmployee: jest.fn(),
      addNotification: jest.fn(),
    });
    render(<AdminDashboard {...makeProps()} />);
    expect(screen.getByText('Performance Overview')).toBeTruthy();
  });

  it('people tab: filter chips All/Managers/Employees are shown', () => {
    render(<AdminDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-people'));
    expect(screen.getByText(/All \(\d+\)/)).toBeTruthy();
    expect(screen.getByText(/Managers \(\d+\)/)).toBeTruthy();
    expect(screen.getByText(/Employees \(\d+\)/)).toBeTruthy();
  });

  it('people tab: filter by managers shows only manager', () => {
    render(<AdminDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-people'));
    fireEvent.press(screen.getByText(/Managers \(\d+\)/));
    expect(screen.getByText('Bob Manager')).toBeTruthy();
    expect(screen.queryByText('Alice Smith')).toBeNull();
  });

  it('people tab: filter by employees shows only employee', () => {
    render(<AdminDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-people'));
    fireEvent.press(screen.getByText(/Employees \(\d+\)/));
    expect(screen.getByText('Alice Smith')).toBeTruthy();
    expect(screen.queryByText('Bob Manager')).toBeNull();
  });

  it('people tab: search filters by name', () => {
    render(<AdminDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-people'));
    fireEvent.changeText(screen.getByPlaceholderText('Search by name or ID…'), 'Alice');
    expect(screen.getByText('Alice Smith')).toBeTruthy();
    expect(screen.queryByText('Bob Manager')).toBeNull();
  });

  it('people tab: clear search restores all results', () => {
    render(<AdminDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-people'));
    fireEvent.changeText(screen.getByPlaceholderText('Search by name or ID…'), 'Alice');
    fireEvent.press(screen.getByText('✕'));
    expect(screen.getByText('Alice Smith')).toBeTruthy();
    expect(screen.getByText('Bob Manager')).toBeTruthy();
  });

  it('people tab: quarter filter chips Q1/Q2/All are shown', () => {
    render(<AdminDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-people'));
    expect(screen.getByText('Q1')).toBeTruthy();
    expect(screen.getByText('Q2')).toBeTruthy();
  });

  it('people tab: pressing active employee card navigates to goals-list', () => {
    const navigate = jest.fn();
    render(<AdminDashboard {...{ ...makeProps(), navigation: { navigate, goBack: jest.fn() } }} />);
    fireEvent.press(screen.getByTestId('tab-people'));
    fireEvent.press(screen.getByText('Alice Smith'));
    expect(navigate).toHaveBeenCalledWith('goals-list', expect.objectContaining({ viewEmployeeId: 'emp-1' }));
  });

  it('people tab: pressing onboarding employee shows toast instead of navigating', () => {
    const showToastMock = jest.fn();
    (useToast as jest.Mock).mockReturnValue({ showToast: showToastMock });
    (useApp as jest.Mock).mockReturnValue({
      employees: [MANAGER, { ...EMPLOYEE, status: 'onboarding' as const }],
      goals: [],
      notifications: [],
      removeEmployee: jest.fn(),
      updateEmployee: jest.fn(),
      addNotification: jest.fn(),
    });
    const navigate = jest.fn();
    render(<AdminDashboard {...{ ...makeProps(), navigation: { navigate, goBack: jest.fn() } }} />);
    fireEvent.press(screen.getByTestId('tab-people'));
    fireEvent.press(screen.getByText('Alice Smith'));
    expect(showToastMock).toHaveBeenCalledWith(expect.stringContaining('goals will appear'), 'info', 'Onboarding');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('actions tab: toggle offboard panel shows search input', () => {
    render(<AdminDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-actions'));
    fireEvent.press(screen.getByText('Offboard Employee'));
    expect(screen.getByText('Find person to offboard')).toBeTruthy();
    expect(screen.getByPlaceholderText('Enter name, email or employee ID…')).toBeTruthy();
  });

  it('actions tab: typing in offboard search shows results', () => {
    render(<AdminDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-actions'));
    fireEvent.press(screen.getByText('Offboard Employee'));
    fireEvent.changeText(
      screen.getByPlaceholderText('Enter name, email or employee ID…'),
      'Alice',
    );
    expect(screen.getAllByText(/Alice/).length).toBeGreaterThan(0);
  });

  it('actions tab: shows Change Manager button', () => {
    render(<AdminDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-actions'));
    expect(screen.getByText('Change Reporting Manager')).toBeTruthy();
  });

  it('actions tab: toggle change manager panel shows employee search', () => {
    render(<AdminDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-actions'));
    fireEvent.press(screen.getByText('Change Reporting Manager'));
    expect(screen.getByText(/Step 1/)).toBeTruthy();
  });

  it('actions tab: navigates to onboard-employee when button pressed', () => {
    const navigate = jest.fn();
    render(<AdminDashboard {...{ ...makeProps(), navigation: { navigate, goBack: jest.fn() } }} />);
    fireEvent.press(screen.getByTestId('tab-actions'));
    fireEvent.press(screen.getByText('Onboard New Employee'));
    expect(navigate).toHaveBeenCalledWith('onboard-employee');
  });

  it('people tab: pressing completed_fiscal_year employee navigates to fy-report', () => {
    const navigate = jest.fn();
    const fyEmp = { ...EMPLOYEE, status: 'completed_fiscal_year' as const };
    (useApp as jest.Mock).mockReturnValue({
      employees: [MANAGER, fyEmp],
      goals: [],
      notifications: [],
      removeEmployee: jest.fn(),
      updateEmployee: jest.fn(),
      addNotification: jest.fn(),
    });
    render(<AdminDashboard {...{ ...makeProps(), navigation: { navigate, goBack: jest.fn() } }} />);
    fireEvent.press(screen.getByTestId('tab-people'));
    fireEvent.press(screen.getByText('Alice Smith'));
    expect(navigate).toHaveBeenCalledWith('fy-report', { employeeId: 'emp-1' });
  });

  it('people tab: shows Activate button for onboarding employee', () => {
    (useApp as jest.Mock).mockReturnValue({
      employees: [MANAGER, { ...EMPLOYEE, status: 'onboarding' as const }],
      goals: [],
      notifications: [],
      removeEmployee: jest.fn(),
      updateEmployee: jest.fn(),
      addNotification: jest.fn(),
    });
    render(<AdminDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-people'));
    expect(screen.getByText('Activate ✓')).toBeTruthy();
  });

  it('people tab: shows Deactivate button for active employee', () => {
    render(<AdminDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-people'));
    expect(screen.getByText('Deactivate')).toBeTruthy();
  });

  it('people tab: pressing Activate button shows Alert', () => {
    const mockAlert = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});
    (useApp as jest.Mock).mockReturnValue({
      employees: [MANAGER, { ...EMPLOYEE, status: 'onboarding' as const }],
      goals: [],
      notifications: [],
      removeEmployee: jest.fn(),
      updateEmployee: jest.fn(),
      addNotification: jest.fn(),
    });
    render(<AdminDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-people'));
    fireEvent.press(screen.getByText('Activate ✓'));
    expect(mockAlert).toHaveBeenCalledWith('Activate Employee', expect.any(String), expect.any(Array));
    mockAlert.mockRestore();
  });

  it('people tab: shows Reactivate button for inactive employee', () => {
    (useApp as jest.Mock).mockReturnValue({
      employees: [MANAGER, { ...EMPLOYEE, status: 'inactive' as const }],
      goals: [],
      notifications: [],
      removeEmployee: jest.fn(),
      updateEmployee: jest.fn(),
      addNotification: jest.fn(),
    });
    render(<AdminDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-people'));
    expect(screen.getByText('Reactivate ✓')).toBeTruthy();
  });

  it('people tab: pressing Reactivate calls updateEmployee', () => {
    const updateEmployee = jest.fn();
    const showToast = jest.fn();
    (useToast as jest.Mock).mockReturnValue({ showToast });
    (useApp as jest.Mock).mockReturnValue({
      employees: [MANAGER, { ...EMPLOYEE, status: 'inactive' as const }],
      goals: [],
      notifications: [],
      removeEmployee: jest.fn(),
      updateEmployee,
      addNotification: jest.fn(),
    });
    render(<AdminDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-people'));
    fireEvent.press(screen.getByText('Reactivate ✓'));
    expect(updateEmployee).toHaveBeenCalledWith('emp-1', { status: 'active' });
  });

  it('people tab: Q1 quarter filter shows only employees with Q1 goals', () => {
    (useApp as jest.Mock).mockReturnValue({
      employees: [MANAGER, EMPLOYEE],
      goals: [{ id: 'g1', employeeId: 'emp-1', status: 'in_progress', weight: 20, quarter: 'Q1' }],
      notifications: [],
      removeEmployee: jest.fn(),
      updateEmployee: jest.fn(),
      addNotification: jest.fn(),
    });
    render(<AdminDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-people'));
    fireEvent.press(screen.getByText('Q1'));
    expect(screen.getByText('Alice Smith')).toBeTruthy();
  });

  it('actions tab: clears offboard search when ✕ pressed', () => {
    render(<AdminDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-actions'));
    fireEvent.press(screen.getByText('Offboard Employee'));
    const searchInput = screen.getByPlaceholderText('Enter name, email or employee ID…');
    fireEvent.changeText(searchInput, 'Alice');
    fireEvent.press(screen.getByText('✕'));
    expect(searchInput.props.value).toBe('');
  });

  it('actions tab: pressing offboard result shows Alert', () => {
    const mockAlert = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});
    render(<AdminDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-actions'));
    fireEvent.press(screen.getByText('Offboard Employee'));
    fireEvent.changeText(
      screen.getByPlaceholderText('Enter name, email or employee ID…'),
      'Alice',
    );
    const aliceRows = screen.getAllByText(/Alice/);
    fireEvent.press(aliceRows[aliceRows.length - 1]);
    expect(mockAlert).toHaveBeenCalledWith('Confirm Offboard', expect.any(String), expect.any(Array));
    mockAlert.mockRestore();
  });

  it('actions tab: change manager search shows employee results', () => {
    render(<AdminDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-actions'));
    fireEvent.press(screen.getByText('Change Reporting Manager'));
    const inputs = screen.getAllByPlaceholderText('Enter name, email or employee ID…');
    fireEvent.changeText(inputs[inputs.length - 1], 'Alice');
    expect(screen.getAllByText(/Alice/).length).toBeGreaterThan(0);
  });

  it('actions tab: selecting employee from change-manager results shows Step 2', () => {
    render(<AdminDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-actions'));
    fireEvent.press(screen.getByText('Change Reporting Manager'));
    const inputs = screen.getAllByPlaceholderText('Enter name, email or employee ID…');
    fireEvent.changeText(inputs[inputs.length - 1], 'Alice');
    const aliceOptions = screen.getAllByText(/Alice Smith/);
    fireEvent.press(aliceOptions[aliceOptions.length - 1]);
    expect(screen.getByText(/Step 2/)).toBeTruthy();
  });

  it('actions tab: clears change manager search when ✕ pressed', () => {
    render(<AdminDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-actions'));
    fireEvent.press(screen.getByText('Change Reporting Manager'));
    const inputs = screen.getAllByPlaceholderText('Enter name, email or employee ID…');
    const changeMgrInput = inputs[inputs.length - 1];
    fireEvent.changeText(changeMgrInput, 'Alice');
    const clearBtns = screen.getAllByText('✕');
    fireEvent.press(clearBtns[clearBtns.length - 1]);
    expect(changeMgrInput.props.value).toBe('');
  });

  it('recent activity: sort comparator runs with 2+ notifications', () => {
    const now = new Date();
    const earlier = new Date(now.getTime() - 60000);
    (useApp as jest.Mock).mockReturnValue({
      employees: [MANAGER, EMPLOYEE],
      goals: [],
      notifications: [
        { id: 'n1', recipientId: ADMIN_ID, type: 'goal_assigned', title: 'A', message: 'First notif', read: false, createdAt: earlier.toISOString() },
        { id: 'n2', recipientId: ADMIN_ID, type: 'evidence_submitted', title: 'B', message: 'Second notif', read: false, createdAt: now.toISOString() },
      ],
      removeEmployee: jest.fn(),
      updateEmployee: jest.fn(),
      addNotification: jest.fn(),
    });
    render(<AdminDashboard {...makeProps()} />);
    expect(screen.getByText('Second notif')).toBeTruthy();
    expect(screen.getByText('First notif')).toBeTruthy();
  });

  it('people tab: Activate Alert confirm calls updateEmployee', () => {
    const updateEmployee = jest.fn();
    const showToast = jest.fn();
    (useToast as jest.Mock).mockReturnValue({ showToast });
    (useApp as jest.Mock).mockReturnValue({
      employees: [MANAGER, { ...EMPLOYEE, status: 'onboarding' as const }],
      goals: [],
      notifications: [],
      removeEmployee: jest.fn(),
      updateEmployee,
      addNotification: jest.fn(),
    });
    let capturedButtons: any[] = [];
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert')
      .mockImplementation((_t: any, _m: any, btns: any) => { capturedButtons = btns; });
    render(<AdminDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-people'));
    fireEvent.press(screen.getByText('Activate ✓'));
    capturedButtons.find((b: any) => b.text === 'Activate')?.onPress?.();
    expect(updateEmployee).toHaveBeenCalledWith('emp-1', { status: 'active' });
    alertSpy.mockRestore();
  });

  it('people tab: Deactivate Alert confirm calls updateEmployee', () => {
    const updateEmployee = jest.fn();
    const showToast = jest.fn();
    (useToast as jest.Mock).mockReturnValue({ showToast });
    (useApp as jest.Mock).mockReturnValue({
      employees: [MANAGER, { ...EMPLOYEE, status: 'active' as const }],
      goals: [],
      notifications: [],
      removeEmployee: jest.fn(),
      updateEmployee,
      addNotification: jest.fn(),
    });
    let capturedButtons: any[] = [];
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert')
      .mockImplementation((_t: any, _m: any, btns: any) => { capturedButtons = btns; });
    render(<AdminDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-people'));
    fireEvent.press(screen.getByText('Deactivate'));
    capturedButtons.find((b: any) => b.text === 'Deactivate')?.onPress?.();
    expect(updateEmployee).toHaveBeenCalledWith('emp-1', { status: 'inactive' });
    alertSpy.mockRestore();
  });

  it('people tab: Offboard × button triggers Alert', () => {
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});
    render(<AdminDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-people'));
    fireEvent.press(screen.getByText('Offboard ×'));
    expect(alertSpy).toHaveBeenCalledWith('Confirm Offboard', expect.any(String), expect.any(Array));
    alertSpy.mockRestore();
  });

  it('actions tab: offboard confirm calls removeEmployee', () => {
    const removeEmployee = jest.fn();
    const showToast = jest.fn();
    (useToast as jest.Mock).mockReturnValue({ showToast });
    (useApp as jest.Mock).mockReturnValue({
      employees: [MANAGER, EMPLOYEE],
      goals: [],
      notifications: [],
      removeEmployee,
      updateEmployee: jest.fn(),
      addNotification: jest.fn(),
    });
    let capturedButtons: any[] = [];
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert')
      .mockImplementation((_t: any, _m: any, btns: any) => { capturedButtons = btns; });
    render(<AdminDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-actions'));
    fireEvent.press(screen.getByText('Offboard Employee'));
    fireEvent.changeText(screen.getAllByPlaceholderText('Enter name, email or employee ID…').at(-1)!, 'Alice');
    const aliceRows = screen.getAllByText(/Alice/);
    fireEvent.press(aliceRows.at(-1)!);
    capturedButtons.find((b: any) => b.text === 'Offboard')?.onPress?.();
    expect(removeEmployee).toHaveBeenCalledWith('emp-1');
    alertSpy.mockRestore();
  });

  it('actions tab: change manager step 2 - select new manager and press Search again', () => {
    render(<AdminDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-actions'));
    fireEvent.press(screen.getByText('Change Reporting Manager'));
    const inputs = screen.getAllByPlaceholderText('Enter name, email or employee ID…');
    fireEvent.changeText(inputs.at(-1)!, 'Alice');
    const aliceOptions = screen.getAllByText(/Alice Smith/);
    fireEvent.press(aliceOptions.at(-1)!);
    expect(screen.getByText(/Step 2/)).toBeTruthy();
    fireEvent.press(screen.getByText(/Search again/));
    expect(screen.getByText(/Step 1/)).toBeTruthy();
  });

  it('actions tab: change manager step 2 - select a non-current manager shows Reassign button', () => {
    const MANAGER2 = {
      id: 'mgr-2', name: 'Carol Manager', email: 'c@t.com',
      role: 'manager' as const, managerId: null,
      department: 'HR', designation: 'HR Mgr', joinDate: '2022-01-01',
      status: 'active' as const, avatarInitials: 'CM',
    };
    (useApp as jest.Mock).mockReturnValue({
      employees: [MANAGER, MANAGER2, EMPLOYEE],
      goals: [],
      notifications: [],
      removeEmployee: jest.fn(),
      updateEmployee: jest.fn(),
      addNotification: jest.fn(),
    });
    render(<AdminDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-actions'));
    fireEvent.press(screen.getByText('Change Reporting Manager'));
    const inputs = screen.getAllByPlaceholderText('Enter name, email or employee ID…');
    fireEvent.changeText(inputs.at(-1)!, 'Alice');
    const aliceOptions = screen.getAllByText(/Alice Smith/);
    fireEvent.press(aliceOptions.at(-1)!);
    expect(screen.getByText(/Step 2/)).toBeTruthy();
    fireEvent.press(screen.getByText('Carol Manager'));
    expect(screen.getByText(/Reassign to Carol Manager/)).toBeTruthy();
  });

  it('actions tab: change manager confirm calls updateEmployee and addNotification', () => {
    const MANAGER2 = {
      id: 'mgr-2', name: 'Carol Manager', email: 'c@t.com',
      role: 'manager' as const, managerId: null,
      department: 'HR', designation: 'HR Mgr', joinDate: '2022-01-01',
      status: 'active' as const, avatarInitials: 'CM',
    };
    const updateEmployee = jest.fn();
    const addNotification = jest.fn();
    const showToast = jest.fn();
    (useToast as jest.Mock).mockReturnValue({ showToast });
    (useApp as jest.Mock).mockReturnValue({
      employees: [MANAGER, MANAGER2, EMPLOYEE],
      goals: [],
      notifications: [],
      removeEmployee: jest.fn(),
      updateEmployee,
      addNotification,
    });
    let capturedButtons: any[] = [];
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert')
      .mockImplementation((_t: any, _m: any, btns: any) => { capturedButtons = btns; });
    render(<AdminDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-actions'));
    fireEvent.press(screen.getByText('Change Reporting Manager'));
    const inputs = screen.getAllByPlaceholderText('Enter name, email or employee ID…');
    fireEvent.changeText(inputs.at(-1)!, 'Alice');
    const aliceOptions = screen.getAllByText(/Alice Smith/);
    fireEvent.press(aliceOptions.at(-1)!);
    fireEvent.press(screen.getByText('Carol Manager'));
    fireEvent.press(screen.getByText(/Reassign to Carol Manager/));
    capturedButtons.find((b: any) => b.text === 'Confirm')?.onPress?.();
    expect(updateEmployee).toHaveBeenCalledWith('emp-1', { managerId: 'mgr-2' });
    expect(addNotification).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

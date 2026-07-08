import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import type { ScreenProps } from '../../../types';

jest.mock('../../../context/AppContext', () => ({ useApp: jest.fn() }));
jest.mock('../../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../context/ToastContext', () => ({ useToast: jest.fn() }));
jest.mock('../../../hooks/useAIReports', () => ({ useTriggerCoaching: jest.fn() }));
jest.mock('../../../components/Header', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return ({ title, onNotif, onLogout }: any) => (
    <View testID="header">
      <Text testID="header-title">{title}</Text>
      {onNotif && <TouchableOpacity testID="notif-btn" onPress={onNotif}><Text>Notif</Text></TouchableOpacity>}
      {onLogout && <TouchableOpacity testID="logout-btn" onPress={onLogout}><Text>Logout</Text></TouchableOpacity>}
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
jest.mock('../../../components/charts/MiniBarChart', () => () => null);
jest.mock('../../../components/charts/GoalStatusBar', () => () => null);
jest.mock('../../../components/AnimatedButton', () => ({
  AnimatedButton: ({ children, onPress }: any) => {
    const { TouchableOpacity } = require('react-native');
    return <TouchableOpacity onPress={onPress}>{children}</TouchableOpacity>;
  },
}));

import { useApp } from '../../../context/AppContext';
import { useTheme } from '../../../context/ThemeContext';
import { useToast } from '../../../context/ToastContext';
import { useTriggerCoaching } from '../../../hooks/useAIReports';
import ManagerDashboard from '../../../screens/manager/ManagerDashboard';

const MOCK_COLORS: any = {
  bg: '#111', bgElevated: '#1a1a1a', card: '#222', border: '#333',
  textPrimary: '#fff', textSecondary: '#ccc', textMuted: '#999',
  managerPrimary: '#7c3aed', managerLight: '#f3e8ff',
  employeePrimary: '#4f46e5', employeeLight: '#ede9fe',
  primary: '#4f46e5', primaryLight: '#ede9fe',
  approved: '#22c55e', approvedBg: '#dcfce7',
  rejected: '#ef4444', rejectedBg: '#fee2e2',
  pending: '#f59e0b', pendingBg: '#fef3c7',
  inProgress: '#3b82f6', inProgressBg: '#dbeafe',
  notStarted: '#6b7280', notStartedBg: '#f3f4f6',
  chartTrack: '#e5e7eb',
  high: '#ef4444', highBg: '#fee2e2',
  medium: '#f59e0b', mediumBg: '#fef3c7',
  low: '#22c55e', lowBg: '#dcfce7',
};

const MGR_ID = 'mgr-1';
const MANAGER = {
  id: MGR_ID, name: 'Bob Manager', email: 'bob@t.com',
  role: 'manager' as const, managerId: null,
  department: 'Eng', designation: 'Eng Manager', joinDate: '2022-01-01',
  status: 'active' as const, avatarInitials: 'BM',
};
const EMPLOYEE = {
  id: 'emp-1', name: 'Alice Smith', email: 'a@t.com',
  role: 'employee' as const, managerId: MGR_ID,
  department: 'Eng', designation: 'Dev', joinDate: '2024-01-01',
  status: 'active' as const, avatarInitials: 'AS',
};

function makeProps(overrides: Partial<ScreenProps> = {}): ScreenProps {
  return {
    navigation: { navigate: jest.fn(), goBack: jest.fn() },
    params: {},
    currentUserId: MGR_ID,
    currentRole: 'manager',
    onLogout: jest.fn(),
    onSwitchAccount: jest.fn(),
    ...overrides,
  };
}

const mockMutate = jest.fn();
const mockMutateAsync = jest.fn();
const mockShowToast = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useTheme as jest.Mock).mockReturnValue({ colors: MOCK_COLORS });
  (useToast as jest.Mock).mockReturnValue({ showToast: mockShowToast });
  (useTriggerCoaching as jest.Mock).mockReturnValue({ mutate: mockMutate, mutateAsync: mockMutateAsync, isPending: false });
  (useApp as jest.Mock).mockReturnValue({
    employees: [MANAGER, EMPLOYEE],
    goals: [],
    notifications: [],
  });
});

describe('ManagerDashboard', () => {
  it('renders without errors', () => {
    const { toJSON } = render(<ManagerDashboard {...makeProps()} />);
    expect(toJSON()).toBeTruthy();
  });

  it('shows Dashboard tab content by default', () => {
    render(<ManagerDashboard {...makeProps()} />);
    expect(screen.getByText('Team Overview')).toBeTruthy();
  });

  it('shows KPI strip items on dashboard tab', () => {
    render(<ManagerDashboard {...makeProps()} />);
    expect(screen.getByText('Team Size')).toBeTruthy();
    expect(screen.getByText('Pending Reviews')).toBeTruthy();
  });

  it('shows bottom tab bar with Dashboard, Team, Analytics tabs', () => {
    render(<ManagerDashboard {...makeProps()} />);
    expect(screen.getByTestId('tab-Dashboard')).toBeTruthy();
    expect(screen.getByTestId('tab-Team')).toBeTruthy();
    expect(screen.getByTestId('tab-Analytics')).toBeTruthy();
  });

  it('switches to Team tab when Team tab pressed', () => {
    render(<ManagerDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-Team'));
    expect(screen.getByText('Alice Smith')).toBeTruthy();
  });

  it('switches to Analytics tab', () => {
    render(<ManagerDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-Analytics'));
    expect(screen.getByText('Analytics')).toBeTruthy();
  });

  it('navigates to team-overview when quick action pressed', () => {
    const navigate = jest.fn();
    render(<ManagerDashboard {...makeProps({ navigation: { navigate, goBack: jest.fn() } })} />);
    fireEvent.press(screen.getByText('Team Overview'));
    expect(navigate).toHaveBeenCalledWith('team-overview');
  });

  it('shows pending review count from team goals', () => {
    (useApp as jest.Mock).mockReturnValue({
      employees: [MANAGER, EMPLOYEE],
      goals: [{
        id: 'g1', employeeId: 'emp-1', title: 'Goal', description: 'D',
        quarter: 'Q1', priority: 'medium', category: 'technical',
        targetDate: '2026-12-31', weight: 50, status: 'submitted',
        evidence: { id: 'e1', description: 'Done', links: [], submittedAt: '2026-03-01T00:00:00Z', status: 'pending' },
        createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
      }],
      notifications: [],
    });
    render(<ManagerDashboard {...makeProps()} />);
    expect(screen.getByText('Pending Reviews')).toBeTruthy();
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });
});

const OVERDUE_GOAL = {
  id: 'g-overdue', employeeId: 'emp-1', title: 'Overdue Goal', description: 'D',
  quarter: 'Q1', priority: 'medium' as const, category: 'technical' as const,
  targetDate: '2024-01-01', weight: 50, status: 'in_progress' as const,
  createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
};

describe('ManagerDashboard — overdue alert', () => {
  it('shows overdue alert when a team member has a goal past its target date', () => {
    (useApp as jest.Mock).mockReturnValue({
      employees: [MANAGER, EMPLOYEE],
      goals: [OVERDUE_GOAL],
      notifications: [],
    });
    render(<ManagerDashboard {...makeProps()} />);
    expect(screen.getByText(/1 team member with overdue goals/)).toBeTruthy();
  });

  it('does not show overdue alert when no goals are overdue', () => {
    render(<ManagerDashboard {...makeProps()} />);
    expect(screen.queryByText(/overdue goals/)).toBeNull();
  });

  it('shows employee first name and "past target date" in alert sub-text', () => {
    (useApp as jest.Mock).mockReturnValue({
      employees: [MANAGER, EMPLOYEE],
      goals: [OVERDUE_GOAL],
      notifications: [],
    });
    render(<ManagerDashboard {...makeProps()} />);
    expect(screen.getByText(/Alice.*past target date/)).toBeTruthy();
  });

  it('navigates to team-overview when View button is pressed', () => {
    const navigate = jest.fn();
    (useApp as jest.Mock).mockReturnValue({
      employees: [MANAGER, EMPLOYEE],
      goals: [OVERDUE_GOAL],
      notifications: [],
    });
    render(<ManagerDashboard {...makeProps({ navigation: { navigate, goBack: jest.fn() } })} />);
    fireEvent.press(screen.getByText('View'));
    expect(navigate).toHaveBeenCalledWith('team-overview');
  });

  it('shows plural "team members" when multiple employees have overdue goals', () => {
    const EMPLOYEE_2 = {
      id: 'emp-2', name: 'Carol Lee', email: 'c@t.com',
      role: 'employee' as const, managerId: MGR_ID,
      department: 'QA', designation: 'Tester', joinDate: '2024-01-01',
      status: 'active' as const, avatarInitials: 'CL',
    };
    (useApp as jest.Mock).mockReturnValue({
      employees: [MANAGER, EMPLOYEE, EMPLOYEE_2],
      goals: [
        OVERDUE_GOAL,
        { ...OVERDUE_GOAL, id: 'g-overdue-2', employeeId: 'emp-2' },
      ],
      notifications: [],
    });
    render(<ManagerDashboard {...makeProps()} />);
    expect(screen.getByText(/2 team members with overdue goals/)).toBeTruthy();
  });

  it('does not show overdue alert for goals with future target dates', () => {
    (useApp as jest.Mock).mockReturnValue({
      employees: [MANAGER, EMPLOYEE],
      goals: [{
        ...OVERDUE_GOAL, targetDate: '2099-12-31',
      }],
      notifications: [],
    });
    render(<ManagerDashboard {...makeProps()} />);
    expect(screen.queryByText(/overdue goals/)).toBeNull();
  });

  it('does not show overdue alert for approved goals even if past target date', () => {
    (useApp as jest.Mock).mockReturnValue({
      employees: [MANAGER, EMPLOYEE],
      goals: [{ ...OVERDUE_GOAL, status: 'approved' as const }],
      notifications: [],
    });
    render(<ManagerDashboard {...makeProps()} />);
    expect(screen.queryByText(/overdue goals/)).toBeNull();
  });
});

describe('ManagerDashboard — Dashboard tab interactions', () => {
  it('navigates to notifications when notif button pressed', () => {
    const navigate = jest.fn();
    render(<ManagerDashboard {...makeProps({ navigation: { navigate, goBack: jest.fn() } })} />);
    fireEvent.press(screen.getByTestId('notif-btn'));
    expect(navigate).toHaveBeenCalledWith('notifications');
  });

  it('navigates to review-evidence when Review Evidence quick action pressed', () => {
    const navigate = jest.fn();
    render(<ManagerDashboard {...makeProps({ navigation: { navigate, goBack: jest.fn() } })} />);
    fireEvent.press(screen.getByText('Review Evidence'));
    expect(navigate).toHaveBeenCalledWith('review-evidence');
  });

  it('navigates to team-daily-logs when Team Daily Activity pressed', () => {
    const navigate = jest.fn();
    render(<ManagerDashboard {...makeProps({ navigation: { navigate, goBack: jest.fn() } })} />);
    fireEvent.press(screen.getByText('Team Daily Activity'));
    expect(navigate).toHaveBeenCalledWith('team-daily-logs');
  });

  it('sends coaching and shows success toast', async () => {
    mockMutateAsync.mockResolvedValueOnce({ sent: 3 });
    render(<ManagerDashboard {...makeProps()} />);
    fireEvent.press(screen.getByText('Send Smart Coaching'));
    await Promise.resolve();
    expect(mockShowToast).toHaveBeenCalledWith('Sent 3 coaching messages', 'success');
  });

  it('shows coaching error toast on failure', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('Quota exceeded'));
    render(<ManagerDashboard {...makeProps()} />);
    fireEvent.press(screen.getByText('Send Smart Coaching'));
    await Promise.resolve();
    expect(mockShowToast).toHaveBeenCalledWith('Quota exceeded', 'error');
  });

  it('navigates to set-goals when team card pressed in Dashboard snapshot', () => {
    const navigate = jest.fn();
    render(<ManagerDashboard {...makeProps({ navigation: { navigate, goBack: jest.fn() } })} />);
    fireEvent.press(screen.getByText('Alice Smith'));
    expect(navigate).toHaveBeenCalledWith('set-goals', expect.objectContaining({ employeeId: 'emp-1' }));
  });

  it('navigates to fy-report when completed_fiscal_year employee card pressed', () => {
    const navigate = jest.fn();
    (useApp as jest.Mock).mockReturnValue({
      employees: [MANAGER, { ...EMPLOYEE, status: 'completed_fiscal_year' as const }],
      goals: [],
      notifications: [],
    });
    render(<ManagerDashboard {...makeProps({ navigation: { navigate, goBack: jest.fn() } })} />);
    fireEvent.press(screen.getByText('Alice Smith'));
    expect(navigate).toHaveBeenCalledWith('fy-report', expect.objectContaining({ employeeId: 'emp-1' }));
  });

  it('shows delta badge when employee has scored goals in both quarters', () => {
    (useApp as jest.Mock).mockReturnValue({
      employees: [MANAGER, EMPLOYEE],
      goals: [
        { id: 'g1', employeeId: 'emp-1', status: 'approved', quarter: 'Q1', weight: 50, managerRating: 4 },
        { id: 'g2', employeeId: 'emp-1', status: 'approved', quarter: 'Q2', weight: 50, managerRating: 5 },
      ],
      notifications: [],
    });
    render(<ManagerDashboard {...makeProps()} />);
    expect(screen.getByText(/pts/)).toBeTruthy();
  });

  it('shows pending review alert card when team has submitted goals', () => {
    const navigate = jest.fn();
    (useApp as jest.Mock).mockReturnValue({
      employees: [MANAGER, EMPLOYEE],
      goals: [{ id: 'g1', employeeId: 'emp-1', status: 'submitted', quarter: 'Q1', weight: 50 }],
      notifications: [],
    });
    render(<ManagerDashboard {...makeProps({ navigation: { navigate, goBack: jest.fn() } })} />);
    fireEvent.press(screen.getByText(/1 submission/));
    expect(navigate).toHaveBeenCalledWith('review-evidence');
  });
});

describe('ManagerDashboard — Analytics tab content', () => {
  it('shows Team Q2 Performance section in Analytics tab', () => {
    render(<ManagerDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-Analytics'));
    expect(screen.getByText('Team Q2 Performance')).toBeTruthy();
  });

  it('shows Goal Status Distribution in Analytics tab', () => {
    render(<ManagerDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-Analytics'));
    expect(screen.getByText('Goal Status Distribution')).toBeTruthy();
  });

  it('shows Individual Performance section in Analytics tab', () => {
    render(<ManagerDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-Analytics'));
    expect(screen.getByText('Individual Performance')).toBeTruthy();
    expect(screen.getByText('Alice Smith')).toBeTruthy();
  });

  it('shows FY completions section when employee has completed_fiscal_year status', () => {
    (useApp as jest.Mock).mockReturnValue({
      employees: [MANAGER, { ...EMPLOYEE, status: 'completed_fiscal_year' as const }],
      goals: [],
      notifications: [],
    });
    render(<ManagerDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-Analytics'));
    expect(screen.getByText('FY 2026 Completions')).toBeTruthy();
  });

  it('navigates to fy-report from FY completions card in Analytics', () => {
    const navigate = jest.fn();
    (useApp as jest.Mock).mockReturnValue({
      employees: [MANAGER, { ...EMPLOYEE, status: 'completed_fiscal_year' as const }],
      goals: [],
      notifications: [],
    });
    render(<ManagerDashboard {...makeProps({ navigation: { navigate, goBack: jest.fn() } })} />);
    fireEvent.press(screen.getByTestId('tab-Analytics'));
    // FY completions card appears first; individual performance section also shows the name
    fireEvent.press(screen.getAllByText('Alice Smith')[0]);
    expect(navigate).toHaveBeenCalledWith('fy-report', expect.objectContaining({ employeeId: 'emp-1' }));
  });
});

describe('ManagerDashboard — Team tab content', () => {
  it('shows email and department in Team tab employee card', () => {
    render(<ManagerDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-Team'));
    expect(screen.getByText('a@t.com')).toBeTruthy();
  });

  it('Set Goals button navigates to set-goals in Team tab', () => {
    const navigate = jest.fn();
    render(<ManagerDashboard {...makeProps({ navigation: { navigate, goBack: jest.fn() } })} />);
    fireEvent.press(screen.getByTestId('tab-Team'));
    fireEvent.press(screen.getByText('Set Goals'));
    expect(navigate).toHaveBeenCalledWith('set-goals', expect.objectContaining({ employeeId: 'emp-1' }));
  });

  it('View Goals button navigates to goals-list in Team tab', () => {
    const navigate = jest.fn();
    render(<ManagerDashboard {...makeProps({ navigation: { navigate, goBack: jest.fn() } })} />);
    fireEvent.press(screen.getByTestId('tab-Team'));
    fireEvent.press(screen.getByText('View Goals'));
    expect(navigate).toHaveBeenCalledWith('goals-list', expect.objectContaining({ viewEmployeeId: 'emp-1', readOnly: true }));
  });

  it('shows Onboarding badge for onboarding team member in Team tab', () => {
    (useApp as jest.Mock).mockReturnValue({
      employees: [MANAGER, { ...EMPLOYEE, status: 'onboarding' as const }],
      goals: [],
      notifications: [],
    });
    render(<ManagerDashboard {...makeProps()} />);
    fireEvent.press(screen.getByTestId('tab-Team'));
    expect(screen.getAllByText('Onboarding').length).toBeGreaterThan(0);
  });
});

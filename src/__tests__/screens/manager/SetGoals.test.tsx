import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
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
jest.mock('../../../components/AnimatedButton', () => ({
  AnimatedButton: ({ children, onPress }: any) => {
    const { TouchableOpacity } = require('react-native');
    return <TouchableOpacity onPress={onPress}>{children}</TouchableOpacity>;
  },
}));

import { useApp } from '../../../context/AppContext';
import { useTheme } from '../../../context/ThemeContext';
import { useToast } from '../../../context/ToastContext';
import SetGoals from '../../../screens/manager/SetGoals';

const MOCK_COLORS: any = {
  bg: '#111', bgElevated: '#1a1a1a', card: '#222', border: '#333',
  textPrimary: '#fff', textSecondary: '#ccc', textMuted: '#999',
  managerPrimary: '#7c3aed', managerLight: '#ede9fe',
  primary: '#4f46e5',
  approved: '#22c55e', approvedBg: '#dcfce7',
  rejected: '#ef4444', rejectedBg: '#fee2e2',
  pending: '#f59e0b', pendingBg: '#fef3c7',
  inProgress: '#3b82f6', inProgressBg: '#dbeafe',
  notStarted: '#6b7280',
};

const EMPLOYEE = {
  id: 'emp-1', name: 'Alice Smith', email: 'a@t.com',
  role: 'employee' as const, managerId: 'mgr-1',
  department: 'Eng', designation: 'Developer', joinDate: '2024-01-01',
  status: 'active' as const, avatarInitials: 'AS',
};

function makeProps(overrides: Partial<ScreenProps> = {}): ScreenProps {
  return {
    navigation: { navigate: jest.fn(), goBack: jest.fn() },
    params: { employeeId: 'emp-1' },
    currentUserId: 'mgr-1',
    currentRole: 'manager',
    onLogout: jest.fn(),
    ...overrides,
  };
}

const mockAddGoal = jest.fn().mockReturnValue({ id: 'g-new', title: 'New Goal' });
const mockShowToast = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useTheme as jest.Mock).mockReturnValue({ colors: MOCK_COLORS });
  (useToast as jest.Mock).mockReturnValue({ showToast: mockShowToast });
  (useApp as jest.Mock).mockReturnValue({
    employees: [EMPLOYEE],
    goals: [],
    addGoal: mockAddGoal,
    updateGoal: jest.fn(),
    updateEmployee: jest.fn(),
    deleteGoal: jest.fn(),
    addNotification: jest.fn(),
  });
});

describe('SetGoals', () => {
  it('renders employee name in header title', () => {
    render(<SetGoals {...makeProps()} />);
    expect(screen.getByTestId('header-title').props.children).toBe('Goals · Alice Smith');
  });

  it('renders Q1 and Q2 tabs', () => {
    render(<SetGoals {...makeProps()} />);
    expect(screen.getByText('Q1')).toBeTruthy();
    expect(screen.getByText('Q2')).toBeTruthy();
  });

  it('shows empty state when no goals for active quarter', () => {
    render(<SetGoals {...makeProps()} />);
    expect(screen.getByText(/No Q\d goals yet — add one below\./)).toBeTruthy();
  });

  it('shows "Add Goal" button', () => {
    render(<SetGoals {...makeProps()} />);
    expect(screen.getByText('+ Add Goal')).toBeTruthy();
  });

  it('shows goal form when Add Goal button pressed', () => {
    render(<SetGoals {...makeProps()} />);
    fireEvent.press(screen.getByText('+ Add Goal'));
    expect(screen.getByPlaceholderText('e.g. Implement user dashboard')).toBeTruthy();
  });

  it('shows validation error when saving without required fields', () => {
    render(<SetGoals {...makeProps()} />);
    fireEvent.press(screen.getByText('+ Add Goal'));
    fireEvent.press(screen.getByText('Save Goal'));
    expect(mockShowToast).toHaveBeenCalledWith(
      'Please fill in title, description, and target date.',
      'error',
      'Missing Fields',
    );
  });

  it('shows "Employee not found" when employee id missing', () => {
    render(<SetGoals {...makeProps({ params: { employeeId: 'nonexistent' } })} />);
    expect(screen.getByText('Employee not found.')).toBeTruthy();
  });

  it('switches to Q1 when Q1 tab pressed', () => {
    render(<SetGoals {...makeProps()} />);
    fireEvent.press(screen.getByText('Q1'));
    expect(screen.getByText(/No Q1 goals yet/)).toBeTruthy();
  });

  it('blocks deletion of terminal goals with a toast', () => {
    const mockDeleteGoal = jest.fn();
    (useApp as jest.Mock).mockReturnValue({
      employees: [EMPLOYEE],
      goals: [{
        id: 'g-approved', employeeId: 'emp-1', title: 'Approved Goal',
        description: 'desc', quarter: 'Q2', priority: 'medium', category: 'technical',
        targetDate: '2026-12-31', weight: 20, status: 'approved',
        createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z',
      }],
      addGoal: mockAddGoal, updateGoal: jest.fn(), updateEmployee: jest.fn(),
      deleteGoal: mockDeleteGoal, addNotification: jest.fn(),
    });
    render(<SetGoals {...makeProps()} />);
    fireEvent.press(screen.getByText(/Show completed goals/));
    fireEvent.press(screen.getByText('✕'));
    expect(mockShowToast).toHaveBeenCalledWith(
      'Goals that have been submitted or reviewed cannot be deleted.',
      'error',
      'Cannot Delete',
    );
    expect(mockDeleteGoal).not.toHaveBeenCalled();
  });

  it('shows confirmation alert for deletable goals', () => {
    const mockDeleteGoal = jest.fn();
    (useApp as jest.Mock).mockReturnValue({
      employees: [EMPLOYEE],
      goals: [{
        id: 'g-open', employeeId: 'emp-1', title: 'Open Goal',
        description: 'desc', quarter: 'Q2', priority: 'medium', category: 'technical',
        targetDate: '2026-12-31', weight: 20, status: 'not_started',
        createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z',
      }],
      addGoal: mockAddGoal, updateGoal: jest.fn(), updateEmployee: jest.fn(),
      deleteGoal: mockDeleteGoal, addNotification: jest.fn(),
    });
    const alertSpy = jest.spyOn(require('react-native'), 'Alert', 'get').mockReturnValue({ alert: jest.fn() });
    render(<SetGoals {...makeProps()} />);
    fireEvent.press(screen.getByText('✕'));
    expect(mockShowToast).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('saves a complete goal and calls addGoal', () => {
    render(<SetGoals {...makeProps()} />);
    fireEvent.press(screen.getByText('+ Add Goal'));
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Implement user dashboard'), 'Ship auth module');
    fireEvent.changeText(screen.getByPlaceholderText(/What should the employee achieve/), 'Build login and session management');
    fireEvent.changeText(screen.getByPlaceholderText('YYYY-MM-DD'), '2026-09-30');
    fireEvent.press(screen.getByText('Save Goal'));
    expect(mockAddGoal).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Ship auth module',
      description: 'Build login and session management',
      targetDate: '2026-09-30',
      quarter: 'Q2',
    }));
  });

  it('shows invalid date toast when date format is wrong', () => {
    render(<SetGoals {...makeProps()} />);
    fireEvent.press(screen.getByText('+ Add Goal'));
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Implement user dashboard'), 'Goal Title');
    fireEvent.changeText(screen.getByPlaceholderText(/What should the employee achieve/), 'Some description');
    fireEvent.changeText(screen.getByPlaceholderText('YYYY-MM-DD'), '30-09-2026');
    fireEvent.press(screen.getByText('Save Goal'));
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('YYYY-MM-DD'),
      'error',
      'Invalid Date',
    );
  });

  it('cancels the add form when Cancel is pressed', () => {
    render(<SetGoals {...makeProps()} />);
    fireEvent.press(screen.getByText('+ Add Goal'));
    expect(screen.getByPlaceholderText('e.g. Implement user dashboard')).toBeTruthy();
    fireEvent.press(screen.getByText('Cancel'));
    expect(screen.queryByPlaceholderText('e.g. Implement user dashboard')).toBeNull();
  });

  it('switches to Q1 tab and shows empty state', () => {
    render(<SetGoals {...makeProps()} />);
    fireEvent.press(screen.getByText('Q1'));
    expect(screen.getByText(/No Q1 goals yet/)).toBeTruthy();
  });

  it('saves a goal to Q1 when on Q1 tab', () => {
    render(<SetGoals {...makeProps()} />);
    fireEvent.press(screen.getByText('Q1'));
    fireEvent.press(screen.getByText('+ Add Goal'));
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Implement user dashboard'), 'Q1 Goal');
    fireEvent.changeText(screen.getByPlaceholderText(/What should the employee achieve/), 'Q1 description here');
    fireEvent.changeText(screen.getByPlaceholderText('YYYY-MM-DD'), '2026-03-31');
    fireEvent.press(screen.getByText('Save Goal'));
    expect(mockAddGoal).toHaveBeenCalledWith(expect.objectContaining({
      quarter: 'Q1',
      title: 'Q1 Goal',
    }));
  });

  it('shows existing Q2 goal and its title', () => {
    (useApp as jest.Mock).mockReturnValue({
      employees: [EMPLOYEE],
      goals: [{
        id: 'g-q2', employeeId: 'emp-1', title: 'Design System',
        description: 'Build the DS', quarter: 'Q2', priority: 'high', category: 'technical',
        targetDate: '2026-12-31', weight: 25, status: 'not_started',
        createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z',
      }],
      addGoal: mockAddGoal, updateGoal: jest.fn(), updateEmployee: jest.fn(),
      deleteGoal: jest.fn(), addNotification: jest.fn(),
    });
    render(<SetGoals {...makeProps()} />);
    expect(screen.getByText('Design System')).toBeTruthy();
  });

  it('enters edit mode and updates goal', () => {
    const mockUpdateGoal = jest.fn();
    (useApp as jest.Mock).mockReturnValue({
      employees: [EMPLOYEE],
      goals: [{
        id: 'g-edit', employeeId: 'emp-1', title: 'Original Title',
        description: 'Original desc', quarter: 'Q2', priority: 'medium', category: 'technical',
        targetDate: '2026-12-31', weight: 20, status: 'not_started',
        createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z',
      }],
      addGoal: mockAddGoal, updateGoal: mockUpdateGoal, updateEmployee: jest.fn(),
      deleteGoal: jest.fn(), addNotification: jest.fn(),
    });
    render(<SetGoals {...makeProps()} />);
    fireEvent.press(screen.getByText('✎'));
    fireEvent.changeText(screen.getByDisplayValue('Original Title'), 'Updated Title');
    fireEvent.press(screen.getByText('Save Changes'));
    expect(mockUpdateGoal).toHaveBeenCalledWith('g-edit', expect.objectContaining({
      title: 'Updated Title',
    }));
  });

  it('shows onboarding toast and transitions employee to active after first goal', () => {
    const mockUpdateEmployee = jest.fn();
    const mockAddNotification = jest.fn();
    (useApp as jest.Mock).mockReturnValue({
      employees: [{ ...EMPLOYEE, status: 'onboarding' as const }],
      goals: [],
      addGoal: mockAddGoal,
      updateGoal: jest.fn(),
      updateEmployee: mockUpdateEmployee,
      deleteGoal: jest.fn(),
      addNotification: mockAddNotification,
    });
    render(<SetGoals {...makeProps()} />);
    fireEvent.press(screen.getByText('+ Add Goal'));
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Implement user dashboard'), 'First Goal');
    fireEvent.changeText(screen.getByPlaceholderText(/What should the employee achieve/), 'Goal description');
    fireEvent.changeText(screen.getByPlaceholderText('YYYY-MM-DD'), '2026-06-30');
    fireEvent.press(screen.getByText('Save Goal'));
    expect(mockUpdateEmployee).toHaveBeenCalledWith('emp-1', { status: 'active' });
    expect(mockAddNotification).toHaveBeenCalled();
  });

  it('returns null when no employeeId in params', () => {
    const { toJSON } = render(<SetGoals {...makeProps({ params: {} })} />);
    expect(toJSON()).toBeNull();
  });

  it('shows web-only toast when Attach File pressed on native platform', async () => {
    render(<SetGoals {...makeProps()} />);
    fireEvent.press(screen.getByText('+ Add Goal'));
    fireEvent.press(screen.getByText('Attach File'));
    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith(
        'File attachments are available in the web app.',
        'info',
        'Web Only',
      ),
    );
  });

  it('calls deleteGoal when delete confirmed via Alert', () => {
    const mockDeleteGoal = jest.fn();
    (useApp as jest.Mock).mockReturnValue({
      employees: [EMPLOYEE],
      goals: [{
        id: 'g-del', employeeId: 'emp-1', title: 'Deletable Goal',
        description: 'desc', quarter: 'Q2', priority: 'medium', category: 'technical',
        targetDate: '2026-12-31', weight: 20, status: 'not_started',
        createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z',
      }],
      addGoal: mockAddGoal, updateGoal: jest.fn(), updateEmployee: jest.fn(),
      deleteGoal: mockDeleteGoal, addNotification: jest.fn(),
    });
    let capturedButtons: any[] = [];
    jest.spyOn(require('react-native'), 'Alert', 'get').mockReturnValue({
      alert: jest.fn().mockImplementation((_t: any, _m: any, buttons: any) => {
        capturedButtons = buttons;
      }),
    });
    render(<SetGoals {...makeProps()} />);
    fireEvent.press(screen.getByText('✕'));
    capturedButtons.find((b: any) => b.text === 'Delete')?.onPress?.();
    expect(mockDeleteGoal).toHaveBeenCalledWith('g-del');
  });

  it('shows carry all to Q2 button when on Q1 with unfinished goals', () => {
    (useApp as jest.Mock).mockReturnValue({
      employees: [EMPLOYEE],
      goals: [{
        id: 'g-q1a', employeeId: 'emp-1', title: 'Q1 In Progress',
        description: 'desc', quarter: 'Q1', priority: 'medium', category: 'technical',
        targetDate: '2026-03-31', weight: 20, status: 'in_progress',
        createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z',
      }],
      addGoal: mockAddGoal, updateGoal: jest.fn(), updateEmployee: jest.fn(),
      deleteGoal: jest.fn(), addNotification: jest.fn(),
    });
    render(<SetGoals {...makeProps({ params: { employeeId: 'emp-1', filterQuarter: 'Q1' } })} />);
    expect(screen.getByText(/Carry all unfinished to Q2/)).toBeTruthy();
  });

  it('calls addGoal when carry all to Q2 confirmed via alert', () => {
    (useApp as jest.Mock).mockReturnValue({
      employees: [EMPLOYEE],
      goals: [{
        id: 'g-q1b', employeeId: 'emp-1', title: 'Q1 Carry Me',
        description: 'carry desc', quarter: 'Q1', priority: 'high', category: 'learning',
        targetDate: '2026-03-31', weight: 20, status: 'not_started',
        createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z',
      }],
      addGoal: mockAddGoal, updateGoal: jest.fn(), updateEmployee: jest.fn(),
      deleteGoal: jest.fn(), addNotification: jest.fn(),
    });
    let capturedButtons: any[] = [];
    jest.spyOn(require('react-native'), 'Alert', 'get').mockReturnValue({
      alert: jest.fn().mockImplementation((_t: any, _m: any, buttons: any) => {
        capturedButtons = buttons;
      }),
    });
    render(<SetGoals {...makeProps({ params: { employeeId: 'emp-1', filterQuarter: 'Q1' } })} />);
    fireEvent.press(screen.getByText(/Carry all unfinished to Q2/));
    capturedButtons.find((b: any) => b.text === 'Carry Over')?.onPress?.();
    expect(mockAddGoal).toHaveBeenCalledWith(expect.objectContaining({ quarter: 'Q2', title: 'Q1 Carry Me' }));
  });

  it('shows individual carry to Q2 button for Q1 in_progress goal', () => {
    (useApp as jest.Mock).mockReturnValue({
      employees: [EMPLOYEE],
      goals: [{
        id: 'g-q1c', employeeId: 'emp-1', title: 'Individual IP',
        description: 'desc', quarter: 'Q1', priority: 'medium', category: 'technical',
        targetDate: '2026-03-31', weight: 20, status: 'in_progress',
        createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z',
      }],
      addGoal: mockAddGoal, updateGoal: jest.fn(), updateEmployee: jest.fn(),
      deleteGoal: jest.fn(), addNotification: jest.fn(),
    });
    render(<SetGoals {...makeProps({ params: { employeeId: 'emp-1', filterQuarter: 'Q1' } })} />);
    expect(screen.getByText('↩ Carry to Q2')).toBeTruthy();
  });

  it('calls addGoal when individual carry to Q2 is pressed', () => {
    (useApp as jest.Mock).mockReturnValue({
      employees: [EMPLOYEE],
      goals: [{
        id: 'g-q1d', employeeId: 'emp-1', title: 'Individual Carry',
        description: 'carry', quarter: 'Q1', priority: 'medium', category: 'technical',
        targetDate: '2026-03-31', weight: 20, status: 'in_progress',
        createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z',
      }],
      addGoal: mockAddGoal, updateGoal: jest.fn(), updateEmployee: jest.fn(),
      deleteGoal: jest.fn(), addNotification: jest.fn(),
    });
    render(<SetGoals {...makeProps({ params: { employeeId: 'emp-1', filterQuarter: 'Q1' } })} />);
    fireEvent.press(screen.getByText('↩ Carry to Q2'));
    expect(mockAddGoal).toHaveBeenCalledWith(expect.objectContaining({ quarter: 'Q2', title: 'Individual Carry' }));
  });

  it('shows feedback box when goal has managerFeedback', () => {
    (useApp as jest.Mock).mockReturnValue({
      employees: [EMPLOYEE],
      goals: [{
        id: 'g-fb', employeeId: 'emp-1', title: 'Feedback Goal',
        description: 'desc', quarter: 'Q2', priority: 'medium', category: 'technical',
        targetDate: '2026-12-31', weight: 20, status: 'approved',
        evidence: {
          id: 'ev-1', goalId: 'g-fb', employeeId: 'emp-1', status: 'approved',
          selfRating: 4, managerRating: 5, managerFeedback: 'Outstanding work!',
          submittedAt: '2026-01-01T00:00:00Z', reviewedAt: '2026-01-02T00:00:00Z',
        },
        createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z',
      }],
      addGoal: mockAddGoal, updateGoal: jest.fn(), updateEmployee: jest.fn(),
      deleteGoal: jest.fn(), addNotification: jest.fn(),
    });
    render(<SetGoals {...makeProps()} />);
    fireEvent.press(screen.getByText(/Show completed goals/));
    expect(screen.getByText('Outstanding work!')).toBeTruthy();
  });

  it('shows filter banner Clear button when filterStatus param is set', () => {
    (useApp as jest.Mock).mockReturnValue({
      employees: [EMPLOYEE],
      goals: [{
        id: 'g-filt', employeeId: 'emp-1', title: 'Filtered Goal',
        description: 'desc', quarter: 'Q2', priority: 'medium', category: 'technical',
        targetDate: '2026-12-31', weight: 20, status: 'in_progress',
        createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z',
      }],
      addGoal: mockAddGoal, updateGoal: jest.fn(), updateEmployee: jest.fn(),
      deleteGoal: jest.fn(), addNotification: jest.fn(),
    });
    render(<SetGoals {...makeProps({ params: { employeeId: 'emp-1', filterStatus: 'in_progress' } })} />);
    expect(screen.getByText('Clear ×')).toBeTruthy();
  });

  it('clears status filter when Clear × is pressed', () => {
    (useApp as jest.Mock).mockReturnValue({
      employees: [EMPLOYEE],
      goals: [{
        id: 'g-filt2', employeeId: 'emp-1', title: 'Filtered Goal 2',
        description: 'desc', quarter: 'Q2', priority: 'medium', category: 'technical',
        targetDate: '2026-12-31', weight: 20, status: 'in_progress',
        createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z',
      }],
      addGoal: mockAddGoal, updateGoal: jest.fn(), updateEmployee: jest.fn(),
      deleteGoal: jest.fn(), addNotification: jest.fn(),
    });
    render(<SetGoals {...makeProps({ params: { employeeId: 'emp-1', filterStatus: 'in_progress' } })} />);
    fireEvent.press(screen.getByText('Clear ×'));
    expect(screen.queryByText('Clear ×')).toBeNull();
  });

  it('selects Learning category chip in add form', () => {
    render(<SetGoals {...makeProps()} />);
    fireEvent.press(screen.getByText('+ Add Goal'));
    fireEvent.press(screen.getByText('Learning'));
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Implement user dashboard'), 'Learning Goal');
    fireEvent.changeText(screen.getByPlaceholderText(/What should the employee achieve/), 'Learn TypeScript');
    fireEvent.changeText(screen.getByPlaceholderText('YYYY-MM-DD'), '2026-09-30');
    fireEvent.press(screen.getByText('Save Goal'));
    expect(mockAddGoal).toHaveBeenCalledWith(expect.objectContaining({ category: 'learning' }));
  });

  it('selects High priority chip in add form', () => {
    render(<SetGoals {...makeProps()} />);
    fireEvent.press(screen.getByText('+ Add Goal'));
    fireEvent.press(screen.getByText('High'));
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Implement user dashboard'), 'High Priority Goal');
    fireEvent.changeText(screen.getByPlaceholderText(/What should the employee achieve/), 'Critical task');
    fireEvent.changeText(screen.getByPlaceholderText('YYYY-MM-DD'), '2026-09-30');
    fireEvent.press(screen.getByText('Save Goal'));
    expect(mockAddGoal).toHaveBeenCalledWith(expect.objectContaining({ priority: 'high' }));
  });

  it('handleSaveEdit shows missing fields toast when title cleared', () => {
    const mockUpdateGoal = jest.fn();
    (useApp as jest.Mock).mockReturnValue({
      employees: [EMPLOYEE],
      goals: [{
        id: 'g-sav', employeeId: 'emp-1', title: 'Save Validation',
        description: 'desc', quarter: 'Q2', priority: 'medium', category: 'technical',
        targetDate: '2026-12-31', weight: 20, status: 'not_started',
        createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z',
      }],
      addGoal: mockAddGoal, updateGoal: mockUpdateGoal, updateEmployee: jest.fn(),
      deleteGoal: jest.fn(), addNotification: jest.fn(),
    });
    render(<SetGoals {...makeProps()} />);
    fireEvent.press(screen.getByText('✎'));
    fireEvent.changeText(screen.getByDisplayValue('Save Validation'), '');
    fireEvent.press(screen.getByText('Save Changes'));
    expect(mockShowToast).toHaveBeenCalledWith(
      'Please fill in title, description, and target date.',
      'error',
      'Missing Fields',
    );
  });

  it('handleSaveEdit shows invalid date toast when date format is wrong', () => {
    const mockUpdateGoal = jest.fn();
    (useApp as jest.Mock).mockReturnValue({
      employees: [EMPLOYEE],
      goals: [{
        id: 'g-dv', employeeId: 'emp-1', title: 'Date Validation',
        description: 'desc', quarter: 'Q2', priority: 'medium', category: 'technical',
        targetDate: '2026-12-31', weight: 20, status: 'not_started',
        createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z',
      }],
      addGoal: mockAddGoal, updateGoal: mockUpdateGoal, updateEmployee: jest.fn(),
      deleteGoal: jest.fn(), addNotification: jest.fn(),
    });
    render(<SetGoals {...makeProps()} />);
    fireEvent.press(screen.getByText('✎'));
    fireEvent.changeText(screen.getByDisplayValue('2026-12-31'), '31-12-2026');
    fireEvent.press(screen.getByText('Save Changes'));
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('YYYY-MM-DD'),
      'error',
      'Invalid Date',
    );
  });

  it('changes category chip to Soft Skills in edit mode', () => {
    const mockUpdateGoal = jest.fn();
    (useApp as jest.Mock).mockReturnValue({
      employees: [EMPLOYEE],
      goals: [{
        id: 'g-ec', employeeId: 'emp-1', title: 'Edit Category Goal',
        description: 'desc', quarter: 'Q2', priority: 'medium', category: 'technical',
        targetDate: '2026-12-31', weight: 20, status: 'not_started',
        createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z',
      }],
      addGoal: mockAddGoal, updateGoal: mockUpdateGoal, updateEmployee: jest.fn(),
      deleteGoal: jest.fn(), addNotification: jest.fn(),
    });
    render(<SetGoals {...makeProps()} />);
    fireEvent.press(screen.getByText('✎'));
    fireEvent.press(screen.getByText('Soft Skills'));
    fireEvent.press(screen.getByText('Save Changes'));
    expect(mockUpdateGoal).toHaveBeenCalledWith('g-ec', expect.objectContaining({ category: 'soft_skills' }));
  });

  it('changes priority chip to Low in edit mode', () => {
    const mockUpdateGoal = jest.fn();
    (useApp as jest.Mock).mockReturnValue({
      employees: [EMPLOYEE],
      goals: [{
        id: 'g-ep', employeeId: 'emp-1', title: 'Edit Priority Goal',
        description: 'desc', quarter: 'Q2', priority: 'medium', category: 'technical',
        targetDate: '2026-12-31', weight: 20, status: 'not_started',
        createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z',
      }],
      addGoal: mockAddGoal, updateGoal: mockUpdateGoal, updateEmployee: jest.fn(),
      deleteGoal: jest.fn(), addNotification: jest.fn(),
    });
    render(<SetGoals {...makeProps()} />);
    fireEvent.press(screen.getByText('✎'));
    fireEvent.press(screen.getByText('Low'));
    fireEvent.press(screen.getByText('Save Changes'));
    expect(mockUpdateGoal).toHaveBeenCalledWith('g-ep', expect.objectContaining({ priority: 'low' }));
  });

  it('autoFormatDate returns digits only when fewer than 5 digits typed', () => {
    render(<SetGoals {...makeProps()} />);
    fireEvent.press(screen.getByText('+ Add Goal'));
    const dateInput = screen.getByPlaceholderText('YYYY-MM-DD');
    fireEvent.changeText(dateInput, '12');
    expect(dateInput.props.value).toBe('12');
  });

  it('autoFormatDate adds hyphen after 4 digits when 5-6 digits typed', () => {
    render(<SetGoals {...makeProps()} />);
    fireEvent.press(screen.getByText('+ Add Goal'));
    const dateInput = screen.getByPlaceholderText('YYYY-MM-DD');
    fireEvent.changeText(dateInput, '202601');
    expect(dateInput.props.value).toBe('2026-01');
  });

});

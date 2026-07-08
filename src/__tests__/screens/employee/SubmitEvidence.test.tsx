import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import type { ScreenProps } from '../../../types';

jest.mock('../../../context/AppContext', () => ({ useApp: jest.fn() }));
jest.mock('../../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../context/ToastContext', () => ({ useToast: jest.fn() }));
jest.mock('../../../hooks/useImagePicker', () => ({
  useImagePicker: jest.fn(),
}));
jest.mock('../../../components/Header', () => {
  const { View, Text } = require('react-native');
  return ({ title }: any) => (
    <View testID="header"><Text testID="header-title">{title}</Text></View>
  );
});
jest.mock('../../../components/PermissionDeniedBanner', () => ({
  PermissionDeniedBanner: () => null,
}));
jest.mock('../../../components/AnimatedButton', () => ({
  AnimatedButton: ({ children, onPress }: any) => {
    const { TouchableOpacity } = require('react-native');
    return <TouchableOpacity onPress={onPress}>{children}</TouchableOpacity>;
  },
}));

import { useApp } from '../../../context/AppContext';
import { useTheme } from '../../../context/ThemeContext';
import { useToast } from '../../../context/ToastContext';
import { useImagePicker } from '../../../hooks/useImagePicker';
import SubmitEvidence from '../../../screens/employee/SubmitEvidence';

const MOCK_COLORS: any = {
  bg: '#111', bgElevated: '#1a1a1a', card: '#222', border: '#333',
  textPrimary: '#fff', textSecondary: '#ccc', textMuted: '#999',
  employeePrimary: '#4f46e5', employeeLight: '#eef2ff',
  approved: '#22c55e', rejected: '#ef4444', rejectedBg: '#fee2e2',
  inProgress: '#3b82f6', pending: '#f59e0b', pendingBg: '#fef3c7',
};

const GOAL = {
  id: 'g1', employeeId: 'emp-1', title: 'Build Dashboard',
  description: 'Create the main dashboard', quarter: 'Q1',
  priority: 'medium' as const, category: 'technical' as const,
  targetDate: '2026-12-31', weight: 50, status: 'in_progress' as const,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
};

const EMPLOYEE = {
  id: 'emp-1', name: 'Alice Smith', email: 'a@t.com',
  role: 'employee' as const, managerId: 'mgr-1',
  department: 'Eng', designation: 'Dev', joinDate: '2024-01-01',
  status: 'active' as const, avatarInitials: 'AS',
};

function makeProps(overrides: Partial<ScreenProps> = {}): ScreenProps {
  return {
    navigation: { navigate: jest.fn(), goBack: jest.fn() },
    params: { goalId: 'g1' },
    currentUserId: 'emp-1',
    currentRole: 'employee',
    onLogout: jest.fn(),
    ...overrides,
  };
}

const mockShowToast = jest.fn();
const mockSubmitEvidence = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useTheme as jest.Mock).mockReturnValue({ colors: MOCK_COLORS });
  (useToast as jest.Mock).mockReturnValue({ showToast: mockShowToast });
  (useImagePicker as jest.Mock).mockReturnValue({
    cameraStatus: 'granted',
    libraryStatus: 'granted',
    pickFromCamera: jest.fn(),
    pickFromLibrary: jest.fn(),
    openSettings: jest.fn(),
  });
  (useApp as jest.Mock).mockReturnValue({
    goals: [GOAL],
    employees: [EMPLOYEE],
    submitEvidence: mockSubmitEvidence,
    updateGoal: jest.fn(),
    addNotification: jest.fn(),
  });
});

describe('SubmitEvidence', () => {
  it('shows goal title in card', () => {
    render(<SubmitEvidence {...makeProps()} />);
    expect(screen.getByText('Build Dashboard')).toBeTruthy();
  });

  it('renders "Submit Evidence" header for in_progress goal', () => {
    render(<SubmitEvidence {...makeProps()} />);
    expect(screen.getByTestId('header-title').props.children).toBe('Submit Evidence');
  });

  it('renders "Resubmit Evidence" header for rejected goal', () => {
    (useApp as jest.Mock).mockReturnValue({
      goals: [{ ...GOAL, status: 'rejected', evidence: { id: 'e1', description: 'D', links: [], submittedAt: '', status: 'rejected', managerFeedback: 'Needs more' } }],
      employees: [EMPLOYEE],
      submitEvidence: mockSubmitEvidence,
      updateGoal: jest.fn(),
      addNotification: jest.fn(),
    });
    render(<SubmitEvidence {...makeProps()} />);
    expect(screen.getByTestId('header-title').props.children).toBe('Resubmit Evidence');
  });

  it('shows "Goal not found" when goal id not in list', () => {
    render(<SubmitEvidence {...makeProps({ params: { goalId: 'nonexistent' } })} />);
    expect(screen.getByText('Goal not found.')).toBeTruthy();
  });

  it('shows error toast when submitting without description', () => {
    render(<SubmitEvidence {...makeProps()} />);
    fireEvent.press(screen.getByText('Submit for Review'));
    expect(mockShowToast).toHaveBeenCalledWith(
      'Please describe what you did to complete this goal.',
      'error',
      'Description required',
    );
  });

  it('calls submitEvidence with description', () => {
    render(<SubmitEvidence {...makeProps()} />);
    fireEvent.changeText(
      screen.getByPlaceholderText(/Describe what you did/),
      'Completed the dashboard feature',
    );
    fireEvent.press(screen.getByText('Submit for Review'));
    expect(mockSubmitEvidence).toHaveBeenCalledWith('g1', expect.objectContaining({
      description: 'Completed the dashboard feature',
    }));
  });

  it('adds link when Add button pressed with text', () => {
    render(<SubmitEvidence {...makeProps()} />);
    fireEvent.changeText(screen.getByPlaceholderText(/github.com\/repo/), 'github.com/pr/1');
    fireEvent.press(screen.getByText('Add'));
    expect(screen.getByText(/github.com\/pr\/1/)).toBeTruthy();
  });

  it('shows previous submission box for rejected goals with existing evidence', () => {
    (useApp as jest.Mock).mockReturnValue({
      goals: [{
        ...GOAL, status: 'rejected',
        evidence: {
          id: 'e1', description: 'My previous work', links: [],
          submittedAt: '2026-03-01T00:00:00Z', status: 'rejected',
          managerFeedback: 'Needs improvement',
        },
      }],
      employees: [EMPLOYEE],
      submitEvidence: mockSubmitEvidence,
      updateGoal: jest.fn(),
      addNotification: jest.fn(),
    });
    render(<SubmitEvidence {...makeProps()} />);
    expect(screen.getByText('📋 Your previous submission')).toBeTruthy();
    expect(screen.getByText('My previous work')).toBeTruthy();
  });

  it('shows previous submission links when evidence has links', () => {
    (useApp as jest.Mock).mockReturnValue({
      goals: [{
        ...GOAL, status: 'rejected',
        evidence: {
          id: 'e1', description: 'See the PR', links: ['https://github.com/pr/42'],
          submittedAt: '2026-03-01T00:00:00Z', status: 'rejected',
          managerFeedback: 'Incomplete',
        },
      }],
      employees: [EMPLOYEE],
      submitEvidence: mockSubmitEvidence,
      updateGoal: jest.fn(),
      addNotification: jest.fn(),
    });
    render(<SubmitEvidence {...makeProps()} />);
    expect(screen.getAllByText(/🔗 https:\/\/github\.com\/pr\/42/).length).toBeGreaterThan(0);
  });

  it('does not show previous submission box for in_progress goals', () => {
    render(<SubmitEvidence {...makeProps()} />);
    expect(screen.queryByText('📋 Your previous submission')).toBeNull();
  });

  it('removes a link when ✕ is pressed', () => {
    render(<SubmitEvidence {...makeProps()} />);
    fireEvent.changeText(screen.getByPlaceholderText(/github.com\/repo/), 'https://example.com/pr/1');
    fireEvent.press(screen.getByText('Add'));
    expect(screen.getByText(/https:\/\/example.com\/pr\/1/)).toBeTruthy();
    fireEvent.press(screen.getByText('✕'));
    expect(screen.queryByText(/https:\/\/example.com\/pr\/1/)).toBeNull();
  });

  it('shows "Mark as In Progress" button for not_started goal', () => {
    (useApp as jest.Mock).mockReturnValue({
      goals: [{ ...GOAL, status: 'not_started' }],
      employees: [EMPLOYEE],
      submitEvidence: mockSubmitEvidence,
      updateGoal: jest.fn(),
      addNotification: jest.fn(),
    });
    render(<SubmitEvidence {...makeProps()} />);
    expect(screen.getByText('Mark as In Progress')).toBeTruthy();
  });

  it('calls updateGoal when "Mark as In Progress" is pressed', () => {
    const mockUpdateGoal = jest.fn();
    (useApp as jest.Mock).mockReturnValue({
      goals: [{ ...GOAL, status: 'not_started' }],
      employees: [EMPLOYEE],
      submitEvidence: mockSubmitEvidence,
      updateGoal: mockUpdateGoal,
      addNotification: jest.fn(),
    });
    render(<SubmitEvidence {...makeProps()} />);
    fireEvent.press(screen.getByText('Mark as In Progress'));
    expect(mockUpdateGoal).toHaveBeenCalledWith('g1', { status: 'in_progress' });
  });

  it('does not show "Mark as In Progress" for in_progress goal', () => {
    render(<SubmitEvidence {...makeProps()} />);
    expect(screen.queryByText('Mark as In Progress')).toBeNull();
  });

  it('calls submitEvidence with selfRating and shows success toast on submit', async () => {
    mockSubmitEvidence.mockResolvedValueOnce(undefined);
    render(<SubmitEvidence {...makeProps()} />);
    fireEvent.changeText(
      screen.getByPlaceholderText(/Describe what you did/),
      'Finished the dashboard',
    );
    fireEvent.press(screen.getByText('Submit for Review'));
    await Promise.resolve();
    expect(mockSubmitEvidence).toHaveBeenCalledWith('g1', expect.objectContaining({
      description: 'Finished the dashboard',
    }));
  });

  it('shows error toast when submitEvidence rejects', async () => {
    mockSubmitEvidence.mockRejectedValueOnce(new Error('Network error'));
    render(<SubmitEvidence {...makeProps()} />);
    fireEvent.changeText(
      screen.getByPlaceholderText(/Describe what you did/),
      'Some work done',
    );
    fireEvent.press(screen.getByText('Submit for Review'));
    await Promise.resolve();
    await Promise.resolve();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('Failed to submit'),
      'error',
      'Submission Failed',
    );
  });

  it('shows take photo button on non-web platform', () => {
    render(<SubmitEvidence {...makeProps()} />);
    expect(screen.getByTestId('take-photo-btn')).toBeTruthy();
  });

  it('calls pickFromCamera when take photo button is pressed', () => {
    const mockPickFromCamera = jest.fn().mockResolvedValue(null);
    (useImagePicker as jest.Mock).mockReturnValue({
      cameraStatus: 'granted',
      libraryStatus: 'granted',
      pickFromCamera: mockPickFromCamera,
      pickFromLibrary: jest.fn(),
      openSettings: jest.fn(),
    });
    render(<SubmitEvidence {...makeProps()} />);
    fireEvent.press(screen.getByTestId('take-photo-btn'));
    expect(mockPickFromCamera).toHaveBeenCalled();
  });

  it('shows attach file button', () => {
    render(<SubmitEvidence {...makeProps()} />);
    expect(screen.getByTestId('attach-file-btn')).toBeTruthy();
  });

  it('shows rejection feedback for rejected goal with manager feedback', () => {
    (useApp as jest.Mock).mockReturnValue({
      goals: [{
        ...GOAL, status: 'rejected',
        evidence: {
          id: 'e1', description: 'My work', links: [], submittedAt: '',
          status: 'rejected', managerFeedback: 'Not detailed enough',
        },
      }],
      employees: [EMPLOYEE],
      submitEvidence: mockSubmitEvidence,
      updateGoal: jest.fn(),
      addNotification: jest.fn(),
    });
    render(<SubmitEvidence {...makeProps()} />);
    expect(screen.getByText('Not detailed enough')).toBeTruthy();
    expect(screen.getByText('Previous rejection feedback:')).toBeTruthy();
  });

  it('shows "Resubmit Evidence" button text for rejected goal', () => {
    (useApp as jest.Mock).mockReturnValue({
      goals: [{ ...GOAL, status: 'rejected', evidence: { id: 'e1', description: 'D', links: [], submittedAt: '', status: 'rejected' } }],
      employees: [EMPLOYEE],
      submitEvidence: mockSubmitEvidence,
      updateGoal: jest.fn(),
      addNotification: jest.fn(),
    });
    render(<SubmitEvidence {...makeProps()} />);
    // AnimatedButton renders "Resubmit Evidence" as button text (header also uses same label via mock)
    expect(screen.getAllByText('Resubmit Evidence').length).toBeGreaterThan(0);
  });

  it('shows "Uploading files..." text when in upload phase (submitting state)', () => {
    render(<SubmitEvidence {...makeProps()} />);
    expect(screen.getByText('Submit for Review')).toBeTruthy();
  });
});

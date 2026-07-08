import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import type { Goal, ScreenProps } from '../../../types';

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
import ReviewEvidence from '../../../screens/manager/ReviewEvidence';

const MOCK_COLORS: any = {
  bg: '#111', bgElevated: '#1a1a1a', card: '#222', border: '#333',
  divider: '#444', textPrimary: '#fff', textSecondary: '#ccc', textMuted: '#999',
  managerPrimary: '#7c3aed', employeePrimary: '#4f46e5', employeeLight: '#ede9fe',
  approved: '#22c55e', approvedBg: '#dcfce7',
  rejected: '#ef4444', rejectedBg: '#fee2e2',
  pending: '#f59e0b', pendingBg: '#fef3c7',
  inProgress: '#3b82f6', inProgressBg: '#dbeafe',
  chartTrack: '#e5e7eb',
  high: '#ef4444', highBg: '#fee2e2',
  medium: '#f59e0b', mediumBg: '#fef3c7',
  low: '#22c55e', lowBg: '#dcfce7',
};

const EMPLOYEE = {
  id: 'emp-1', name: 'Alice Smith', email: 'a@t.com',
  role: 'employee' as const, managerId: 'mgr-1',
  department: 'Eng', designation: 'Dev', joinDate: '2024-01-01',
  status: 'active' as const, avatarInitials: 'AS',
};

function makeSubmittedGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'g1', employeeId: 'emp-1', title: 'Submit Report',
    description: 'Desc', quarter: 'Q1', priority: 'medium',
    category: 'technical', targetDate: '2026-12-31',
    weight: 50, status: 'submitted',
    evidence: {
      id: 'ev1', description: 'Done it', links: ['https://example.com'],
      selfRating: 4, submittedAt: '2026-03-01T00:00:00Z',
      status: 'pending',
    },
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeProps(): ScreenProps {
  return {
    navigation: { navigate: jest.fn(), goBack: jest.fn() },
    params: {},
    currentUserId: 'mgr-1',
    currentRole: 'manager',
    onLogout: jest.fn(),
  };
}

const mockShowToast = jest.fn();
const mockReviewEvidence = jest.fn();
const mockAddNotification = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useTheme as jest.Mock).mockReturnValue({ colors: MOCK_COLORS });
  (useToast as jest.Mock).mockReturnValue({ showToast: mockShowToast });
  (useApp as jest.Mock).mockReturnValue({
    employees: [EMPLOYEE],
    goals: [],
    reviewEvidence: mockReviewEvidence,
    addNotification: mockAddNotification,
    notifications: [],
  });
});

describe('ReviewEvidence — empty state', () => {
  it('renders "Review Evidence" heading', () => {
    render(<ReviewEvidence {...makeProps()} />);
    expect(screen.getByTestId('header-title').props.children).toBe('Review Evidence');
  });

  it('shows "No pending submissions" when no submitted goals', () => {
    render(<ReviewEvidence {...makeProps()} />);
    expect(screen.getByText(/No pending submissions/)).toBeTruthy();
  });

  it('shows pending count in tab', () => {
    render(<ReviewEvidence {...makeProps()} />);
    expect(screen.getByText('Pending (0)')).toBeTruthy();
  });
});

describe('ReviewEvidence — with submitted goals', () => {
  beforeEach(() => {
    (useApp as jest.Mock).mockReturnValue({
      employees: [EMPLOYEE],
      goals: [makeSubmittedGoal()],
      reviewEvidence: mockReviewEvidence,
      addNotification: mockAddNotification,
      notifications: [],
    });
  });

  it('renders goal title', () => {
    render(<ReviewEvidence {...makeProps()} />);
    expect(screen.getByText('Submit Report')).toBeTruthy();
  });

  it('renders employee name', () => {
    render(<ReviewEvidence {...makeProps()} />);
    expect(screen.getByText('Alice Smith')).toBeTruthy();
  });

  it('shows evidence description', () => {
    render(<ReviewEvidence {...makeProps()} />);
    expect(screen.getByText('Done it')).toBeTruthy();
  });

  it('shows toast warning when approving without rating', () => {
    render(<ReviewEvidence {...makeProps()} />);
    fireEvent.press(screen.getByText('Approve'));
    expect(mockShowToast).toHaveBeenCalledWith(
      'Please set a star rating (1–5) before approving.',
      'warning',
      'Rating Required',
    );
  });

  it('shows toast warning when rejecting without feedback', () => {
    render(<ReviewEvidence {...makeProps()} />);
    fireEvent.press(screen.getByText('Reject'));
    expect(mockShowToast).toHaveBeenCalledWith(
      'Please provide feedback explaining why the evidence was rejected.',
      'warning',
      'Feedback Required',
    );
  });

  it('calls reviewEvidence when rating set and approve pressed', () => {
    render(<ReviewEvidence {...makeProps()} />);
    // Press first star (rating = 1)
    const stars = screen.getAllByText('★');
    fireEvent.press(stars[0]);
    fireEvent.press(screen.getByText('Approve'));
    expect(mockReviewEvidence).toHaveBeenCalledWith('g1', true, '', expect.any(Number), expect.any(Function));
  });

  it('calls reviewEvidence with feedback when reject pressed', () => {
    render(<ReviewEvidence {...makeProps()} />);
    fireEvent.changeText(
      screen.getByPlaceholderText(/feedback/i),
      'Needs improvement',
    );
    fireEvent.press(screen.getByText('Reject'));
    expect(mockReviewEvidence).toHaveBeenCalledWith('g1', false, 'Needs improvement', undefined, expect.any(Function));
  });
});

describe('ReviewEvidence — reviewed tab', () => {
  it('shows reviewed goals in reviewed tab', () => {
    (useApp as jest.Mock).mockReturnValue({
      employees: [EMPLOYEE],
      goals: [makeSubmittedGoal({ status: 'approved', evidence: {
        id: 'ev1', description: 'Done', links: [], submittedAt: '2026-03-01T00:00:00Z',
        status: 'approved', managerFeedback: 'Great job',
      }})],
      reviewEvidence: mockReviewEvidence,
      addNotification: mockAddNotification,
      notifications: [],
    });
    render(<ReviewEvidence {...makeProps()} />);
    fireEvent.press(screen.getAllByText(/Reviewed/)[0]);
    expect(screen.getByText('Submit Report')).toBeTruthy();
  });

  it('shows "No reviewed submissions" in reviewed tab when empty', () => {
    render(<ReviewEvidence {...makeProps()} />);
    fireEvent.press(screen.getByText(/Reviewed/));
    expect(screen.getByText('No reviewed submissions yet.')).toBeTruthy();
  });
});

describe('ReviewEvidence — attachments', () => {
  const goalWithAttachments = makeSubmittedGoal({
    evidence: {
      id: 'ev1', description: 'Done it', links: [],
      selfRating: 4, submittedAt: '2026-03-01T00:00:00Z', status: 'pending',
      attachments: [
        { name: 'report.pdf', uri: 'file://report.pdf', mimeType: 'application/pdf', size: 51200 },
        { name: 'screenshot.png', uri: 'file://screenshot.png', mimeType: 'image/png' },
      ],
    },
  });

  beforeEach(() => {
    (useApp as jest.Mock).mockReturnValue({
      employees: [EMPLOYEE],
      goals: [goalWithAttachments],
      reviewEvidence: mockReviewEvidence,
      addNotification: mockAddNotification,
      notifications: [],
    });
  });

  it('shows attachment section label with count', () => {
    render(<ReviewEvidence {...makeProps()} />);
    expect(screen.getByText('📎 Attachments (2)')).toBeTruthy();
  });

  it('shows each attachment file name', () => {
    render(<ReviewEvidence {...makeProps()} />);
    expect(screen.getByText('report.pdf')).toBeTruthy();
    expect(screen.getByText('screenshot.png')).toBeTruthy();
  });

  it('does not render attachment section when evidence has no attachments', () => {
    (useApp as jest.Mock).mockReturnValue({
      employees: [EMPLOYEE],
      goals: [makeSubmittedGoal()],
      reviewEvidence: mockReviewEvidence,
      addNotification: mockAddNotification,
      notifications: [],
    });
    render(<ReviewEvidence {...makeProps()} />);
    expect(screen.queryByText(/📎 Attachments/)).toBeNull();
  });

  it('shows single attachment label with count of 1', () => {
    (useApp as jest.Mock).mockReturnValue({
      employees: [EMPLOYEE],
      goals: [makeSubmittedGoal({
        evidence: {
          id: 'ev1', description: 'Done', links: [], selfRating: 3,
          submittedAt: '2026-03-01T00:00:00Z', status: 'pending',
          attachments: [{ name: 'only.pdf', uri: 'file://only.pdf', mimeType: 'application/pdf' }],
        },
      })],
      reviewEvidence: mockReviewEvidence,
      addNotification: mockAddNotification,
      notifications: [],
    });
    render(<ReviewEvidence {...makeProps()} />);
    expect(screen.getByText('📎 Attachments (1)')).toBeTruthy();
  });
});

describe('ReviewEvidence — aging badge', () => {
  it('shows aging badge for pending submissions older than 3 days', () => {
    (useApp as jest.Mock).mockReturnValue({
      employees: [EMPLOYEE],
      goals: [makeSubmittedGoal({
        evidence: {
          id: 'ev1', description: 'Done it', links: [], selfRating: 4,
          submittedAt: '2024-01-01T00:00:00Z',
          status: 'pending',
        },
      })],
      reviewEvidence: mockReviewEvidence,
      addNotification: mockAddNotification,
      notifications: [],
    });
    render(<ReviewEvidence {...makeProps()} />);
    expect(screen.getByText(/⏳ Pending \d+d — awaiting your review/)).toBeTruthy();
  });

  it('shows normal "Submitted" timestamp for recent submissions (under 3 days)', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    (useApp as jest.Mock).mockReturnValue({
      employees: [EMPLOYEE],
      goals: [makeSubmittedGoal({
        evidence: {
          id: 'ev1', description: 'Done it', links: [], selfRating: 4,
          submittedAt: oneHourAgo,
          status: 'pending',
        },
      })],
      reviewEvidence: mockReviewEvidence,
      addNotification: mockAddNotification,
      notifications: [],
    });
    render(<ReviewEvidence {...makeProps()} />);
    expect(screen.queryByText(/⏳ Pending/)).toBeNull();
  });
});

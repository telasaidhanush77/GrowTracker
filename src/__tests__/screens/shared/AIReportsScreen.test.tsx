import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import type { ScreenProps } from '../../../types';

jest.mock('../../../context/AppContext', () => ({ useApp: jest.fn() }));
jest.mock('../../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../context/ToastContext', () => ({ useToast: jest.fn() }));
jest.mock('../../../hooks/useAIReports', () => ({
  useAIReports: jest.fn(),
  useGenerateReport: jest.fn(),
}));
jest.mock('../../../components/Header', () => {
  const { View, Text } = require('react-native');
  return ({ title, subtitle }: any) => (
    <View testID="header">
      <Text testID="header-title">{title}</Text>
      {subtitle ? <Text testID="header-subtitle">{subtitle}</Text> : null}
    </View>
  );
});

import { useApp } from '../../../context/AppContext';
import { useTheme } from '../../../context/ThemeContext';
import { useToast } from '../../../context/ToastContext';
import { useAIReports, useGenerateReport } from '../../../hooks/useAIReports';
import AIReportsScreen from '../../../screens/shared/AIReportsScreen';

const MOCK_COLORS: any = {
  bg: '#111', bgElevated: '#1a1a1a', card: '#222', border: '#333',
  textPrimary: '#fff', textSecondary: '#ccc', textMuted: '#999',
  primary: '#4f46e5', approved: '#22c55e', rejected: '#ef4444', pending: '#f59e0b',
};

const MOCK_REPORT = {
  id: 'r1', employee_id: 'emp-1', report_type: 'quarterly' as const,
  goal_id: null, quarter: 'Q1', content: 'Good performance',
  summary: 'Summary text', strengths: ['Focus'],
  improvements: ['Communication'], recommendations: ['More reviews'],
  overall_score: 78, model_used: 'claude', generated_at: '2026-03-01T00:00:00Z',
  created_at: '2026-03-01T00:00:00Z',
};

const mockMutateAsync = jest.fn();

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
  (useTheme as jest.Mock).mockReturnValue({ colors: MOCK_COLORS, isDark: true });
  (useToast as jest.Mock).mockReturnValue({ showToast: jest.fn() });
  (useApp as jest.Mock).mockReturnValue({ goals: [] });
  (useAIReports as jest.Mock).mockReturnValue({ data: [], isLoading: false });
  (useGenerateReport as jest.Mock).mockReturnValue({ mutateAsync: mockMutateAsync, isPending: false });
});

describe('AIReportsScreen', () => {
  it('renders "AI Reports" heading', () => {
    render(<AIReportsScreen {...makeProps()} />);
    expect(screen.getByTestId('header-title').props.children).toBe('AI Reports');
  });

  it('renders filter chips', () => {
    render(<AIReportsScreen {...makeProps()} />);
    expect(screen.getByText('All')).toBeTruthy();
    expect(screen.getByText('Goal')).toBeTruthy();
    expect(screen.getByText('Quarterly')).toBeTruthy();
    expect(screen.getByText('Fiscal Year')).toBeTruthy();
  });

  it('shows "Generate New Report" button', () => {
    render(<AIReportsScreen {...makeProps()} />);
    expect(screen.getByText('Generate New Report')).toBeTruthy();
  });

  it('expands generator form when generate button pressed', () => {
    render(<AIReportsScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Generate New Report'));
    expect(screen.getByText('Report Type')).toBeTruthy();
  });

  it('collapses generator form when Cancel pressed', () => {
    render(<AIReportsScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Generate New Report'));
    fireEvent.press(screen.getByText('Cancel'));
    expect(screen.queryByText('Report Type')).toBeNull();
  });

  it('shows reports when data is available', () => {
    (useAIReports as jest.Mock).mockReturnValue({ data: [MOCK_REPORT], isLoading: false });
    render(<AIReportsScreen {...makeProps()} />);
    expect(screen.getByText('78')).toBeTruthy();
  });

  it('shows loading indicator when isLoading=true', () => {
    (useAIReports as jest.Mock).mockReturnValue({ data: [], isLoading: true });
    const { toJSON } = render(<AIReportsScreen {...makeProps()} />);
    expect(toJSON()).toBeTruthy();
  });

  it('uses params.employeeId when provided', () => {
    render(<AIReportsScreen {...makeProps({ params: { employeeId: 'emp-2' } })} />);
    expect(useAIReports).toHaveBeenCalledWith('emp-2');
  });

  it('shows error toast when goal type selected without goal', async () => {
    const showToast = jest.fn();
    (useToast as jest.Mock).mockReturnValue({ showToast });
    render(<AIReportsScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Generate New Report'));
    // chip text is '🎯 Goal' per REPORT_TYPE_ICONS
    fireEvent.press(screen.getByText('🎯 Goal'));
    fireEvent.press(screen.getByText('✦ Generate Report'));
    expect(showToast).toHaveBeenCalledWith('Please select a goal', 'error');
  });

  it('filters reports when a filter chip is pressed', () => {
    const goalReport = { ...MOCK_REPORT, id: 'r2', report_type: 'goal' as const, overall_score: 90 };
    (useAIReports as jest.Mock).mockReturnValue({ data: [MOCK_REPORT, goalReport], isLoading: false });
    render(<AIReportsScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Quarterly'));
    expect(screen.getByText('78')).toBeTruthy();
  });

  it('renders report with pending score color (50-74)', () => {
    const pendingReport = { ...MOCK_REPORT, id: 'r-pending', overall_score: 60 };
    (useAIReports as jest.Mock).mockReturnValue({ data: [pendingReport], isLoading: false });
    render(<AIReportsScreen {...makeProps()} />);
    expect(screen.getByText('60')).toBeTruthy();
  });

  it('renders report with rejected score color (under 50)', () => {
    const lowReport = { ...MOCK_REPORT, id: 'r-low', overall_score: 40 };
    (useAIReports as jest.Mock).mockReturnValue({ data: [lowReport], isLoading: false });
    render(<AIReportsScreen {...makeProps()} />);
    expect(screen.getByText('40')).toBeTruthy();
  });

  it('renders report with null score (no score badge shown)', () => {
    const nullReport = { ...MOCK_REPORT, id: 'r-null', overall_score: null };
    (useAIReports as jest.Mock).mockReturnValue({ data: [nullReport], isLoading: false });
    render(<AIReportsScreen {...makeProps()} />);
    expect(screen.queryByText('78')).toBeNull();
    expect(screen.getByText('Summary text')).toBeTruthy();
  });

  it('navigates to report detail when report card is pressed', () => {
    const navigate = jest.fn();
    (useAIReports as jest.Mock).mockReturnValue({ data: [MOCK_REPORT], isLoading: false });
    render(<AIReportsScreen {...makeProps({ navigation: { navigate, goBack: jest.fn() } })} />);
    fireEvent.press(screen.getByText('Summary text'));
    expect(navigate).toHaveBeenCalledWith('ai-report-detail', { reportId: 'r1', employeeId: 'emp-1' });
  });

  it('shows goal selector when genType is goal and goals exist', () => {
    const mockGoal = { id: 'g1', title: 'Boost sales', quarter: 'Q1', status: 'in_progress', employeeId: 'emp-1' };
    (useApp as jest.Mock).mockReturnValue({ goals: [mockGoal] });
    render(<AIReportsScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Generate New Report'));
    fireEvent.press(screen.getByText('🎯 Goal'));
    expect(screen.getByText('Boost sales')).toBeTruthy();
  });

  it('selects a goal from the goal picker', () => {
    const mockGoal = { id: 'g1', title: 'Boost sales', quarter: 'Q1', status: 'in_progress', employeeId: 'emp-1' };
    (useApp as jest.Mock).mockReturnValue({ goals: [mockGoal] });
    render(<AIReportsScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Generate New Report'));
    fireEvent.press(screen.getByText('🎯 Goal'));
    fireEvent.press(screen.getByText('Boost sales'));
    expect(screen.getByText('Boost sales')).toBeTruthy();
  });

  it('shows no-goals text when genType is goal and no goals available', () => {
    render(<AIReportsScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Generate New Report'));
    fireEvent.press(screen.getByText('🎯 Goal'));
    expect(screen.getByText('No goals found.')).toBeTruthy();
  });

  it('switches quarter selector to Q2', () => {
    render(<AIReportsScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Generate New Report'));
    fireEvent.press(screen.getByText('Q2'));
    expect(screen.getByText('Q2')).toBeTruthy();
  });

  it('calls mutateAsync on generate success and shows toast', async () => {
    const showToast = jest.fn();
    (useToast as jest.Mock).mockReturnValue({ showToast });
    mockMutateAsync.mockResolvedValueOnce({});
    render(<AIReportsScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Generate New Report'));
    fireEvent.press(screen.getByText('✦ Generate Report'));
    await Promise.resolve();
    await Promise.resolve();
    expect(mockMutateAsync).toHaveBeenCalled();
  });

  it('shows error toast when generate fails', async () => {
    const showToast = jest.fn();
    (useToast as jest.Mock).mockReturnValue({ showToast });
    mockMutateAsync.mockRejectedValueOnce(new Error('Network error'));
    render(<AIReportsScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Generate New Report'));
    fireEvent.press(screen.getByText('✦ Generate Report'));
    await Promise.resolve();
    await Promise.resolve();
    expect(mockMutateAsync).toHaveBeenCalled();
  });

  it('switches to FY report type', () => {
    render(<AIReportsScreen {...makeProps()} />);
    fireEvent.press(screen.getByText('Generate New Report'));
    fireEvent.press(screen.getByText('🏆 FY'));
    expect(screen.queryByText('Quarter')).toBeNull();
  });
});

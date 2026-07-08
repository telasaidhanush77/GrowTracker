import React from 'react';
import { render, screen, cleanup } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ScreenProps } from '../../../types';

jest.mock('../../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../lib/supabase', () => ({
  supabase: { from: jest.fn() },
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

import { useTheme } from '../../../context/ThemeContext';
import { supabase } from '../../../lib/supabase';
import AIReportDetailScreen from '../../../screens/shared/AIReportDetailScreen';

const MOCK_COLORS: any = {
  bg: '#111', bgElevated: '#1a1a1a', card: '#222', border: '#333',
  textPrimary: '#fff', textSecondary: '#ccc', textMuted: '#999',
  primary: '#4f46e5',
  approved: '#22c55e', rejected: '#ef4444', pending: '#f59e0b',
};

function buildChain(result: any) {
  const chain: any = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.single = jest.fn().mockResolvedValue(result);
  return chain;
}

const _clients: QueryClient[] = [];

afterEach(() => {
  cleanup();
  _clients.forEach(qc => qc.clear());
  _clients.length = 0;
});

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  _clients.push(qc);
  return ({ children }: any) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

function makeProps(overrides: Partial<ScreenProps> = {}): ScreenProps {
  return {
    navigation: { navigate: jest.fn(), goBack: jest.fn() },
    params: { reportId: 'r1' },
    currentUserId: 'emp-1',
    currentRole: 'employee',
    onLogout: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (useTheme as jest.Mock).mockReturnValue({ colors: MOCK_COLORS, isDark: true });
});

describe('AIReportDetailScreen', () => {
  it('shows loading state initially', () => {
    const chain = buildChain({ data: null, error: null });
    (supabase.from as jest.Mock).mockReturnValue(chain);
    const { toJSON } = render(
      <AIReportDetailScreen {...makeProps()} />,
      { wrapper: createWrapper() },
    );
    expect(toJSON()).toBeTruthy();
  });

  it('shows "Report not found" when no data returned', async () => {
    const chain = buildChain({ data: null, error: null });
    (supabase.from as jest.Mock).mockReturnValue(chain);
    render(
      <AIReportDetailScreen {...makeProps()} />,
      { wrapper: createWrapper() },
    );
    await screen.findByText('Report not found.');
    expect(screen.getByText('Report not found.')).toBeTruthy();
  });

  it('shows report content when data loaded', async () => {
    const REPORT = {
      id: 'r1', employee_id: 'emp-1', report_type: 'quarterly',
      goal_id: null, quarter: 'Q1', content: 'Detailed analysis here',
      summary: 'Good work overall', strengths: ['Communication'],
      improvements: ['Documentation'], recommendations: ['Read more'],
      overall_score: 82, model_used: 'claude',
      generated_at: '2026-03-01T00:00:00Z', created_at: '2026-03-01T00:00:00Z',
    };
    const chain = buildChain({ data: REPORT, error: null });
    (supabase.from as jest.Mock).mockReturnValue(chain);
    render(
      <AIReportDetailScreen {...makeProps()} />,
      { wrapper: createWrapper() },
    );
    await screen.findByText('82');
    expect(screen.getByText('82')).toBeTruthy();
    expect(screen.getByText('Good work overall')).toBeTruthy();
  });

  it('shows report not found when no reportId in params', async () => {
    const chain = buildChain({ data: null, error: null });
    (supabase.from as jest.Mock).mockReturnValue(chain);
    render(
      <AIReportDetailScreen {...makeProps({ params: {} })} />,
      { wrapper: createWrapper() },
    );
    await screen.findByText('Report not found.');
    expect(screen.getByText('Report not found.')).toBeTruthy();
  });

  it('shows Exceptional band for score >= 90', async () => {
    const chain = buildChain({
      data: {
        id: 'r2', employee_id: 'emp-1', report_type: 'quarterly', goal_id: null,
        quarter: 'Q1', content: 'Excellent', summary: 'Top performer',
        strengths: [], improvements: [], recommendations: [],
        overall_score: 92, model_used: 'claude',
        generated_at: '2026-03-01T00:00:00Z', created_at: '2026-03-01T00:00:00Z',
      },
      error: null,
    });
    (supabase.from as jest.Mock).mockReturnValue(chain);
    render(
      <AIReportDetailScreen {...makeProps({ params: { reportId: 'r2' } })} />,
      { wrapper: createWrapper() },
    );
    await screen.findByText('Exceptional');
    expect(screen.getByText('Exceptional')).toBeTruthy();
  });

  it('shows Meeting Expectations band for score 60-74 (pending color)', async () => {
    const chain = buildChain({
      data: {
        id: 'r3', employee_id: 'emp-1', report_type: 'quarterly', goal_id: null,
        quarter: 'Q2', content: 'Average', summary: 'Decent work',
        strengths: [], improvements: [], recommendations: [],
        overall_score: 65, model_used: 'claude',
        generated_at: '2026-03-01T00:00:00Z', created_at: '2026-03-01T00:00:00Z',
      },
      error: null,
    });
    (supabase.from as jest.Mock).mockReturnValue(chain);
    render(
      <AIReportDetailScreen {...makeProps({ params: { reportId: 'r3' } })} />,
      { wrapper: createWrapper() },
    );
    await screen.findByText('Meeting Expectations');
    expect(screen.getByText('Meeting Expectations')).toBeTruthy();
    expect(screen.getByText('65')).toBeTruthy();
  });

  it('shows Needs Improvement band for score 45-59', async () => {
    const chain = buildChain({
      data: {
        id: 'r4', employee_id: 'emp-1', report_type: 'quarterly', goal_id: null,
        quarter: 'Q1', content: 'Below par', summary: 'Needs work',
        strengths: [], improvements: [], recommendations: [],
        overall_score: 48, model_used: 'claude',
        generated_at: '2026-03-01T00:00:00Z', created_at: '2026-03-01T00:00:00Z',
      },
      error: null,
    });
    (supabase.from as jest.Mock).mockReturnValue(chain);
    render(
      <AIReportDetailScreen {...makeProps({ params: { reportId: 'r4' } })} />,
      { wrapper: createWrapper() },
    );
    await screen.findByText('Needs Improvement');
    expect(screen.getByText('Needs Improvement')).toBeTruthy();
  });

  it('shows At Risk band for score < 45', async () => {
    const chain = buildChain({
      data: {
        id: 'r5', employee_id: 'emp-1', report_type: 'quarterly', goal_id: null,
        quarter: 'Q2', content: 'Critical', summary: 'Requires urgent action',
        strengths: [], improvements: [], recommendations: [],
        overall_score: 30, model_used: 'claude',
        generated_at: '2026-03-01T00:00:00Z', created_at: '2026-03-01T00:00:00Z',
      },
      error: null,
    });
    (supabase.from as jest.Mock).mockReturnValue(chain);
    render(
      <AIReportDetailScreen {...makeProps({ params: { reportId: 'r5' } })} />,
      { wrapper: createWrapper() },
    );
    await screen.findByText('At Risk');
    expect(screen.getByText('At Risk')).toBeTruthy();
  });

  it('shows report not found when supabase returns an error', async () => {
    const chain = buildChain({ data: null, error: { message: 'Database error' } });
    (supabase.from as jest.Mock).mockReturnValue(chain);
    render(
      <AIReportDetailScreen {...makeProps()} />,
      { wrapper: createWrapper() },
    );
    await screen.findByText('Report not found.');
    expect(screen.getByText('Report not found.')).toBeTruthy();
  });
});

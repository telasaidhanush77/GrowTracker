import React from 'react';
import { renderHook, waitFor, act, cleanup } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAIReports, useGenerateReport, useTriggerCoaching } from '../../hooks/useAIReports';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    functions: { invoke: jest.fn() },
  },
}));

import { supabase } from '../../lib/supabase';

const _clients: QueryClient[] = [];

afterEach(() => {
  cleanup();
  _clients.forEach(qc => qc.clear());
  _clients.length = 0;
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  _clients.push(queryClient);
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return { Wrapper, queryClient };
}

function buildChain(result: { data?: any; error?: any }) {
  const chain: any = {};
  for (const m of ['select', 'eq', 'order', 'insert', 'update', 'delete', 'single', 'neq', 'in']) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  chain.then = (onFulfilled: any, onRejected: any) =>
    Promise.resolve(result).then(onFulfilled, onRejected);
  chain.catch = (fn: any) => Promise.resolve(result).catch(fn);
  (supabase.from as jest.Mock).mockReturnValue(chain);
  return chain;
}

const MOCK_REPORT = {
  id: 'r1',
  employee_id: 'emp-1',
  report_type: 'quarterly' as const,
  goal_id: null,
  quarter: 'Q1',
  content: 'Performance review content',
  summary: 'Good performance',
  strengths: ['Communication'],
  improvements: ['Time management'],
  recommendations: ['Take on more projects'],
  overall_score: 78,
  model_used: 'claude-opus',
  generated_at: '2026-03-01T00:00:00Z',
  created_at: '2026-03-01T00:00:00Z',
};

describe('useAIReports', () => {
  it('is disabled and returns empty array when employeeId is null', async () => {
    buildChain({ data: [], error: null });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAIReports(null), { wrapper: Wrapper });
    expect(result.current.data).toBeUndefined();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('fetches reports for a given employeeId', async () => {
    buildChain({ data: [MOCK_REPORT], error: null });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAIReports('emp-1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([MOCK_REPORT]);
  });

  it('returns empty array when data is null', async () => {
    buildChain({ data: null, error: null });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAIReports('emp-1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('enters error state when Supabase returns an error', async () => {
    buildChain({ data: null, error: { message: 'DB error' } });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAIReports('emp-1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useGenerateReport', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls supabase.functions.invoke with generate-report', async () => {
    const report = { ...MOCK_REPORT, id: 'r2' };
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: { ok: true, report },
      error: null,
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGenerateReport(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        employeeId: 'emp-1',
        reportType: 'quarterly',
        quarter: 'Q1',
      });
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-report', {
      body: { employeeId: 'emp-1', reportType: 'quarterly', quarter: 'Q1' },
    });
    expect(result.current.data).toEqual(report);
  });

  it('enters error state when invoke returns an error', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Function error' },
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGenerateReport(), { wrapper: Wrapper });

    await act(async () => {
      try { await result.current.mutateAsync({ employeeId: 'emp-1', reportType: 'goal' }); } catch {}
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('enters error state when ok is false', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: { ok: false, error: 'Generation failed' },
      error: null,
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGenerateReport(), { wrapper: Wrapper });

    await act(async () => {
      try { await result.current.mutateAsync({ employeeId: 'emp-1', reportType: 'goal' }); } catch {}
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useTriggerCoaching', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls supabase.functions.invoke with smart-coaching', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: { ok: true, sent: 3, employees_processed: 3 },
      error: null,
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTriggerCoaching(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ employeeId: 'emp-1' });
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith('smart-coaching', {
      body: { employeeId: 'emp-1' },
    });
    await waitFor(() => expect(result.current.data).toEqual({ ok: true, sent: 3, employees_processed: 3 }));
  });

  it('calls with empty params when no employeeId given', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: { ok: true, sent: 0, employees_processed: 0 },
      error: null,
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTriggerCoaching(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({});
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith('smart-coaching', { body: {} });
  });

  it('enters error state when invoke fails', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Coaching function error' },
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTriggerCoaching(), { wrapper: Wrapper });

    await act(async () => {
      try { await result.current.mutateAsync({}); } catch {}
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

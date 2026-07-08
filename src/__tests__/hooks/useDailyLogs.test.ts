import React from 'react';
import { renderHook, waitFor, act, cleanup } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDailyLogs, useSaveDailyLog } from '../../hooks/useDailyLogs';

jest.mock('../../lib/supabase', () => ({
  supabase: { from: jest.fn() },
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
  for (const m of ['select', 'order', 'eq', 'upsert', 'insert']) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  chain.single = jest.fn().mockResolvedValue(result);
  chain.then = (onFulfilled: any, onRejected: any) =>
    Promise.resolve(result).then(onFulfilled, onRejected);
  chain.catch = (fn: any) => Promise.resolve(result).catch(fn);
  (supabase.from as jest.Mock).mockReturnValue(chain);
  return chain;
}

const RAW_LOG = {
  id: 'log-1',
  employee_id: 'emp-1',
  date: '2026-06-19',
  tasks: [{ id: 'task-1', description: 'Wrote tests' }],
  notes: 'Good day',
  created_at: '2026-06-19T08:00:00Z',
  updated_at: '2026-06-19T17:00:00Z',
};

// ── useDailyLogs ───────────────────────────────────────────────

describe('useDailyLogs', () => {
  it('fetches and transforms daily logs', async () => {
    buildChain({ data: [RAW_LOG], error: null });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDailyLogs(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    const log = result.current.data![0];
    expect(log.id).toBe('log-1');
    expect(log.employeeId).toBe('emp-1');
    expect(log.date).toBe('2026-06-19');
    expect(log.tasks).toEqual([{ id: 'task-1', description: 'Wrote tests' }]);
    expect(log.notes).toBe('Good day');
  });

  it('returns empty array when data is null', async () => {
    buildChain({ data: null, error: null });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDailyLogs(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('sets notes to undefined when null in DB', async () => {
    buildChain({ data: [{ ...RAW_LOG, notes: null }], error: null });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDailyLogs(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data![0].notes).toBeUndefined();
  });

  it('propagates errors', async () => {
    buildChain({ data: null, error: { message: 'fetch failed' } });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDailyLogs(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ── useSaveDailyLog ────────────────────────────────────────────

describe('useSaveDailyLog', () => {
  it('inserts a new log and prepends it to the cache', async () => {
    const savedRow = { ...RAW_LOG, id: 'log-new' };
    const chain = buildChain({ data: savedRow, error: null });
    chain.upsert.mockReturnValue(chain);
    chain.select.mockReturnValue(chain);

    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(['dailyLogs'], []);

    const { result } = renderHook(() => useSaveDailyLog(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        employeeId: 'emp-1',
        date: '2026-06-19',
        tasks: [{ id: 'task-1', description: 'Wrote tests' }],
        notes: 'Good day',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<any[]>(['dailyLogs'])!;
    expect(cached).toHaveLength(1);
    expect(cached[0].id).toBe('log-new');
  });

  it('updates an existing log in the cache by id', async () => {
    const updatedRow = { ...RAW_LOG, notes: 'Updated notes' };
    const chain = buildChain({ data: updatedRow, error: null });
    chain.upsert.mockReturnValue(chain);
    chain.select.mockReturnValue(chain);

    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(['dailyLogs'], [
      { id: 'log-1', employeeId: 'emp-1', date: '2026-06-19', tasks: [], notes: 'Old notes', createdAt: '', updatedAt: '' },
    ]);

    const { result } = renderHook(() => useSaveDailyLog(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        employeeId: 'emp-1',
        date: '2026-06-19',
        tasks: [{ id: 'task-1', description: 'Wrote tests' }],
        notes: 'Updated notes',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<any[]>(['dailyLogs'])!;
    expect(cached).toHaveLength(1);
    expect(cached[0].notes).toBe('Updated notes');
  });

  it('works without optional notes', async () => {
    const chain = buildChain({ data: { ...RAW_LOG, notes: null }, error: null });
    chain.upsert.mockReturnValue(chain);
    chain.select.mockReturnValue(chain);

    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(['dailyLogs'], []);

    const { result } = renderHook(() => useSaveDailyLog(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ employeeId: 'emp-1', date: '2026-06-19', tasks: [] });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('throws on supabase error', async () => {
    buildChain({ data: null, error: { message: 'upsert failed' } });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSaveDailyLog(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ employeeId: 'emp-1', date: '2026-06-19', tasks: [] });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('upsert failed');
  });
});

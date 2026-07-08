import React from 'react';
import { renderHook, waitFor, act, cleanup } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGoals, useAddGoal, useUpdateGoal, useDeleteGoal, useSubmitEvidence, useReviewEvidence } from '../../hooks/useGoals';

jest.mock('../../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

import { supabase } from '../../lib/supabase';

// ── helpers ────────────────────────────────────────────────────

const _clients: QueryClient[] = [];

afterEach(() => {
  cleanup();
  _clients.forEach(qc => qc.clear());
  _clients.length = 0;
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  _clients.push(queryClient);
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return { Wrapper, queryClient };
}

function buildChain(result: { data?: any; error?: any }) {
  const chain: any = {};
  for (const m of ['select', 'order', 'eq', 'neq', 'insert', 'update', 'delete', 'upsert', 'in', 'gte']) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  chain.single = jest.fn().mockResolvedValue(result);
  // Make the chain directly awaitable (for queries without .single())
  chain.then = (onFulfilled: any, onRejected: any) =>
    Promise.resolve(result).then(onFulfilled, onRejected);
  chain.catch = (fn: any) => Promise.resolve(result).catch(fn);
  (supabase.from as jest.Mock).mockReturnValue(chain);
  return chain;
}

const RAW_GOAL_ROW = {
  id: 'goal-1',
  employee_id: 'emp-1',
  title: 'Build feature',
  description: 'Ship the thing',
  quarter: 'Q1',
  priority: 'high',
  category: 'technical',
  target_date: '2026-06-30',
  weight: 60,
  status: 'in_progress',
  manager_rating: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  evidence: null,
};

const RAW_GOAL_WITH_EVIDENCE = {
  ...RAW_GOAL_ROW,
  id: 'goal-2',
  status: 'submitted',
  evidence: {
    id: 'ev-1',
    description: 'I did it',
    links: ['https://example.com'],
    self_rating: 4,
    submitted_at: '2026-03-01T00:00:00Z',
    status: 'pending',
    manager_feedback: null,
    reviewed_at: null,
  },
};

// ── useGoals ───────────────────────────────────────────────────

describe('useGoals', () => {
  it('fetches and snake_case→camelCase transforms goals', async () => {
    buildChain({ data: [RAW_GOAL_ROW], error: null });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoals(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    const goal = result.current.data![0];
    expect(goal.id).toBe('goal-1');
    expect(goal.employeeId).toBe('emp-1');
    expect(goal.targetDate).toBe('2026-06-30');
    expect(goal.managerRating).toBeUndefined();
    expect(goal.evidence).toBeUndefined();
  });

  it('maps evidence rows correctly', async () => {
    buildChain({ data: [RAW_GOAL_WITH_EVIDENCE], error: null });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoals(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const goal = result.current.data![0];
    expect(goal.evidence).toMatchObject({
      id: 'ev-1',
      description: 'I did it',
      selfRating: 4,
      status: 'pending',
      managerFeedback: undefined,
    });
  });

  it('propagates supabase errors', async () => {
    buildChain({ data: null, error: { message: 'DB error' } });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoals(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('DB error');
  });

  it('returns empty array when data is null', async () => {
    // supabase returns null data with no error — edge case
    buildChain({ data: null, error: null });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoals(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

// ── useAddGoal ─────────────────────────────────────────────────

describe('useAddGoal', () => {
  it('inserts and prepends the new goal into the cache', async () => {
    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(['goals'], []);

    const inserted = { ...RAW_GOAL_ROW, id: 'goal-new' };
    const chain = buildChain({ data: inserted, error: null });
    // insert().select().single() — chain returns the same chain, then single() resolves
    chain.insert.mockReturnValue(chain);
    chain.select.mockReturnValue(chain);

    const { result } = renderHook(() => useAddGoal(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        employeeId: 'emp-1',
        title: 'Build feature',
        description: 'Ship the thing',
        quarter: 'Q1',
        priority: 'high',
        category: 'technical',
        targetDate: '2026-06-30',
        weight: 60,
        status: 'not_started',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<any[]>(['goals']);
    expect(cached).toHaveLength(1);
    expect(cached![0].id).toBe('goal-new');
  });

  it('throws on supabase error', async () => {
    buildChain({ data: null, error: { message: 'insert failed' } });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useAddGoal(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        employeeId: 'emp-1',
        title: 'X',
        description: '',
        quarter: 'Q1',
        priority: 'low',
        category: 'learning',
        targetDate: '2026-12-31',
        weight: 10,
        status: 'not_started',
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('insert failed');
  });
});

// ── useUpdateGoal ──────────────────────────────────────────────

describe('useUpdateGoal', () => {
  it('patches the matching goal in the cache', async () => {
    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(['goals'], [
      { id: 'goal-1', employeeId: 'emp-1', title: 'Old', status: 'in_progress', updatedAt: '2026-01-01T00:00:00Z' },
    ]);

    buildChain({ data: null, error: null });

    const { result } = renderHook(() => useUpdateGoal(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ goalId: 'goal-1', updates: { title: 'New' } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<any[]>(['goals']);
    expect(cached![0].title).toBe('New');
  });

  it('leaves other goals untouched', async () => {
    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(['goals'], [
      { id: 'goal-1', title: 'First', status: 'in_progress', updatedAt: '' },
      { id: 'goal-2', title: 'Second', status: 'approved', updatedAt: '' },
    ]);

    buildChain({ data: null, error: null });

    const { result } = renderHook(() => useUpdateGoal(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ goalId: 'goal-1', updates: { title: 'Updated' } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<any[]>(['goals']);
    expect(cached![1].title).toBe('Second');
  });

  it('throws on error', async () => {
    buildChain({ data: null, error: { message: 'update failed' } });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateGoal(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ goalId: 'goal-1', updates: { status: 'approved' } });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ── useDeleteGoal ──────────────────────────────────────────────

describe('useDeleteGoal', () => {
  it('removes the goal from the cache', async () => {
    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(['goals'], [
      { id: 'goal-1', title: 'Delete me' },
      { id: 'goal-2', title: 'Keep me' },
    ]);

    buildChain({ data: null, error: null });

    const { result } = renderHook(() => useDeleteGoal(), { wrapper: Wrapper });

    await act(async () => { result.current.mutate('goal-1'); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<any[]>(['goals']);
    expect(cached).toHaveLength(1);
    expect(cached![0].id).toBe('goal-2');
  });
});

// ── useSubmitEvidence ──────────────────────────────────────────

describe('useSubmitEvidence', () => {
  it('sets goal status to submitted in the cache', async () => {
    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(['goals'], [
      { id: 'goal-1', status: 'in_progress', evidence: undefined },
    ]);

    const evRow = {
      id: 'ev-1',
      description: 'Done',
      links: [],
      self_rating: null,
      submitted_at: '2026-04-01T00:00:00Z',
      status: 'pending',
    };

    let callCount = 0;
    (supabase.from as jest.Mock).mockImplementation(() => {
      callCount++;
      const c: any = {};
      for (const m of ['select', 'eq', 'update', 'upsert', 'delete', 'insert', 'order']) {
        c[m] = jest.fn().mockReturnValue(c);
      }
      if (callCount === 1) {
        // existence check: supabase.from('evidence').select().eq().maybeSingle()
        c.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      } else if (callCount === 2) {
        // evidence upsert: supabase.from('evidence').upsert().select().single()
        c.single = jest.fn().mockResolvedValue({ data: evRow, error: null });
      } else {
        // goal update — directly awaitable
        c.then = (onFulfilled: any) => Promise.resolve({ data: null, error: null }).then(onFulfilled);
        c.catch = (fn: any) => Promise.resolve({ data: null, error: null }).catch(fn);
      }
      return c;
    });

    const { result } = renderHook(() => useSubmitEvidence(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        goalId: 'goal-1',
        data: { description: 'Done', links: [], selfRating: 0, submittedAt: new Date().toISOString() },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<any[]>(['goals']);
    expect(cached![0].status).toBe('submitted');
    expect(cached![0].evidence).toBeDefined();
  });
});

// ── useReviewEvidence ──────────────────────────────────────────

describe('useReviewEvidence', () => {
  it('sets goal status to approved with manager rating', async () => {
    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(['goals'], [
      { id: 'goal-1', status: 'submitted', evidence: { id: 'ev-1', status: 'pending', description: 'x', links: [], submittedAt: '' } },
    ]);

    (supabase.from as jest.Mock).mockImplementation(() => {
      const c: any = {};
      for (const m of ['select', 'eq', 'update', 'insert', 'order']) {
        c[m] = jest.fn().mockReturnValue(c);
      }
      c.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      c.then = (onFulfilled: any) => Promise.resolve({ data: null, error: null }).then(onFulfilled);
      c.catch = (fn: any) => Promise.resolve({ data: null, error: null }).catch(fn);
      return c;
    });

    const { result } = renderHook(() => useReviewEvidence(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ goalId: 'goal-1', approved: true, feedback: 'Great work', managerRating: 5 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<any[]>(['goals']);
    expect(cached![0].status).toBe('approved');
    expect(cached![0].managerRating).toBe(5);
    expect(cached![0].evidence.status).toBe('approved');
    expect(cached![0].evidence.managerFeedback).toBe('Great work');
  });

  it('sets goal status to rejected', async () => {
    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(['goals'], [
      { id: 'goal-1', status: 'submitted', evidence: { id: 'ev-1', status: 'pending', description: '', links: [], submittedAt: '' } },
    ]);

    (supabase.from as jest.Mock).mockImplementation(() => {
      const c: any = {};
      for (const m of ['select', 'eq', 'update', 'insert', 'order']) {
        c[m] = jest.fn().mockReturnValue(c);
      }
      c.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      c.then = (onFulfilled: any) => Promise.resolve({ data: null, error: null }).then(onFulfilled);
      c.catch = (fn: any) => Promise.resolve({ data: null, error: null }).catch(fn);
      return c;
    });

    const { result } = renderHook(() => useReviewEvidence(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ goalId: 'goal-1', approved: false, feedback: 'Needs more detail' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<any[]>(['goals']);
    expect(cached![0].status).toBe('rejected');
    expect(cached![0].managerRating).toBeUndefined();
  });
});

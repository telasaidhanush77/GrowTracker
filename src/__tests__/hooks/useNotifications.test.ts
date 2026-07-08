import React from 'react';
import { renderHook, waitFor, act, cleanup } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useNotifications,
  useAddNotification,
  useMarkNotifRead,
  useMarkAllRead,
} from '../../hooks/useNotifications';

jest.mock('../../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));
import { supabase } from '../../lib/supabase';

// Track every QueryClient created per test so we can destroy() them in afterEach.
// destroy() cancels the internal GC timers that would otherwise keep the Jest
// worker alive after the suite finishes.
const _clients: QueryClient[] = [];

afterEach(() => {
  // Unmount all components first so TanStack can schedule any GC timers it needs
  // on unmount, then clear() cancels those timers before Jest tries to exit.
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
  for (const m of ['select', 'order', 'eq', 'insert', 'update', 'in']) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  chain.single = jest.fn().mockResolvedValue(result);
  chain.then = (onFulfilled: any, onRejected: any) =>
    Promise.resolve(result).then(onFulfilled, onRejected);
  chain.catch = (fn: any) => Promise.resolve(result).catch(fn);
  (supabase.from as jest.Mock).mockReturnValue(chain);
  return chain;
}

const RAW_NOTIF = {
  id: 'notif-1',
  recipient_id: 'emp-1',
  type: 'goal_assigned',
  title: 'New Goal',
  message: 'You have been assigned a goal',
  is_read: false,
  created_at: '2026-03-01T10:00:00Z',
  related_goal_id: 'goal-1',
  related_employee_id: null,
};

// ── useNotifications ───────────────────────────────────────────

describe('useNotifications', () => {
  it('fetches and transforms notifications', async () => {
    buildChain({ data: [RAW_NOTIF], error: null });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useNotifications(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    const n = result.current.data![0];
    expect(n.id).toBe('notif-1');
    expect(n.recipientId).toBe('emp-1');
    expect(n.read).toBe(false);
    expect(n.relatedGoalId).toBe('goal-1');
    expect(n.relatedEmployeeId).toBeUndefined();
  });

  it('returns empty array when data is null', async () => {
    buildChain({ data: null, error: null });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useNotifications(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('propagates fetch errors', async () => {
    buildChain({ data: null, error: { message: 'fetch failed' } });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useNotifications(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('fetch failed');
  });
});

// ── useAddNotification ─────────────────────────────────────────

describe('useAddNotification', () => {
  it('inserts and prepends the new notification into the cache', async () => {
    const inserted = { ...RAW_NOTIF, id: 'notif-new' };
    const chain = buildChain({ data: inserted, error: null });
    chain.insert.mockReturnValue(chain);

    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(['notifications'], []);

    const { result } = renderHook(() => useAddNotification(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        recipientId: 'emp-1',
        type: 'goal_assigned',
        title: 'New Goal',
        message: 'A goal was assigned',
        read: false,
        createdAt: new Date().toISOString(),
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<any[]>(['notifications']);
    expect(cached).toHaveLength(1);
    expect(cached![0].id).toBe('notif-new');
  });

  it('throws on supabase error', async () => {
    buildChain({ data: null, error: { message: 'insert failed' } });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAddNotification(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        recipientId: 'emp-1',
        type: 'goal_assigned',
        title: 'X',
        message: 'x',
        read: false,
        createdAt: '',
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('insert failed');
  });
});

// ── useMarkNotifRead ───────────────────────────────────────────

describe('useMarkNotifRead', () => {
  it('optimistically marks the target notification as read in onMutate', async () => {
    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(['notifications'], [
      { id: 'notif-1', read: false, recipientId: 'emp-1' },
      { id: 'notif-2', read: false, recipientId: 'emp-1' },
    ]);

    // Delay the DB response to ensure we can observe the optimistic update
    const chain: any = {};
    for (const m of ['select', 'eq', 'update']) {
      chain[m] = jest.fn().mockReturnValue(chain);
    }
    chain.then = (onFulfilled: any) =>
      new Promise(resolve => setTimeout(() => resolve({ data: null, error: null }), 50)).then(onFulfilled);
    chain.catch = (fn: any) => Promise.resolve().catch(fn);
    (supabase.from as jest.Mock).mockReturnValue(chain);

    const { result } = renderHook(() => useMarkNotifRead(), { wrapper: Wrapper });

    // Start mutation but don't await it
    act(() => { result.current.mutate('notif-1'); });

    // After onMutate runs, the cache should already be updated
    await waitFor(() => {
      const cached = queryClient.getQueryData<any[]>(['notifications'])!;
      return cached[0].read === true;
    });

    const cached = queryClient.getQueryData<any[]>(['notifications'])!;
    expect(cached[0].read).toBe(true);
    expect(cached[1].read).toBe(false); // other notif untouched
  });

  it('does not mark other notifications as read', async () => {
    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(['notifications'], [
      { id: 'notif-1', read: false },
      { id: 'notif-2', read: false },
    ]);

    buildChain({ data: null, error: null });

    const { result } = renderHook(() => useMarkNotifRead(), { wrapper: Wrapper });

    await act(async () => { result.current.mutate('notif-1'); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<any[]>(['notifications'])!;
    expect(cached[1].read).toBe(false);
  });
});

// ── useMarkAllRead ─────────────────────────────────────────────

describe('useMarkAllRead', () => {
  it('optimistically marks all notifications for the recipient as read', async () => {
    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(['notifications'], [
      { id: 'n1', recipientId: 'emp-1', read: false },
      { id: 'n2', recipientId: 'emp-1', read: false },
      { id: 'n3', recipientId: 'emp-2', read: false }, // different user
    ]);

    const chain: any = {};
    for (const m of ['select', 'eq', 'update']) {
      chain[m] = jest.fn().mockReturnValue(chain);
    }
    chain.then = (onFulfilled: any) =>
      new Promise(resolve => setTimeout(() => resolve({ data: null, error: null }), 50)).then(onFulfilled);
    chain.catch = (fn: any) => Promise.resolve().catch(fn);
    (supabase.from as jest.Mock).mockReturnValue(chain);

    const { result } = renderHook(() => useMarkAllRead(), { wrapper: Wrapper });

    act(() => { result.current.mutate('emp-1'); });

    await waitFor(() => {
      const cached = queryClient.getQueryData<any[]>(['notifications'])!;
      return cached[0].read === true && cached[1].read === true;
    });

    const cached = queryClient.getQueryData<any[]>(['notifications'])!;
    expect(cached[0].read).toBe(true);
    expect(cached[1].read).toBe(true);
    expect(cached[2].read).toBe(false); // emp-2's notification untouched
  });

  it('throws on error', async () => {
    buildChain({ data: null, error: { message: 'update failed' } });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useMarkAllRead(), { wrapper: Wrapper });

    await act(async () => { result.current.mutate('emp-1'); });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

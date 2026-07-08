import React from 'react';
import { renderHook, waitFor, cleanup } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProfiles, useProfile } from '../../hooks/useProfiles';

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
  for (const m of ['select', 'order', 'eq']) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  chain.single = jest.fn().mockResolvedValue(result);
  chain.then = (onFulfilled: any, onRejected: any) =>
    Promise.resolve(result).then(onFulfilled, onRejected);
  chain.catch = (fn: any) => Promise.resolve(result).catch(fn);
  (supabase.from as jest.Mock).mockReturnValue(chain);
  return chain;
}

const RAW_PROFILE = {
  id: 'emp-1',
  employee_code: 'EMP001',
  first_name: 'Alice',
  last_name: 'Smith',
  email: 'alice@example.com',
  username: 'alicesmith',
  mobile: '+1234567890',
  role: 'employee',
  department: 'Engineering',
  designation: 'Software Engineer',
  manager_id: 'mgr-1',
  join_date: '2024-01-15',
  status: 'active',
  avatar_initials: 'AS',
  created_at: '2024-01-15T00:00:00Z',
};

// ── useProfiles ────────────────────────────────────────────────

describe('useProfiles', () => {
  it('fetches and transforms profile list', async () => {
    buildChain({ data: [RAW_PROFILE], error: null });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useProfiles(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    const user = result.current.data![0];
    expect(user.id).toBe('emp-1');
    expect(user.firstName).toBe('Alice');
    expect(user.lastName).toBe('Smith');
    expect(user.name).toBe('Alice Smith');
    expect(user.role).toBe('employee');
    expect(user.managerId).toBe('mgr-1');
    expect(user.avatarInitials).toBe('AS');
    expect(user.passwordHash).toBe('');
  });

  it('maps optional mobile field correctly', async () => {
    buildChain({ data: [{ ...RAW_PROFILE, mobile: null }], error: null });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useProfiles(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data![0].mobile).toBeUndefined();
  });

  it('returns empty array when data is null', async () => {
    buildChain({ data: null, error: null });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useProfiles(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('propagates errors', async () => {
    buildChain({ data: null, error: { message: 'access denied' } });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useProfiles(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('access denied');
  });
});

// ── useProfile ─────────────────────────────────────────────────

describe('useProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches a single profile by id', async () => {
    const chain = buildChain({ data: RAW_PROFILE, error: null });
    chain.eq.mockReturnValue(chain);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useProfile('emp-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.id).toBe('emp-1');
    expect(result.current.data?.name).toBe('Alice Smith');
  });

  it('is disabled and never fetches when id is null', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useProfile(null), { wrapper: Wrapper });

    // Should stay idle — query is disabled
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('propagates fetch errors', async () => {
    const chain = buildChain({ data: null, error: { message: 'not found' } });
    chain.eq.mockReturnValue(chain);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useProfile('missing'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('not found');
  });
});

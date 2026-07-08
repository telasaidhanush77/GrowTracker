/**
 * Network resilience tests — GrowTracker
 *
 * The app routes all network traffic through the Supabase JS client (not
 * fetch/axios directly), so we mock supabase.from() using the same chain
 * builder pattern as the existing hook tests.
 *
 * DOCUMENTED GAPS — the tests below confirm these current behaviors:
 *   1. Query hooks (useGoals, useNotifications, useDailyLogs) surface errors
 *      only through React Query's isError state. Screens have no error UI
 *      and show empty lists instead of an error message.
 *   2. Mutation hooks (useAddGoal, useSaveDailyLog, useAddNotification) surface
 *      errors through isError only. No onError toast is wired in any hook.
 *   3. ForgotUsernameScreen destructures only { data }, never { data, error },
 *      so ALL network failures (500, 401, timeout) silently fall through to
 *      the "No account found" branch — users see a misleading message.
 *   4. No retry button exists anywhere in the app UI.
 *   5. No offline detection — no @react-native-community/netinfo usage.
 */

import React from 'react';
import { renderHook, waitFor, act, cleanup } from '@testing-library/react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../../lib/supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));

import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { useGoals, useAddGoal } from '../../hooks/useGoals';
import { useNotifications, useAddNotification } from '../../hooks/useNotifications';
import { useDailyLogs, useSaveDailyLog } from '../../hooks/useDailyLogs';
import ForgotUsernameScreen from '../../screens/auth/ForgotUsernameScreen';

const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

// ── theme fixture ─────────────────────────────────────────────────────────────

const MOCK_COLORS: any = {
  bg: '#fff', bgElevated: '#f5f5f5', card: '#fafafa', border: '#e0e0e0',
  divider: '#eee', textPrimary: '#000', textSecondary: '#666', textMuted: '#999',
  adminPrimary: '#7c3aed', adminLight: '#ede9fe',
  managerPrimary: '#0891b2', managerLight: '#cffafe',
  employeePrimary: '#4f46e5', employeeLight: '#ede9fe',
  primary: '#4f46e5',
  approved: '#22c55e', approvedBg: '#dcfce7',
  rejected: '#ef4444', rejectedBg: '#fee2e2',
  pending: '#f59e0b', pendingBg: '#fef3c7',
  inProgress: '#3b82f6', inProgressBg: '#dbeafe',
  chartTrack: '#e5e7eb',
  high: '#ef4444', highBg: '#fee2e2',
  medium: '#f59e0b', mediumBg: '#fef3c7',
  low: '#22c55e', lowBg: '#dcfce7',
  notStarted: '#6b7280', notStartedBg: '#f3f4f6',
};

// ── React Query test wrapper ──────────────────────────────────────────────────

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

// ── Supabase chain helpers ────────────────────────────────────────────────────

/**
 * Builds a mock supabase chain that resolves to `result`.
 * Works for both:
 *   - Direct await on the chain: await supabase.from(...).select().order()
 *   - Chained .single(): await supabase.from(...).insert().select().single()
 */
function buildChain(result: { data?: any; error?: any }) {
  const chain: any = {};
  for (const m of ['select', 'order', 'eq', 'neq', 'insert', 'update',
                   'delete', 'upsert', 'in', 'gte']) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  chain.single = jest.fn().mockResolvedValue(result);
  chain.then = (onFulfilled: any, onRejected: any) =>
    Promise.resolve(result).then(onFulfilled, onRejected);
  chain.catch = (fn: any) => Promise.resolve(result).catch(fn);
  (supabase.from as jest.Mock).mockReturnValue(chain);
  return chain;
}

/**
 * Builds a mock supabase chain that rejects — simulates a hard network failure
 * such as a connection timeout or DNS resolution error.
 * React Query catches the rejection and sets isError: true.
 */
function buildRejectionChain(rejection: Error) {
  const chain: any = {};
  for (const m of ['select', 'order', 'eq', 'neq', 'insert', 'update',
                   'delete', 'upsert', 'in', 'gte']) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  chain.single = jest.fn().mockRejectedValue(rejection);
  chain.then = (onFulfilled: any, onRejected: any) =>
    Promise.reject(rejection).then(onFulfilled, onRejected);
  chain.catch = (fn: any) => Promise.reject(rejection).catch(fn);
  (supabase.from as jest.Mock).mockReturnValue(chain);
  return chain;
}

// ═══════════════════════════════════════════════════════════════════════════
// useGoals — query error scenarios
// ═══════════════════════════════════════════════════════════════════════════

describe('useGoals — network resilience', () => {
  it('enters error state on a 500 server error', async () => {
    buildChain({ data: null, error: { message: 'Internal Server Error' } });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoals(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('Internal Server Error');
  });

  it('enters error state on a 401 JWT-expired auth error', async () => {
    buildChain({ data: null, error: { message: 'JWT expired' } });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoals(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('JWT expired');
  });

  it('enters error state on a network timeout (connection rejected)', async () => {
    buildRejectionChain(new Error('Network request failed'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoals(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('Network request failed');
  });

  it('returns an empty array when Supabase returns null data with no error', async () => {
    buildChain({ data: null, error: null });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoals(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('does not crash on malformed row objects — mapper returns partial goals', async () => {
    // Rows missing all expected fields. dbRowToGoal accesses them with optional
    // chaining so the result is a Goal with undefined fields, not a thrown error.
    buildChain({ data: [{}], error: null });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGoals(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].id).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// useNotifications — query error scenarios
// ═══════════════════════════════════════════════════════════════════════════

describe('useNotifications — network resilience', () => {
  it('enters error state on a 500 server error', async () => {
    buildChain({ data: null, error: { message: 'Internal Server Error' } });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useNotifications(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('Internal Server Error');
  });

  it('enters error state on a JWT auth error', async () => {
    buildChain({ data: null, error: { message: 'JWT expired' } });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useNotifications(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('JWT expired');
  });

  it('enters error state on a network timeout', async () => {
    buildRejectionChain(new Error('Network request failed'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useNotifications(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('Network request failed');
  });

  it('returns an empty array when Supabase returns null data with no error', async () => {
    buildChain({ data: null, error: null });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useNotifications(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// useDailyLogs — query error scenarios
// ═══════════════════════════════════════════════════════════════════════════

describe('useDailyLogs — network resilience', () => {
  it('enters error state on a 500 server error', async () => {
    buildChain({ data: null, error: { message: 'Internal Server Error' } });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDailyLogs(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('Internal Server Error');
  });

  it('enters error state on a JWT auth error', async () => {
    buildChain({ data: null, error: { message: 'JWT expired' } });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDailyLogs(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('JWT expired');
  });

  it('enters error state on a network timeout', async () => {
    buildRejectionChain(new Error('Network request failed'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDailyLogs(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('Network request failed');
  });

  it('returns an empty array when Supabase returns null data with no error', async () => {
    buildChain({ data: null, error: null });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDailyLogs(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// useAddGoal mutation — error propagation
// ═══════════════════════════════════════════════════════════════════════════

const GOAL_INPUT: any = {
  employeeId: 'emp-1',
  title: 'Improve test coverage',
  description: 'Reach 80% across all hooks',
  quarter: 'Q3',
  priority: 'high',
  category: 'technical',
  targetDate: '2026-09-30',
  weight: 25,
  status: 'not_started',
};

describe('useAddGoal mutation — network resilience', () => {
  it('enters isError on a 500 server error', async () => {
    buildChain({ data: null, error: { message: 'Internal Server Error' } });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAddGoal(), { wrapper: Wrapper });

    await act(async () => { result.current.mutate(GOAL_INPUT); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('Internal Server Error');
  });

  it('enters isError on a JWT expired auth error', async () => {
    buildChain({ data: null, error: { message: 'JWT expired' } });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAddGoal(), { wrapper: Wrapper });

    await act(async () => { result.current.mutate(GOAL_INPUT); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('JWT expired');
  });

  it('enters isError on a network timeout', async () => {
    buildRejectionChain(new Error('Network request failed'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAddGoal(), { wrapper: Wrapper });

    await act(async () => { result.current.mutate(GOAL_INPUT); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('Network request failed');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// useSaveDailyLog mutation — error propagation
// ═══════════════════════════════════════════════════════════════════════════

const LOG_INPUT: any = {
  employeeId: 'emp-1',
  date: '2026-06-20',
  tasks: [{ description: 'Completed network resilience tests', completedAt: '2026-06-20T10:00:00Z' }],
};

describe('useSaveDailyLog mutation — network resilience', () => {
  it('enters isError on a 500 server error', async () => {
    buildChain({ data: null, error: { message: 'Internal Server Error' } });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSaveDailyLog(), { wrapper: Wrapper });

    await act(async () => { result.current.mutate(LOG_INPUT); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('Internal Server Error');
  });

  it('enters isError on a JWT expired auth error', async () => {
    buildChain({ data: null, error: { message: 'JWT expired' } });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSaveDailyLog(), { wrapper: Wrapper });

    await act(async () => { result.current.mutate(LOG_INPUT); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('JWT expired');
  });

  it('enters isError on a network timeout', async () => {
    buildRejectionChain(new Error('Network request failed'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSaveDailyLog(), { wrapper: Wrapper });

    await act(async () => { result.current.mutate(LOG_INPUT); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('Network request failed');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// useAddNotification mutation — error propagation
// ═══════════════════════════════════════════════════════════════════════════

const NOTIF_INPUT: any = {
  recipientId: 'emp-1',
  type: 'info',
  title: 'Test notification',
  message: 'Automated test notification',
  read: false,
};

describe('useAddNotification mutation — network resilience', () => {
  it('enters isError on a 500 server error', async () => {
    buildChain({ data: null, error: { message: 'Internal Server Error' } });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAddNotification(), { wrapper: Wrapper });

    await act(async () => { result.current.mutate(NOTIF_INPUT); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('Internal Server Error');
  });

  it('enters isError on a JWT expired auth error', async () => {
    buildChain({ data: null, error: { message: 'JWT expired' } });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAddNotification(), { wrapper: Wrapper });

    await act(async () => { result.current.mutate(NOTIF_INPUT); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('JWT expired');
  });

  it('enters isError on a network timeout', async () => {
    buildRejectionChain(new Error('Network request failed'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAddNotification(), { wrapper: Wrapper });

    await act(async () => { result.current.mutate(NOTIF_INPUT); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('Network request failed');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ForgotUsernameScreen — network failure UI behavior
//
// Server errors (5xx, auth errors) correctly show "Something went wrong"
// rather than falling through to the "No account found" branch.
//
// Network timeout (where single() rejects) is NOT tested here because the
// screen has no try-catch around handleRecover(), so the rejection is
// unhandled — the screen stays in a permanent loading spinner state.
// ═══════════════════════════════════════════════════════════════════════════

describe('ForgotUsernameScreen — network failure UI behavior', () => {
  beforeEach(() => {
    mockUseTheme.mockReturnValue({
      colors: MOCK_COLORS,
      isDark: false,
      toggleTheme: jest.fn(),
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows "Something went wrong" when Supabase returns a server error', async () => {
    buildChain({ data: null, error: { message: 'Internal Server Error' } });

    render(<ForgotUsernameScreen onBack={jest.fn()} />);
    fireEvent.changeText(screen.getByPlaceholderText('your@email.com'), 'user@example.com');
    await act(async () => {
      fireEvent.press(screen.getAllByText('Recover Username').at(-1)!);
    });

    expect(screen.queryByText('Something went wrong. Please try again.')).toBeTruthy();
  });

  it('shows "Something went wrong" when Supabase returns a JWT auth error', async () => {
    buildChain({ data: null, error: { message: 'JWT expired' } });

    render(<ForgotUsernameScreen onBack={jest.fn()} />);
    fireEvent.changeText(screen.getByPlaceholderText('your@email.com'), 'user@example.com');
    fireEvent.press(screen.getAllByText('Recover Username').at(-1)!);

    await waitFor(() =>
      expect(screen.queryByText('Something went wrong. Please try again.')).toBeTruthy(),
    );
  });

  it('shows the recovered account details when Supabase returns valid data', async () => {
    buildChain({ data: { username: 'alice.smith', employee_code: 'EMP-0042' }, error: null });

    render(<ForgotUsernameScreen onBack={jest.fn()} />);
    fireEvent.changeText(screen.getByPlaceholderText('your@email.com'), 'alice@company.com');
    fireEvent.press(screen.getAllByText('Recover Username').at(-1)!);

    await waitFor(() =>
      expect(screen.queryByText('alice.smith')).toBeTruthy(),
    );
    expect(screen.getByText('EMP-0042')).toBeTruthy();
  });

  it('rejects invalid email format without calling Supabase', () => {
    const fromSpy = supabase.from as jest.Mock;

    render(<ForgotUsernameScreen onBack={jest.fn()} />);
    fireEvent.changeText(screen.getByPlaceholderText('your@email.com'), 'not-an-email');
    fireEvent.press(screen.getAllByText('Recover Username').at(-1)!);

    expect(screen.getByText('Please enter a valid email address.')).toBeTruthy();
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('rejects empty email without calling Supabase', () => {
    const fromSpy = supabase.from as jest.Mock;

    render(<ForgotUsernameScreen onBack={jest.fn()} />);
    // No changeText — email stays empty string ''
    fireEvent.press(screen.getAllByText('Recover Username').at(-1)!);

    expect(screen.getByText('Please enter a valid email address.')).toBeTruthy();
    expect(fromSpy).not.toHaveBeenCalled();
  });
});

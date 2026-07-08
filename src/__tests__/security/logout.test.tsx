/**
 * Security: Logout Clears All Session State
 *
 * logout() must:
 *   1. Call supabase.auth.signOut() — wipes the JWT from Supabase's internal state
 *      and AsyncStorage via its storage adapter.
 *   2. Call queryClient.clear() — wipes cached user/goal/log data from AsyncStorage.
 *   3. Clear React state (currentUser, session, users, isAuthenticated) via
 *      the onAuthStateChange('SIGNED_OUT') listener that Supabase fires.
 */

import React from 'react';
import { Text } from 'react-native';
import { render, screen, act, waitFor } from '@testing-library/react-native';

// ── Mocks ─────────────────────────────────────────────────────────────────────
//
// IMPORTANT: jest.mock factories must NOT reference outer-scope `const`/`let`
// variables declared in the same file. Babel hoists jest.mock() calls above
// those declarations, so outer variables may be `undefined` at factory call
// time (or in TDZ for `const`). Use `jest.fn()` directly inside the factory,
// then obtain references by importing the mocked module below.

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('../../lib/queryClient', () => ({
  // jest.fn() is a safe factory-internal call — no outer variable references.
  queryClient: { clear: jest.fn(), invalidateQueries: jest.fn() },
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession:            jest.fn(),
      onAuthStateChange:     jest.fn(),
      signOut:               jest.fn(),
      signInWithPassword:    jest.fn(),
      signUp:                jest.fn(),
      resetPasswordForEmail: jest.fn(),
      verifyOtp:             jest.fn(),
      updateUser:            jest.fn(),
    },
    from: jest.fn(),
    rpc:  jest.fn(),
  },
}));

// Import mocked modules AFTER the jest.mock() calls so we get the mock instances.
import { supabase } from '../../lib/supabase';
import { queryClient } from '../../lib/queryClient';
import { AuthProvider, useAuth } from '../../context/AuthContext';

// ── Typed mock references ─────────────────────────────────────────────────────

const mockGetSession         = supabase.auth.getSession         as jest.Mock;
const mockOnAuthStateChange  = supabase.auth.onAuthStateChange  as jest.Mock;
const mockSignOut            = supabase.auth.signOut            as jest.Mock;
const mockFrom               = supabase.from                    as jest.Mock;
const mockClear              = queryClient.clear                as jest.Mock;

// ── Sample data ───────────────────────────────────────────────────────────────

const MOCK_SESSION = {
  user: { id: 'u-1' },
  access_token:  'test-access-token',
  refresh_token: 'test-refresh-token',
};

const MOCK_PROFILE = {
  id:              'u-1',
  employee_code:   'EMP-001',
  first_name:      'Alice',
  last_name:       'Brown',
  email:           'alice@test.com',
  username:        'alice.brown',
  role:            'employee',
  department:      'Engineering',
  designation:     'Engineer',
  avatar_initials: 'AB',
  mobile:          null,
  manager_id:      null,
  join_date:       '2026-01-01',
  status:          'active',
  created_at:      '2026-01-01T00:00:00Z',
};

// ── Helper component ──────────────────────────────────────────────────────────

/** Exposes auth state as testID text nodes for straightforward assertion. */
function AuthDisplay() {
  const { currentUser, session, users, isAuthenticated, logout } = useAuth();
  return (
    <>
      <Text testID="user">{currentUser?.email ?? 'null'}</Text>
      <Text testID="session">{session ? 'active' : 'null'}</Text>
      <Text testID="user-count">{String(users.length)}</Text>
      <Text testID="is-authenticated">{String(isAuthenticated)}</Text>
      <Text testID="logout-btn" onPress={() => { logout().catch(() => {}); }}>
        Logout
      </Text>
    </>
  );
}

// ── Setup helpers ─────────────────────────────────────────────────────────────

/**
 * Configures mocks for an unauthenticated start state.
 * signOut calls the stored onAuthStateChange callback with SIGNED_OUT.
 */
function setupUnauthenticated() {
  mockGetSession.mockResolvedValue({ data: { session: null } });
  mockOnAuthStateChange.mockImplementation(() => ({
    data: { subscription: { unsubscribe: jest.fn() } },
  }));
  mockSignOut.mockImplementation(async () => {
    // Simulate Supabase firing the auth-state listener after sign-out.
    const cb = mockOnAuthStateChange.mock.calls[0]?.[0];
    if (cb) cb('SIGNED_OUT', null);
    return { error: null };
  });
}

/**
 * Configures mocks for a fully logged-in state.
 * loadProfile + loadAllVisibleUsers both query supabase.from().
 */
function setupLoggedIn() {
  mockGetSession.mockResolvedValue({ data: { session: MOCK_SESSION } });

  let fromCallCount = 0;
  mockFrom.mockImplementation(() => {
    fromCallCount++;

    if (fromCallCount === 1) {
      // loadProfile: supabase.from('profiles').select('*').eq('id', userId).single()
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: MOCK_PROFILE, error: null }),
          }),
        }),
      };
    }

    // loadAllVisibleUsers: supabase.from('profiles').select('*')[.in()|.or()] — awaitable
    const chain: any = {};
    const resolved = { data: [MOCK_PROFILE], error: null };
    chain.then = (onFulfilled: any) => Promise.resolve(resolved).then(onFulfilled);
    chain.catch = (fn: any) => Promise.resolve(resolved).catch(fn);
    chain.select = jest.fn().mockReturnValue(chain);
    chain.in = jest.fn().mockReturnValue(chain);
    chain.or = jest.fn().mockReturnValue(chain);
    chain.eq = jest.fn().mockReturnValue(chain);
    return chain;
  });

  mockOnAuthStateChange.mockImplementation(() => ({
    data: { subscription: { unsubscribe: jest.fn() } },
  }));

  mockSignOut.mockImplementation(async () => {
    const cb = mockOnAuthStateChange.mock.calls[0]?.[0];
    if (cb) cb('SIGNED_OUT', null);
    return { error: null };
  });
}

// ── Global test setup ─────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests: supabase.auth.signOut() ────────────────────────────────────────────

describe('logout() — supabase.auth.signOut()', () => {
  it('calls supabase.auth.signOut() exactly once', async () => {
    setupUnauthenticated();

    let logoutFn: (() => Promise<void>) | undefined;
    function Capture() {
      const { logout } = useAuth();
      logoutFn = logout;
      return null;
    }

    render(<AuthProvider><Capture /></AuthProvider>);
    await waitFor(() => expect(logoutFn).toBeDefined());

    await act(async () => { await logoutFn!(); });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('passes no unexpected arguments to signOut', async () => {
    setupUnauthenticated();

    let logoutFn: (() => Promise<void>) | undefined;
    function Capture() {
      const { logout } = useAuth();
      logoutFn = logout;
      return null;
    }

    render(<AuthProvider><Capture /></AuthProvider>);
    await waitFor(() => expect(logoutFn).toBeDefined());
    await act(async () => { await logoutFn!(); });

    // signOut() should be called with no args (not with scope or other params)
    expect(mockSignOut).toHaveBeenCalledWith();
  });
});

// ── Tests: React Query cache cleared ─────────────────────────────────────────

describe('logout() — React Query cache', () => {
  it('calls queryClient.clear() on logout', async () => {
    setupUnauthenticated();

    let logoutFn: (() => Promise<void>) | undefined;
    function Capture() {
      const { logout } = useAuth();
      logoutFn = logout;
      return null;
    }

    render(<AuthProvider><Capture /></AuthProvider>);
    await waitFor(() => expect(logoutFn).toBeDefined());
    await act(async () => { await logoutFn!(); });

    expect(mockClear).toHaveBeenCalledTimes(1);
  });

  it('calls queryClient.clear() AFTER signOut completes', async () => {
    setupUnauthenticated();

    const callOrder: string[] = [];
    mockSignOut.mockImplementation(async () => {
      callOrder.push('signOut');
      const cb = mockOnAuthStateChange.mock.calls[0]?.[0];
      if (cb) cb('SIGNED_OUT', null);
      return { error: null };
    });
    mockClear.mockImplementation(() => { callOrder.push('clear'); });

    let logoutFn: (() => Promise<void>) | undefined;
    function Capture() {
      const { logout } = useAuth();
      logoutFn = logout;
      return null;
    }

    render(<AuthProvider><Capture /></AuthProvider>);
    await waitFor(() => expect(logoutFn).toBeDefined());
    await act(async () => { await logoutFn!(); });

    expect(callOrder).toEqual(['signOut', 'clear']);
  });

  it('does NOT call queryClient.clear() when signOut is not called', () => {
    setupUnauthenticated();
    // Simply rendering the provider should not clear the cache
    render(<AuthProvider><Text>noop</Text></AuthProvider>);
    expect(mockClear).not.toHaveBeenCalled();
  });
});

// ── Tests: React state after logout ──────────────────────────────────────────

describe('logout() — React state cleared', () => {
  it('currentUser becomes null after logout', async () => {
    setupLoggedIn();

    render(<AuthProvider><AuthDisplay /></AuthProvider>);
    await waitFor(() =>
      expect(screen.getByTestId('user').props.children).toBe('alice@test.com'),
    );

    await act(async () => { screen.getByTestId('logout-btn').props.onPress(); });

    await waitFor(() =>
      expect(screen.getByTestId('user').props.children).toBe('null'),
    );
  });

  it('session becomes null after logout', async () => {
    setupLoggedIn();

    render(<AuthProvider><AuthDisplay /></AuthProvider>);
    await waitFor(() =>
      expect(screen.getByTestId('session').props.children).toBe('active'),
    );

    await act(async () => { screen.getByTestId('logout-btn').props.onPress(); });

    await waitFor(() =>
      expect(screen.getByTestId('session').props.children).toBe('null'),
    );
  });

  it('users array empties after logout', async () => {
    setupLoggedIn();

    render(<AuthProvider><AuthDisplay /></AuthProvider>);
    await waitFor(() =>
      expect(screen.getByTestId('user-count').props.children).toBe('1'),
    );

    await act(async () => { screen.getByTestId('logout-btn').props.onPress(); });

    await waitFor(() =>
      expect(screen.getByTestId('user-count').props.children).toBe('0'),
    );
  });

  it('isAuthenticated is false after logout', async () => {
    setupLoggedIn();

    render(<AuthProvider><AuthDisplay /></AuthProvider>);
    await waitFor(() =>
      expect(screen.getByTestId('is-authenticated').props.children).toBe('true'),
    );

    await act(async () => { screen.getByTestId('logout-btn').props.onPress(); });

    await waitFor(() =>
      expect(screen.getByTestId('is-authenticated').props.children).toBe('false'),
    );
  });
});

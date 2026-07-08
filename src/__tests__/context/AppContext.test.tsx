import React from 'react';
import { render, act } from '@testing-library/react-native';
import type { Goal, Employee } from '../../types';

// ── mutable state the mocked query hooks read from ─────────────────
const mockState: {
  goals: Goal[];
  notifications: any[];
  dailyLogs: any[];
  users: Employee[];
  currentUser: Employee | null;
} = { goals: [], notifications: [], dailyLogs: [], users: [], currentUser: null };

// ── mutation mocks (stable identities across renders) ──────────────
const mockAddGoalMut = { mutate: jest.fn(), mutateAsync: jest.fn().mockResolvedValue(undefined) };
const mockUpdateGoalMut = { mutate: jest.fn(), mutateAsync: jest.fn().mockResolvedValue(undefined) };
const mockDeleteGoalMut = { mutate: jest.fn(), mutateAsync: jest.fn().mockResolvedValue(undefined) };
const mockSubmitEvidenceMut = { mutate: jest.fn(), mutateAsync: jest.fn().mockResolvedValue(undefined) };
const mockReviewEvidenceMut = { mutate: jest.fn(), mutateAsync: jest.fn().mockResolvedValue(undefined) };
const mockAddNotifMut = { mutate: jest.fn(), mutateAsync: jest.fn().mockResolvedValue(undefined) };
const mockMarkReadMut = { mutate: jest.fn(), mutateAsync: jest.fn().mockResolvedValue(undefined) };
const mockMarkAllReadMut = { mutate: jest.fn(), mutateAsync: jest.fn().mockResolvedValue(undefined) };
const mockSaveLogMut = { mutate: jest.fn(), mutateAsync: jest.fn().mockResolvedValue(undefined) };

// ── auth / toast / push mocks ──────────────────────────────────────
const mockUpdateUser = jest.fn().mockResolvedValue(undefined);
const mockRemoveUser = jest.fn().mockResolvedValue(undefined);
const mockShowToast = jest.fn();
const mockSendExpoPush = jest.fn();

// ── query client mock — setQueryData executes updaters to cover them ─
const mockQc = {
  setQueryData: jest.fn((_key: unknown, updater: unknown) => {
    if (typeof updater === 'function') {
      (updater as (prev: unknown) => unknown)([{ id: 'existing' }]); // prev-truthy branch
      (updater as (prev: unknown) => unknown)(undefined);            // prev-falsy branch
    }
  }),
  invalidateQueries: jest.fn(),
};

// ── supabase mock — realtime channel chain + delete chain ──────────
let mockRelayCb: ((payload: { new: Record<string, unknown> }) => void) | null = null;
const mockChannel: any = {
  on: jest.fn((_event: string, _filter: unknown, cb: any) => { mockRelayCb = cb; return mockChannel; }),
  subscribe: jest.fn(() => mockChannel),
};

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => mockQc,
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    users: mockState.users,
    currentUser: mockState.currentUser,
    updateUser: mockUpdateUser,
    removeUser: mockRemoveUser,
  }),
}));

jest.mock('../../context/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

jest.mock('../../hooks/useGoals', () => ({
  goalKeys: { all: ['goals'] },
  useGoals: () => ({ data: mockState.goals }),
  useAddGoal: () => mockAddGoalMut,
  useUpdateGoal: () => mockUpdateGoalMut,
  useDeleteGoal: () => mockDeleteGoalMut,
  useSubmitEvidence: () => mockSubmitEvidenceMut,
  useReviewEvidence: () => mockReviewEvidenceMut,
}));

jest.mock('../../hooks/useNotifications', () => ({
  notifKeys: { all: ['notifications'] },
  useNotifications: () => ({ data: mockState.notifications }),
  useAddNotification: () => mockAddNotifMut,
  useMarkNotifRead: () => mockMarkReadMut,
  useMarkAllRead: () => mockMarkAllReadMut,
}));

jest.mock('../../hooks/useDailyLogs', () => ({
  logKeys: { all: ['daily-logs'] },
  useDailyLogs: () => ({ data: mockState.dailyLogs }),
  useSaveDailyLog: () => mockSaveLogMut,
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {
    channel: jest.fn(() => mockChannel),
    removeChannel: jest.fn(),
    from: jest.fn(() => ({
      delete: jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({ error: null }),
        or: jest.fn().mockResolvedValue({ error: null }),
      })),
    })),
  },
}));

jest.mock('../../lib/push', () => ({
  sendExpoPush: (...args: unknown[]) => mockSendExpoPush(...args),
}));

import { AppProvider, useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';

// ── consumer that exposes the context to each test ─────────────────
let ctx: ReturnType<typeof useApp>;
function Consumer() {
  ctx = useApp();
  return null;
}

function renderApp() {
  return render(
    <AppProvider>
      <Consumer />
    </AppProvider>,
  );
}

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'g1', employeeId: 'e1', title: 'Goal', description: 'd',
    quarter: 'Q1', priority: 'medium', category: 'technical',
    targetDate: '2026-12-31', weight: 50, status: 'not_started',
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeUser(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'e1', name: 'Alice', email: 'alice@test.com', role: 'employee',
    managerId: 'm1', department: 'Eng', designation: 'SWE',
    joinDate: '2024-01-01', status: 'active', avatarInitials: 'AL',
    ...overrides,
  } as Employee;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockState.goals = [];
  mockState.notifications = [];
  mockState.dailyLogs = [];
  mockState.users = [];
  mockState.currentUser = null;
  mockRelayCb = null;
});

// ── provider wiring ────────────────────────────────────────────────
describe('AppContext — provider + hook', () => {
  it('provides the context value to consumers', () => {
    renderApp();
    expect(typeof ctx.addGoal).toBe('function');
    expect(ctx.employees).toEqual([]);
  });

  it('throws when useApp is called outside AppProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow('useApp must be used inside AppProvider');
    spy.mockRestore();
  });

  it('exposes users as employees', () => {
    mockState.users = [makeUser({ id: 'e1' }), makeUser({ id: 'e2', email: 'b@t.com' })];
    renderApp();
    expect(ctx.employees).toHaveLength(2);
  });
});

// ── emailExists / addEmployee / updateEmployee ─────────────────────
describe('AppContext — employee helpers', () => {
  it('emailExists returns true for a known email (case-insensitive, trimmed)', () => {
    mockState.users = [makeUser({ email: 'Alice@Test.com' })];
    renderApp();
    expect(ctx.emailExists('  alice@test.com ')).toBe(true);
  });

  it('emailExists returns false for an unknown email', () => {
    mockState.users = [makeUser({ email: 'alice@test.com' })];
    renderApp();
    expect(ctx.emailExists('nobody@test.com')).toBe(false);
  });

  it('addEmployee returns a stubbed employee with an id', () => {
    renderApp();
    const created = ctx.addEmployee(makeUser());
    expect(created.id).toMatch(/^stub-/);
    expect(created.name).toBe('Alice');
  });

  it('updateEmployee delegates to auth updateUser', () => {
    renderApp();
    act(() => { ctx.updateEmployee('e1', { department: 'Sales' }); });
    expect(mockUpdateUser).toHaveBeenCalledWith('e1', { department: 'Sales' });
  });
});

// ── removeEmployee ─────────────────────────────────────────────────
describe('AppContext — removeEmployee', () => {
  it('removes the user, deletes orphaned rows, and invalidates caches', async () => {
    renderApp();
    await act(async () => { await ctx.removeEmployee('e9'); });
    expect(mockRemoveUser).toHaveBeenCalledWith('e9');
    expect(supabase.from).toHaveBeenCalledWith('goals');
    expect(supabase.from).toHaveBeenCalledWith('daily_logs');
    expect(supabase.from).toHaveBeenCalledWith('notifications');
    expect(mockQc.invalidateQueries).toHaveBeenCalledTimes(3);
  });
});

// ── addGoal (optimistic + rollback) ────────────────────────────────
describe('AppContext — addGoal', () => {
  it('optimistically inserts and calls the add mutation', () => {
    renderApp();
    let returned: Goal;
    act(() => { returned = ctx.addGoal(makeGoal()); });
    expect(returned!.id).toMatch(/^temp-/);
    expect(mockQc.setQueryData).toHaveBeenCalled();
    expect(mockAddGoalMut.mutate).toHaveBeenCalled();
  });

  it('rolls back the optimistic goal and shows a toast on error', () => {
    renderApp();
    act(() => { ctx.addGoal(makeGoal()); });
    const opts = mockAddGoalMut.mutate.mock.calls[0][1] as { onError: () => void };
    act(() => { opts.onError(); });
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringMatching(/went wrong/i), 'error');
  });
});

// ── updateGoal (transition guard) ──────────────────────────────────
describe('AppContext — updateGoal', () => {
  it('allows a valid status transition', () => {
    mockState.goals = [makeGoal({ id: 'g1', status: 'submitted' })];
    renderApp();
    act(() => { ctx.updateGoal('g1', { status: 'approved' }); });
    expect(mockUpdateGoalMut.mutate).toHaveBeenCalledWith(
      { goalId: 'g1', updates: { status: 'approved' } },
      expect.any(Object),
    );
  });

  it('blocks an invalid status transition and shows a toast', () => {
    mockState.goals = [makeGoal({ id: 'g1', status: 'approved' })];
    renderApp();
    act(() => { ctx.updateGoal('g1', { status: 'in_progress' }); });
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringMatching(/Cannot change goal status/),
      'error',
    );
    expect(mockUpdateGoalMut.mutate).not.toHaveBeenCalled();
  });

  it('updates non-status fields without transition checks', () => {
    mockState.goals = [makeGoal({ id: 'g1', status: 'approved' })];
    renderApp();
    act(() => { ctx.updateGoal('g1', { title: 'Renamed' }); });
    expect(mockUpdateGoalMut.mutate).toHaveBeenCalled();
  });

  it('skips the transition check when the goal is not in cache', () => {
    mockState.goals = [];
    renderApp();
    act(() => { ctx.updateGoal('missing', { status: 'approved' }); });
    expect(mockUpdateGoalMut.mutate).toHaveBeenCalled();
  });
});

// ── deleteGoal / submitEvidence / reviewEvidence ───────────────────
describe('AppContext — goal + evidence mutations', () => {
  it('deleteGoal calls the delete mutation', () => {
    renderApp();
    act(() => { ctx.deleteGoal('g1'); });
    expect(mockDeleteGoalMut.mutate).toHaveBeenCalledWith('g1', expect.any(Object));
  });

  it('submitEvidence awaits the submit mutation', async () => {
    renderApp();
    await act(async () => {
      await ctx.submitEvidence('g1', { selfRating: 4, managerFeedback: '', evidenceUrl: '' } as any);
    });
    expect(mockSubmitEvidenceMut.mutateAsync).toHaveBeenCalledWith({
      goalId: 'g1',
      data: expect.any(Object),
    });
  });

  it('reviewEvidence calls the review mutation with success callback', () => {
    const onSuccess = jest.fn();
    renderApp();
    act(() => { ctx.reviewEvidence('g1', true, 'good', 5, onSuccess); });
    expect(mockReviewEvidenceMut.mutate).toHaveBeenCalledWith(
      { goalId: 'g1', approved: true, feedback: 'good', managerRating: 5 },
      expect.objectContaining({ onSuccess }),
    );
  });
});

// ── notifications ──────────────────────────────────────────────────
describe('AppContext — notifications', () => {
  it('markNotifRead calls the mark-read mutation', () => {
    renderApp();
    act(() => { ctx.markNotifRead('n1'); });
    expect(mockMarkReadMut.mutate).toHaveBeenCalledWith('n1');
  });

  it('markAllRead calls the mark-all-read mutation', () => {
    renderApp();
    act(() => { ctx.markAllRead('e1'); });
    expect(mockMarkAllReadMut.mutate).toHaveBeenCalledWith('e1');
  });

  it('addNotification sends a push when the recipient has a token', () => {
    mockState.users = [makeUser({ id: 'e1', pushToken: 'ExponentPushToken[abc]' } as any)];
    renderApp();
    act(() => {
      ctx.addNotification({
        recipientId: 'e1', type: 'goal_assigned', title: 'T', message: 'M',
        read: false, createdAt: '2026-01-01T00:00:00Z',
      } as any);
    });
    expect(mockAddNotifMut.mutate).toHaveBeenCalled();
    expect(mockSendExpoPush).toHaveBeenCalledWith('ExponentPushToken[abc]', expect.objectContaining({ title: 'T' }));
  });

  it('addNotification does not push when the recipient has no token', () => {
    mockState.users = [makeUser({ id: 'e1' })];
    renderApp();
    act(() => {
      ctx.addNotification({
        recipientId: 'e1', type: 'goal_assigned', title: 'T', message: 'M',
        read: false, createdAt: '2026-01-01T00:00:00Z',
      } as any);
    });
    expect(mockAddNotifMut.mutate).toHaveBeenCalled();
    expect(mockSendExpoPush).not.toHaveBeenCalled();
  });
});

// ── closeFiscalYear ────────────────────────────────────────────────
describe('AppContext — closeFiscalYear', () => {
  it('marks active non-admin staff completed and notifies them', () => {
    mockState.users = [
      makeUser({ id: 'e1', role: 'employee', status: 'active' }),
      makeUser({ id: 'm1', role: 'manager', status: 'active', email: 'm@t.com' }),
      makeUser({ id: 'a1', role: 'admin', status: 'active', email: 'a@t.com' }),
    ];
    renderApp();
    act(() => { ctx.closeFiscalYear(); });
    // admin excluded → 2 staff updated
    expect(mockUpdateUser).toHaveBeenCalledWith('e1', { status: 'completed_fiscal_year' });
    expect(mockUpdateUser).toHaveBeenCalledWith('m1', { status: 'completed_fiscal_year' });
    expect(mockUpdateUser).not.toHaveBeenCalledWith('a1', expect.anything());
    expect(mockAddNotifMut.mutate).toHaveBeenCalledTimes(2);
  });
});

// ── saveDailyLog ───────────────────────────────────────────────────
describe('AppContext — saveDailyLog', () => {
  it('calls the save-log mutation with the payload', () => {
    renderApp();
    const tasks = [{ id: 't1', text: 'Task', done: true }] as any;
    act(() => { ctx.saveDailyLog('e1', '2026-06-01', tasks, 'notes'); });
    expect(mockSaveLogMut.mutate).toHaveBeenCalledWith(
      { employeeId: 'e1', date: '2026-06-01', tasks, notes: 'notes' },
      expect.any(Object),
    );
  });
});

// ── FY auto-complete effect ────────────────────────────────────────
describe('AppContext — FY auto-complete effect', () => {
  it('marks an employee completed when all their goals are final', () => {
    mockState.users = [makeUser({ id: 'e1', role: 'employee', status: 'active' })];
    mockState.goals = [
      makeGoal({ id: 'g1', employeeId: 'e1', status: 'approved' }),
      makeGoal({ id: 'g2', employeeId: 'e1', status: 'rejected' }),
    ];
    renderApp();
    expect(mockUpdateUser).toHaveBeenCalledWith('e1', { status: 'completed_fiscal_year' });
  });

  it('does not complete when some goals are not final', () => {
    mockState.users = [makeUser({ id: 'e1', role: 'employee', status: 'active' })];
    mockState.goals = [
      makeGoal({ id: 'g1', employeeId: 'e1', status: 'approved' }),
      makeGoal({ id: 'g2', employeeId: 'e1', status: 'in_progress' }),
    ];
    renderApp();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('does nothing when the employee has no goals', () => {
    mockState.users = [makeUser({ id: 'e1', role: 'employee', status: 'active' })];
    mockState.goals = [makeGoal({ id: 'g1', employeeId: 'other', status: 'approved' })];
    renderApp();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });
});

// ── realtime push relay effect ─────────────────────────────────────
describe('AppContext — realtime push relay', () => {
  function setupRelay(currentId: string) {
    mockState.currentUser = makeUser({ id: currentId });
    mockState.users = [
      makeUser({ id: 'me', role: 'manager' }),
      makeUser({ id: 'u2', email: 'u2@t.com', pushToken: 'ExponentPushToken[u2]' } as any),
      makeUser({ id: 'u3', email: 'u3@t.com' }),
    ];
  }

  it('subscribes to the notifications channel when a user is present', () => {
    setupRelay('me');
    renderApp();
    expect(supabase.channel).toHaveBeenCalledWith('notification-push-relay');
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('relays a push to a recipient with a token', () => {
    setupRelay('me');
    renderApp();
    act(() => {
      mockRelayCb!({ new: { recipient_id: 'u2', title: 'Hi', message: 'Body', type: 'goal_assigned', related_goal_id: 'g9' } });
    });
    expect(mockSendExpoPush).toHaveBeenCalledWith('ExponentPushToken[u2]', expect.objectContaining({ title: 'Hi', body: 'Body' }));
  });

  it('skips the relay when the recipient is the current user', () => {
    setupRelay('u2'); // current user is u2, who has a token
    renderApp();
    act(() => {
      mockRelayCb!({ new: { recipient_id: 'u2', title: 'Hi', message: 'Body', type: 'x', related_goal_id: null } });
    });
    expect(mockSendExpoPush).not.toHaveBeenCalled();
  });

  it('skips the relay when the recipient has no push token', () => {
    setupRelay('me');
    renderApp();
    act(() => {
      mockRelayCb!({ new: { recipient_id: 'u3', title: 'Hi', message: 'Body', type: 'x', related_goal_id: null } });
    });
    expect(mockSendExpoPush).not.toHaveBeenCalled();
  });

  it('skips the relay when the recipient is unknown', () => {
    setupRelay('me');
    renderApp();
    act(() => {
      mockRelayCb!({ new: { recipient_id: 'ghost', title: 'Hi', message: 'Body', type: 'x', related_goal_id: null } });
    });
    expect(mockSendExpoPush).not.toHaveBeenCalled();
  });

  it('removes the channel on unmount', () => {
    setupRelay('me');
    const { unmount } = renderApp();
    unmount();
    expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });
});

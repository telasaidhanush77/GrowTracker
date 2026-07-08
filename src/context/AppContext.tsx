import { createContext, ReactNode, useCallback, useContext, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import {
  useGoals, useAddGoal, useUpdateGoal, useDeleteGoal,
  useSubmitEvidence, useReviewEvidence, goalKeys,
} from '../hooks/useGoals';
import {
  useNotifications, useAddNotification,
  useMarkNotifRead, useMarkAllRead, notifKeys,
} from '../hooks/useNotifications';
import { useDailyLogs, useSaveDailyLog, logKeys } from '../hooks/useDailyLogs';
import { supabase } from '../lib/supabase';
import { sendExpoPush } from '../lib/push';
import type {
  DailyLog, DailyTask, Employee, EmployeeStatus,
  Evidence, Goal, GoalStatus, Notification, NotificationType, StoredUser,
} from '../types';

// ── context shape — identical to the old interface so screens need no changes ──
interface AppContextType {
  employees: Employee[];
  goals: Goal[];
  notifications: Notification[];
  dailyLogs: DailyLog[];
  emailExists: (email: string) => boolean;
  addEmployee: (emp: Omit<Employee, 'id'>) => Employee;
  updateEmployee: (employeeId: string, updates: Partial<StoredUser>) => void;
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => Goal;
  updateGoal: (goalId: string, updates: Partial<Goal>) => void;
  deleteGoal: (goalId: string) => void;
  submitEvidence: (goalId: string, data: Omit<Evidence, 'id' | 'status'>) => Promise<void>;
  reviewEvidence: (goalId: string, approved: boolean, feedback: string, managerRating?: number, onSuccess?: () => void) => void;
  markNotifRead: (notifId: string) => void;
  markAllRead: (recipientId: string) => void;
  addNotification: (notif: Omit<Notification, 'id'>) => void;
  closeFiscalYear: () => void;
  saveDailyLog: (employeeId: string, date: string, tasks: DailyTask[], notes?: string) => void;
  removeEmployee: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { users, updateUser, removeUser, currentUser } = useAuth();
  const { showToast } = useToast();
  const qc = useQueryClient();

  // ── data queries (cached + persisted by React Query) ──────────
  const { data: goals = [] }         = useGoals();
  const { data: notifications = [] } = useNotifications();
  const { data: dailyLogs = [] }     = useDailyLogs();

  // ── mutations ──────────────────────────────────────────────────
  const addGoalMutation         = useAddGoal();
  const updateGoalMutation      = useUpdateGoal();
  const deleteGoalMutation      = useDeleteGoal();
  const submitEvidenceMutation  = useSubmitEvidence();
  const reviewEvidenceMutation  = useReviewEvidence();
  const addNotifMutation        = useAddNotification();
  const markReadMutation        = useMarkNotifRead();
  const markAllReadMutation     = useMarkAllRead();
  const saveLogMutation         = useSaveDailyLog();

  // Tracks employees already processed for FY auto-complete within this session
  const fyProcessedRef = useRef<Set<string>>(new Set());

  // ── auto-complete FY when all goals reach a final state ────────
  useEffect(() => {
    if (!goals.length || !users.length) return;
    const activeEmployees = users.filter(u => u.role === 'employee' && u.status === 'active');

    activeEmployees.forEach(emp => {
      if (fyProcessedRef.current.has(emp.id)) return;

      const empGoals = goals.filter(g => g.employeeId === emp.id);
      if (!empGoals.length) return;
      const allFinal = empGoals.every(g => g.status === 'approved' || g.status === 'rejected');
      if (!allFinal) return;

      fyProcessedRef.current.add(emp.id);
      // Status update only — notifications are created by the handle_fy_complete DB trigger
      updateUser(emp.id, { status: 'completed_fiscal_year' as EmployeeStatus }).catch(onMutationError);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals, users]);

  // ── Realtime push relay ────────────────────────────────────────
  // When a DB trigger inserts a notification, the currently-online user
  // relays a push to the recipient if they manage them (or are admin).
  useEffect(() => {
    if (!users.length || !currentUser) return;

    const channel = supabase
      .channel('notification-push-relay')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const row = payload.new as {
            recipient_id: string;
            title: string;
            message: string;
            type: string;
            related_goal_id: string | null;
          };
          const recipient = users.find(u => u.id === row.recipient_id);
          if (!recipient?.pushToken) return;
          // Skip self — current user is already in the app and sees the notification inline.
          if (recipient.id === currentUser.id) return;
          sendExpoPush(recipient.pushToken, {
            title: row.title,
            body: row.message,
            data: { type: row.type, goalId: row.related_goal_id ?? undefined },
          });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, currentUser?.id, currentUser?.role]);

  // ── employees (pulled from AuthContext) ────────────────────────
  const employees: Employee[] = users;

  function emailExists(email: string): boolean {
    return users.some(u => u.email.toLowerCase() === email.trim().toLowerCase());
  }

  // Kept for API compatibility — admin onboarding uses AuthContext.createUser directly
  function addEmployee(emp: Omit<Employee, 'id'>): Employee {
    return { ...emp, id: `stub-${Date.now()}` };
  }

  const updateEmployee = useCallback(
    (employeeId: string, updates: Partial<StoredUser>) => updateUser(employeeId, updates),
    [updateUser],
  );

  const removeEmployee = useCallback(
    async (id: string) => {
      await removeUser(id);
      // Delete orphaned rows from Supabase so they don't reappear after cache TTL expires
      await supabase.from('goals').delete().eq('employee_id', id);
      await supabase.from('daily_logs').delete().eq('employee_id', id);
      await supabase.from('notifications').delete()
        .or(`recipient_id.eq.${id},related_employee_id.eq.${id}`);
      qc.invalidateQueries({ queryKey: goalKeys.all });
      qc.invalidateQueries({ queryKey: notifKeys.all });
      qc.invalidateQueries({ queryKey: logKeys.all });
    },
    [removeUser, qc],
  );

  const onMutationError = useCallback(() => {
    showToast('Something went wrong. Check your connection and try again.', 'error');
  }, [showToast]);

  // ── goal actions (optimistic cache update — errors surface via toast) ──
  function addGoal(goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Goal {
    const optimistic: Goal = {
      ...goal,
      id: `temp-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    // Insert into cache immediately so the UI reflects the new goal without waiting
    qc.setQueryData<Goal[]>(goalKeys.all, prev =>
      prev ? [optimistic, ...prev] : [optimistic],
    );
    addGoalMutation.mutate(goal, {
      onError: () => {
        // Remove the stub if the server write failed
        qc.setQueryData<Goal[]>(goalKeys.all, prev =>
          prev?.filter(g => g.id !== optimistic.id),
        );
        onMutationError();
      },
    });
    return optimistic;
  }

  const VALID_GOAL_TRANSITIONS: Record<GoalStatus, GoalStatus[]> = {
    not_started: ['in_progress'],
    in_progress: ['submitted'],
    submitted: ['approved', 'rejected'],
    approved: [],
    rejected: ['in_progress'],
  };

  function updateGoal(goalId: string, updates: Partial<Goal>) {
    if (updates.status !== undefined) {
      const current = goals.find(g => g.id === goalId);
      if (current) {
        const allowed = VALID_GOAL_TRANSITIONS[current.status] ?? [];
        if (!allowed.includes(updates.status as GoalStatus)) {
          showToast(
            `Cannot change goal status from "${current.status}" to "${updates.status}".`,
            'error',
          );
          return;
        }
      }
    }
    updateGoalMutation.mutate({ goalId, updates }, { onError: onMutationError });
  }

  function deleteGoal(goalId: string) {
    deleteGoalMutation.mutate(goalId, { onError: onMutationError });
  }

  function submitEvidence(goalId: string, data: Omit<Evidence, 'id' | 'status'>): Promise<void> {
    return submitEvidenceMutation.mutateAsync({ goalId, data }).then(() => undefined);
  }

  function reviewEvidence(goalId: string, approved: boolean, feedback: string, managerRating?: number, onSuccess?: () => void) {
    reviewEvidenceMutation.mutate({ goalId, approved, feedback, managerRating }, { onError: onMutationError, onSuccess });
  }

  function markNotifRead(notifId: string) {
    markReadMutation.mutate(notifId);
  }

  function markAllRead(recipientId: string) {
    markAllReadMutation.mutate(recipientId);
  }

  function addNotification(notif: Omit<Notification, 'id'>) {
    addNotifMutation.mutate(notif);
    const recipient = users.find(u => u.id === notif.recipientId);
    if (recipient?.pushToken) {
      sendExpoPush(recipient.pushToken, {
        title: notif.title,
        body: notif.message,
        data: { type: notif.type, goalId: notif.relatedGoalId },
      });
    }
  }

  function closeFiscalYear() {
    const now = new Date().toISOString();
    const staff = employees.filter(e => e.role !== 'admin' && e.status === 'active');
    staff.forEach(e => {
      updateUser(e.id, { status: 'completed_fiscal_year' as EmployeeStatus }).catch(onMutationError);
      addNotification({
        recipientId: e.id,
        type: 'fiscal_year_complete' as NotificationType,
        title: 'FY 2026 Closed',
        message: 'Fiscal Year 2026 has been officially closed. Your performance record is now finalized.',
        read: false,
        createdAt: now,
      });
    });
  }

  function saveDailyLog(employeeId: string, date: string, tasks: DailyTask[], notes?: string) {
    saveLogMutation.mutate({ employeeId, date, tasks, notes }, { onError: onMutationError });
  }

  return (
    <AppContext.Provider value={{
      employees, goals, notifications, dailyLogs,
      emailExists, addEmployee, updateEmployee,
      addGoal, updateGoal, deleteGoal,
      submitEvidence, reviewEvidence,
      markNotifRead, markAllRead, addNotification,
      closeFiscalYear, saveDailyLog, removeEmployee,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

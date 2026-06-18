import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { goalStore, logStore, notifStore } from '../auth/storage';
import { useAuth } from './AuthContext';
import { DailyLog, DailyTask, Employee, EmployeeStatus, Evidence, Goal, Notification, NotificationType, StoredUser } from '../types';

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
  submitEvidence: (goalId: string, data: Omit<Evidence, 'id' | 'status'>) => void;
  reviewEvidence: (goalId: string, approved: boolean, feedback: string, managerRating?: number) => void;
  markNotifRead: (notifId: string) => void;
  markAllRead: (recipientId: string) => void;
  addNotification: (notif: Omit<Notification, 'id'>) => void;
  closeFiscalYear: () => void;
  saveDailyLog: (employeeId: string, date: string, tasks: DailyTask[], notes?: string) => void;
  removeEmployee: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { users, updateUser, removeUser } = useAuth();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load persisted goals / notifications / logs once on mount
  useEffect(() => {
    (async () => {
      const [g, n, l] = await Promise.all([
        goalStore.getAll(),
        notifStore.getAll(),
        logStore.getAll(),
      ]);
      setGoals(g);
      setNotifications(n);
      setDailyLogs(l);
      setDataLoaded(true);
    })();
  }, []);

  // Persist goals whenever they change (after initial load)
  useEffect(() => { if (dataLoaded) goalStore.save(goals); }, [goals, dataLoaded]);
  useEffect(() => { if (dataLoaded) notifStore.save(notifications); }, [notifications, dataLoaded]);
  useEffect(() => { if (dataLoaded) logStore.save(dailyLogs); }, [dailyLogs, dataLoaded]);

  // Expose users as Employee[] (StoredUser satisfies Employee structurally)
  const employees: Employee[] = users;

  // Auto-complete FY when all of an employee's goals reach a final state
  useEffect(() => {
    const activeEmployees = employees.filter(e => e.role === 'employee' && e.status === 'active');
    if (activeEmployees.length === 0) return;

    const now = new Date().toISOString();
    activeEmployees.forEach(emp => {
      const empGoals = goals.filter(g => g.employeeId === emp.id);
      if (empGoals.length === 0) return;
      const allFinal = empGoals.every(g => g.status === 'approved' || g.status === 'rejected');
      if (!allFinal) return;

      updateUser(emp.id, { status: 'completed_fiscal_year' as EmployeeStatus });
      const mgr = employees.find(e => e.id === emp.managerId);
      const ts = Date.now();
      const newNotifs: Notification[] = [
        {
          id: `notif-fy-e-${ts}-${emp.id}`,
          recipientId: emp.id,
          type: 'fiscal_year_complete' as NotificationType,
          title: 'FY 2026 Complete',
          message: 'All your goals have been reviewed. Your Fiscal Year 2026 is now complete!',
          read: false,
          createdAt: now,
        },
      ];
      if (mgr) {
        newNotifs.push({
          id: `notif-fy-m-${ts}-${emp.id}`,
          recipientId: mgr.id,
          type: 'fiscal_year_complete' as NotificationType,
          title: `${emp.name.split(' ')[0]}'s FY Complete`,
          message: `All goals for ${emp.name} have been reviewed. Their FY 2026 is now finalized.`,
          read: false,
          createdAt: now,
        });
      }
      setNotifications(prev => [...newNotifs, ...prev]);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals]);

  function emailExists(email: string): boolean {
    return users.some(u => u.email.toLowerCase() === email.trim().toLowerCase());
  }

  // Kept for backward compatibility — admin onboarding now uses AuthContext.createUser directly
  function addEmployee(emp: Omit<Employee, 'id'>): Employee {
    const stub: Employee = { ...emp, id: `emp-${Date.now()}` };
    return stub;
  }

  const updateEmployee = useCallback(
    (employeeId: string, updates: Partial<StoredUser>) => updateUser(employeeId, updates),
    [updateUser],
  );

  const removeEmployee = useCallback(
    (id: string) => {
      removeUser(id);
      setGoals(prev => prev.filter(g => g.employeeId !== id));
      setNotifications(prev => prev.filter(n => n.recipientId !== id && n.relatedEmployeeId !== id));
    },
    [removeUser],
  );

  function addGoal(goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Goal {
    const now = new Date().toISOString();
    const newGoal: Goal = { ...goal, id: `goal-${Date.now()}`, createdAt: now, updatedAt: now };
    setGoals(prev => [...prev, newGoal]);
    return newGoal;
  }

  function updateGoal(goalId: string, updates: Partial<Goal>) {
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g));
  }

  function deleteGoal(goalId: string) {
    setGoals(prev => prev.filter(g => g.id !== goalId));
  }

  function submitEvidence(goalId: string, data: Omit<Evidence, 'id' | 'status'>) {
    const evidence: Evidence = { ...data, id: `ev-${Date.now()}`, status: 'pending' };
    updateGoal(goalId, { status: 'submitted', evidence });
  }

  function reviewEvidence(goalId: string, approved: boolean, feedback: string, managerRating?: number) {
    const goal = goals.find(g => g.id === goalId);
    if (!goal?.evidence) return;
    updateGoal(goalId, {
      status: approved ? 'approved' : 'rejected',
      managerRating: approved ? managerRating : undefined,
      evidence: {
        ...goal.evidence,
        status: approved ? 'approved' : 'rejected',
        managerFeedback: feedback,
        reviewedAt: new Date().toISOString(),
      },
    });
  }

  function markNotifRead(notifId: string) {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
  }

  function markAllRead(recipientId: string) {
    setNotifications(prev => prev.map(n => n.recipientId === recipientId ? { ...n, read: true } : n));
  }

  function addNotification(notif: Omit<Notification, 'id'>) {
    setNotifications(prev => [{ ...notif, id: `notif-${Date.now()}` }, ...prev]);
  }

  function closeFiscalYear() {
    const now = new Date().toISOString();
    const staff = employees.filter(e => e.role !== 'admin' && e.status === 'active');
    staff.forEach(e => updateUser(e.id, { status: 'completed_fiscal_year' as EmployeeStatus }));
    setNotifications(prev => [
      ...staff.map(e => ({
        id: `notif-fy-${Date.now()}-${e.id}`,
        recipientId: e.id,
        type: 'fiscal_year_complete' as NotificationType,
        title: 'FY 2026 Closed',
        message: 'Fiscal Year 2026 has been officially closed. Your performance record is now finalized.',
        read: false,
        createdAt: now,
      })),
      ...prev,
    ]);
  }

  function saveDailyLog(employeeId: string, date: string, tasks: DailyTask[], notes?: string) {
    const now = new Date().toISOString();
    setDailyLogs(prev => {
      const existing = prev.find(l => l.employeeId === employeeId && l.date === date);
      if (existing) {
        return prev.map(l => l.id === existing.id ? { ...l, tasks, notes, updatedAt: now } : l);
      }
      return [...prev, { id: `log-${Date.now()}`, employeeId, date, tasks, notes, createdAt: now, updatedAt: now }];
    });
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

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthSession, Goal, DailyLog, Notification, StoredUser } from '../types';

const K = {
  users: '@gt:users',
  session: '@gt:session',
  counters: '@gt:counters',
  otps: '@gt:otps',
  goals: '@gt:goals',
  notifications: '@gt:notifications',
  dailyLogs: '@gt:dailylogs',
};

export interface RoleCounters {
  admin: number;
  manager: number;
  employee: number;
}

export interface OTPRecord {
  email: string;
  otp: string;
  createdAt: string;
  expiresAt: string;
}

async function get<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function set(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const userStore = {
  getAll: () => get<StoredUser[]>(K.users, []),
  save: (users: StoredUser[]) => set(K.users, users),
};

export const sessionStore = {
  get: () => get<AuthSession | null>(K.session, null),
  save: (s: AuthSession | null) => s ? set(K.session, s) : AsyncStorage.removeItem(K.session).catch(() => {}),
};

export const counterStore = {
  get: () => get<RoleCounters>(K.counters, { admin: 0, manager: 0, employee: 0 }),
  save: (c: RoleCounters) => set(K.counters, c),
};

export const otpStore = {
  getAll: () => get<OTPRecord[]>(K.otps, []),
  save: (otps: OTPRecord[]) => set(K.otps, otps),
};

export const goalStore = {
  getAll: () => get<Goal[]>(K.goals, []),
  save: (goals: Goal[]) => set(K.goals, goals),
};

export const notifStore = {
  getAll: () => get<Notification[]>(K.notifications, []),
  save: (notifs: Notification[]) => set(K.notifications, notifs),
};

export const logStore = {
  getAll: () => get<DailyLog[]>(K.dailyLogs, []),
  save: (logs: DailyLog[]) => set(K.dailyLogs, logs),
};

import * as Crypto from 'expo-crypto';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { counterStore, otpStore, sessionStore, userStore, OTPRecord } from '../auth/storage';
import { AuthSession, Role, SignupData, StoredUser } from '../types';

// ---------- crypto helpers ----------

function makeSalt(): string {
  const bytes = Crypto.getRandomBytes(16);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string): Promise<string> {
  const salt = makeSalt();
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, salt + password);
  return `${salt}:${hash}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const idx = stored.indexOf(':');
  if (idx === -1) return false;
  const salt = stored.slice(0, idx);
  const expected = stored.slice(idx + 1);
  const actual = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, salt + password);
  return actual === expected;
}

function makeOTP(): string {
  const bytes = Crypto.getRandomBytes(3);
  const n = ((bytes[0] << 16) | (bytes[1] << 8) | bytes[2]) % 900000 + 100000;
  return String(n);
}

function makeId(role: Role, count: number): string {
  const prefix = { admin: 'ADM', manager: 'MGR', employee: 'EMP' }[role];
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}

function avatarInitials(firstName: string, lastName: string): string {
  return ((firstName[0] ?? '') + (lastName[0] ?? '')).toUpperCase();
}

// ---------- context ----------

interface AuthContextType {
  users: StoredUser[];
  currentUser: StoredUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login(identifier: string, password: string): Promise<{ ok: boolean; error?: string }>;
  logout(): Promise<void>;
  signup(data: SignupData): Promise<{ ok: boolean; error?: string; user?: StoredUser }>;

  // for admin onboarding
  createUser(data: Omit<SignupData, 'password'> & { tempPassword: string }): Promise<StoredUser>;
  updateUser(userId: string, updates: Partial<StoredUser>): Promise<void>;
  removeUser(userId: string): Promise<void>;

  // password reset
  requestPasswordReset(email: string): Promise<{ ok: boolean; otp?: string; error?: string }>;
  verifyOTP(email: string, otp: string): Promise<boolean>;
  resetPassword(email: string, otp: string, newPassword: string): Promise<{ ok: boolean; error?: string }>;

  // username recovery
  recoverUsername(email: string): Promise<{ ok: boolean; username?: string; uniqueId?: string; error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [loadedUsers, loadedSession] = await Promise.all([
        userStore.getAll(),
        sessionStore.get(),
      ]);
      setUsers(loadedUsers);
      setSession(loadedSession);
      setIsLoading(false);
    })();
  }, []);

  const currentUser = session ? (users.find(u => u.id === session.userId) ?? null) : null;

  const persistUsers = useCallback(async (next: StoredUser[]) => {
    setUsers(next);
    await userStore.save(next);
  }, []);

  async function login(identifier: string, password: string): Promise<{ ok: boolean; error?: string }> {
    const id = identifier.trim().toLowerCase();
    const user = users.find(u =>
      u.email.toLowerCase() === id ||
      u.username.toLowerCase() === id ||
      u.employeeCode.toLowerCase() === id,
    );
    if (!user) return { ok: false, error: 'No account found with that username, email, or ID.' };
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return { ok: false, error: 'Incorrect password.' };
    const s: AuthSession = { userId: user.id, role: user.role, createdAt: new Date().toISOString() };
    setSession(s);
    await sessionStore.save(s);
    return { ok: true };
  }

  async function logout() {
    setSession(null);
    await sessionStore.save(null);
  }

  async function signup(data: SignupData): Promise<{ ok: boolean; error?: string; user?: StoredUser }> {
    const emailLow = data.email.trim().toLowerCase();
    const usernameLow = data.username.trim().toLowerCase();
    if (users.some(u => u.email.toLowerCase() === emailLow))
      return { ok: false, error: 'An account with this email already exists.' };
    if (users.some(u => u.username.toLowerCase() === usernameLow))
      return { ok: false, error: 'That username is already taken.' };

    const counters = await counterStore.get();
    const roleKey = data.role === 'admin' ? 'admin' : data.role === 'manager' ? 'manager' : 'employee';
    const newCount = counters[roleKey] + 1;
    const newId = makeId(data.role, counters[roleKey]);
    const updatedCounters = { ...counters, [roleKey]: newCount };

    const passwordHash = await hashPassword(data.password);
    const now = new Date().toISOString();

    const newUser: StoredUser = {
      id: newId,
      employeeCode: newId,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      name: `${data.firstName.trim()} ${data.lastName.trim()}`,
      email: emailLow,
      username: usernameLow,
      passwordHash,
      role: data.role,
      mobile: data.mobile?.trim(),
      department: data.department?.trim() ?? 'Unassigned',
      designation: data.designation?.trim() ?? 'Unassigned',
      managerId: null,
      joinDate: now.slice(0, 10),
      status: 'active',
      avatarInitials: avatarInitials(data.firstName, data.lastName),
      createdAt: now,
    };

    const next = [...users, newUser];
    await persistUsers(next);
    await counterStore.save(updatedCounters);
    return { ok: true, user: newUser };
  }

  async function createUser(data: Omit<SignupData, 'password'> & { tempPassword: string }): Promise<StoredUser> {
    const result = await signup({ ...data, password: data.tempPassword });
    if (!result.ok || !result.user) throw new Error(result.error ?? 'Failed to create user');
    return result.user;
  }

  async function updateUser(userId: string, updates: Partial<StoredUser>): Promise<void> {
    const next = users.map(u => u.id === userId ? { ...u, ...updates } : u);
    await persistUsers(next);
  }

  async function removeUser(userId: string): Promise<void> {
    const next = users.filter(u => u.id !== userId);
    await persistUsers(next);
  }

  async function requestPasswordReset(email: string): Promise<{ ok: boolean; otp?: string; error?: string }> {
    const emailLow = email.trim().toLowerCase();
    const user = users.find(u => u.email.toLowerCase() === emailLow);
    if (!user) return { ok: false, error: 'No account found with that email address.' };

    const otp = makeOTP();
    const now = Date.now();
    const record: OTPRecord = {
      email: emailLow,
      otp,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 10 * 60 * 1000).toISOString(), // 10 min
    };

    const existing = await otpStore.getAll();
    const filtered = existing.filter(r => r.email !== emailLow);
    await otpStore.save([...filtered, record]);

    // TODO: send OTP to email via a real email service (e.g. SendGrid, Resend, Firebase)
    return { ok: true, otp };
  }

  async function verifyOTP(email: string, otp: string): Promise<boolean> {
    const emailLow = email.trim().toLowerCase();
    const records = await otpStore.getAll();
    const record = records.find(r => r.email === emailLow && r.otp === otp.trim());
    if (!record) return false;
    return new Date() < new Date(record.expiresAt);
  }

  async function resetPassword(email: string, otp: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
    const valid = await verifyOTP(email, otp);
    if (!valid) return { ok: false, error: 'Invalid or expired OTP.' };

    const emailLow = email.trim().toLowerCase();
    const user = users.find(u => u.email.toLowerCase() === emailLow);
    if (!user) return { ok: false, error: 'Account not found.' };

    const passwordHash = await hashPassword(newPassword);
    await updateUser(user.id, { passwordHash });

    const records = await otpStore.getAll();
    await otpStore.save(records.filter(r => r.email !== emailLow));

    return { ok: true };
  }

  async function recoverUsername(email: string): Promise<{ ok: boolean; username?: string; uniqueId?: string; error?: string }> {
    const emailLow = email.trim().toLowerCase();
    const user = users.find(u => u.email.toLowerCase() === emailLow);
    if (!user) return { ok: false, error: 'No account found with that email address.' };
    return { ok: true, username: user.username, uniqueId: user.employeeCode };
  }

  return (
    <AuthContext.Provider value={{
      users, currentUser, isLoading, isAuthenticated: !!currentUser,
      login, logout, signup, createUser, updateUser, removeUser,
      requestPasswordReset, verifyOTP, resetPassword, recoverUsername,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

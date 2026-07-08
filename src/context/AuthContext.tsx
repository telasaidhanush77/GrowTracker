import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { queryClient } from '../lib/queryClient';
import type { TablesUpdate } from '../db/types';
import { profileToStoredUser } from '../lib/profileAdapter';
import type { Role, SignupData, StoredUser } from '../types';

// ── context shape ─────────────────────────────────────────────
interface AuthContextType {
  // session state
  session: Session | null;
  currentUser: StoredUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // background session window — call when app goes to background to suppress
  // spurious SIGNED_OUT events from Supabase token refresh during that period
  setBackgroundWindow: (expiresAt: number) => void;

  // user list (for manager/admin views)
  users: StoredUser[];

  // auth actions
  login(identifier: string, password: string, expectedRole?: Role): Promise<{ ok: boolean; error?: string }>;
  logout(): Promise<void>;
  signup(data: SignupData): Promise<{ ok: boolean; error?: string; user?: StoredUser }>;

  // profile mutations
  updateUser(userId: string, updates: Partial<StoredUser>): Promise<void>;
  removeUser(userId: string): Promise<void>;

  // admin creates an account for a new hire (uses signUp with temp password)
  createUser(
    data: Omit<SignupData, 'password'> & { tempPassword: string },
  ): Promise<StoredUser>;

  // password reset — Supabase sends a real email with a 6-digit OTP
  resetPasswordRequest(email: string): Promise<{ ok: boolean; error?: string }>;
  // Step 2: validate OTP on the server (call before asking for new password).
  resetPasswordCheckOtp(email: string, otp: string): Promise<{ ok: boolean; error?: string }>;
  // Step 3: set the new password (requires a prior successful resetPasswordCheckOtp call).
  resetPasswordSetNewPassword(newPassword: string): Promise<{ ok: boolean; error?: string }>;
  // Combined step 2+3, kept for backward compatibility.
  resetPasswordVerify(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<{ ok: boolean; error?: string }>;

  // username lookup (for login hint)
  getUsernameForEmail(email: string): Promise<string | null>;

  // change password — verifies current password before updating
  changePassword(currentPassword: string, newPassword: string): Promise<{ ok: boolean; error?: string }>;
  // sign out from all sessions globally
  signOutAllDevices(): Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ── provider ─────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Prevents onAuthStateChange from auto-navigating during signup or the login role-check.
  // Without this, signInWithPassword() fires onAuthStateChange before we can validate
  // the portal role, causing a flash of the wrong dashboard then a sign-out back to splash.
  const signingUpRef      = useRef(false);
  const loggingInRef      = useRef(false);
  const resettingPwdRef   = useRef(false);
  // Ref-based mirror of currentUser so updateUser stays a stable callback reference
  const currentUserRef    = useRef<StoredUser | null>(null);
  // When set to a future timestamp, SIGNED_OUT events are suppressed until that time.
  // Used by AppRoot to prevent spurious logouts during the 2-minute background window.
  const bgWindowExpiresAtRef = useRef<number>(0);

  function setBackgroundWindow(expiresAt: number) {
    bgWindowExpiresAtRef.current = expiresAt;
  }

  // Keep the ref in sync so updateUser always reads the latest value without being recreated
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  // Load session on mount and subscribe to auth changes
  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session: s } }) => {
        setSession(s);
        if (s?.user) loadProfile(s.user);
        else setIsLoading(false);
      })
      .catch(() => setIsLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      // INITIAL_SESSION is already handled by the getSession() call above — skip it here
      // to prevent two concurrent loadProfile() calls racing on cold start.
      if (event === 'INITIAL_SESSION') return;
      // Suppress spurious SIGNED_OUT events that Supabase fires during token refresh
      // when the app resumes from background within the 2-minute session window.
      if (event === 'SIGNED_OUT' && Date.now() < bgWindowExpiresAtRef.current) return;
      setSession(s);
      if (s?.user) {
        if (!signingUpRef.current && !loggingInRef.current && !resettingPwdRef.current) loadProfile(s.user);
      } else {
        setCurrentUser(null);
        setUsers([]);
        setIsLoading(false);
      }
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfile(user: User) {
    setIsLoading(true);
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error || !profile) {
        setCurrentUser(null);
        return;
      }
      const storedUser = profileToStoredUser(profile);
      setCurrentUser(storedUser);
      await loadAllVisibleUsers(storedUser);
      // Invalidate all cached queries so they refetch with the now-authenticated session.
      // Without this, goals/notifications/logs fetched before auth was ready return 0 rows
      // (RLS blocks unauthenticated reads) and the cache serves stale empty data for 2 min.
      queryClient.invalidateQueries();
    } finally {
      setIsLoading(false);
    }
  }

  // Load only the profiles this role is allowed to see
  async function loadAllVisibleUsers(me: StoredUser) {
    let query = supabase.from('profiles').select('*');

    if (me.role === 'employee') {
      // Employee sees only themselves and their manager
      const ids = me.managerId ? [me.id, me.managerId] : [me.id];
      query = query.in('id', ids);
    } else if (me.role === 'manager') {
      // Manager sees themselves and their direct reports
      query = query.or(`id.eq.${me.id},manager_id.eq.${me.id}`);
    }
    // admin: no filter — sees everyone

    const { data } = await query;
    if (data) setUsers(data.map(profileToStoredUser));
  }

  // ── login ───────────────────────────────────────────────────
  async function login(
    identifier: string,
    password: string,
    expectedRole?: Role,
  ): Promise<{ ok: boolean; error?: string }> {
    loggingInRef.current = true;
    try {
      // Resolve username / employee-code → email if needed
      let email = identifier.trim();
      if (!email.includes('@')) {
        const { data: resolved } = await supabase.rpc('get_email_by_identifier', {
          p_identifier: email,
        });
        if (!resolved) {
          return { ok: false, error: 'No account found with that username or ID.' };
        }
        email = resolved as string;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error: 'Incorrect email or password.' };

      // Enforce portal role before allowing the session to activate
      if (expectedRole) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('email', email)
          .single();

        if (profile && profile.role !== expectedRole) {
          await supabase.auth.signOut();
          const actualName = profile.role.charAt(0).toUpperCase() + profile.role.slice(1);
          return {
            ok: false,
            error: `This account is registered as ${actualName}. Please use the ${actualName} portal to sign in.`,
          };
        }
      }

      // Role check passed — unblock the auth listener and load profile manually
      // (the onAuthStateChange event fired during signInWithPassword was held back by loggingInRef)
      loggingInRef.current = false;
      const { data: { session: s } } = await supabase.auth.getSession();
      if (s?.user) loadProfile(s.user);
      return { ok: true };
    } finally {
      loggingInRef.current = false;
    }
  }

  // ── logout ──────────────────────────────────────────────────
  async function logout() {
    await supabase.auth.signOut();
    queryClient.clear();
    // Explicitly wipe the persisted cache so a subsequent login never sees stale data
    await AsyncStorage.removeItem('@gt:query-cache');
  }

  // ── signup ──────────────────────────────────────────────────
  async function signup(
    data: SignupData,
  ): Promise<{ ok: boolean; error?: string; user?: StoredUser }> {
    signingUpRef.current = true;
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name:  data.firstName,
            last_name:   data.lastName,
            username:    data.username,
            role:        data.role,
            mobile:      data.mobile ?? null,
            department:  data.department ?? '',
            designation: data.designation ?? '',
          },
        },
      });

      if (error) {
        const msg = typeof error.message === 'string' && !error.message.startsWith('{')
          ? error.message
          : (error.status === 500 ? 'Sign up failed — please try a different email or username.' : 'Sign up failed. Please try again.');
        return { ok: false, error: msg };
      }
      if (!authData.user) return { ok: false, error: 'Signup failed — no user returned.' };

      // Profile is created automatically by the handle_new_user trigger.
      // Fetch it so we can return a StoredUser.
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      // Sign out the auto-created session so the app stays in the auth flow
      // and shows the "Account Created!" screen before the user logs in.
      await supabase.auth.signOut();

      const user = profile ? profileToStoredUser(profile) : undefined;
      return { ok: true, user };
    } finally {
      signingUpRef.current = false;
    }
  }

  // ── createUser (admin onboarding) ────────────────────────────
  // Delegates to the 'create-user' Edge Function so the service role key
  // stays server-side and never appears in the client bundle.
  async function createUser(
    data: Omit<SignupData, 'password'> & { tempPassword: string },
  ): Promise<StoredUser> {
    const { data: result, error } = await supabase.functions.invoke('create-user', {
      body: {
        email:       data.email,
        tempPassword: data.tempPassword,
        firstName:   data.firstName,
        lastName:    data.lastName,
        username:    data.username,
        role:        data.role,
        department:  data.department ?? '',
        designation: data.designation ?? '',
        mobile:      data.mobile ?? null,
      },
    });

    if (error) throw new Error(error.message);
    if (result?.error) throw new Error(result.error);
    if (!result?.profile) throw new Error('Profile not returned from server');

    const newUser = profileToStoredUser(result.profile);
    setUsers(prev => [...prev, newUser]);
    return newUser;
  }

  // ── updateUser ──────────────────────────────────────────────
  const updateUser = useCallback(async (userId: string, updates: Partial<StoredUser>) => {
    const dbUpdates: TablesUpdate<'profiles'> = {};
    if (updates.firstName !== undefined)  dbUpdates.first_name  = updates.firstName;
    if (updates.lastName !== undefined)   dbUpdates.last_name   = updates.lastName;
    if (updates.email !== undefined)      dbUpdates.email       = updates.email;
    if (updates.mobile !== undefined)     dbUpdates.mobile      = updates.mobile;
    if (updates.role !== undefined)       dbUpdates.role        = updates.role;
    if (updates.department !== undefined) dbUpdates.department  = updates.department;
    if (updates.designation !== undefined) dbUpdates.designation = updates.designation;
    if (updates.managerId !== undefined)  dbUpdates.manager_id  = updates.managerId;
    if (updates.status !== undefined)     dbUpdates.status      = updates.status;
    if (updates.pushToken !== undefined)  dbUpdates.push_token  = updates.pushToken;

    const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', userId);
    if (error) throw new Error(error.message);

    // Refresh local user lists
    setUsers(prev =>
      prev.map(u =>
        u.id === userId ? { ...u, ...updates, name: `${updates.firstName ?? u.firstName} ${updates.lastName ?? u.lastName}` } : u,
      ),
    );
    if (currentUserRef.current?.id === userId) {
      setCurrentUser(prev => {
        if (!prev) return prev;
        const f = updates.firstName ?? prev.firstName;
        const l = updates.lastName ?? prev.lastName;
        return { ...prev, ...updates, name: `${f} ${l}` };
      });
    }
  }, []);

  // ── removeUser ──────────────────────────────────────────────
  const removeUser = useCallback(async (userId: string) => {
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) throw new Error(error.message);
    // Hard-delete the auth.users row via Edge Function (requires service role)
    await supabase.functions.invoke('delete-user', { body: { userId } });
    setUsers(prev => prev.filter(u => u.id !== userId));
  }, []);

  // ── password reset ───────────────────────────────────────────
  // Supabase sends a 6-digit OTP to the user's email when type = 'email'.
  // In Supabase Dashboard → Auth → Email Templates, set the OTP email template
  // and ensure "Enable Email OTP" is on under Auth → Settings.
  async function resetPasswordRequest(
    email: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  // Step 2: verify OTP against the Supabase server.
  // verifyOtp() creates a temporary session — resettingPwdRef blocks onAuthStateChange from
  // calling loadProfile() so the app stays in the auth flow and does not navigate to dashboard.
  async function resetPasswordCheckOtp(
    email: string,
    otp: string,
  ): Promise<{ ok: boolean; error?: string }> {
    resettingPwdRef.current = true;
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'recovery' });
    if (error) {
      resettingPwdRef.current = false;
      return { ok: false, error: error.message };
    }
    // Leave resettingPwdRef.current = true until resetPasswordSetNewPassword() completes.
    return { ok: true };
  }

  // Step 3: update the password using the session from step 2, then sign out.
  // Signing out clears the auto-created session so the user must log in with their new password.
  async function resetPasswordSetNewPassword(
    newPassword: string,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        await supabase.auth.signOut();
        return { ok: false, error: error.message };
      }
      await supabase.auth.signOut();
      return { ok: true };
    } finally {
      resettingPwdRef.current = false;
    }
  }

  // Combined convenience function (kept for backward compatibility with existing callers).
  async function resetPasswordVerify(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const check = await resetPasswordCheckOtp(email, otp);
    if (!check.ok) return check;
    return resetPasswordSetNewPassword(newPassword);
  }

  // ── changePassword ───────────────────────────────────────────
  async function changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const email = currentUserRef.current?.email;
    if (!email) return { ok: false, error: 'Not authenticated.' };
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (signInError) return { ok: false, error: 'Current password is incorrect.' };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  // ── signOutAllDevices ─────────────────────────────────────────
  async function signOutAllDevices(): Promise<void> {
    bgWindowExpiresAtRef.current = 0;
    await supabase.auth.signOut({ scope: 'global' });
    queryClient.clear();
  }

  // ── username lookup ──────────────────────────────────────────
  async function getUsernameForEmail(email: string): Promise<string | null> {
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('email', email.toLowerCase())
      .single();
    return data?.username ?? null;
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        currentUser,
        isLoading,
        isAuthenticated: !!session,
        setBackgroundWindow,
        users,
        login,
        logout,
        signup,
        createUser,
        updateUser,
        removeUser,
        resetPasswordRequest,
        resetPasswordCheckOtp,
        resetPasswordSetNewPassword,
        resetPasswordVerify,
        getUsernameForEmail,
        changePassword,
        signOutAllDevices,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, LogBox, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GrowMark } from './src/components/GrowMark';
import { configureNotificationHandler } from './src/lib/push';
import { usePushNotifications } from './src/hooks/usePushNotifications';

configureNotificationHandler();

// Suppress the Expo dev LogBox overlay so it doesn't intercept E2E test taps
// In production, LogBox is a no-op anyway; guard here makes intent explicit
if (__DEV__) {
  LogBox.ignoreAllLogs();
}
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, asyncStoragePersister } from './src/lib/queryClient';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: string | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  componentDidCatch(err: Error) { this.setState({ error: err.message ?? String(err) }); }
  static getDerivedStateFromError(err: Error) { return { error: err.message ?? String(err) }; }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#7F1D1D', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>⚠ Something went wrong</Text>
          <Text style={{ color: '#FCA5A5', fontSize: 14, lineHeight: 20 }}>
            An unexpected error occurred. Please restart the app. If the problem persists, contact support.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppProvider } from './src/context/AppContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { ToastProvider } from './src/context/ToastContext';

// Auth screens
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';
import ForgotUsernameScreen from './src/screens/auth/ForgotUsernameScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import SignUpScreen from './src/screens/auth/SignUpScreen';
import SignUpSuccessScreen from './src/screens/auth/SignUpSuccessScreen';
import SplashScreen from './src/screens/auth/SplashScreen';

// App screens
import AdminDashboard from './src/screens/admin/AdminDashboard';
import OnboardEmployee from './src/screens/admin/OnboardEmployee';
import ManagerDashboard from './src/screens/manager/ManagerDashboard';
import ReviewEvidence from './src/screens/manager/ReviewEvidence';
import SetGoals from './src/screens/manager/SetGoals';
import TeamDailyLogs from './src/screens/manager/TeamDailyLogs';
import TeamOverview from './src/screens/manager/TeamOverview';
import DailyLogScreen from './src/screens/employee/DailyLogScreen';
import EmployeeDashboard from './src/screens/employee/EmployeeDashboard';
import GoalsList from './src/screens/employee/GoalsList';
import MyProgressScreen from './src/screens/employee/MyProgressScreen';
import SubmitEvidence from './src/screens/employee/SubmitEvidence';
import AIReportDetailScreen from './src/screens/shared/AIReportDetailScreen';
import AIReportsScreen from './src/screens/shared/AIReportsScreen';
import FYReportScreen from './src/screens/shared/FYReportScreen';
import NotificationsScreen from './src/screens/shared/NotificationsScreen';
import PrivacySecurityScreen from './src/screens/shared/PrivacySecurityScreen';
import ProfileScreen from './src/screens/shared/ProfileScreen';

import RoleSelector from './src/screens/RoleSelector';
import { NavParams, Role, Screen, ScreenProps, StackEntry } from './src/types';
import { isScreenAllowed } from './src/screenRoles';

// ---------- Auth flow (before login) ----------

type AuthView =
  | { kind: 'splash' }
  | { kind: 'login'; role: Role }
  | { kind: 'signup'; role: Role }
  | { kind: 'signup-success'; uniqueId: string; username: string; role: Role }
  | { kind: 'forgot-username'; role: Role }
  | { kind: 'forgot-password'; role: Role };

function AuthFlow({ onAuthenticated, initialRole }: { onAuthenticated: () => void; initialRole?: Role }) {
  const [view, setView] = useState<AuthView>(initialRole ? { kind: 'login', role: initialRole } : { kind: 'splash' });

  if (view.kind === 'splash') {
    return (
      <SplashScreen
        onSelectRole={role => setView({ kind: 'login', role })}
      />
    );
  }

  if (view.kind === 'login') {
    return (
      <LoginScreen
        role={view.role}
        onBack={() => setView({ kind: 'splash' })}
        onForgotUsername={() => setView({ kind: 'forgot-username', role: view.role })}
        onForgotPassword={() => setView({ kind: 'forgot-password', role: view.role })}
        onSignUp={() => setView({ kind: 'signup', role: view.role })}
        onSuccess={onAuthenticated}
      />
    );
  }

  if (view.kind === 'signup') {
    return (
      <SignUpScreen
        role={view.role}
        onBack={() => setView({ kind: 'login', role: view.role })}
        onSignIn={() => setView({ kind: 'login', role: view.role })}
        onSuccess={(userId, uniqueId, username) => {
          setView({ kind: 'signup-success', uniqueId, username, role: view.role });
        }}
      />
    );
  }

  if (view.kind === 'signup-success') {
    return (
      <SignUpSuccessScreen
        uniqueId={view.uniqueId}
        username={view.username}
        onContinue={() => setView({ kind: 'login', role: view.role })}
      />
    );
  }

  if (view.kind === 'forgot-username') {
    return (
      <ForgotUsernameScreen
        onBack={() => setView({ kind: 'login', role: view.role })}
      />
    );
  }

  if (view.kind === 'forgot-password') {
    return (
      <ForgotPasswordScreen
        onBack={() => setView({ kind: 'login', role: view.role })}
        onSuccess={() => setView({ kind: 'login', role: view.role })}
      />
    );
  }

  return null;
}

// ---------- Branded loading screen ----------

function BrandSplash() {
  const { colors, isDark } = useTheme();
  return (
    <View style={[splashStyles.root, { backgroundColor: colors.bg }]}>
      <GrowMark size={96} isDark={isDark} />
      <View style={splashStyles.textBlock}>
        <Text style={[splashStyles.name, { color: colors.textPrimary }]}>GrowTracker</Text>
        <Text style={[splashStyles.tagline, { color: colors.textMuted }]}>Track growth · Drive results</Text>
      </View>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  root:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
  textBlock: { alignItems: 'center', gap: 6 },
  name:      { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  tagline:   { fontSize: 13, letterSpacing: 0.3 },
});

// ---------- Main app (after login) ----------

const BG_TS_KEY = '@gt:bg_ts';
const BG_STACK_KEY = '@gt:bg_stack';
const BACKGROUND_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

function AppRoot() {
  const { currentUser, isLoading, logout, setBackgroundWindow, updateUser } = useAuth();
  const [stack, setStack] = useState<StackEntry[]>([]);
  const [authKey, setAuthKey] = useState(0);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [pendingSwitchRole, setPendingSwitchRole] = useState<Role | null>(null);
  const { register, pushToken } = usePushNotifications();

  // Register for push notifications when the user logs in
  useEffect(() => {
    if (!currentUser) return;
    register().catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // Persist the push token to the user's profile once obtained
  useEffect(() => {
    if (!currentUser || !pushToken) return;
    if (currentUser.pushToken === pushToken) return;
    updateUser(currentUser.id, { pushToken }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushToken, currentUser?.id]);

  // Stable refs so the AppState listener doesn't need to be recreated on every render
  const stackRef = useRef<StackEntry[]>([]);
  const logoutRef = useRef(logout);
  const setBackgroundWindowRef = useRef(setBackgroundWindow);
  const currentUserRef = useRef(currentUser);
  const bgTimestampRef = useRef(0);
  // Pending restore from a cold start (app killed while in background)
  const pendingStackRef = useRef<StackEntry[] | null>(null);
  const timedOutRef = useRef(false);

  useEffect(() => { stackRef.current = stack; }, [stack]);
  useEffect(() => { logoutRef.current = logout; }, [logout]);
  useEffect(() => { setBackgroundWindowRef.current = setBackgroundWindow; }, [setBackgroundWindow]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  // On mount: check for a saved background timestamp from a previous app kill.
  // If the app was killed while backgrounded and restarted within 2 min, restore the stack.
  // If it was killed after 2 min have elapsed, force-logout after auth loads.
  useEffect(() => {
    AsyncStorage.multiGet([BG_TS_KEY, BG_STACK_KEY])
      .then(([tsEntry, stackEntry]) => {
        const tsStr = tsEntry[1];
        const stackStr = stackEntry[1];
        if (!tsStr || !stackStr) return;
        const elapsed = Date.now() - parseInt(tsStr, 10);
        AsyncStorage.multiRemove([BG_TS_KEY, BG_STACK_KEY]).catch(() => {});
        if (elapsed < BACKGROUND_TIMEOUT_MS) {
          pendingStackRef.current = JSON.parse(stackStr) as StackEntry[];
        } else {
          timedOutRef.current = true;
        }
      })
      .catch(() => {});
  }, []);

  // Initialize nav stack when auth finishes loading.
  // Only runs when stack is empty to avoid resetting on spurious SIGNED_OUT/SIGNED_IN cycles.
  useEffect(() => {
    if (isLoading || !currentUser || stack.length > 0) return;

    // Cold-start timed out: force logout (user was away > 2 min before the OS killed the app)
    if (timedOutRef.current) {
      timedOutRef.current = false;
      logout();
      return;
    }

    // Cold-start restore: app was killed while backgrounded but came back within 2 min
    if (pendingStackRef.current && pendingStackRef.current.length > 0) {
      setStack(pendingStackRef.current);
      pendingStackRef.current = null;
      return;
    }

    // Normal fresh login → go to role dashboard
    const dashMap: Record<Role, Screen> = {
      admin: 'admin-dashboard',
      manager: 'manager-dashboard',
      employee: 'employee-dashboard',
    };
    setStack([{ screen: dashMap[currentUser.role] }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, currentUser]); // intentionally excludes `stack` to avoid reset loops

  // Background/foreground AppState listener (stable — reads live state via refs)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        bgTimestampRef.current = Date.now();
        // Tell AuthContext to suppress spurious SIGNED_OUT events for 2 minutes
        setBackgroundWindowRef.current(bgTimestampRef.current + BACKGROUND_TIMEOUT_MS);
        // Persist timestamp + stack so a killed-and-restarted app can restore
        AsyncStorage.multiSet([
          [BG_TS_KEY, String(bgTimestampRef.current)],
          [BG_STACK_KEY, JSON.stringify(stackRef.current)],
        ]).catch(() => {});
      } else if (nextState === 'active' && bgTimestampRef.current > 0) {
        const elapsed = Date.now() - bgTimestampRef.current;
        bgTimestampRef.current = 0;
        // Clean up persisted state — app is back in memory, no cold-start restore needed
        AsyncStorage.multiRemove([BG_TS_KEY, BG_STACK_KEY]).catch(() => {});
        if (elapsed >= BACKGROUND_TIMEOUT_MS && currentUserRef.current) {
          // Session expired — clear stack then sign out
          setStack([]);
          logoutRef.current();
        }
        // Within 2 min: stack and auth state are preserved in memory; no action needed
      }
    });
    return () => sub.remove();
  }, []); // Empty deps — intentional; all state accessed through stable refs

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 1) {
        setStack(prev => prev.slice(0, -1));
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [stack.length]);

  if (isLoading) {
    return <BrandSplash />;
  }

  if (!currentUser) {
    return (
      <AuthFlow
        key={authKey}
        onAuthenticated={() => {
          setPendingSwitchRole(null);
          setAuthKey(k => k + 1);
        }}
        initialRole={pendingSwitchRole ?? undefined}
      />
    );
  }

  function navigate(screen: Screen, params?: NavParams) {
    setStack(prev => {
      const last = prev[prev.length - 1];
      if (last?.screen === screen && JSON.stringify(last?.params ?? {}) === JSON.stringify(params ?? {})) return prev;
      return [...prev, { screen, params }];
    });
  }

  function goBack() {
    setStack(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }

  async function handleLogout() {
    setStack([]); // Clear stack before sign-out so re-login starts at dashboard
    await logout();
  }

  function handleSwitchAccount() {
    setSwitchingAccount(true);
  }

  async function handleRoleSelected(role: Role) {
    setSwitchingAccount(false);
    setPendingSwitchRole(role);
    setStack([]);
    await logout();
  }

  const current = stack[stack.length - 1];
  if (!current) return null;
  const { screen, params = {} } = current;

  const screenProps: ScreenProps = {
    navigation: { navigate, goBack },
    params,
    currentUserId: currentUser.id,
    currentRole: currentUser.role,
    onLogout: handleLogout,
    onSwitchAccount: handleSwitchAccount,
  };

  if (switchingAccount) {
    return <RoleSelector onRoleSelect={(role) => handleRoleSelected(role)} />;
  }

  return (
    <ThemedRoot screen={screen} screenProps={screenProps} />
  );
}

function ThemedRoot({ screen, screenProps }: { screen: Screen; screenProps: ScreenProps }) {
  const { isDark, colors } = useTheme();

  if (!isScreenAllowed(screen, screenProps.currentRole)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>🔒</Text>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 }}>
          Access Denied
        </Text>
        <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: 28 }}>
          You don't have permission to view this screen.
        </Text>
        <TouchableOpacity
          onPress={screenProps.navigation.goBack}
          style={{ backgroundColor: colors.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 }}
        >
          <Text style={{ color: colors.bg, fontWeight: '700', fontSize: 15 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View
        style={
          Platform.OS === 'web'
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? ({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, height: '100vh', backgroundColor: colors.bg } as any)
            : { flex: 1, backgroundColor: colors.bg }
        }
      >
        {screen === 'admin-dashboard'   && <AdminDashboard {...screenProps} />}
        {screen === 'onboard-employee'  && <OnboardEmployee {...screenProps} />}
        {screen === 'manager-dashboard' && <ManagerDashboard {...screenProps} />}
        {screen === 'team-overview'     && <TeamOverview {...screenProps} />}
        {screen === 'set-goals'         && <SetGoals {...screenProps} />}
        {screen === 'review-evidence'   && <ReviewEvidence {...screenProps} />}
        {screen === 'employee-dashboard'&& <EmployeeDashboard {...screenProps} />}
        {screen === 'goals-list'        && <GoalsList {...screenProps} />}
        {screen === 'submit-evidence'   && <SubmitEvidence {...screenProps} />}
        {screen === 'daily-log'         && <DailyLogScreen {...screenProps} />}
        {screen === 'team-daily-logs'   && <TeamDailyLogs {...screenProps} />}
        {screen === 'notifications'      && <NotificationsScreen {...screenProps} />}
        {screen === 'profile'            && <ProfileScreen {...screenProps} />}
        {screen === 'privacy-security'   && <PrivacySecurityScreen {...screenProps} />}
        {screen === 'fy-report'          && <FYReportScreen {...screenProps} />}
        {screen === 'my-progress'        && <MyProgressScreen {...screenProps} />}
        {screen === 'ai-reports'         && <AIReportsScreen {...screenProps} />}
        {screen === 'ai-report-detail'   && <AIReportDetailScreen {...screenProps} />}
        <View pointerEvents="none" style={{ position: 'absolute', bottom: 8, right: 12, zIndex: 0 }}>
          <Text style={{ fontSize: 9, color: 'rgba(150,150,150,0.4)', letterSpacing: 0.5, fontWeight: '500' }}>
            GrowTracker v1.0
          </Text>
        </View>
      </View>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: asyncStoragePersister }}
      >
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <AppProvider>
                <AppRoot />
              </AppProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

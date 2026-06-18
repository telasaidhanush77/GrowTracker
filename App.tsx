import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';

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
          <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>⚠ Render Error</Text>
          <Text style={{ color: '#FCA5A5', fontSize: 14, lineHeight: 20 }}>{this.state.error}</Text>
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
import FYReportScreen from './src/screens/shared/FYReportScreen';
import NotificationsScreen from './src/screens/shared/NotificationsScreen';
import ProfileScreen from './src/screens/shared/ProfileScreen';

import { NavParams, Role, Screen, ScreenProps, StackEntry } from './src/types';

// ---------- Auth flow (before login) ----------

type AuthView =
  | { kind: 'splash' }
  | { kind: 'login'; role: Role }
  | { kind: 'signup'; role: Role }
  | { kind: 'signup-success'; uniqueId: string; username: string; role: Role }
  | { kind: 'forgot-username'; role: Role }
  | { kind: 'forgot-password'; role: Role };

function AuthFlow({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [view, setView] = useState<AuthView>({ kind: 'splash' });
  const { users } = useAuth();

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
        onSuccess={(userId, uniqueId) => {
          const user = users.find(u => u.id === userId);
          setView({ kind: 'signup-success', uniqueId, username: user?.username ?? '', role: view.role });
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

// ---------- Main app (after login) ----------

function AppRoot() {
  const { currentUser, isLoading, logout } = useAuth();
  const [stack, setStack] = useState<StackEntry[]>([]);
  const [authKey, setAuthKey] = useState(0);

  useEffect(() => {
    if (!isLoading && currentUser) {
      const dashMap: Record<Role, Screen> = {
        admin: 'admin-dashboard',
        manager: 'manager-dashboard',
        employee: 'employee-dashboard',
      };
      setStack([{ screen: dashMap[currentUser.role] }]);
    }
  }, [isLoading, currentUser?.id]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 16, color: '#666' }}>Loading…</Text>
      </View>
    );
  }

  if (!currentUser) {
    return <AuthFlow key={authKey} onAuthenticated={() => setAuthKey(k => k + 1)} />;
  }

  function navigate(screen: Screen, params?: NavParams) {
    setStack(prev => [...prev, { screen, params }]);
  }

  function goBack() {
    setStack(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }

  async function handleLogout() {
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
  };

  return (
    <ThemedRoot screen={screen} screenProps={screenProps} />
  );
}

function ThemedRoot({ screen, screenProps }: { screen: Screen; screenProps: ScreenProps }) {
  const { isDark, colors } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View
        style={
          Platform.OS === 'web'
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
        {screen === 'notifications'     && <NotificationsScreen {...screenProps} />}
        {screen === 'profile'           && <ProfileScreen {...screenProps} />}
        {screen === 'fy-report'         && <FYReportScreen {...screenProps} />}
        {screen === 'my-progress'       && <MyProgressScreen {...screenProps} />}
        <View pointerEvents="none" style={{ position: 'absolute', bottom: 8, right: 12, zIndex: 0 }}>
          <Text style={{ fontSize: 9, color: 'rgba(150,150,150,0.4)', letterSpacing: 0.5, fontWeight: '500' }}>
            GrowTracker v1.0
          </Text>
        </View>
      </View>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AppProvider>
            <ToastProvider>
              <AppRoot />
            </ToastProvider>
          </AppProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

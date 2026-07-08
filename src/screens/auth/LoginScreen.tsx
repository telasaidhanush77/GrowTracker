import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { GrowMark } from '../../components/GrowMark';
import { RoleIcon } from '../../components/RoleIcon';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView,
  StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Radius, Shadow, Spacing } from '../../theme';
import type { ColorPalette } from '../../theme';
import { Role } from '../../types';

const LOCK_STORAGE_KEY = '@gt:login-lock';

// ---------- role meta ----------
const ROLE_META: Record<Role, { label: string; accent: (C: ColorPalette) => string; accentBg: (C: ColorPalette) => string }> = {
  admin:    { label: 'Admin',    accent: C => C.adminPrimary,    accentBg: C => C.adminLight    },
  manager:  { label: 'Manager',  accent: C => C.managerPrimary,  accentBg: C => C.managerLight  },
  employee: { label: 'Employee', accent: C => C.employeePrimary, accentBg: C => C.employeeLight },
};

interface Props {
  role: Role;
  onBack: () => void;
  onForgotUsername: () => void;
  onForgotPassword: () => void;
  onSignUp: () => void;
  onSuccess: () => void;
}

export default function LoginScreen({ role, onBack, onForgotUsername, onForgotPassword, onSignUp, onSuccess }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { login } = useAuth();
  const meta   = ROLE_META[role];
  const accent = meta.accent(colors);

  const [identifier, setIdentifier] = useState('');
  const [password,   setPassword]   = useState('');
  const [showPwd,    setShowPwd]     = useState(false);
  const [loading,    setLoading]     = useState(false);
  const [error,      setError]       = useState('');
  const [lockSecondsLeft, setLockSecondsLeft] = useState(0);

  const passwordRef      = useRef<TextInput>(null);
  const failureCountRef  = useRef(0);
  const lockedUntilRef   = useRef(0);
  const lockTimerRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (lockTimerRef.current) clearInterval(lockTimerRef.current);
    };
  }, []);

  // Restore any active lockout that persisted across navigation
  useEffect(() => {
    AsyncStorage.getItem(LOCK_STORAGE_KEY).then(raw => {
      if (!raw) return;
      try {
        const { failures, lockedUntil } = JSON.parse(raw) as { failures: number; lockedUntil: number };
        failureCountRef.current = failures;
        const remaining = lockedUntil - Date.now();
        if (remaining > 0) startLockCountdown(remaining, false);
      } catch { /* ignore malformed */ }
    });
  }, []);

  function startLockCountdown(ms: number, shouldPersist = true) {
    const lockedUntil = Date.now() + ms;
    lockedUntilRef.current = lockedUntil;
    if (shouldPersist) {
      AsyncStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify({
        failures: failureCountRef.current,
        lockedUntil,
      })).catch(() => {});
    }
    const initial = Math.ceil(ms / 1000);
    setLockSecondsLeft(initial);
    if (lockTimerRef.current) clearInterval(lockTimerRef.current);
    lockTimerRef.current = setInterval(() => {
      const remaining = Math.ceil((lockedUntilRef.current - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(lockTimerRef.current!);
        lockTimerRef.current = null;
        setLockSecondsLeft(0);
        setError('');
      } else {
        setLockSecondsLeft(remaining);
      }
    }, 1000);
  }

  function lockDurationMs(failures: number): number {
    if (failures >= 7) return 60_000;
    if (failures >= 5) return 30_000;
    if (failures >= 3) return 15_000;
    return 0;
  }

  const idFocusBorder  = identifier ? accent : colors.border;
  const pwdFocusBorder = password   ? accent : colors.border;

  async function handleLogin() {
    setError('');

    const remaining = Math.ceil((lockedUntilRef.current - Date.now()) / 1000);
    if (remaining > 0) {
      setError(`Too many failed attempts. Please wait ${remaining}s before trying again.`);
      return;
    }

    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    const result = await login(identifier, password, role);
    setLoading(false);
    if (result.ok) {
      failureCountRef.current = 0;
      AsyncStorage.removeItem(LOCK_STORAGE_KEY).catch(() => {});
      onSuccess();
    } else {
      failureCountRef.current += 1;
      const lockMs = lockDurationMs(failureCountRef.current);
      if (lockMs > 0) {
        startLockCountdown(lockMs);
        setError(`Too many failed attempts. Please wait ${Math.ceil(lockMs / 1000)}s before trying again.`);
      } else {
        setError(result.error ?? 'Login failed. Please try again.');
      }
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
        >
        {/* Back */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBack}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 16 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Brand lockup */}
        <View style={styles.brandRow}>
          <GrowMark size={48} isDark={isDark} />
          <View style={styles.brandText}>
            <Text style={styles.brandName}>GrowTracker</Text>
            <View style={[styles.rolePill, { backgroundColor: meta.accentBg(colors), borderColor: accent + '50' }]}>
              <RoleIcon role={role} size={13} color={accent} />
              <Text style={[styles.rolePillLabel, { color: accent }]}>{meta.label} Portal</Text>
            </View>
          </View>
        </View>

        {/* Heading */}
        <View style={styles.headingWrap}>
          <Text style={styles.heading}>Welcome to{'\n'}GrowTracker</Text>
          <Text style={styles.sub}>Set goals. Track progress. Grow every day.</Text>
        </View>

        {/* Error banner */}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorIcon}>⚠</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Username field */}
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, { borderColor: idFocusBorder }]}
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="Enter your email"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            blurOnSubmit={false}
            accessibilityLabel="Email"
          />
          <TouchableOpacity
            onPress={onForgotUsername}
            activeOpacity={0.7}
            style={styles.forgotWrap}
            accessibilityLabel="Forgot username"
            accessibilityRole="button"
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          >
            <Text style={[styles.forgotText, { color: accent }]}>Forgot username? →</Text>
          </TouchableOpacity>
        </View>

        {/* Password field */}
        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.pwdRow}>
            <TextInput
              ref={passwordRef}
              style={[styles.input, styles.pwdInput, { borderColor: pwdFocusBorder }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPwd}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              accessibilityLabel="Password"
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPwd(v => !v)}
              activeOpacity={0.7}
              accessibilityLabel={showPwd ? 'Hide password' : 'Show password'}
              accessibilityRole="button"
              hitSlop={{ top: 0, bottom: 0, left: 14, right: 14 }}
            >
              <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={onForgotPassword}
            activeOpacity={0.7}
            style={styles.forgotWrap}
            accessibilityLabel="Forgot password"
            accessibilityRole="button"
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          >
            <Text style={[styles.forgotText, { color: accent }]}>Forgot password? →</Text>
          </TouchableOpacity>
        </View>

        {/* Sign in */}
        <TouchableOpacity
          style={[styles.signInBtn, { backgroundColor: accent }, (loading || lockSecondsLeft > 0) && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading || lockSecondsLeft > 0}
          activeOpacity={0.85}
          accessibilityLabel={loading ? 'Signing in' : lockSecondsLeft > 0 ? `Locked out, wait ${lockSecondsLeft} seconds` : 'Sign in'}
          accessibilityRole="button"
          accessibilityState={{ disabled: loading || lockSecondsLeft > 0 }}
        >
          {loading
            ? <ActivityIndicator color={isDark ? '#0A0A0A' : '#FFFFFF'} />
            : <Text style={[styles.signInBtnText, { color: isDark ? '#0A0A0A' : '#FFFFFF' }]}>
                {lockSecondsLeft > 0 ? `Try again in ${lockSecondsLeft}s` : 'Sign In'}
              </Text>}
        </TouchableOpacity>

        {/* Sign up row — hidden for admin (accounts are provisioned, not self-registered) */}
        {role !== 'admin' && (
          <View style={styles.signUpRow}>
            <Text style={styles.signUpLabel}>Don't have an account?</Text>
            <TouchableOpacity
              onPress={onSignUp}
              activeOpacity={0.7}
              accessibilityLabel="Sign up for a new account"
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.signUpLink, { color: accent }]}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(C: ColorPalette, isDark: boolean) {
  // A subtle elevated panel for the form area
  const inputBg = isDark ? '#1E1E1E' : '#F7F8FA';

  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: C.bg },
    root: { flex: 1, backgroundColor: C.bg },
    content: {
      flexGrow: 1,
      padding: Spacing.xl,
      paddingTop: Platform.OS === 'android'
        ? (StatusBar.currentHeight ?? 24) + Spacing.lg
        : Spacing.lg,
      paddingBottom: Spacing.xxxl,
    },

    backBtn: { marginBottom: Spacing.xl, alignSelf: 'flex-start' },

    // Brand row (logo + name + role pill side by side)
    brandRow: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      marginBottom: Spacing.xxl,
    },
    brandText: { gap: 6 },
    brandName: {
      fontSize: 20, fontWeight: '900', color: C.textPrimary, letterSpacing: -0.5,
    },
    rolePill: {
      flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
      borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4,
      borderWidth: 1,
    },
    rolePillIcon: { fontSize: 12 }, // kept for any remaining references
    rolePillLabel: { fontSize: 12, fontWeight: '700' },

    // Heading
    headingWrap: { marginBottom: Spacing.xl },
    heading: {
      fontSize: 34, fontWeight: '900', color: C.textPrimary, letterSpacing: -1, marginBottom: 10, lineHeight: 40,
    },
    sub: { fontSize: 15, color: C.textMuted, lineHeight: 22, fontWeight: '500' },

    // Error
    errorBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: C.rejectedBg, borderRadius: Radius.md,
      padding: 12, marginBottom: Spacing.lg,
      borderWidth: 1, borderColor: C.rejected + '30',
    },
    errorIcon: { fontSize: 14, color: C.rejected },
    errorText: { flex: 1, fontSize: 13, fontWeight: '600', color: C.rejected, lineHeight: 18 },

    // Fields
    field: { marginBottom: 18 },
    label: {
      fontSize: 12, fontWeight: '700', color: C.textSecondary,
      marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6,
    },
    input: {
      backgroundColor: inputBg,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 14 : 12,
      fontSize: 15,
      color: C.textPrimary,
    },
    pwdRow: { position: 'relative' },
    pwdInput: { paddingRight: 50 },
    eyeBtn: {
      position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center',
    },
    forgotWrap: { alignSelf: 'flex-end', marginTop: 8 },
    forgotText: { fontSize: 12, fontWeight: '700' },

    // CTA
    signInBtn: {
      borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center',
      marginTop: 4, ...Shadow.md,
    },
    btnDisabled: { opacity: 0.55 },
    signInBtnText: { fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },

    // Sign up
    signUpRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 4,
      marginTop: Spacing.xl,
    },
    signUpLabel: { fontSize: 14, color: C.textMuted },
    signUpLink: { fontSize: 14, fontWeight: '800' },
  });
}

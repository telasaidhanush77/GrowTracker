import { useMemo, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Radius, Shadow, Spacing } from '../../theme';
import type { ColorPalette } from '../../theme';
import { Role } from '../../types';

// ---------- reuse the same brand mark ----------
function GrowMark({ size, isDark }: { size: number; isDark: boolean }) {
  const bg    = isDark ? '#ECECEC' : '#111111';
  const fg    = isDark ? '#0A0A0A' : '#FFFFFF';
  const bar   = Math.round(size * 0.13);
  const gap   = Math.round(size * 0.08);
  const padB  = Math.round(size * 0.17);
  const r     = Math.round(size * 0.26);
  const heights = [Math.round(size * 0.30), Math.round(size * 0.52), Math.round(size * 0.74)];

  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: bg, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: padB }}>
      <View style={{
        position: 'absolute',
        bottom: padB + heights[2] + Math.round(bar * 0.55),
        right: padB - bar * 0.1,
        width: Math.round(bar * 0.7), height: Math.round(bar * 0.7),
        borderRadius: bar, backgroundColor: fg, opacity: 0.55,
      }} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap }}>
        {heights.map((h, i) => (
          <View key={i} style={{ width: bar, height: h, backgroundColor: fg, borderRadius: bar }} />
        ))}
      </View>
    </View>
  );
}

// ---------- role meta ----------
const ROLE_META: Record<Role, { label: string; icon: string; accent: (C: ColorPalette) => string; accentBg: (C: ColorPalette) => string }> = {
  admin:    { label: 'Admin',    icon: '🛡',  accent: C => C.adminPrimary,    accentBg: C => C.adminLight    },
  manager:  { label: 'Manager',  icon: '👤',  accent: C => C.managerPrimary,  accentBg: C => C.managerLight  },
  employee: { label: 'Employee', icon: '📈',  accent: C => C.employeePrimary, accentBg: C => C.employeeLight },
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

  const idFocusBorder  = identifier ? accent : colors.border;
  const pwdFocusBorder = password   ? accent : colors.border;

  async function handleLogin() {
    setError('');
    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your username/email and password.');
      return;
    }
    setLoading(true);
    const result = await login(identifier, password);
    setLoading(false);
    if (result.ok) {
      onSuccess();
    } else {
      setError(result.error ?? 'Login failed. Please try again.');
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        {/* Brand lockup */}
        <View style={styles.brandRow}>
          <GrowMark size={48} isDark={isDark} />
          <View style={styles.brandText}>
            <Text style={styles.brandName}>GrowTracker</Text>
            <View style={[styles.rolePill, { backgroundColor: meta.accentBg(colors), borderColor: accent + '50' }]}>
              <Text style={styles.rolePillIcon}>{meta.icon}</Text>
              <Text style={[styles.rolePillLabel, { color: accent }]}>{meta.label} Portal</Text>
            </View>
          </View>
        </View>

        {/* Heading */}
        <View style={styles.headingWrap}>
          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.sub}>Sign in with your username, email, or unique ID</Text>
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
          <Text style={styles.label}>Username / Email / ID</Text>
          <TextInput
            style={[styles.input, { borderColor: idFocusBorder }]}
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="e.g. john.doe or EMP-0001"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity onPress={onForgotUsername} activeOpacity={0.7} style={styles.forgotWrap}>
            <Text style={[styles.forgotText, { color: accent }]}>Forgot username? →</Text>
          </TouchableOpacity>
        </View>

        {/* Password field */}
        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.pwdRow}>
            <TextInput
              style={[styles.input, styles.pwdInput, { borderColor: pwdFocusBorder }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPwd}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPwd(v => !v)} activeOpacity={0.7}>
              <Text style={styles.eyeIcon}>{showPwd ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={onForgotPassword} activeOpacity={0.7} style={styles.forgotWrap}>
            <Text style={[styles.forgotText, { color: accent }]}>Forgot password? →</Text>
          </TouchableOpacity>
        </View>

        {/* Sign in */}
        <TouchableOpacity
          style={[styles.signInBtn, { backgroundColor: accent }, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color={isDark ? '#0A0A0A' : '#FFFFFF'} />
            : <Text style={[styles.signInBtnText, { color: isDark ? '#0A0A0A' : '#FFFFFF' }]}>Sign In</Text>}
        </TouchableOpacity>

        {/* Sign up row */}
        <View style={styles.signUpRow}>
          <Text style={styles.signUpLabel}>Don't have an account?</Text>
          <TouchableOpacity onPress={onSignUp} activeOpacity={0.7}>
            <Text style={[styles.signUpLink, { color: accent }]}>  Sign Up</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(C: ColorPalette, isDark: boolean) {
  // A subtle elevated panel for the form area
  const formBg = isDark ? '#141414' : '#FFFFFF';
  const inputBg = isDark ? '#1E1E1E' : '#F7F8FA';

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    content: {
      flexGrow: 1,
      padding: Spacing.xl,
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.xxxl,
    },

    backBtn: { marginBottom: Spacing.xl },
    backText: { fontSize: 15, fontWeight: '600', color: C.textSecondary },

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
    rolePillIcon: { fontSize: 12 },
    rolePillLabel: { fontSize: 12, fontWeight: '700' },

    // Heading
    headingWrap: { marginBottom: Spacing.xl },
    heading: {
      fontSize: 28, fontWeight: '900', color: C.textPrimary, letterSpacing: -0.8, marginBottom: 6,
    },
    sub: { fontSize: 14, color: C.textMuted, lineHeight: 20 },

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
    eyeIcon: { fontSize: 18 },
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
      marginTop: Spacing.xl,
    },
    signUpLabel: { fontSize: 14, color: C.textMuted },
    signUpLink: { fontSize: 14, fontWeight: '800' },
  });
}

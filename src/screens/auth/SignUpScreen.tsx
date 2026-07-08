import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, DimensionValue, KeyboardAvoidingView, KeyboardTypeOptions,
  Platform, Pressable, SafeAreaView, ScrollView, StatusBar,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Radius, Shadow, Spacing } from '../../theme';
import type { ColorPalette } from '../../theme';
import { Role } from '../../types';

const ROLE_META: Record<Role, { label: string; icon: string; color: (C: ColorPalette) => string }> = {
  admin:    { label: 'Admin',    icon: '🛡',  color: C => C.adminPrimary    },
  manager:  { label: 'Manager',  icon: '👤',  color: C => C.managerPrimary  },
  employee: { label: 'Employee', icon: '📊',  color: C => C.employeePrimary },
};

function passwordStrength(pwd: string): { label: string; color: string; pct: number } {
  if (pwd.length < 8) return { label: 'Too short', color: '#EF4444', pct: 0 };
  let score = 0;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const map = [
    { label: 'Weak',   color: '#F97316', pct: 25 },
    { label: 'Fair',   color: '#EAB308', pct: 50 },
    { label: 'Fair',   color: '#EAB308', pct: 50 },
    { label: 'Good',   color: '#22C55E', pct: 75 },
    { label: 'Strong', color: '#10B981', pct: 100 },
  ];
  return map[Math.min(score, 4)];
}

interface Props {
  role: Role;
  onBack: () => void;
  onSuccess: (userId: string, uniqueId: string, username: string) => void;
  onSignIn: () => void;
}

export default function SignUpScreen({ role, onBack, onSuccess, onSignIn }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { signup } = useAuth();
  const meta = ROLE_META[role];
  const accent = meta.color(colors);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mobile, setMobile] = useState('');
  const [terms, setTerms] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const strength = passwordStrength(password);

  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef  = useRef<TextInput>(null);
  const emailRef     = useRef<TextInput>(null);
  const usernameRef  = useRef<TextInput>(null);
  const mobileRef    = useRef<TextInput>(null);
  const passwordRef  = useRef<TextInput>(null);
  const confirmRef   = useRef<TextInput>(null);

  function autoUsername() {
    if (!username && firstName) {
      setUsername((firstName.toLowerCase().trim() + (lastName ? '.' + lastName.toLowerCase().trim() : '')).replace(/\s+/g, ''));
    }
  }

  async function handleSignUp() {
    setError('');
    if (!firstName.trim() || !lastName.trim()) return setError('First and last name are required.');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) return setError('Please enter a valid email address.');
    if (!username.trim()) return setError('Username is required.');
    if (username.trim().length < 3) return setError('Username must be at least 3 characters.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (!/[A-Z]/.test(password)) return setError('Password must contain at least one uppercase letter.');
    if (!/[a-z]/.test(password)) return setError('Password must contain at least one lowercase letter.');
    if (!/[^A-Za-z0-9]/.test(password)) return setError('Password must contain at least one special character (e.g. @, #, !).');
    if (strength.pct < 75) return setError('Password is too weak. Use a mix of uppercase, lowercase, numbers, and special characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    if (!terms) return setError('Please accept the Terms & Conditions to continue.');

    setLoading(true);
    const result = await signup({ firstName, lastName, email, username, password, role, mobile });
    setLoading(false);

    if (result.ok && result.user) {
      onSuccess(result.user.id, result.user.employeeCode, result.user.username);
    } else {
      setError(result.error ?? 'Sign up failed. Please try again.');
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

        <View style={styles.headerWrap}>
          <View style={[styles.roleBadge, { backgroundColor: accent + '18', borderColor: accent + '40' }]}>
            <Text style={styles.roleBadgeIcon}>{meta.icon}</Text>
            <Text style={[styles.roleBadgeText, { color: accent }]}>{meta.label}</Text>
          </View>
          <Text style={styles.heading}>Create Account</Text>
          <Text style={styles.sub}>Fill in your details to get started</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Name row */}
        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput
              ref={firstNameRef}
              style={[styles.input, { borderColor: firstName ? accent + '80' : colors.border }]}
              value={firstName}
              onChangeText={setFirstName}
              onBlur={autoUsername}
              placeholder="First"
              placeholderTextColor={colors.textMuted}
              returnKeyType="next"
              onSubmitEditing={() => lastNameRef.current?.focus()}
              blurOnSubmit={false}
              accessibilityLabel="First name"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Last Name *</Text>
            <TextInput
              ref={lastNameRef}
              style={[styles.input, { borderColor: lastName ? accent + '80' : colors.border }]}
              value={lastName}
              onChangeText={setLastName}
              onBlur={autoUsername}
              placeholder="Last"
              placeholderTextColor={colors.textMuted}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              blurOnSubmit={false}
              accessibilityLabel="Last name"
            />
          </View>
        </View>

        <FieldInput ref={emailRef} label="Email Address *" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" accent={accent} colors={colors} styles={styles} returnKeyType="next" onSubmitEditing={() => usernameRef.current?.focus()} blurOnSubmit={false} />
        <FieldInput ref={usernameRef} label="Username *" value={username} onChangeText={setUsername} placeholder="e.g. john.doe" autoCapitalize="none" accent={accent} colors={colors} styles={styles} hint="Minimum 3 characters" returnKeyType="next" onSubmitEditing={() => mobileRef.current?.focus()} blurOnSubmit={false} />
        <FieldInput ref={mobileRef} label="Mobile Number" value={mobile} onChangeText={t => setMobile(t.replace(/[^0-9+\-\s()]/g, ''))} placeholder="+91 9876543210" keyboardType="phone-pad" accent={accent} colors={colors} styles={styles} returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} blurOnSubmit={false} />

        {/* Password */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Password *</Text>
          <View style={styles.pwdWrap}>
            <TextInput
              ref={passwordRef}
              style={[styles.input, styles.pwdInput, { borderColor: password ? accent + '80' : colors.border }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 8 characters"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPwd}
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
              blurOnSubmit={false}
              accessibilityLabel="Password"
              accessibilityHint="Minimum 8 characters"
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPwd(v => !v)}
              accessibilityLabel={showPwd ? 'Hide password' : 'Show password'}
              accessibilityRole="button"
              hitSlop={{ top: 0, bottom: 0, left: 14, right: 14 }}
            >
              <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.pwdRequirements}>
            Min. 8 characters · one uppercase (A–Z) · one lowercase (a–z) · one special character (@, #, !, etc.)
          </Text>
          {password.length > 0 && (
            <View style={styles.strengthRow}>
              <View style={styles.strengthTrack}>
                <View style={[styles.strengthFill, { width: `${strength.pct}%` as DimensionValue, backgroundColor: strength.color }]} />
              </View>
              <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
            </View>
          )}
        </View>

        {/* Confirm */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Confirm Password *</Text>
          <View style={styles.pwdWrap}>
            <TextInput
              ref={confirmRef}
              style={[styles.input, styles.pwdInput, {
                borderColor: confirm && confirm !== password ? colors.rejected : colors.border,
              }]}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Re-enter password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showConfirm}
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
              accessibilityLabel="Confirm password"
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowConfirm(v => !v)}
              accessibilityLabel={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
              accessibilityRole="button"
              hitSlop={{ top: 0, bottom: 0, left: 14, right: 14 }}
            >
              <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          {confirm.length > 0 && confirm !== password && (
            <Text style={[styles.hintText, { color: colors.rejected }]}>Passwords do not match</Text>
          )}
        </View>

        {/* Terms */}
        <Pressable
          style={styles.termsRow}
          onPress={() => setTerms(v => !v)}
          testID="terms-checkbox"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: terms }}
          accessibilityLabel="Accept Terms and Conditions"
        >
          <View style={[styles.checkbox, terms && { backgroundColor: accent, borderColor: accent }]}>
            {terms && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.termsText}>
            I accept the{' '}
            <Text style={[styles.termsLink, { color: accent }]}>Terms & Conditions</Text>
            {' '}and{' '}
            <Text style={[styles.termsLink, { color: accent }]}>Privacy Policy</Text>
          </Text>
        </Pressable>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: accent }, loading && styles.submitBtnDisabled]}
          onPress={handleSignUp}
          disabled={loading}
          activeOpacity={0.85}
          testID="create-account-btn"
          accessibilityLabel={loading ? 'Creating account' : 'Create account'}
          accessibilityRole="button"
          accessibilityState={{ disabled: loading }}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitBtnText}>Create Account</Text>}
        </TouchableOpacity>

        <View style={styles.signInRow}>
          <Text style={styles.signInRowText}>Already have an account?  </Text>
          <TouchableOpacity
            onPress={onSignIn}
            activeOpacity={0.7}
            accessibilityLabel="Already have an account? Sign in"
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.signInLink, { color: accent }]}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const FieldInput = forwardRef<TextInput, {
  label: string; value: string; onChangeText: (v: string) => void; placeholder: string;
  keyboardType?: KeyboardTypeOptions; autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'; accent: string; colors: ColorPalette;
  styles: ReturnType<typeof createStyles>; hint?: string;
  returnKeyType?: 'next' | 'done'; onSubmitEditing?: () => void; blurOnSubmit?: boolean;
}>(function FieldInput(
  { label, value, onChangeText, placeholder, keyboardType, autoCapitalize, accent, colors, styles, hint, returnKeyType, onSubmitEditing, blurOnSubmit },
  ref
) {
  const a11yLabel = label.replace(/\s*\*$/, '').trim();
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        style={[styles.input, { borderColor: value ? accent + '80' : colors.border }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'words'}
        autoCorrect={false}
        autoComplete="off"
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        blurOnSubmit={blurOnSubmit}
        accessibilityLabel={a11yLabel}
      />
      {hint && <Text style={styles.hintText}>{hint}</Text>}
    </View>
  );
});

function createStyles(C: ColorPalette) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: C.bg },
    root: { flex: 1, backgroundColor: C.bg },
    content: {
      padding: Spacing.xl,
      paddingTop: Platform.OS === 'android'
        ? (StatusBar.currentHeight ?? 24) + Spacing.lg
        : Spacing.lg,
      paddingBottom: 80,
    },

    backBtn: { marginBottom: Spacing.lg, alignSelf: 'flex-start' },

    headerWrap: { marginBottom: Spacing.lg },
    roleBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
      borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, marginBottom: 14,
    },
    roleBadgeIcon: { fontSize: 16 },
    roleBadgeText: { fontSize: 13, fontWeight: '700' },
    heading: { fontSize: 26, fontWeight: '900', color: C.textPrimary, letterSpacing: -0.5, marginBottom: 4 },
    sub: { fontSize: 14, color: C.textMuted },

    errorBox: { backgroundColor: C.rejectedBg, borderRadius: Radius.md, padding: 12, marginBottom: 14 },
    errorText: { fontSize: 13, color: C.rejected, fontWeight: '600' },

    row2: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    fieldWrap: { marginBottom: 14 },
    label: { fontSize: 13, fontWeight: '700', color: C.textSecondary, marginBottom: 6 },
    input: {
      backgroundColor: C.card, borderRadius: Radius.md, borderWidth: 1.5,
      paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 13 : 10,
      fontSize: 15, color: C.textPrimary, ...Shadow.sm,
    },
    hintText: { fontSize: 11, color: C.textMuted, marginTop: 4 },
    pwdRequirements: {
      fontSize: 11, color: C.textMuted, marginTop: 6, lineHeight: 17,
    },

    pwdWrap: { position: 'relative' },
    pwdInput: { paddingRight: 48 },
    eyeBtn: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },

    strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
    strengthTrack: { flex: 1, height: 4, backgroundColor: C.border, borderRadius: Radius.full, overflow: 'hidden' },
    strengthFill: { height: '100%', borderRadius: Radius.full },
    strengthLabel: { fontSize: 11, fontWeight: '700', minWidth: 50 },

    termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20 },
    checkbox: {
      width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.border,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
    },
    checkmark: { fontSize: 13, color: '#fff', fontWeight: '800' },
    termsText: { flex: 1, fontSize: 13, color: C.textSecondary, lineHeight: 20 },
    termsLink: { fontWeight: '700' },

    submitBtn: {
      borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center', ...Shadow.md,
    },
    submitBtnDisabled: { opacity: 0.6 },
    submitBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },

    signInRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.lg },
    signInRowText: { fontSize: 14, color: C.textMuted },
    signInLink: { fontSize: 14, fontWeight: '800' },
  });
}

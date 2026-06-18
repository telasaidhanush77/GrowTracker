import { useMemo, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Radius, Shadow, Spacing } from '../../theme';
import type { ColorPalette } from '../../theme';

function GrowMark({ size, isDark }: { size: number; isDark: boolean }) {
  const bg = isDark ? '#ECECEC' : '#111111';
  const fg = isDark ? '#0A0A0A' : '#FFFFFF';
  const bar = Math.round(size * 0.13);
  const gap = Math.round(size * 0.08);
  const padB = Math.round(size * 0.17);
  const heights = [Math.round(size * 0.30), Math.round(size * 0.52), Math.round(size * 0.74)];
  return (
    <View style={{ width: size, height: size, borderRadius: Math.round(size * 0.26), backgroundColor: bg, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: padB }}>
      <View style={{ position: 'absolute', bottom: padB + heights[2] + Math.round(bar * 0.55), right: padB - bar * 0.1, width: Math.round(bar * 0.7), height: Math.round(bar * 0.7), borderRadius: bar, backgroundColor: fg, opacity: 0.55 }} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap }}>
        {heights.map((h, i) => <View key={i} style={{ width: bar, height: h, backgroundColor: fg, borderRadius: bar }} />)}
      </View>
    </View>
  );
}

type Step = 'email' | 'otp' | 'reset' | 'done';

interface Props {
  onBack: () => void;
  onSuccess: () => void;
}

export default function ForgotPasswordScreen({ onBack, onSuccess }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { requestPasswordReset, verifyOTP, resetPassword } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [devOTP, setDevOTP] = useState('');   // shown on screen — remove when real email is wired
  const [otp, setOTP] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRequestOTP() {
    setError('');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    const res = await requestPasswordReset(email);
    setLoading(false);
    if (res.ok && res.otp) {
      setDevOTP(res.otp); // TODO: remove this when a real email service is configured
      setStep('otp');
    } else {
      setError(res.error ?? 'Failed to send OTP. Please try again.');
    }
  }

  async function handleVerifyOTP() {
    setError('');
    if (otp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP.');
      return;
    }
    setLoading(true);
    const valid = await verifyOTP(email, otp);
    setLoading(false);
    if (valid) {
      setStep('reset');
    } else {
      setError('Invalid or expired OTP. Please request a new one.');
    }
  }

  async function handleResetPassword() {
    setError('');
    if (newPwd.length < 8) return setError('Password must be at least 8 characters.');
    if (newPwd !== confirmPwd) return setError('Passwords do not match.');
    setLoading(true);
    const res = await resetPassword(email, otp, newPwd);
    setLoading(false);
    if (res.ok) {
      setStep('done');
    } else {
      setError(res.error ?? 'Reset failed. Please try again.');
    }
  }

  const stepLabel = { email: '1 of 3', otp: '2 of 3', reset: '3 of 3', done: 'Done' }[step];

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.backBtn} onPress={step === 'email' ? onBack : () => { setStep('email'); setError(''); }} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>‹ {step === 'email' ? 'Back' : 'Start Over'}</Text>
        </TouchableOpacity>

        <GrowMark size={52} isDark={isDark} />
        <Text style={styles.heading}>Reset Password</Text>
        <Text style={styles.stepLabel}>Step {stepLabel}</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Step 1: Email */}
        {step === 'email' && (
          <View style={styles.stepContent}>
            <Text style={styles.sub}>Enter your registered email address to receive a verification code.</Text>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleRequestOTP}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send Verification Code</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: OTP */}
        {step === 'otp' && (
          <View style={styles.stepContent}>
            <Text style={styles.sub}>Enter the 6-digit code sent to <Text style={styles.emailHighlight}>{email}</Text></Text>

            {/* TODO: Remove this dev block once a real email service (SendGrid, Resend, etc.) is integrated */}
            <View style={styles.devBox}>
              <Text style={styles.devTitle}>⚙ Development Mode</Text>
              <Text style={styles.devSub}>Your OTP (would normally be emailed):</Text>
              <Text style={styles.devOTP}>{devOTP}</Text>
            </View>

            <Text style={styles.label}>Verification Code</Text>
            <TextInput
              style={[styles.input, styles.otpInput]}
              value={otp}
              onChangeText={text => setOTP(text.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={6}
            />
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleVerifyOTP}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify Code</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.resendBtn} onPress={handleRequestOTP} activeOpacity={0.7}>
              <Text style={[styles.resendText, { color: colors.primary }]}>Didn't receive it? Resend</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3: New password */}
        {step === 'reset' && (
          <View style={styles.stepContent}>
            <Text style={styles.sub}>Choose a strong new password for your account.</Text>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.pwdWrap}>
              <TextInput
                style={[styles.input, styles.pwdInput]}
                value={newPwd}
                onChangeText={setNewPwd}
                placeholder="Min. 8 characters"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPwd}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPwd(v => !v)}>
                <Text style={styles.eyeIcon}>{showPwd ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
              style={[styles.input, confirmPwd.length > 0 && { borderColor: confirmPwd === newPwd ? colors.approved : colors.rejected }]}
              value={confirmPwd}
              onChangeText={setConfirmPwd}
              placeholder="Re-enter new password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPwd}
            />
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Reset Password</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Done */}
        {step === 'done' && (
          <View style={styles.doneCard}>
            <Text style={styles.doneIcon}>✓</Text>
            <Text style={styles.doneTitle}>Password Reset!</Text>
            <Text style={styles.doneSub}>Your password has been updated. You can now sign in with your new password.</Text>
            <TouchableOpacity style={styles.btn} onPress={onSuccess} activeOpacity={0.85}>
              <Text style={styles.btnText}>Go to Sign In</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(C: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    content: { flex: 1, padding: Spacing.xl },

    backBtn: { marginBottom: Spacing.xl },
    backBtnText: { fontSize: 16, color: C.textSecondary, fontWeight: '600' },

    heading: { fontSize: 26, fontWeight: '900', color: C.textPrimary, letterSpacing: -0.5, marginBottom: 4 },
    stepLabel: { fontSize: 12, fontWeight: '700', color: C.textMuted, marginBottom: Spacing.lg, textTransform: 'uppercase', letterSpacing: 1 },

    errorBox: { backgroundColor: C.rejectedBg, borderRadius: Radius.md, padding: 12, marginBottom: 16 },
    errorText: { fontSize: 13, color: C.rejected, fontWeight: '600' },

    stepContent: { flex: 1 },
    sub: { fontSize: 14, color: C.textMuted, lineHeight: 21, marginBottom: Spacing.lg },
    emailHighlight: { fontWeight: '700', color: C.textPrimary },
    label: { fontSize: 13, fontWeight: '700', color: C.textSecondary, marginBottom: 6, marginTop: 4 },
    input: {
      backgroundColor: C.card, borderRadius: Radius.md, borderWidth: 1.5, borderColor: C.border,
      paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 11,
      fontSize: 15, color: C.textPrimary, marginBottom: 16, ...Shadow.sm,
    },
    otpInput: { fontSize: 24, fontWeight: '800', letterSpacing: 8, textAlign: 'center' },
    pwdWrap: { position: 'relative' },
    pwdInput: { paddingRight: 48 },
    eyeBtn: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },
    eyeIcon: { fontSize: 18 },

    devBox: {
      backgroundColor: C.pendingBg, borderRadius: Radius.md, padding: 12, marginBottom: 16,
      borderWidth: 1, borderColor: C.pending + '40',
    },
    devTitle: { fontSize: 11, fontWeight: '800', color: C.pending, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    devSub: { fontSize: 12, color: C.textSecondary, marginBottom: 4 },
    devOTP: { fontSize: 28, fontWeight: '900', color: C.textPrimary, letterSpacing: 6 },

    btn: {
      backgroundColor: C.primary, borderRadius: Radius.lg,
      paddingVertical: 16, alignItems: 'center', ...Shadow.md,
    },
    btnDisabled: { opacity: 0.6 },
    btnText: { fontSize: 16, fontWeight: '800', color: '#fff' },

    resendBtn: { alignItems: 'center', marginTop: 14 },
    resendText: { fontSize: 13, fontWeight: '700' },

    doneCard: { alignItems: 'center', gap: 12, paddingTop: 20 },
    doneIcon: { fontSize: 52, color: C.approved },
    doneTitle: { fontSize: 22, fontWeight: '900', color: C.textPrimary },
    doneSub: { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 21, marginBottom: 8 },
  });
}

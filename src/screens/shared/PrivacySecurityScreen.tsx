import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Platform,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import type { ColorPalette } from '../../theme';
import { Radius, Shadow, Spacing } from '../../theme';
import type { ScreenProps } from '../../types';

type MFAFactor = { id: string; status: 'verified' | 'unverified' };
type Panel = 'password' | '2fa' | 'privacy' | 'terms' | null;

// ─── Document content ─────────────────────────────────────────────────────────

const PRIVACY_SECTIONS = [
  {
    heading: '1. Information We Collect',
    body: 'GrowTracker collects the following to operate the performance management platform:\n\n• Identity: full name, username, employee code, email address, mobile number\n• Organisational: job designation, department, reporting manager assignment\n• Performance: quarterly goals, evidence submissions, self-ratings, manager ratings and feedback, approval history\n• Activity: daily progress logs and goal completion records\n• Authentication: encrypted credentials managed by Supabase Auth',
  },
  {
    heading: '2. How We Use Your Information',
    body: 'Your data is used exclusively to:\n\n• Enable employees to set goals, track progress, and submit evidence\n• Allow reporting managers to review team performance and approve evidence\n• Allow administrators to manage onboarding, offboarding, and team structure\n• Generate quarterly and fiscal-year performance reports\n• Send in-app notifications about goal assignments and evidence reviews',
  },
  {
    heading: '3. Who Can See Your Data',
    body: '• You — full access to your own goals, logs, and performance scores\n• Your Reporting Manager — can view your goals, evidence, daily logs, and scores within your direct reporting relationship\n• Administrators — can view all employee profiles, goals, and reports to manage the organisation',
  },
  {
    heading: '4. Data Storage & Security',
    body: 'All data is stored on Supabase\'s secured cloud infrastructure. Data is encrypted in transit (TLS 1.2+) and at rest. Authentication credentials are never stored in plain text. Optional two-factor authentication (TOTP) is available for all accounts.',
  },
  {
    heading: '5. Data Retention',
    body: 'Your data is retained while your account is active. When an administrator offboards your account, profile and performance data is archived in line with your organisation\'s retention policy. You may request a review of your stored data by contacting your organisation\'s administrator.',
  },
  {
    heading: '6. No Third-Party Sharing',
    body: 'GrowTracker does not sell, rent, or share your personal data with third-party advertisers or marketers. Data is shared with infrastructure providers (e.g. Supabase) only to the extent necessary to operate the service, under equivalent data protection obligations.',
  },
  {
    heading: '7. Your Rights',
    body: 'You may request a copy or review of your personal data by contacting your organisation\'s administrator. If you believe your data has been processed incorrectly, raise the concern with your administrator or HR department.',
  },
];

const TERMS_SECTIONS = [
  {
    heading: '1. Acceptance of Terms',
    body: 'By accessing or using GrowTracker, you agree to be bound by these Terms and Conditions. If you do not agree, you must not use the application. Use of the platform constitutes acceptance on behalf of yourself and your employing organisation.',
  },
  {
    heading: '2. Purpose of the Platform',
    body: 'GrowTracker is a workplace performance management tool provided exclusively for corporate use within your organisation. It facilitates goal-setting, evidence submission, manager review, and performance reporting. It is not intended for personal use outside your employment relationship.',
  },
  {
    heading: '3. User Responsibilities',
    body: '• Provide accurate and truthful information in all goal submissions, evidence uploads, and daily logs\n• Keep your login credentials confidential — do not share your username or password\n• Do not attempt to access another user\'s account or data without explicit authorisation\n• Use the platform in compliance with your organisation\'s policies and applicable laws',
  },
  {
    heading: '4. Manager & Administrator Responsibilities',
    body: '• Evaluate performance fairly and provide objective, constructive feedback\n• Use account management features (onboarding, offboarding, role assignment) only for legitimate organisational purposes\n• Performance data must not be used for any purpose unrelated to the employee\'s professional development or formal review process',
  },
  {
    heading: '5. Evidence and Goal Submissions',
    body: 'Evidence submitted represents a truthful account of work completed by the employee. Submitting false or fabricated evidence is a violation of these terms and may result in disciplinary action by your organisation. Approved goals and evidence become part of the employee\'s formal performance record.',
  },
  {
    heading: '6. Prohibited Conduct',
    body: 'You must not:\n\n• Attempt to reverse-engineer, hack, or compromise the application\'s security\n• Use the platform to harass, defame, or harm any other user\n• Share access credentials with individuals who are not authorised users\n• Tamper with performance records or attempt to manipulate performance scores',
  },
  {
    heading: '7. Intellectual Property',
    body: 'GrowTracker and its content, design, and functionality are the property of the operating organisation. You are granted a limited, non-transferable licence to use the application solely for its intended purpose during your employment.',
  },
  {
    heading: '8. Limitation of Liability',
    body: 'GrowTracker is provided as a business productivity tool. The organisation operating this platform is not liable for employment decisions (hiring, promotion, termination) made on the basis of performance data, beyond what is required by applicable employment law.',
  },
  {
    heading: '9. Changes to Terms',
    body: 'These terms may be updated periodically to reflect changes in the platform or applicable regulations. Continued use following notification of changes constitutes acceptance of the revised terms. Contact your administrator for the most current version.',
  },
];

// ─── Styles ──────────────────────────────────────────────────────────────────

function createStyles(C: ColorPalette, isDark: boolean) {
  const inputBg = isDark ? '#1E1E1E' : '#F7F8FA';
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1 },
    content: { padding: Spacing.lg, paddingBottom: 48 },

    statusCard: {
      backgroundColor: C.card,
      borderRadius: Radius.xl,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: C.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      ...Shadow.md,
    },
    statusIconWrap: {
      width: 52, height: 52, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center',
    },
    statusRight: { flex: 1 },
    statusTitle: { fontSize: 16, fontWeight: '800', color: C.textPrimary, marginBottom: 6 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusDot: { width: 7, height: 7, borderRadius: 3.5 },
    statusLabel: { fontSize: 13, color: C.textSecondary, fontWeight: '500' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1 },
    statusBadgeText: { fontSize: 11, fontWeight: '700' },

    sectionLabel: {
      fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase',
      color: C.textMuted, marginTop: 4, marginBottom: 8, marginLeft: 2,
    },
    sectionRule: { height: 1, backgroundColor: C.divider, marginBottom: Spacing.sm },

    settingsGroup: {
      backgroundColor: C.card, borderRadius: Radius.lg, borderWidth: 1,
      borderColor: C.border, marginBottom: Spacing.lg, overflow: 'hidden', ...Shadow.sm,
    },
    row: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: Spacing.lg, paddingVertical: 13,
    },
    rowDivider: { height: 1, backgroundColor: C.divider, marginLeft: 62 },
    rowIconWrap: {
      width: 38, height: 38, borderRadius: Radius.full,
      backgroundColor: C.bgElevated, alignItems: 'center', justifyContent: 'center', marginRight: 13,
    },
    rowBody: { flex: 1 },
    rowLabel: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
    rowSublabel: { fontSize: 12, color: C.textMuted, marginTop: 1 },
    rowTrailBadge: {
      paddingHorizontal: 9, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1, marginLeft: 8,
    },
    rowTrailBadgeText: { fontSize: 11, fontWeight: '700' },

    panel: {
      backgroundColor: isDark ? '#1A1A1A' : '#F2F4F8',
      padding: Spacing.lg, paddingTop: Spacing.md,
      borderTopWidth: 1, borderTopColor: C.border,
    },
    panelTitle: { fontSize: 13, fontWeight: '700', color: C.textPrimary, marginBottom: Spacing.md },
    panelError: { fontSize: 12, color: C.rejected, marginBottom: Spacing.sm, fontWeight: '600' },
    panelHint: { fontSize: 12, color: C.textMuted, lineHeight: 17, marginBottom: Spacing.md },

    // Document panels
    docTitle: {
      fontSize: 15, fontWeight: '800', color: C.textPrimary, marginBottom: 3,
    },
    docMeta: {
      fontSize: 11, color: C.textMuted, marginBottom: Spacing.lg, fontWeight: '500',
    },
    docSection: { marginBottom: Spacing.md },
    docHeading: {
      fontSize: 12, fontWeight: '800', color: C.textPrimary,
      letterSpacing: 0.1, marginBottom: 5,
    },
    docBody: {
      fontSize: 12, color: C.textSecondary, lineHeight: 19,
    },
    docDivider: { height: 1, backgroundColor: C.divider, marginVertical: Spacing.sm },

    field: { marginBottom: 12 },
    fieldLabel: {
      fontSize: 11, fontWeight: '700', color: C.textSecondary,
      marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
    },
    inputWrap: { position: 'relative' },
    input: {
      backgroundColor: inputBg, borderRadius: Radius.md, borderWidth: 1.5,
      borderColor: C.border, paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 12 : 10, fontSize: 14, color: C.textPrimary,
    },
    inputWithEye: { paddingRight: 46 },
    eyeBtn: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },

    secretBox: {
      backgroundColor: inputBg, borderRadius: Radius.md, borderWidth: 1.5,
      borderColor: C.border, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 4,
    },
    secretText: {
      fontSize: 14, fontWeight: '700', color: C.textPrimary, letterSpacing: 1.5,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },

    openInAppBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
      borderRadius: Radius.md, paddingVertical: 11, marginBottom: Spacing.md,
      borderWidth: 1.5, borderColor: C.primary + '60', backgroundColor: C.primary + '10',
    },
    openInAppText: { fontSize: 13, fontWeight: '700', color: C.primary },

    panelBtn: {
      borderRadius: Radius.md, paddingVertical: 13,
      alignItems: 'center', marginTop: 4, ...Shadow.sm,
    },
    panelBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  });
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function PrivacySecurityScreen({
  navigation, currentUserId,
}: ScreenProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { changePassword, users } = useAuth();
  const { showToast } = useToast();

  const user = users.find(u => u.id === currentUserId);

  const [mfaFactors, setMfaFactors]         = useState<MFAFactor[]>([]);
  const [mfaInitLoading, setMfaInitLoading] = useState(true);
  const [enrollData, setEnrollData]         = useState<{ factorId: string; secret: string; uri: string } | null>(null);
  const [enrollLoading, setEnrollLoading]   = useState(false);

  const [panel, setPanel] = useState<Panel>(null);

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd]         = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurPwd, setShowCurPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError]     = useState('');

  const [totpCode, setTotpCode]       = useState('');
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpError, setTotpError]     = useState('');
  const [lastSignIn, setLastSignIn]   = useState<string | null>(null);

  const verifiedFactor = mfaFactors.find(f => f.status === 'verified');
  const is2FAEnabled   = !!verifiedFactor;

  useEffect(() => { loadMfa(); }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const ts = session?.user?.last_sign_in_at;
      if (ts) {
        const d = new Date(ts);
        setLastSignIn(d.toLocaleString('en-GB', {
          day: 'numeric', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        }));
      }
    });
  }, []);

  async function loadMfa() {
    setMfaInitLoading(true);
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      setMfaFactors((data?.totp ?? []) as MFAFactor[]);
    } catch { /* non-fatal — MFA may not be enabled in this Supabase project */ }
    setMfaInitLoading(false);
  }

  function openPanel(p: Panel) {
    if (panel === p) { setPanel(null); return; }
    setPwdError(''); setTotpError(''); setTotpCode('');
    setPanel(p);
    if (p === '2fa' && !is2FAEnabled) startEnrollment();
  }

  async function startEnrollment() {
    setEnrollData(null);
    setEnrollLoading(true);
    setTotpError('');
    try {
      const { data: fd } = await supabase.auth.mfa.listFactors();
      const unverified = ((fd?.totp ?? []) as MFAFactor[]).filter(f => f.status === 'unverified');
      await Promise.all(unverified.map(f => supabase.auth.mfa.unenroll({ factorId: f.id })));
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (error || !data) {
        setTotpError(error?.message ?? 'Failed to start 2FA setup. Ensure MFA is enabled in your Supabase project settings.');
        return;
      }
      setEnrollData({ factorId: data.id, secret: data.totp.secret, uri: data.totp.uri });
    } catch (e: unknown) {
      setTotpError(e instanceof Error ? e.message : 'Setup failed');
    } finally {
      setEnrollLoading(false);
    }
  }

  async function handleEnable2FA() {
    if (!enrollData) return;
    if (totpCode.trim().length < 6) {
      setTotpError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setTotpLoading(true);
    setTotpError('');
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: enrollData.factorId });
      if (chErr || !ch) throw new Error(chErr?.message ?? 'Challenge failed');
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: enrollData.factorId,
        challengeId: ch.id,
        code: totpCode.trim(),
      });
      if (vErr) { setTotpError('Incorrect code. Check your authenticator app and try again.'); return; }
      await loadMfa();
      setPanel(null); setEnrollData(null); setTotpCode('');
      showToast('Two-factor authentication enabled.', 'success', '2FA Enabled');
    } catch (e: unknown) {
      setTotpError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setTotpLoading(false);
    }
  }

  function handleDisable2FA() {
    if (!verifiedFactor) return;
    Alert.alert(
      'Disable 2FA',
      'This removes the extra security layer from your account. You can re-enable it anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disable', style: 'destructive', onPress: doDisable2FA },
      ]
    );
  }

  async function doDisable2FA() {
    if (!verifiedFactor) return;
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: verifiedFactor.id });
      if (error) { showToast(error.message, 'error'); return; }
      await loadMfa();
      showToast('Two-factor authentication disabled.', 'info', '2FA Disabled');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to disable 2FA.', 'error');
    }
  }

  async function handleChangePassword() {
    setPwdError('');
    if (!currentPwd || !newPwd || !confirmPwd) { setPwdError('All fields are required.'); return; }
    if (newPwd.length < 8) { setPwdError('New password must be at least 8 characters.'); return; }
    if (newPwd !== confirmPwd) { setPwdError('New passwords do not match.'); return; }
    if (newPwd === currentPwd) { setPwdError('New password must differ from your current password.'); return; }
    setPwdLoading(true);
    const res = await changePassword(currentPwd, newPwd);
    setPwdLoading(false);
    if (!res.ok) { setPwdError(res.error ?? 'Failed to update password.'); return; }
    setPanel(null); setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    showToast('Password updated successfully.', 'success', 'Password Changed');
  }

  async function openInAuthenticator() {
    if (!enrollData) return;
    try {
      const canOpen = await Linking.canOpenURL(enrollData.uri);
      if (canOpen) {
        await Linking.openURL(enrollData.uri);
      } else {
        Alert.alert('No Authenticator App Found', 'Install Google Authenticator or Authy, then enter the secret key manually.');
      }
    } catch {
      Alert.alert('Cannot Open', 'Enter the key manually in your authenticator app.');
    }
  }

  const shieldColor = is2FAEnabled ? colors.approved : colors.textMuted;

  return (
    <KeyboardAvoidingView style={styles.root} behavior="padding">
      <Header
        title="Privacy & Security"
        color={colors.bgElevated}
        accentColor={colors.primary}
        onBack={navigation.goBack}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >

        {/* ── Security Status Card ─────────────────────────────────────── */}
        <View style={styles.statusCard}>
          <View style={[styles.statusIconWrap, { backgroundColor: shieldColor + '18' }]}>
            <MaterialCommunityIcons
              name={is2FAEnabled ? 'shield-lock' : 'shield-lock-outline'}
              size={28}
              color={shieldColor}
            />
          </View>
          <View style={styles.statusRight}>
            <Text style={styles.statusTitle}>Account Security</Text>
            {mfaInitLoading ? (
              <ActivityIndicator size="small" color={colors.textMuted} />
            ) : (
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: is2FAEnabled ? colors.approved : colors.textMuted }]} />
                <Text style={styles.statusLabel}>Two-Factor Auth</Text>
                <View style={[styles.statusBadge, {
                  backgroundColor: is2FAEnabled ? colors.approvedBg : colors.bgElevated,
                  borderColor: is2FAEnabled ? colors.approved + '50' : colors.border,
                }]}>
                  <Text style={[styles.statusBadgeText, { color: is2FAEnabled ? colors.approved : colors.textMuted }]}>
                    {is2FAEnabled ? 'Enabled' : 'Disabled'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* ── Authentication ───────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Authentication</Text>
        <View style={styles.sectionRule} />

        <View style={styles.settingsGroup}>

          {/* Change Password */}
          <TouchableOpacity style={styles.row} onPress={() => openPanel('password')} activeOpacity={0.7}>
            <View style={styles.rowIconWrap}>
              <MaterialCommunityIcons name="lock-reset" size={20} color={colors.primary} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>Change Password</Text>
              <Text style={styles.rowSublabel}>Update your account password</Text>
            </View>
            <MaterialCommunityIcons
              name={panel === 'password' ? 'chevron-up' : 'chevron-down'}
              size={20} color={colors.textMuted}
            />
          </TouchableOpacity>

          {panel === 'password' && (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Change Password</Text>
              {pwdError ? <Text style={styles.panelError}>{pwdError}</Text> : null}

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Current Password</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={[styles.input, styles.inputWithEye]}
                    value={currentPwd} onChangeText={setCurrentPwd}
                    placeholder="Enter current password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showCurPwd} autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowCurPwd(v => !v)}>
                    <MaterialCommunityIcons name={showCurPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>New Password</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={[styles.input, styles.inputWithEye]}
                    value={newPwd} onChangeText={setNewPwd}
                    placeholder="Minimum 8 characters"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showNewPwd} autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNewPwd(v => !v)}>
                    <MaterialCommunityIcons name={showNewPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Confirm New Password</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPwd} onChangeText={setConfirmPwd}
                  placeholder="Re-enter new password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[styles.panelBtn, { backgroundColor: pwdLoading ? colors.primary + '70' : colors.primary }]}
                onPress={handleChangePassword} disabled={pwdLoading} activeOpacity={0.85}
              >
                {pwdLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.panelBtnText}>Update Password</Text>}
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.rowDivider} />

          {/* Two-Factor Auth */}
          <TouchableOpacity
            style={styles.row}
            onPress={is2FAEnabled ? handleDisable2FA : () => openPanel('2fa')}
            activeOpacity={0.7}
          >
            <View style={[styles.rowIconWrap, { backgroundColor: is2FAEnabled ? colors.approvedBg : colors.bgElevated }]}>
              <MaterialCommunityIcons
                name="cellphone-key" size={20}
                color={is2FAEnabled ? colors.approved : colors.textMuted}
              />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>Two-Factor Authentication</Text>
              <Text style={styles.rowSublabel}>
                {is2FAEnabled ? 'Active — tap to disable' : 'Add an extra layer of security'}
              </Text>
            </View>
            {mfaInitLoading ? (
              <ActivityIndicator size="small" color={colors.textMuted} />
            ) : (
              <>
                <View style={[styles.rowTrailBadge, {
                  backgroundColor: is2FAEnabled ? colors.approvedBg : colors.bgElevated,
                  borderColor: is2FAEnabled ? colors.approved + '50' : colors.border,
                }]}>
                  <Text style={[styles.rowTrailBadgeText, { color: is2FAEnabled ? colors.approved : colors.textMuted }]}>
                    {is2FAEnabled ? 'ON' : 'OFF'}
                  </Text>
                </View>
                {!is2FAEnabled && (
                  <MaterialCommunityIcons
                    name={panel === '2fa' ? 'chevron-up' : 'chevron-down'}
                    size={20} color={colors.textMuted} style={{ marginLeft: 4 }}
                  />
                )}
              </>
            )}
          </TouchableOpacity>

          {panel === '2fa' && !is2FAEnabled && (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Set Up Two-Factor Authentication</Text>
              {enrollLoading ? (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={[styles.panelHint, { textAlign: 'center', marginTop: 10 }]}>Preparing your authenticator setup…</Text>
                </View>
              ) : totpError && !enrollData ? (
                <>
                  <Text style={styles.panelError}>{totpError}</Text>
                  <TouchableOpacity style={[styles.panelBtn, { backgroundColor: colors.primary }]} onPress={startEnrollment}>
                    <Text style={styles.panelBtnText}>Try Again</Text>
                  </TouchableOpacity>
                </>
              ) : enrollData ? (
                <>
                  <Text style={styles.panelHint}>
                    Open your authenticator app (Google Authenticator, Authy, or any TOTP app) and add a new account.
                  </Text>
                  <TouchableOpacity style={styles.openInAppBtn} onPress={openInAuthenticator} activeOpacity={0.8}>
                    <MaterialCommunityIcons name="qrcode-scan" size={16} color={colors.primary} />
                    <Text style={styles.openInAppText}>Open in Authenticator App</Text>
                  </TouchableOpacity>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Secret Key — Enter Manually</Text>
                    <View style={styles.secretBox}>
                      <TextInput style={styles.secretText} value={enrollData.secret} editable={false} selectTextOnFocus multiline={false} />
                    </View>
                    <Text style={[styles.panelHint, { marginBottom: 0 }]}>Long-press the key above to copy it into your authenticator app.</Text>
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Verification Code</Text>
                    <TextInput
                      style={styles.input}
                      value={totpCode}
                      onChangeText={t => setTotpCode(t.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit code"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad" maxLength={6}
                    />
                    <Text style={[styles.panelHint, { marginBottom: 0, marginTop: 4 }]}>Enter the code shown in your authenticator app.</Text>
                  </View>
                  {totpError ? <Text style={styles.panelError}>{totpError}</Text> : null}
                  <TouchableOpacity
                    style={[styles.panelBtn, { backgroundColor: (totpLoading || totpCode.length < 6) ? colors.approved + '60' : colors.approved }]}
                    onPress={handleEnable2FA} disabled={totpLoading || totpCode.length < 6} activeOpacity={0.85}
                  >
                    {totpLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.panelBtnText}>Verify & Enable 2FA</Text>}
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          )}
        </View>

        {/* ── Device & Session ─────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Device & Session</Text>
        <View style={styles.sectionRule} />

        <View style={styles.settingsGroup}>
          <View style={styles.row}>
            <View style={styles.rowIconWrap}>
              <MaterialCommunityIcons
                name={Platform.OS === 'ios' ? 'apple' : Platform.OS === 'android' ? 'android' : 'web'}
                size={20} color={colors.textSecondary}
              />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>Platform</Text>
              <Text style={styles.rowSublabel}>
                {Platform.OS === 'ios' ? 'Apple iOS' : Platform.OS === 'android' ? 'Android' : 'Web browser'}
              </Text>
            </View>
            <View style={[styles.rowTrailBadge, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
              <Text style={[styles.rowTrailBadgeText, { color: colors.textMuted }]}>
                {Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web'}
              </Text>
            </View>
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.row}>
            <View style={styles.rowIconWrap}>
              <MaterialCommunityIcons name="at" size={20} color={colors.textSecondary} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>Sign-in Method</Text>
              <Text style={styles.rowSublabel}>Email and password</Text>
            </View>
            <View style={[styles.rowTrailBadge, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
              <Text style={[styles.rowTrailBadgeText, { color: colors.textMuted }]}>Email</Text>
            </View>
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.row}>
            <View style={styles.rowIconWrap}>
              <MaterialCommunityIcons name="clock-outline" size={20} color={colors.textSecondary} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>Last Signed In</Text>
              <Text style={styles.rowSublabel}>{lastSignIn ?? 'Current session'}</Text>
            </View>
          </View>
        </View>

        {/* ── Privacy & Documents ──────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Privacy & Documents</Text>
        <View style={styles.sectionRule} />

        <View style={styles.settingsGroup}>

          {/* Linked Email */}
          <View style={styles.row}>
            <View style={styles.rowIconWrap}>
              <MaterialCommunityIcons name="email-outline" size={20} color={colors.textMuted} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>Linked Email</Text>
              <Text style={styles.rowSublabel} numberOfLines={1}>{user?.email ?? '—'}</Text>
            </View>
          </View>

          <View style={styles.rowDivider} />

          {/* Privacy Policy */}
          <TouchableOpacity style={styles.row} onPress={() => openPanel('privacy')} activeOpacity={0.7}>
            <View style={styles.rowIconWrap}>
              <MaterialCommunityIcons name="shield-check-outline" size={20} color={colors.textSecondary} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>Privacy Policy</Text>
              <Text style={styles.rowSublabel}>How we collect, use and protect your data</Text>
            </View>
            <MaterialCommunityIcons
              name={panel === 'privacy' ? 'chevron-up' : 'chevron-down'}
              size={20} color={colors.textMuted}
            />
          </TouchableOpacity>

          {panel === 'privacy' && (
            <View style={styles.panel}>
              <Text style={styles.docTitle}>GrowTracker Privacy Policy</Text>
              <Text style={styles.docMeta}>Effective 1 January 2025  ·  Version 1.0</Text>
              {PRIVACY_SECTIONS.map((s, i) => (
                <View key={i} style={styles.docSection}>
                  {i > 0 && <View style={styles.docDivider} />}
                  <Text style={styles.docHeading}>{s.heading}</Text>
                  <Text style={styles.docBody}>{s.body}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.rowDivider} />

          {/* Terms & Conditions */}
          <TouchableOpacity style={styles.row} onPress={() => openPanel('terms')} activeOpacity={0.7}>
            <View style={styles.rowIconWrap}>
              <MaterialCommunityIcons name="file-document-outline" size={20} color={colors.textSecondary} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>Terms & Conditions</Text>
              <Text style={styles.rowSublabel}>Rules and obligations for using GrowTracker</Text>
            </View>
            <MaterialCommunityIcons
              name={panel === 'terms' ? 'chevron-up' : 'chevron-down'}
              size={20} color={colors.textMuted}
            />
          </TouchableOpacity>

          {panel === 'terms' && (
            <View style={styles.panel}>
              <Text style={styles.docTitle}>GrowTracker Terms & Conditions</Text>
              <Text style={styles.docMeta}>Effective 1 January 2025  ·  Version 1.0</Text>
              {TERMS_SECTIONS.map((s, i) => (
                <View key={i} style={styles.docSection}>
                  {i > 0 && <View style={styles.docDivider} />}
                  <Text style={styles.docHeading}>{s.heading}</Text>
                  <Text style={styles.docBody}>{s.body}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

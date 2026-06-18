import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AnimatedButton } from '../../components/AnimatedButton';
import Header from '../../components/Header';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { Radius, Shadow, Spacing } from '../../theme';
import type { ColorPalette } from '../../theme';
import { ScreenProps } from '../../types';

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function genTempPassword(): string {
  // Generate a readable temporary password: Gt + 6 random digits
  const n = Math.floor(100000 + Math.random() * 900000);
  return `Gt@${n}`;
}

export default function OnboardEmployee({ navigation }: ScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { employees, addNotification } = useApp();
  const { createUser, updateUser } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [managerId, setManagerId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // After successful onboarding, show credentials
  const [credentials, setCredentials] = useState<{ code: string; password: string; username: string } | null>(null);

  const managers = employees.filter(e => e.role === 'manager');

  async function handleSubmit() {
    if (!name.trim() || !email.trim() || !designation.trim() || !department.trim() || !managerId) {
      showToast('Please fill in all fields and select a reporting manager.', 'error', 'Missing Fields');
      return;
    }

    const emailTrimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      showToast('Please enter a valid email address.', 'error', 'Invalid Email');
      return;
    }

    if (employees.some(e => e.email.toLowerCase() === emailTrimmed)) {
      showToast('An account with this email already exists.', 'error', 'Duplicate Email');
      return;
    }

    setSubmitting(true);

    try {
      const { firstName, lastName } = splitName(name);
      const username = (firstName.toLowerCase() + '.' + lastName.toLowerCase()).replace(/\s+/g, '');
      const tempPassword = genTempPassword();

      const newUser = await createUser({
        firstName,
        lastName,
        email: emailTrimmed,
        username,
        role: 'employee',
        designation: designation.trim(),
        department: department.trim(),
        tempPassword,
      });

      // Set managerId and status to onboarding (signup defaults to active/null)
      await updateUser(newUser.id, {
        managerId,
        status: 'onboarding',
      });

      const manager = employees.find(e => e.id === managerId);
      addNotification({
        recipientId: managerId,
        type: 'onboarding_complete',
        title: 'New Employee Onboarded',
        message: `${newUser.name} has been added to your team. Please set their goals within the first two weeks.`,
        read: false,
        createdAt: new Date().toISOString(),
        relatedEmployeeId: newUser.id,
      });
      addNotification({
        recipientId: newUser.id,
        type: 'onboarding_complete',
        title: 'Welcome to GrowTracker! 👋',
        message: `You've been onboarded${manager ? ` and ${manager.name} has been assigned as your reporting manager` : ''}. Your manager will set your goals soon.`,
        read: false,
        createdAt: new Date().toISOString(),
        relatedEmployeeId: newUser.id,
      });

      setCredentials({ code: newUser.employeeCode, password: tempPassword, username: newUser.username });
      showToast(`${newUser.name} (${newUser.employeeCode}) has been onboarded successfully.`, 'success', 'Employee Onboarded');
    } catch (err: any) {
      showToast(err?.message ?? 'Onboarding failed. Please try again.', 'error', 'Error');
    } finally {
      setSubmitting(false);
    }
  }

  // Credentials reveal screen after success
  if (credentials) {
    return (
      <View style={styles.root}>
        <Header
          title="Onboard Employee"
          subtitle="New hire setup"
          color={colors.bgElevated}
          accentColor={colors.adminPrimary}
          onBack={navigation.goBack}
        />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.successCard}>
            <Text style={styles.successIcon}>🎉</Text>
            <Text style={styles.successTitle}>Employee Onboarded!</Text>
            <Text style={styles.successSub}>
              Share these credentials securely with the new hire. They can use them to sign in.
            </Text>

            <View style={styles.credBox}>
              <View style={styles.credRow}>
                <Text style={styles.credLabel}>Unique ID</Text>
                <Text style={styles.credValue}>{credentials.code}</Text>
              </View>
              <View style={styles.credDivider} />
              <View style={styles.credRow}>
                <Text style={styles.credLabel}>Username</Text>
                <Text style={styles.credValue}>{credentials.username}</Text>
              </View>
              <View style={styles.credDivider} />
              <View style={styles.credRow}>
                <Text style={styles.credLabel}>Temp Password</Text>
                <Text style={[styles.credValue, { color: colors.adminPrimary }]}>{credentials.password}</Text>
              </View>
            </View>

            <Text style={styles.credHint}>
              The employee should change their password after first login.
            </Text>

            <TouchableOpacity style={styles.doneBtn} onPress={navigation.goBack} activeOpacity={0.85}>
              <Text style={styles.doneBtnText}>Done →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        title="Onboard Employee"
        subtitle="New hire setup"
        color={colors.bgElevated}
        accentColor={colors.adminPrimary}
        onBack={navigation.goBack}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.infoCard}>
          <View style={[styles.infoIcon, { backgroundColor: colors.adminLight }]}>
            <Text style={{ fontSize: 18 }}>📋</Text>
          </View>
          <Text style={styles.infoText}>
            Fill in the new hire's details. A unique ID and temporary password will be generated automatically.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Personal Details</Text>
        <Field label="Full Name *">
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Jamie Patel"
            placeholderTextColor={colors.textMuted}
          />
        </Field>
        <Field label="Work Email *">
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="jamie.patel@company.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Field>

        <Text style={styles.sectionTitle}>Role & Team</Text>
        <Field label="Designation *">
          <TextInput
            style={styles.input}
            value={designation}
            onChangeText={setDesignation}
            placeholder="e.g. Software Engineer"
            placeholderTextColor={colors.textMuted}
          />
        </Field>
        <Field label="Department *">
          <TextInput
            style={styles.input}
            value={department}
            onChangeText={setDepartment}
            placeholder="e.g. Engineering"
            placeholderTextColor={colors.textMuted}
          />
        </Field>

        <Text style={styles.sectionTitle}>Reporting Manager *</Text>
        {managers.length === 0 ? (
          <View style={styles.emptyManagerWrap}>
            <Text style={styles.emptyManagerText}>
              No managers found. Please onboard a manager account first.
            </Text>
          </View>
        ) : (
          <View style={styles.managerGrid}>
            {managers.map(m => {
              const isSelected = managerId === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.managerCard, isSelected && styles.managerCardActive]}
                  onPress={() => setManagerId(m.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.managerAvatar,
                      { backgroundColor: isSelected ? colors.adminPrimary : colors.adminLight },
                    ]}
                  >
                    <Text
                      style={[
                        styles.managerAvatarText,
                        { color: isSelected ? '#fff' : colors.adminPrimary },
                      ]}
                    >
                      {m.avatarInitials}
                    </Text>
                  </View>
                  <Text style={[styles.managerName, isSelected && { color: colors.adminPrimary }]}>
                    {m.name}
                  </Text>
                  <Text style={styles.managerDept}>{m.department}</Text>
                  {isSelected && (
                    <View style={styles.selectedBadge}>
                      <Text style={styles.selectedBadgeText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <AnimatedButton
          style={submitting ? [styles.submitBtn, styles.submitBtnDisabled] : styles.submitBtn}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitBtnText}>
            {submitting ? 'Onboarding…' : 'Onboard Employee →'}
          </Text>
        </AnimatedButton>

        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>{label}</Text>
      {children}
    </View>
  );
}

function createStyles(C: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    content: { padding: Spacing.lg },

    infoCard: {
      backgroundColor: C.adminLight,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.xl,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      borderWidth: 1,
      borderColor: C.adminPrimary + '30',
    },
    infoIcon: {
      width: 36, height: 36, borderRadius: Radius.md,
      alignItems: 'center', justifyContent: 'center',
    },
    infoText: { flex: 1, fontSize: 13, color: C.adminPrimary, lineHeight: 19 },

    sectionTitle: {
      fontSize: 11, fontWeight: '700', color: C.textMuted,
      textTransform: 'uppercase', letterSpacing: 1,
      marginTop: 16, marginBottom: 10,
    },
    input: {
      backgroundColor: C.bgElevated, borderRadius: Radius.md, borderWidth: 1,
      borderColor: C.border, paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 12 : 10,
      fontSize: 15, color: C.textPrimary,
    },

    emptyManagerWrap: {
      backgroundColor: C.pendingBg, borderRadius: Radius.md, padding: 14,
      borderWidth: 1, borderColor: C.pending + '30', marginBottom: 12,
    },
    emptyManagerText: { fontSize: 13, color: C.textSecondary, lineHeight: 19 },

    managerGrid: { flexDirection: 'row', gap: 10, marginBottom: 12, flexWrap: 'wrap' },
    managerCard: {
      flex: 1, minWidth: 120, backgroundColor: C.card, borderRadius: Radius.lg,
      padding: Spacing.md, alignItems: 'center', borderWidth: 1.5, borderColor: C.border,
      ...Shadow.sm, position: 'relative',
    },
    managerCardActive: { borderColor: C.adminPrimary, backgroundColor: C.adminLight },
    managerAvatar: {
      width: 52, height: 52, borderRadius: Radius.full,
      alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    },
    managerAvatarText: { fontSize: 20, fontWeight: '700' },
    managerName: { fontSize: 13, fontWeight: '600', color: C.textPrimary, textAlign: 'center' },
    managerDept: { fontSize: 11, color: C.textMuted, textAlign: 'center', marginTop: 2 },
    selectedBadge: {
      position: 'absolute', top: 8, right: 8,
      width: 22, height: 22, borderRadius: Radius.full,
      backgroundColor: C.adminPrimary, alignItems: 'center', justifyContent: 'center',
    },
    selectedBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },

    submitBtn: {
      backgroundColor: C.adminPrimary, borderRadius: Radius.lg,
      paddingVertical: 16, alignItems: 'center', marginTop: Spacing.lg, ...Shadow.md,
    },
    submitBtnDisabled: { opacity: 0.6 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    // Credentials screen
    successCard: {
      alignItems: 'center', paddingTop: 24,
    },
    successIcon: { fontSize: 52, marginBottom: 12 },
    successTitle: { fontSize: 22, fontWeight: '900', color: C.textPrimary, marginBottom: 8 },
    successSub: { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },

    credBox: {
      width: '100%', backgroundColor: C.approvedBg, borderRadius: Radius.lg,
      padding: Spacing.lg, borderWidth: 1, borderColor: C.approved + '40', marginBottom: 14,
    },
    credRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    credDivider: { height: 1, backgroundColor: C.approved + '25', marginVertical: 4 },
    credLabel: { fontSize: 12, fontWeight: '700', color: C.textMuted },
    credValue: { fontSize: 16, fontWeight: '900', color: C.textPrimary },
    credHint: { fontSize: 12, color: C.textMuted, textAlign: 'center', lineHeight: 18, marginBottom: 28 },

    doneBtn: {
      width: '100%', backgroundColor: C.adminPrimary, borderRadius: Radius.lg,
      paddingVertical: 16, alignItems: 'center', ...Shadow.md,
    },
    doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  });
}

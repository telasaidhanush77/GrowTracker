import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  KeyboardTypeOptions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Header from '../../components/Header';
import { RoleIcon } from '../../components/RoleIcon';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import type { ColorPalette } from '../../theme';
import { Radius, Shadow, Spacing, Typography } from '../../theme';
import { ScreenProps } from '../../types';
import { calcQuarterScore, formatDate, getGoalStats } from '../../utils';

// ─── Style factories ─────────────────────────────────────────────────────────

function createStyles(C: ColorPalette, isDark: boolean) {
  const inputBg = isDark ? '#1E1E1E' : '#F7F8FA';
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1 },
    content: { padding: Spacing.lg, paddingBottom: 48 },

    identityCard: {
      backgroundColor: C.card,
      borderRadius: Radius.xl,
      padding: Spacing.xxl,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: Spacing.lg,
      ...Shadow.md,
    },
    avatarWrap: {
      width: 84,
      height: 84,
      borderRadius: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      overflow: 'hidden',
      marginBottom: 14,
    },
    cameraStrip: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 24,
      backgroundColor: 'rgba(0,0,0,0.52)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    fullName: { ...Typography.h2, color: C.textPrimary, marginBottom: 3 },
    designation: { fontSize: 14, color: C.textSecondary, marginBottom: 10 },
    badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 12 },
    roleBadge: {
      borderRadius: Radius.xs, paddingHorizontal: 10, paddingVertical: 4,
      borderWidth: 1, backgroundColor: C.bgElevated, borderColor: C.border,
    },
    roleBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6, color: C.textSecondary },
    deptBadge: {
      borderRadius: Radius.xs, paddingHorizontal: 10, paddingVertical: 4,
      borderWidth: 1, backgroundColor: C.bgElevated, borderColor: C.border,
    },
    deptBadgeText: { fontSize: 10, fontWeight: '600', color: C.textMuted },

    editBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 14, paddingVertical: 7,
      borderRadius: Radius.full, borderWidth: 1,
      borderColor: C.border, backgroundColor: C.bgElevated,
    },
    editBtnText: { fontSize: 12, fontWeight: '600', color: C.textMuted },

    editPanel: {
      backgroundColor: C.card, borderRadius: Radius.lg,
      padding: Spacing.lg, marginTop: -Spacing.sm, marginBottom: Spacing.lg,
      borderWidth: 1, borderColor: C.border, ...Shadow.sm,
    },
    editPanelTitle: { fontSize: 14, fontWeight: '800', color: C.textPrimary, marginBottom: Spacing.md },
    editError: { fontSize: 12, color: C.rejected, marginBottom: 10, fontWeight: '600' },
    editInput: {
      backgroundColor: inputBg, borderRadius: Radius.md, borderWidth: 1.5,
      borderColor: C.border, paddingHorizontal: 12,
      paddingVertical: Platform.OS === 'ios' ? 11 : 9,
      fontSize: 14, color: C.textPrimary, marginBottom: 10,
    },
    editFieldLabel: {
      fontSize: 11, fontWeight: '700', color: C.textMuted,
      marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5,
    },
    saveBtn: { borderRadius: Radius.md, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
    saveBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },

    infoCard: {
      backgroundColor: C.card, borderRadius: Radius.lg,
      paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg,
      borderWidth: 1, borderColor: C.border, ...Shadow.sm,
    },
    infoDivider: { height: 1, backgroundColor: C.divider },

    perfCard: {
      backgroundColor: C.card, borderRadius: Radius.lg, padding: Spacing.md,
      flexDirection: 'row', gap: 16, marginBottom: Spacing.lg,
      borderWidth: 1, borderColor: C.border, ...Shadow.md,
    },
    perfScoreWrap: { alignItems: 'center', justifyContent: 'center', minWidth: 80, gap: 4 },
    perfScoreNum: { fontSize: 36, fontWeight: '800', color: C.textPrimary, letterSpacing: -1 },
    perfScoreLabel: { fontSize: 9, color: C.textMuted, fontWeight: '600', textAlign: 'center' },
    perfRight: { flex: 1, justifyContent: 'center' },
    perfBlockDivider: { height: 1, backgroundColor: C.divider, marginVertical: 2 },

    sectionLabel: {
      fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase',
      color: C.textMuted, marginTop: 4, marginBottom: 8, marginLeft: 2,
    },
    sectionRule: { height: 1, backgroundColor: C.divider, marginBottom: Spacing.sm },

    settingsGroup: {
      backgroundColor: C.card, borderRadius: Radius.lg,
      borderWidth: 1, borderColor: C.border,
      marginBottom: Spacing.lg, overflow: 'hidden', ...Shadow.sm,
    },
    settingsRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: Spacing.lg, paddingVertical: 13, backgroundColor: C.card,
    },
    settingsRowDivider: { height: 1, backgroundColor: C.divider, marginLeft: 62 },
    settingsIconWrap: {
      width: 38, height: 38, borderRadius: Radius.full,
      backgroundColor: C.bgElevated, alignItems: 'center',
      justifyContent: 'center', marginRight: 13,
    },
    settingsIconText: { fontSize: 17 },
    settingsLabelCol: { flex: 1 },
    settingsLabel: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
    settingsSublabel: { fontSize: 12, color: C.textMuted, marginTop: 1 },
    settingsArrow: { fontSize: 22, color: C.textMuted, marginLeft: 6 },
    settingsDangerLabel: { fontSize: 14, fontWeight: '600', color: C.rejected },
    trailBadge: {
      backgroundColor: C.bgElevated, borderRadius: Radius.full,
      paddingHorizontal: 10, paddingVertical: 3,
      borderWidth: 1, borderColor: C.border, marginLeft: 8,
    },
    trailBadgeText: { fontSize: 11, fontWeight: '600', color: C.textMuted },

    dangerGroup: {
      backgroundColor: C.card, borderRadius: Radius.lg,
      borderWidth: 1, borderColor: C.rejectedBg,
      marginBottom: Spacing.lg, overflow: 'hidden', ...Shadow.sm,
    },
    signOutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
    signOutText: { fontSize: 15, fontWeight: '700', color: C.rejected },
  });
}

function createInfoStyles(C: ColorPalette) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    label: { flex: 1, fontSize: 12, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
    value: { fontSize: 13, fontWeight: '600', color: C.textPrimary, textAlign: 'right', flex: 2 },
  });
}

function createPerfStyles(C: ColorPalette) {
  return StyleSheet.create({
    block: { flex: 1, alignItems: 'center', paddingVertical: 6 },
    value: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
    label: { fontSize: 10, color: C.textMuted, fontWeight: '600', marginTop: 3 },
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  const { colors } = useTheme();
  const s = useMemo(() => createInfoStyles(colors), [colors]);
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <Text style={[s.value, highlight ? { color: highlight } : null]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function PerfBlock({ label, value, color }: { label: string; value: string; color: string }) {
  const { colors } = useTheme();
  const s = useMemo(() => createPerfStyles(colors), [colors]);
  return (
    <View style={s.block}>
      <Text style={[s.value, { color }]}>{value}</Text>
      <Text style={s.label}>{label}</Text>
    </View>
  );
}

type SettingsItemProps = {
  icon: string; label: string; sublabel?: string; onPress?: () => void;
  danger?: boolean; trailBadge?: string; showArrow?: boolean;
};

function SettingsItem({ icon, label, sublabel, onPress, danger, trailBadge, showArrow = true }: SettingsItemProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  return (
    <TouchableOpacity style={styles.settingsRow} onPress={onPress} activeOpacity={onPress ? 0.6 : 1}>
      <View style={styles.settingsIconWrap}>
        <Text style={styles.settingsIconText}>{icon}</Text>
      </View>
      <View style={styles.settingsLabelCol}>
        <Text style={danger ? styles.settingsDangerLabel : styles.settingsLabel}>{label}</Text>
        {sublabel ? <Text style={styles.settingsSublabel}>{sublabel}</Text> : null}
      </View>
      {trailBadge ? <View style={styles.trailBadge}><Text style={styles.trailBadgeText}>{trailBadge}</Text></View> : null}
      {showArrow && !danger ? <Text style={styles.settingsArrow}>›</Text> : null}
    </TouchableOpacity>
  );
}

function SectionLabel({ title }: { title: string }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  return (
    <>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.sectionRule} />
    </>
  );
}

function EditField({
  label, value, onChange, keyboardType = 'default', autoCapitalize = 'words',
}: {
  label: string; value: string; onChange: (v: string) => void;
  keyboardType?: KeyboardTypeOptions; autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  const { colors, isDark } = useTheme();
  const inputBg = isDark ? '#1E1E1E' : '#F7F8FA';
  return (
    <View>
      <Text style={{
        fontSize: 11, fontWeight: '700' as const, color: colors.textMuted,
        marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: 0.5,
      }}>
        {label}
      </Text>
      <TextInput
        style={{
          backgroundColor: inputBg, borderRadius: Radius.md, borderWidth: 1.5,
          borderColor: colors.border, paddingHorizontal: 12,
          paddingVertical: Platform.OS === 'ios' ? 11 : 9,
          fontSize: 14, color: colors.textPrimary, marginBottom: 10,
        }}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen({
  navigation,
  currentUserId,
  currentRole,
  onLogout,
  onSwitchAccount,
}: ScreenProps) {
  const { employees, goals, notifications } = useApp();
  const { updateUser, users: authUsers } = useAuth();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  // authUsers is StoredUser[] — has firstName/lastName/mobile; employees is Employee[] (for manager lookup)
  const user = authUsers.find(u => u.id === currentUserId);
  const manager = employees.find(e => e.id === user?.managerId);

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editFirst, setEditFirst] = useState('');
  const [editLast, setEditLast] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editDesig, setEditDesig] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!currentUserId) return;
    AsyncStorage.getItem(`@gt:avatar_${currentUserId}`).then(uri => {
      if (uri) setAvatarUri(uri);
    });
  }, [currentUserId]);

  function openEdit() {
    if (!user) return;
    setEditFirst(user.firstName);
    setEditLast(user.lastName);
    setEditMobile(user.mobile ?? '');
    setEditDept(user.department);
    setEditDesig(user.designation);
    setSaveError('');
    setEditOpen(true);
  }

  function handlePickAvatar() {
    Alert.alert('Profile Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: pickFromCamera },
      { text: 'Choose from Library', onPress: pickFromLibrary },
      ...(avatarUri ? [{ text: 'Remove Photo', style: 'destructive' as const, onPress: removeAvatar }] : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }

  async function pickFromLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as const,
      allowsEditing: true,
      aspect: [1, 1] as [number, number],
      quality: 0.7,
    });
    if (!result.canceled && currentUserId) {
      const uri = result.assets[0].uri;
      setAvatarUri(uri);
      AsyncStorage.setItem(`@gt:avatar_${currentUserId}`, uri);
    }
  }

  async function pickFromCamera() {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission Required', 'Allow camera access in your device settings to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1] as [number, number],
      quality: 0.7,
    });
    if (!result.canceled && currentUserId) {
      const uri = result.assets[0].uri;
      setAvatarUri(uri);
      AsyncStorage.setItem(`@gt:avatar_${currentUserId}`, uri);
    }
  }

  function removeAvatar() {
    setAvatarUri(null);
    if (currentUserId) AsyncStorage.removeItem(`@gt:avatar_${currentUserId}`);
  }

  async function handleSaveProfile() {
    if (!editFirst.trim() || !editLast.trim()) { setSaveError('First and last name are required.'); return; }
    if (!editDept.trim() || !editDesig.trim()) { setSaveError('Department and designation are required.'); return; }
    setSaving(true);
    setSaveError('');
    try {
      await updateUser(currentUserId!, {
        firstName: editFirst.trim(),
        lastName: editLast.trim(),
        mobile: editMobile.trim() || undefined,
        department: editDept.trim(),
        designation: editDesig.trim(),
      });
      setEditOpen(false);
      showToast('Profile updated successfully.', 'success', 'Profile Updated');
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Update failed.');
    } finally {
      setSaving(false);
    }
  }

  const myGoals   = goals.filter(g => g.employeeId === currentUserId);
  const q1Stats   = getGoalStats(myGoals, 'Q1');
  const q2Stats   = getGoalStats(myGoals, 'Q2');
  const q1Score   = calcQuarterScore(myGoals, 'Q1');
  const q2Score   = calcQuarterScore(myGoals, 'Q2');
  const totalGoals    = myGoals.length;
  const approvedGoals = q1Stats.approved + q2Stats.approved;
  const overallRate   = totalGoals > 0 ? Math.round((approvedGoals / totalGoals) * 100) : 0;
  const unreadNotifs  = notifications.filter(n => n.recipientId === currentUserId && !n.read).length;

  const roleLabel =
    currentRole === 'admin' ? 'Administrator' :
    currentRole === 'manager' ? 'Reporting Manager' : 'Employee';
  const roleAccent =
    currentRole === 'admin' ? colors.adminPrimary :
    currentRole === 'manager' ? colors.managerPrimary : colors.employeePrimary;
  const statusColor =
    user?.status === 'active' ? colors.approved :
    user?.status === 'onboarding' ? colors.pending : colors.textMuted;
  const statusLabel =
    user?.status === 'onboarding' ? 'Onboarding' :
    user?.status === 'active' ? 'Active' : 'Completed FY';

  if (!user) return null;

  return (
    <KeyboardAvoidingView style={styles.root} behavior="padding">
      <Header
        title="Profile & Settings"
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

        {/* ── Identity Card ─────────────────────────────────────────── */}
        <View style={styles.identityCard}>
          <TouchableOpacity
            style={[styles.avatarWrap, { borderColor: statusColor, backgroundColor: roleAccent + '12' }]}
            onPress={handlePickAvatar}
            activeOpacity={0.8}
          >
            {avatarUri
              ? <Image source={{ uri: avatarUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              : <RoleIcon role={currentRole ?? 'employee'} size={44} color={roleAccent} />
            }
            <View style={styles.cameraStrip}>
              <MaterialCommunityIcons name="camera" size={13} color="#fff" />
            </View>
          </TouchableOpacity>

          <Text style={styles.fullName}>{user.name}</Text>
          <Text style={styles.designation}>{user.designation}</Text>

          <View style={styles.badgeRow}>
            <View style={[styles.roleBadge, { backgroundColor: roleAccent + '14', borderColor: roleAccent + '40', flexDirection: 'row', alignItems: 'center', gap: 5 }]}>
              <RoleIcon role={currentRole ?? 'employee'} size={11} color={roleAccent} />
              <Text style={[styles.roleBadgeText, { color: roleAccent }]}>{roleLabel.toUpperCase()}</Text>
            </View>
            <View style={styles.deptBadge}>
              <Text style={styles.deptBadgeText}>{user.department}</Text>
            </View>
            <View style={[styles.deptBadge, { borderColor: statusColor }]}>
              <Text style={[styles.deptBadgeText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.editBtn}
            onPress={editOpen ? () => setEditOpen(false) : openEdit}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name={editOpen ? 'close' : 'pencil-outline'} size={13} color={colors.textMuted} />
            <Text style={styles.editBtnText}>{editOpen ? 'Cancel' : 'Edit Profile'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Edit Profile Panel ────────────────────────────────────── */}
        {editOpen && (
          <View style={styles.editPanel}>
            <Text style={styles.editPanelTitle}>Edit Profile</Text>
            {saveError ? <Text style={styles.editError}>{saveError}</Text> : null}
            <EditField label="First Name" value={editFirst} onChange={setEditFirst} />
            <EditField label="Last Name" value={editLast} onChange={setEditLast} />
            <EditField label="Mobile" value={editMobile} onChange={setEditMobile} keyboardType="phone-pad" autoCapitalize="none" />
            <EditField label="Department" value={editDept} onChange={setEditDept} />
            <EditField label="Designation" value={editDesig} onChange={setEditDesig} />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: saving ? colors.primary + '70' : colors.primary }]}
              onPress={handleSaveProfile}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Save Changes</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* ── Info Card ─────────────────────────────────────────────── */}
        <View style={styles.infoCard}>
          <InfoRow label="Email" value={user.email} />
          <View style={styles.infoDivider} />
          <InfoRow label="Employee Code" value={user.employeeCode ?? '—'} />
          <View style={styles.infoDivider} />
          <InfoRow label="Mobile" value={user.mobile ?? 'Not set'} />
          <View style={styles.infoDivider} />
          <InfoRow label="Join Date" value={formatDate(user.joinDate)} />
          {manager ? (
            <>
              <View style={styles.infoDivider} />
              <InfoRow label="Reports To" value={`${manager.name} · ${manager.designation}`} />
            </>
          ) : null}
        </View>

        {/* ── Performance Card (employee only) ──────────────────────── */}
        {currentRole === 'employee' && totalGoals > 0 ? (
          <View style={styles.perfCard}>
            <View style={styles.perfScoreWrap}>
              <Text style={styles.perfScoreNum}>{overallRate}%</Text>
              <Text style={styles.perfScoreLabel}>APPROVAL{'\n'}RATE</Text>
            </View>
            <View style={styles.perfRight}>
              <PerfBlock label="Q1 Score" value={q1Score > 0 ? `${q1Score}%` : '—'} color={colors.textPrimary} />
              <View style={styles.perfBlockDivider} />
              <PerfBlock label="Q2 Score" value={q2Score > 0 ? `${q2Score}%` : '—'} color={colors.textSecondary} />
              <View style={styles.perfBlockDivider} />
              <PerfBlock label="Goals Done" value={`${approvedGoals}/${totalGoals}`} color={colors.approved} />
            </View>
          </View>
        ) : null}

        {/* ── Preferences ───────────────────────────────────────────── */}
        <SectionLabel title="Preferences" />
        <View style={styles.settingsGroup}>
          <SettingsItem
            icon="🔔"
            label="Notifications"
            sublabel={unreadNotifs > 0 ? `${unreadNotifs} unread` : 'All caught up'}
            onPress={() => navigation.navigate('notifications')}
            trailBadge={unreadNotifs > 0 ? String(unreadNotifs) : undefined}
          />
        </View>

        {/* ── Account ───────────────────────────────────────────────── */}
        <SectionLabel title="Account" />
        <View style={styles.settingsGroup}>
          {onSwitchAccount ? (
            <>
              <SettingsItem icon="🔄" label="Switch Account" sublabel="Log in as a different user" onPress={onSwitchAccount} />
              <View style={styles.settingsRowDivider} />
            </>
          ) : null}
          <SettingsItem
            icon="🔑"
            label="Change Password"
            sublabel="Update your account password"
            onPress={() => navigation.navigate('privacy-security')}
          />
          <View style={styles.settingsRowDivider} />
          <SettingsItem
            icon="🔒"
            label="Privacy & Security"
            sublabel="2FA, privacy policy & terms"
            onPress={() => navigation.navigate('privacy-security')}
          />
        </View>

        {/* ── Support ───────────────────────────────────────────────── */}
        <SectionLabel title="Support" />
        <View style={styles.settingsGroup}>
          <SettingsItem
            icon="💬"
            label="Help & Support"
            sublabel="Get help or contact us"
            onPress={() => Alert.alert(
              'Help & Support',
              'For assistance with GrowTracker, please contact your organisation\'s administrator.\n\nEmail: support@growtracker.app\n\nWe aim to respond within 1–2 business days.',
              [{ text: 'OK' }],
            )}
          />
          <View style={styles.settingsRowDivider} />
          <SettingsItem
            icon="📄"
            label="Privacy, Terms & Security"
            sublabel="View privacy policy and terms of use"
            onPress={() => navigation.navigate('privacy-security')}
          />
          <View style={styles.settingsRowDivider} />
          <SettingsItem icon="ℹ️" label="About GrowTracker" sublabel="Version 1.0.0 · GrowTracker" showArrow={false} />
        </View>

        {/* ── Sign Out ──────────────────────────────────────────────── */}
        <View style={styles.dangerGroup}>
          <TouchableOpacity style={styles.signOutRow} onPress={onLogout} activeOpacity={0.7}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

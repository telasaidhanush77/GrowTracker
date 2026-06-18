import { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Header from '../../components/Header';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import type { ColorPalette } from '../../theme';
import { Radius, Shadow, Spacing, Typography } from '../../theme';
import { ScreenProps } from '../../types';
import { calcQuarterScore, formatDate, getGoalStats } from '../../utils';

// ─── Style factories ─────────────────────────────────────────────────────────

function createStyles(C: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1 },
    content: { padding: Spacing.lg, paddingBottom: 48 },

    // Identity card
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
    avatarLarge: {
      width: 84,
      height: 84,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.bgElevated,
      borderWidth: 2,
      borderColor: C.border,
      marginBottom: 14,
    },
    avatarLargeText: { fontSize: 32, fontWeight: '800', color: C.textPrimary },
    statusDot: {
      width: 12,
      height: 12,
      borderRadius: Radius.full,
      position: 'absolute',
      bottom: 16,
      right: -2,
      borderWidth: 2,
      borderColor: C.card,
    },
    fullName: { ...Typography.h2, color: C.textPrimary, marginBottom: 3 },
    designation: { fontSize: 14, color: C.textSecondary, marginBottom: 14 },
    badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
    roleBadge: {
      borderRadius: Radius.xs,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      backgroundColor: C.bgElevated,
      borderColor: C.border,
    },
    roleBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6, color: C.textSecondary },
    deptBadge: {
      borderRadius: Radius.xs,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      backgroundColor: C.bgElevated,
      borderColor: C.border,
    },
    deptBadgeText: { fontSize: 10, fontWeight: '600', color: C.textMuted },

    // Info card
    infoCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      paddingHorizontal: Spacing.lg,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: C.border,
      ...Shadow.sm,
    },
    infoDivider: { height: 1, backgroundColor: C.divider },

    // Performance card
    perfCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      flexDirection: 'row',
      gap: 16,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: C.border,
      ...Shadow.md,
    },
    perfScoreWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 80,
      gap: 4,
    },
    perfScoreNum: {
      fontSize: 36,
      fontWeight: '800',
      color: C.textPrimary,
      letterSpacing: -1,
    },
    perfScoreLabel: {
      fontSize: 9,
      color: C.textMuted,
      fontWeight: '600',
      textAlign: 'center',
    },
    perfRight: { flex: 1, justifyContent: 'center' },
    perfBlockDivider: { height: 1, backgroundColor: C.divider, marginVertical: 2 },

    // Section label
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: C.textMuted,
      marginTop: 4,
      marginBottom: 8,
      marginLeft: 2,
    },
    sectionRule: {
      height: 1,
      backgroundColor: C.divider,
      marginBottom: Spacing.sm,
    },

    // Settings group card — groups multiple rows into one iOS-style card
    settingsGroup: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: Spacing.lg,
      overflow: 'hidden',
      ...Shadow.sm,
    },
    settingsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: 13,
      backgroundColor: C.card,
    },
    settingsRowDivider: { height: 1, backgroundColor: C.divider, marginLeft: 62 },
    settingsIconWrap: {
      width: 38,
      height: 38,
      borderRadius: Radius.full,
      backgroundColor: C.bgElevated,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 13,
    },
    settingsIconText: { fontSize: 17 },
    settingsLabelCol: { flex: 1 },
    settingsLabel: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
    settingsSublabel: { fontSize: 12, color: C.textMuted, marginTop: 1 },
    settingsArrow: { fontSize: 22, color: C.textMuted, marginLeft: 6 },
    settingsDangerLabel: { fontSize: 14, fontWeight: '600', color: C.rejected },

    // Trailing badge pill
    trailBadge: {
      backgroundColor: C.bgElevated,
      borderRadius: Radius.full,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderWidth: 1,
      borderColor: C.border,
      marginLeft: 8,
    },
    trailBadgeText: { fontSize: 11, fontWeight: '600', color: C.textMuted },

    // Danger zone
    dangerGroup: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: C.rejectedBg,
      marginBottom: Spacing.lg,
      overflow: 'hidden',
      ...Shadow.sm,
    },
    signOutRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
    },
    signOutText: {
      fontSize: 15,
      fontWeight: '700',
      color: C.rejected,
    },
  });
}

function createInfoStyles(C: ColorPalette) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    label: {
      flex: 1,
      fontSize: 12,
      fontWeight: '600',
      color: C.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
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
      <Text style={[s.value, highlight ? { color: highlight } : null]}>{value}</Text>
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
  icon: string;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  danger?: boolean;
  trailBadge?: string;
  showArrow?: boolean;
};

function SettingsItem({ icon, label, sublabel, onPress, danger, trailBadge, showArrow = true }: SettingsItemProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={styles.settingsRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <View style={styles.settingsIconWrap}>
        <Text style={styles.settingsIconText}>{icon}</Text>
      </View>
      <View style={styles.settingsLabelCol}>
        <Text style={danger ? styles.settingsDangerLabel : styles.settingsLabel}>{label}</Text>
        {sublabel ? <Text style={styles.settingsSublabel}>{sublabel}</Text> : null}
      </View>
      {trailBadge ? (
        <View style={styles.trailBadge}>
          <Text style={styles.trailBadgeText}>{trailBadge}</Text>
        </View>
      ) : null}
      {showArrow && !danger ? <Text style={styles.settingsArrow}>›</Text> : null}
    </TouchableOpacity>
  );
}

function SectionLabel({ title }: { title: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.sectionRule} />
    </>
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
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const user = employees.find(e => e.id === currentUserId);
  const manager = employees.find(e => e.id === user?.managerId);

  const myGoals = goals.filter(g => g.employeeId === currentUserId);
  const q1Stats = getGoalStats(myGoals, 'Q1');
  const q2Stats = getGoalStats(myGoals, 'Q2');
  const q1Score = calcQuarterScore(myGoals, 'Q1');
  const q2Score = calcQuarterScore(myGoals, 'Q2');

  const totalGoals = myGoals.length;
  const approvedGoals = q1Stats.approved + q2Stats.approved;
  const overallRate = totalGoals > 0 ? Math.round((approvedGoals / totalGoals) * 100) : 0;

  const unreadNotifs = notifications.filter(n => n.recipientId === currentUserId && !n.read).length;

  const roleLabel =
    currentRole === 'admin' ? 'Administrator' :
    currentRole === 'manager' ? 'Reporting Manager' : 'Employee';

  const statusColor =
    user?.status === 'active' ? colors.approved :
    user?.status === 'onboarding' ? colors.pending : colors.textMuted;

  const statusLabel =
    user?.status === 'onboarding' ? 'Onboarding' :
    user?.status === 'active' ? 'Active' : 'Completed FY';

  function handleComingSoon(feature: string) {
    Alert.alert(feature, 'This feature is coming soon.', [{ text: 'OK' }]);
  }

  if (!user) return null;

  return (
    <View style={styles.root}>
      <Header
        title="Profile & Settings"
        color={colors.bgElevated}
        accentColor={colors.primary}
        onBack={navigation.goBack}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Identity Card ─────────────────────────────────────────── */}
        <View style={styles.identityCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>{user.avatarInitials}</Text>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          </View>
          <Text style={styles.fullName}>{user.name}</Text>
          <Text style={styles.designation}>{user.designation}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{roleLabel.toUpperCase()}</Text>
            </View>
            <View style={styles.deptBadge}>
              <Text style={styles.deptBadgeText}>{user.department}</Text>
            </View>
            <View style={[styles.deptBadge, { borderColor: statusColor }]}>
              <Text style={[styles.deptBadgeText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>
        </View>

        {/* ── Info Card ─────────────────────────────────────────────── */}
        <View style={styles.infoCard}>
          <InfoRow label="Email" value={user.email} />
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

        {/* ── Preferences Section ───────────────────────────────────── */}
        <SectionLabel title="Preferences" />

        <View style={styles.settingsGroup}>
          <SettingsItem
            icon="🎨"
            label="Appearance"
            sublabel="Choose your color theme"
            onPress={toggleTheme}
            trailBadge={isDark ? 'Dark' : 'Light'}
            showArrow={false}
          />
          <View style={styles.settingsRowDivider} />
          <SettingsItem
            icon="🔔"
            label="Notifications"
            sublabel={unreadNotifs > 0 ? `${unreadNotifs} unread` : 'All caught up'}
            onPress={() => navigation.navigate('notifications')}
            trailBadge={unreadNotifs > 0 ? `${unreadNotifs}` : undefined}
          />
        </View>

        {/* ── Account Section ───────────────────────────────────────── */}
        <SectionLabel title="Account" />

        <View style={styles.settingsGroup}>
          {onSwitchAccount ? (
            <>
              <SettingsItem
                icon="🔄"
                label="Switch Account"
                sublabel="Log in as a different user"
                onPress={onSwitchAccount}
              />
              <View style={styles.settingsRowDivider} />
            </>
          ) : null}
          <SettingsItem
            icon="🔒"
            label="Privacy & Security"
            sublabel="Manage your data and security"
            onPress={() => handleComingSoon('Privacy & Security')}
          />
        </View>

        {/* ── Support Section ───────────────────────────────────────── */}
        <SectionLabel title="Support" />

        <View style={styles.settingsGroup}>
          <SettingsItem
            icon="💬"
            label="Help & Support"
            sublabel="FAQs, contact us"
            onPress={() => handleComingSoon('Help & Support')}
          />
          <View style={styles.settingsRowDivider} />
          <SettingsItem
            icon="📄"
            label="Terms & Conditions"
            sublabel="Read our terms of use"
            onPress={() => handleComingSoon('Terms & Conditions')}
          />
          <View style={styles.settingsRowDivider} />
          <SettingsItem
            icon="ℹ️"
            label="About GrowTracker"
            sublabel="GrowTracker v1.0.0"
            showArrow={false}
          />
        </View>

        {/* ── Danger Zone ───────────────────────────────────────────── */}
        <View style={styles.dangerGroup}>
          <TouchableOpacity style={styles.signOutRow} onPress={onLogout} activeOpacity={0.7}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

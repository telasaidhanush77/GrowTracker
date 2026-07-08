import { useCallback, useMemo } from 'react';
import { SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Header from '../../components/Header';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import type { ColorPalette } from '../../theme';
import { Radius, Shadow, Spacing, Typography } from '../../theme';
import { NavParams, Notification, Screen, ScreenProps } from '../../types';
import { NOTIF_ICONS, timeAgo } from '../../utils';

function getDestination(notif: Notification, role: string | null): { screen: Screen; params?: NavParams } | null {
  switch (notif.type) {
    case 'evidence_submitted':
      if (role === 'manager') return { screen: 'review-evidence' };
      if (role === 'admin') return { screen: 'admin-dashboard' };
      break;
    case 'evidence_approved':
      if (role === 'employee') return { screen: 'goals-list' };
      if (role === 'admin') return { screen: 'admin-dashboard' };
      break;
    case 'evidence_rejected':
      if (role === 'employee') {
        return notif.relatedGoalId
          ? { screen: 'submit-evidence', params: { goalId: notif.relatedGoalId } }
          : { screen: 'goals-list' };
      }
      if (role === 'admin') return { screen: 'admin-dashboard' };
      break;
    case 'goal_assigned':
    case 'goal_adjusted':
      if (role === 'employee') {
        return notif.relatedGoalId
          ? { screen: 'goals-list', params: { filterStatus: 'not_started' } }
          : { screen: 'goals-list' };
      }
      if (role === 'admin') return { screen: 'admin-dashboard' };
      break;
    case 'fiscal_year_complete':
      if (role === 'employee') return { screen: 'goals-list' };
      if (role === 'manager') return { screen: 'team-overview' };
      if (role === 'admin') return { screen: 'admin-dashboard' };
      break;
    case 'onboarding_complete':
      if (role === 'employee') return { screen: 'employee-dashboard' };
      if (role === 'manager') return { screen: 'team-overview' };
      if (role === 'admin') return { screen: 'admin-dashboard' };
      break;
    case 'employee_offboarded':
      if (role === 'manager') return { screen: 'team-overview' };
      if (role === 'admin') return { screen: 'admin-dashboard' };
      break;
    case 'manager_changed':
      if (role === 'employee') return { screen: 'profile' };
      if (role === 'manager') return { screen: 'team-overview' };
      if (role === 'admin') return { screen: 'admin-dashboard' };
      break;
    case 'ai_overdue_alert':
    case 'ai_deadline_warning':
      if (role === 'employee') return { screen: 'goals-list' };
      break;
    case 'ai_daily_log_reminder':
      if (role === 'employee') return { screen: 'daily-log' };
      break;
    case 'ai_streak_milestone':
      if (role === 'employee') return { screen: 'my-progress' };
      break;
  }
  return null;
}

function groupByDate(notifs: Notification[]): { label: string; items: Notification[] }[] {
  const now = new Date();
  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const older: Notification[] = [];

  notifs.forEach(n => {
    const d = new Date(n.createdAt);
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) today.push(n);
    else if (diffDays === 1) yesterday.push(n);
    else older.push(n);
  });

  const groups: { label: string; items: Notification[] }[] = [];
  if (today.length) groups.push({ label: 'Today', items: today });
  if (yesterday.length) groups.push({ label: 'Yesterday', items: yesterday });
  if (older.length) groups.push({ label: 'Earlier', items: older });
  return groups;
}

function createStyles(C: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },

    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      backgroundColor: C.bgElevated,
    },
    unreadPill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    unreadDotPill: { width: 7, height: 7, borderRadius: 4 },
    unreadPillText: { fontSize: 12, fontWeight: '600', color: C.textSecondary },
    markAllBtn: {
      borderWidth: 1,
      borderRadius: Radius.full,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    markAllText: { fontSize: 12, fontWeight: '700' },

    content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },

    emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
    emptyIconWrap: {
      width: 64, height: 64, borderRadius: Radius.full,
      backgroundColor: C.card,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 16,
      borderWidth: 1, borderColor: C.border,
    },
    emptyIconText: { fontSize: 28, color: C.textMuted },
    emptyTitle: { ...Typography.h4, color: C.textSecondary, marginBottom: 8 },
    emptySub: { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20 },

    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: Spacing.md,
      marginTop: 4,
    },
    groupLabel: { ...Typography.label, color: C.textMuted, flexShrink: 0 },
    groupLine: { flex: 1, height: 1, backgroundColor: C.border },

    card: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      padding: Spacing.md,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: C.border,
      ...Shadow.sm,
    },
    cardUnread: {
      backgroundColor: C.bgElevated,
      borderColor: C.borderLight,
      ...Shadow.md,
    },
    accentBar: {
      position: 'absolute',
      left: 0, top: 0, bottom: 0,
      width: 3,
      borderTopLeftRadius: Radius.lg,
      borderBottomLeftRadius: Radius.lg,
    },
    iconCircle: {
      width: 42, height: 42,
      borderRadius: Radius.md,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1,
      marginLeft: 4,
      flexShrink: 0,
    },
    iconText: { fontSize: 18 },
    body: { flex: 1 },
    bodyTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    notifTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: C.textPrimary },
    notifTitleUnread: { color: C.textPrimary, fontWeight: '700' },
    typePill: {
      borderRadius: Radius.xs,
      paddingHorizontal: 7,
      paddingVertical: 2,
      flexShrink: 0,
    },
    typePillText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    message: { fontSize: 12, color: C.textSecondary, lineHeight: 18, marginBottom: 6 },
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    footerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    time: { fontSize: 10, color: C.textMuted, fontWeight: '500' },
    unreadDot: { width: 7, height: 7, borderRadius: 4 },
    viewLink: { fontSize: 11, fontWeight: '700' },
  });
}

export default function NotificationsScreen({
  navigation,
  currentUserId,
  currentRole,
}: ScreenProps) {
  const { notifications, markNotifRead, markAllRead } = useApp();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const TYPE_CONFIG = useMemo(() => ({
    evidence_approved: { bg: colors.approvedBg, accent: colors.approved, label: 'Approved' },
    evidence_rejected: { bg: colors.rejectedBg, accent: colors.rejected, label: 'Rejected' },
    evidence_submitted: { bg: colors.pendingBg, accent: colors.pending, label: 'Submitted' },
    goal_assigned: { bg: colors.inProgressBg, accent: colors.inProgress, label: 'Goal Assigned' },
    goal_adjusted: { bg: colors.inProgressBg, accent: colors.inProgress, label: 'Goal Updated' },
    fiscal_year_complete: { bg: colors.approvedBg, accent: colors.approved, label: 'FY Complete' },
    onboarding_complete: { bg: colors.inProgressBg, accent: colors.inProgress, label: 'Onboarding' },
    employee_offboarded: { bg: colors.rejectedBg, accent: colors.rejected, label: 'Offboarded' },
    manager_changed: { bg: colors.inProgressBg, accent: colors.inProgress, label: 'Manager Change' },
    ai_overdue_alert: { bg: colors.rejectedBg, accent: colors.rejected, label: 'Overdue' },
    ai_deadline_warning: { bg: colors.pendingBg, accent: colors.pending, label: 'Deadline' },
    ai_daily_log_reminder: { bg: colors.inProgressBg, accent: colors.inProgress, label: 'Reminder' },
    ai_streak_milestone: { bg: colors.approvedBg, accent: colors.approved, label: 'Milestone' },
  }), [colors]);

  const myNotifs = notifications
    .filter(n => n.recipientId === currentUserId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = myNotifs.filter(n => !n.read).length;

  const sections = useMemo(
    () => groupByDate(myNotifs).map(g => ({ title: g.label, data: g.items })),
    [myNotifs],
  );

  const handleNotifTap = useCallback((notif: Notification) => {
    markNotifRead(notif.id);
    const dest = getDestination(notif, currentRole);
    if (dest) {
      navigation.navigate(dest.screen, dest.params);
    }
  }, [markNotifRead, currentRole, navigation]);

  const renderNotif = useCallback(({ item: notif }: { item: Notification }) => {
    const icon = NOTIF_ICONS[notif.type] ?? '📌';
    const tc = (TYPE_CONFIG as Record<string, { bg: string; accent: string; label: string }>)[notif.type] ?? { bg: colors.bgElevated, accent: colors.textSecondary, label: 'Info' };
    const dest = getDestination(notif, currentRole);
    const isActionable = !!dest;

    return (
      <TouchableOpacity
        style={[styles.card, !notif.read && styles.cardUnread]}
        onPress={() => handleNotifTap(notif)}
        activeOpacity={0.8}
      >
        {!notif.read && (
          <View style={[styles.accentBar, { backgroundColor: tc.accent }]} />
        )}
        <View style={[styles.iconCircle, { backgroundColor: tc.bg, borderColor: tc.accent + '40' }]}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>
        <View style={styles.body}>
          <View style={styles.bodyTop}>
            <Text style={[styles.notifTitle, !notif.read && styles.notifTitleUnread]} numberOfLines={1}>
              {notif.title}
            </Text>
            <View style={[styles.typePill, { backgroundColor: tc.bg }]}>
              <Text style={[styles.typePillText, { color: tc.accent }]}>{tc.label}</Text>
            </View>
          </View>
          <Text style={styles.message} numberOfLines={2}>{notif.message}</Text>
          <View style={styles.footer}>
            <Text style={styles.time}>{timeAgo(notif.createdAt)}</Text>
            <View style={styles.footerRight}>
              {!notif.read && <View style={[styles.unreadDot, { backgroundColor: tc.accent }]} />}
              {isActionable && <Text style={[styles.viewLink, { color: tc.accent }]}>View →</Text>}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [styles, colors, TYPE_CONFIG, currentRole, handleNotifTap]);

  const renderSectionHeader = useCallback(({ section }: { section: { title: string } }) => (
    <View style={styles.groupHeader}>
      <Text style={styles.groupLabel}>{section.title}</Text>
      <View style={styles.groupLine} />
    </View>
  ), [styles]);

  return (
    <View style={styles.root}>
      <Header
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        color={colors.bgElevated}
        accentColor={colors.primary}
        onBack={navigation.goBack}
      />

      {unreadCount > 0 && (
        <View style={styles.toolbar}>
          <View style={styles.unreadPill}>
            <View style={[styles.unreadDotPill, { backgroundColor: colors.primary }]} />
            <Text style={styles.unreadPillText}>{unreadCount} unread</Text>
          </View>
          <TouchableOpacity
            style={[styles.markAllBtn, { borderColor: colors.primary }]}
            onPress={() => currentUserId && markAllRead(currentUserId)}
          >
            <Text style={[styles.markAllText, { color: colors.primary }]}>Mark all read</Text>
          </TouchableOpacity>
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={notif => notif.id}
        renderItem={renderNotif}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Text style={styles.emptyIconText}>◉</Text>
            </View>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySub}>
              You'll see updates here when goals are assigned, evidence is reviewed, or status changes.
            </Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 36 }} />}
      />
    </View>
  );
}

import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Header from '../../components/Header';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { Radius, Shadow, Spacing, Typography } from '../../theme';
import type { ColorPalette } from '../../theme';
import { ScreenProps } from '../../types';

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayString() {
  return toLocalDateString(new Date());
}

function formatDisplayDate(date: string) {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function shiftDateForward(date: string): string {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  const day = d.getDay();
  if (day === 6) d.setDate(d.getDate() + 2); // Saturday → Monday
  if (day === 0) d.setDate(d.getDate() + 1); // Sunday → Monday
  return toLocalDateString(d);
}

function shiftDateBackward(date: string): string {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  const day = d.getDay();
  if (day === 0) d.setDate(d.getDate() - 2); // Sunday → Friday
  if (day === 6) d.setDate(d.getDate() - 1); // Saturday → Friday
  return toLocalDateString(d);
}

export default function TeamDailyLogs({ navigation, currentUserId, onLogout }: ScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { employees, dailyLogs, notifications } = useApp();

  const today = todayString();
  const [selectedDate, setSelectedDate] = useState(today);

  const team = employees.filter(e => e.managerId === currentUserId && e.role === 'employee');
  const notifCount = notifications.filter(n => n.recipientId === currentUserId && !n.read).length;

  const isToday = selectedDate === today;

  const teamLogs = team.map(emp => {
    const log = dailyLogs.find(l => l.employeeId === emp.id && l.date === selectedDate);
    return { emp, log };
  });

  const loggedCount = teamLogs.filter(({ log }) => log && log.tasks.length > 0).length;

  return (
    <View style={styles.root}>
      <Header
        title="Team Activity"
        subtitle="Daily work logs · Your team"
        color={colors.bgElevated}
        accentColor={colors.managerPrimary}
        onBack={() => navigation.goBack()}
        onLogout={onLogout}
        onNotif={() => navigation.navigate('notifications')}
        notifCount={notifCount}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Date navigation */}
        <View style={styles.dateNav}>
          <TouchableOpacity
            style={styles.dateArrowBtn}
            onPress={() => setSelectedDate(shiftDateBackward(selectedDate))}
          >
            <Text style={[styles.dateArrow, { color: colors.managerPrimary }]}>‹</Text>
          </TouchableOpacity>

          <View style={styles.dateLabelWrap}>
            <Text style={styles.dateLabel}>{formatDisplayDate(selectedDate)}</Text>
            {isToday && (
              <View style={[styles.todayChip, { backgroundColor: colors.managerLight }]}>
                <Text style={[styles.todayChipText, { color: colors.managerPrimary }]}>Today</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.dateArrowBtn}
            onPress={() => setSelectedDate(shiftDateForward(selectedDate))}
          >
            <Text style={[styles.dateArrow, { color: colors.managerPrimary }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Summary strip */}
        <View style={styles.summaryStrip}>
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryValue, { color: colors.managerPrimary }]}>{team.length}</Text>
            <Text style={styles.summaryLabel}>Team Members</Text>
          </View>
          <View style={[styles.summaryStat, styles.summaryBorder]}>
            <Text style={[styles.summaryValue, { color: colors.approved }]}>{loggedCount}</Text>
            <Text style={styles.summaryLabel}>Logged Today</Text>
          </View>
          <View style={[styles.summaryStat, styles.summaryBorder]}>
            <Text style={[styles.summaryValue, { color: colors.rejected }]}>{team.length - loggedCount}</Text>
            <Text style={styles.summaryLabel}>Not Logged</Text>
          </View>
        </View>

        {/* Per-employee logs */}
        {teamLogs.map(({ emp, log }) => {
          const hasLog = log && log.tasks.length > 0;
          return (
            <View key={emp.id} style={styles.empCard}>
              <View style={styles.empHeader}>
                <View style={[styles.avatar, { backgroundColor: colors.employeeLight }]}>
                  <Text style={[styles.avatarText, { color: colors.employeePrimary }]}>
                    {emp.avatarInitials}
                  </Text>
                </View>
                <View style={styles.empInfo}>
                  <Text style={styles.empName}>{emp.name}</Text>
                  <Text style={styles.empDesig}>{emp.designation}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: hasLog ? colors.approvedBg : colors.rejectedBg },
                ]}>
                  <Text style={[
                    styles.statusBadgeText,
                    { color: hasLog ? colors.approved : colors.rejected },
                  ]}>
                    {hasLog ? `${log!.tasks.length} task${log!.tasks.length !== 1 ? 's' : ''}` : 'No log'}
                  </Text>
                </View>
              </View>

              {hasLog ? (
                <View style={styles.logBody}>
                  {log!.tasks.map((task, idx) => (
                    <View key={task.id} style={styles.taskRow}>
                      <View style={[styles.taskDot, { backgroundColor: colors.managerPrimary }]}>
                        <Text style={styles.taskDotNum}>{idx + 1}</Text>
                      </View>
                      <Text style={styles.taskDesc}>{task.description}</Text>
                    </View>
                  ))}
                  {log!.notes ? (
                    <View style={styles.notesBlock}>
                      <Text style={styles.notesLabel}>Notes</Text>
                      <Text style={styles.notesText}>{log!.notes}</Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                <View style={styles.noLogPlaceholder}>
                  <Text style={styles.noLogText}>No work log submitted for this date.</Text>
                </View>
              )}
            </View>
          );
        })}

        {team.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Team Members</Text>
            <Text style={styles.emptyText}>No employees are reporting to you yet.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(C: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1 },
    content: { paddingHorizontal: Spacing.xl, paddingBottom: 48 },

    dateNav: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      marginTop: Spacing.lg,
      marginBottom: Spacing.md,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.sm,
      ...Shadow.sm,
    },
    dateArrowBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateArrowDisabled: { opacity: 0.3 },
    dateArrow: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
    dateLabelWrap: { flex: 1, alignItems: 'center', gap: 4 },
    dateLabel: { ...Typography.h4, color: C.textPrimary, textAlign: 'center' },
    todayChip: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 2 },
    todayChipText: { fontSize: 11, fontWeight: '700' },

    summaryStrip: {
      flexDirection: 'row',
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      marginBottom: Spacing.md,
      ...Shadow.sm,
    },
    summaryStat: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: Spacing.md,
    },
    summaryBorder: {
      borderLeftWidth: 1,
      borderLeftColor: C.border,
    },
    summaryValue: { ...Typography.h3, fontWeight: '800' },
    summaryLabel: { fontSize: 11, color: C.textMuted, marginTop: 2 },

    empCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      marginBottom: Spacing.md,
      ...Shadow.sm,
      overflow: 'hidden',
    },
    empHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.md,
      gap: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    avatarText: { fontSize: 14, fontWeight: '800' },
    empInfo: { flex: 1 },
    empName: { ...Typography.h4, color: C.textPrimary },
    empDesig: { fontSize: 12, color: C.textMuted, marginTop: 1 },
    statusBadge: {
      borderRadius: Radius.full,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    statusBadgeText: { fontSize: 12, fontWeight: '700' },

    logBody: { padding: Spacing.md, gap: 6 },

    taskRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
    },
    taskDot: {
      width: 22,
      height: 22,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginTop: 1,
    },
    taskDotNum: { fontSize: 11, fontWeight: '700', color: '#fff' },
    taskDesc: { flex: 1, fontSize: 13, color: C.textPrimary, lineHeight: 20 },

    notesBlock: {
      marginTop: 8,
      backgroundColor: C.bgElevated,
      borderRadius: Radius.sm,
      padding: Spacing.sm,
    },
    notesLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, marginBottom: 3 },
    notesText: { fontSize: 13, color: C.textSecondary, lineHeight: 18 },

    noLogPlaceholder: {
      padding: Spacing.md,
      alignItems: 'center',
    },
    noLogText: { fontSize: 13, color: C.textMuted },

    emptyState: {
      alignItems: 'center',
      paddingVertical: 60,
      gap: 8,
    },
    emptyTitle: { ...Typography.h3, color: C.textPrimary },
    emptyText: { fontSize: 14, color: C.textMuted },
  });
}

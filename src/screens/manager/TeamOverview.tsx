import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Header from '../../components/Header';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { Radius, Shadow, Spacing } from '../../theme';
import type { ColorPalette } from '../../theme';
import { GoalStatus, Quarter, ScreenProps } from '../../types';
import { calcQuarterScore, getGoalStats } from '../../utils';

export default function TeamOverview({ navigation, currentUserId, onLogout }: ScreenProps) {
  const { employees, goals } = useApp();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activeQuarter, setActiveQuarter] = useState<'all' | 'Q1' | 'Q2'>('all');

  const team = employees.filter(e => e.managerId === currentUserId && e.role === 'employee');

  return (
    <View style={styles.root}>
      <Header
        title="Team Overview"
        subtitle={`${team.length} direct reports`}
        color={colors.managerPrimary}
        onBack={navigation.goBack}
      />

      <View style={styles.quarterFilterRow}>
        {(['all', 'Q1', 'Q2'] as const).map(q => (
          <TouchableOpacity
            key={q}
            style={[styles.qChip, activeQuarter === q && styles.qChipActive]}
            onPress={() => setActiveQuarter(q)}
            activeOpacity={0.8}
          >
            <Text style={[styles.qChipText, activeQuarter === q && styles.qChipTextActive]}>
              {q === 'all' ? 'All' : q}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.hint}>Tap an employee to manage their goals.</Text>

        {team.map(emp => {
          const empGoals = goals.filter(g => g.employeeId === emp.id);
          const q1 = getGoalStats(empGoals, 'Q1');
          const q2 = getGoalStats(empGoals, 'Q2');
          const q1Score = calcQuarterScore(empGoals, 'Q1');
          const q2Score = calcQuarterScore(empGoals, 'Q2');

          const summaryQ1 = activeQuarter === 'Q2' ? { approved: 0, submitted: 0, inProgress: 0, rejected: 0 } : q1;
          const summaryQ2 = activeQuarter === 'Q1' ? { approved: 0, submitted: 0, inProgress: 0, rejected: 0 } : q2;

          return (
            <TouchableOpacity
              key={emp.id}
              style={styles.card}
              onPress={() => navigation.navigate('set-goals', { employeeId: emp.id })}
              activeOpacity={0.82}
            >
              <View style={styles.cardTop}>
                <View style={styles.avatarWrap}>
                  <View style={[styles.avatar, { backgroundColor: colors.employeeLight }]}>
                    <Text style={[styles.avatarText, { color: colors.employeePrimary }]}>
                      {emp.avatarInitials}
                    </Text>
                  </View>
                  {emp.status === 'onboarding' && (
                    <View style={styles.onboardBadge}>
                      <Text style={styles.onboardBadgeText}>NEW</Text>
                    </View>
                  )}
                </View>
                <View style={styles.empInfo}>
                  <Text style={styles.empName}>{emp.name}</Text>
                  <Text style={styles.empDesig}>{emp.designation}</Text>
                  <Text style={styles.empDept}>{emp.department}</Text>
                </View>
                <TouchableOpacity
                  style={styles.manageBtn}
                  onPress={() => navigation.navigate('set-goals', { employeeId: emp.id })}
                >
                  <Text style={styles.manageBtnText}>Manage Goals</Text>
                </TouchableOpacity>
              </View>

              {[
                { q: 'Q1', stats: q1, score: q1Score },
                { q: 'Q2', stats: q2, score: q2Score },
              ].map(({ q, stats, score }) => {
                const isActive = activeQuarter === q;
                const isDimmed = activeQuarter !== 'all' && !isActive;
                return (
                <View
                  key={q}
                  style={[
                    styles.quarterRow,
                    isActive && styles.quarterRowActive,
                    isDimmed && styles.quarterRowDimmed,
                  ]}
                >
                  <View style={styles.qLabelWrap}>
                    <Text style={[styles.qLabel, isActive && styles.qLabelActive]}>{q}</Text>
                    <Text style={styles.qCount}>{stats.total} goals</Text>
                  </View>
                  <View style={styles.barWrap}>
                    {stats.total > 0 ? (
                      <View style={styles.barTrack}>
                        {([
                          { v: stats.approved, c: colors.approved, s: 'approved' as GoalStatus },
                          { v: stats.submitted, c: colors.pending, s: 'submitted' as GoalStatus },
                          { v: stats.inProgress, c: colors.inProgress, s: 'in_progress' as GoalStatus },
                          { v: stats.rejected, c: colors.rejected, s: 'rejected' as GoalStatus },
                          { v: stats.notStarted, c: '#E2E8F0', s: 'not_started' as GoalStatus },
                        ] as { v: number; c: string; s: GoalStatus }[]).map((seg, i) =>
                          seg.v > 0 ? (
                            <TouchableOpacity
                              key={i}
                              style={{ width: `${(seg.v / stats.total) * 100}%` as any, height: '100%', backgroundColor: seg.c }}
                              onPress={() => navigation.navigate('set-goals', { employeeId: emp.id, filterStatus: seg.s, filterQuarter: q as Quarter })}
                              activeOpacity={0.75}
                            />
                          ) : null,
                        )}
                      </View>
                    ) : (
                      <Text style={styles.noGoals}>No goals set yet</Text>
                    )}
                  </View>
                  {score > 0 && (
                    <View style={[styles.scoreTag, score >= 80 ? styles.scoreHigh : styles.scoreMid, isActive && styles.scoreTagActive]}>
                      <Text
                        style={[
                          styles.scoreTagText,
                          { color: score >= 80 ? colors.approved : colors.pending },
                        ]}
                      >
                        {score}%
                      </Text>
                    </View>
                  )}
                </View>
                );
              })}

              <View style={styles.statsSummary}>
                {([
                  { label: '✅ Approved', val: summaryQ1.approved + summaryQ2.approved, color: colors.approved, status: 'approved' as GoalStatus },
                  { label: '⏳ Pending', val: summaryQ1.submitted + summaryQ2.submitted, color: colors.pending, status: 'submitted' as GoalStatus },
                  { label: '🔄 In Progress', val: summaryQ1.inProgress + summaryQ2.inProgress, color: colors.inProgress, status: 'in_progress' as GoalStatus },
                  { label: '❌ Rejected', val: summaryQ1.rejected + summaryQ2.rejected, color: colors.rejected, status: 'rejected' as GoalStatus },
                ] as { label: string; val: number; color: string; status: GoalStatus }[]).map(s => (
                  <TouchableOpacity
                    key={s.label}
                    style={styles.summaryItem}
                    activeOpacity={s.val > 0 ? 0.7 : 1}
                    onPress={() => s.val > 0 && navigation.navigate('set-goals', {
                      employeeId: emp.id,
                      filterStatus: s.status,
                      filterQuarter: activeQuarter === 'all' ? undefined : activeQuarter,
                    })}
                  >
                    <Text style={[styles.summaryVal, { color: s.color }]}>{s.val}</Text>
                    <Text style={styles.summaryLabel}>{s.label}</Text>
                    {s.val > 0 && <Text style={[styles.summaryTap, { color: s.color }]}>tap</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

function createStyles(C: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    content: { padding: Spacing.lg },
    hint: { fontSize: 13, color: C.textMuted, marginBottom: 12, textAlign: 'center' },

    card: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: 14,
      ...Shadow.md,
    },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
    avatarWrap: { position: 'relative' },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { fontSize: 18, fontWeight: '700' },
    onboardBadge: {
      position: 'absolute',
      bottom: -4,
      right: -4,
      backgroundColor: C.pending,
      borderRadius: Radius.full,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    onboardBadgeText: { color: '#fff', fontSize: 8, fontWeight: '800' },
    empInfo: { flex: 1 },
    empName: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
    empDesig: { fontSize: 12, color: C.textSecondary },
    empDept: { fontSize: 11, color: C.textMuted },
    manageBtn: {
      backgroundColor: C.managerLight,
      borderRadius: Radius.md,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    manageBtnText: { fontSize: 12, fontWeight: '600', color: C.primary },

    quarterFilterRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      backgroundColor: C.bgElevated,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    qChip: {
      borderRadius: Radius.full,
      paddingHorizontal: 16,
      paddingVertical: 6,
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.border,
    },
    qChipActive: {
      backgroundColor: C.primary,
      borderColor: C.primary,
    },
    qChipText: { fontSize: 12, fontWeight: '700', color: C.textSecondary },
    qChipTextActive: { color: '#FFFFFF' },

    quarterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    quarterRowActive: {
      backgroundColor: C.managerLight,
      borderRadius: Radius.md,
      paddingHorizontal: 6,
      marginHorizontal: -6,
    },
    quarterRowDimmed: { opacity: 0.4 },
    qLabelWrap: { width: 52 },
    qLabel: { fontSize: 13, fontWeight: '700', color: C.textPrimary },
    qLabelActive: { color: C.primary },
    qCount: { fontSize: 10, color: C.textMuted },
    barWrap: { flex: 1 },
    barTrack: {
      height: 10,
      borderRadius: Radius.full,
      flexDirection: 'row',
      overflow: 'hidden',
      backgroundColor: C.divider,
    },
    noGoals: { fontSize: 11, color: C.textMuted, fontStyle: 'italic' },
    scoreTag: {
      borderRadius: Radius.full,
      paddingHorizontal: 8,
      paddingVertical: 2,
      minWidth: 44,
      alignItems: 'center',
    },
    scoreHigh: { backgroundColor: C.approvedBg },
    scoreMid: { backgroundColor: C.pendingBg },
    scoreTagActive: { borderWidth: 2, borderColor: C.primary },
    scoreTagText: { fontSize: 12, fontWeight: '700' },

    statsSummary: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: C.divider,
      paddingTop: 10,
      marginTop: 6,
    },
    summaryItem: { flex: 1, alignItems: 'center' },
    summaryVal: { fontSize: 18, fontWeight: '800' },
    summaryLabel: { fontSize: 10, color: C.textMuted, textAlign: 'center', marginTop: 2 },
    summaryTap: { fontSize: 8, fontWeight: '700', marginTop: 2, opacity: 0.6 },
  });
}

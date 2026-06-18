import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Header from '../../components/Header';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { Radius, Shadow, Spacing } from '../../theme';
import type { ColorPalette } from '../../theme';
import { GoalStatus, Quarter, ScreenProps } from '../../types';
import {
  CATEGORY_CONFIG,
  formatDate,
  isOverdue,
  PRIORITY_CONFIG,
  STATUS_CONFIG,
} from '../../utils';

type FilterChip = { label: string; value: GoalStatus | undefined };

const FILTER_CHIPS: FilterChip[] = [
  { label: 'All', value: undefined },
  { label: 'Not Started', value: 'not_started' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

export default function GoalsList({ navigation, params, currentUserId }: ScreenProps) {
  const { goals, employees } = useApp();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [activeQ, setActiveQ] = useState<Quarter>(params?.filterQuarter ?? 'Q2');
  const [filterStatus, setFilterStatus] = useState<GoalStatus | undefined>(params?.filterStatus);

  const isReadOnly = !!params?.readOnly;
  const targetId = params?.viewEmployeeId ?? currentUserId;
  const viewingEmployee = params?.viewEmployeeId
    ? employees.find(e => e.id === params.viewEmployeeId)
    : null;

  const myGoals = goals
    .filter(g => {
      if (g.employeeId !== targetId || g.quarter !== activeQ) return false;
      if (filterStatus !== undefined && g.status !== filterStatus) return false;
      return true;
    })
    .sort((a, b) => {
      const order: Record<string, number> = {
        rejected: 0, not_started: 1, in_progress: 2, submitted: 3, approved: 4,
      };
      return (order[a.status] ?? 5) - (order[b.status] ?? 5);
    });

  const headerTitle = viewingEmployee
    ? `${viewingEmployee.name.split(' ')[0]}'s Goals`
    : 'My Goals';

  return (
    <View style={styles.root}>
      <Header
        title={headerTitle}
        color={colors.bgElevated}
        accentColor={colors.employeePrimary}
        onBack={navigation.goBack}
      />

      {/* Quarter tabs */}
      <View style={styles.tabRow}>
        {(['Q1', 'Q2'] as Quarter[]).map(q => (
          <TouchableOpacity
            key={q}
            style={[styles.tab, activeQ === q && styles.tabActive]}
            onPress={() => setActiveQ(q)}
          >
            <Text style={[styles.tabText, activeQ === q && styles.tabTextActive]}>{q}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Status filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTER_CHIPS.map(chip => {
          const isActive = filterStatus === chip.value;
          return (
            <TouchableOpacity
              key={chip.label}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setFilterStatus(chip.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {myGoals.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyText}>No {activeQ} goals have been set yet.</Text>
            <Text style={styles.emptySub}>Your manager will assign goals soon.</Text>
          </View>
        )}

        {myGoals.map(goal => {
          const sc = STATUS_CONFIG[goal.status];
          const pc = PRIORITY_CONFIG[goal.priority];
          const cc = CATEGORY_CONFIG[goal.category];
          const overdue =
            goal.status !== 'approved' && goal.status !== 'submitted' && isOverdue(goal.targetDate);
          const canSubmit = goal.status === 'in_progress' || goal.status === 'not_started';
          const canResubmit = goal.status === 'rejected';

          return (
            <View key={goal.id} style={styles.card}>
              {/* Header row */}
              <View style={styles.cardHeader}>
                <View style={styles.badges}>
                  <View style={[styles.chip, { backgroundColor: cc.color + '40' }]}>
                    <Text style={[styles.chipText, { color: cc.color }]}>{cc.label}</Text>
                  </View>
                  <View style={[styles.chip, { backgroundColor: pc.bg }]}>
                    <Text style={[styles.chipText, { color: pc.color }]}>{pc.label}</Text>
                  </View>
                </View>
                <View style={[styles.statusChip, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.statusChipText, { color: sc.color }]}>{sc.label}</Text>
                </View>
              </View>

              <Text style={styles.goalTitle}>{goal.title}</Text>
              <Text style={styles.goalDesc}>{goal.description}</Text>

              <View style={styles.metaRow}>
                <Text style={[styles.dueText, overdue && styles.overdueText]}>
                  {overdue ? '⚠ Overdue · ' : ''}Due {formatDate(goal.targetDate)}
                </Text>
                <Text style={styles.weightText}>{goal.weight} cr</Text>
              </View>

              {/* Manager rating */}
              {goal.status === 'approved' && goal.managerRating && (
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingLabel}>Manager rating: </Text>
                  <View style={styles.stars}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Text
                        key={s}
                        style={[styles.star, s <= goal.managerRating! && styles.starFilled]}
                      >
                        ★
                      </Text>
                    ))}
                  </View>
                </View>
              )}

              {/* Manager feedback */}
              {goal.evidence?.managerFeedback && (
                <View
                  style={[
                    styles.feedbackBox,
                    {
                      backgroundColor:
                        goal.status === 'approved' ? colors.approvedBg : colors.rejectedBg,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.feedbackLabel,
                      { color: goal.status === 'approved' ? colors.approved : colors.rejected },
                    ]}
                  >
                    {goal.status === 'approved' ? '✓ Manager feedback:' : '✕ Rejection reason:'}
                  </Text>
                  <Text style={styles.feedbackText}>{goal.evidence.managerFeedback}</Text>
                </View>
              )}

              {/* Evidence submitted indicator */}
              {goal.status === 'submitted' && (
                <View style={styles.submittedBox}>
                  <Text style={styles.submittedText}>
                    📎 Evidence submitted · Awaiting manager review
                  </Text>
                </View>
              )}

              {/* Actions */}
              {!isReadOnly && (canSubmit || canResubmit) && (
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    canResubmit && styles.resubmitBtn,
                  ]}
                  onPress={() =>
                    navigation.navigate('submit-evidence', { goalId: goal.id })
                  }
                >
                  <Text style={styles.submitBtnText}>
                    {canResubmit ? '🔁 Resubmit Evidence' : '📎 Submit Evidence'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
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
    tabRow: {
      flexDirection: 'row',
      backgroundColor: C.card,
      padding: 4,
      margin: Spacing.lg,
      borderRadius: Radius.lg,
      ...Shadow.sm,
    },
    tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: Radius.md },
    tabActive: { backgroundColor: C.primary },
    tabText: { fontSize: 14, fontWeight: '600', color: C.textMuted },
    tabTextActive: { color: C.bg },

    filterRow: {
      flexDirection: 'row',
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.md,
      gap: 8,
    },
    filterChip: {
      borderRadius: Radius.full,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: C.bgElevated,
      borderWidth: 1,
      borderColor: C.border,
    },
    filterChipActive: {
      backgroundColor: C.primary,
      borderColor: C.primary,
    },
    filterChipText: { fontSize: 12, fontWeight: '600', color: C.textMuted },
    filterChipTextActive: { color: C.bg },

    content: { paddingHorizontal: Spacing.lg, paddingBottom: 16 },

    emptyState: { alignItems: 'center', paddingTop: 60 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyText: { fontSize: 16, fontWeight: '600', color: C.textSecondary },
    emptySub: { fontSize: 13, color: C.textMuted, marginTop: 4 },

    card: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: 12,
      ...Shadow.md,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 },
    chip: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
    chipText: { fontSize: 11, fontWeight: '600' },
    statusChip: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
    statusChipText: { fontSize: 11, fontWeight: '700' },
    goalTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
    goalDesc: { fontSize: 13, color: C.textSecondary, lineHeight: 18, marginBottom: 8 },

    metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    dueText: { fontSize: 11, color: C.textMuted },
    overdueText: { color: C.rejected, fontWeight: '700' },
    weightText: { fontSize: 11, color: C.textMuted },

    ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    ratingLabel: { fontSize: 12, color: C.textMuted },
    stars: { flexDirection: 'row' },
    star: { fontSize: 16, color: C.border },
    starFilled: { color: '#F59E0B' },

    feedbackBox: { borderRadius: Radius.md, padding: 10, marginBottom: 8 },
    feedbackLabel: { fontSize: 11, fontWeight: '700', marginBottom: 3 },
    feedbackText: { fontSize: 12, color: C.textSecondary, lineHeight: 16 },

    submittedBox: {
      backgroundColor: C.pendingBg,
      borderRadius: Radius.md,
      padding: 10,
      marginBottom: 8,
    },
    submittedText: { fontSize: 12, color: C.pending, fontWeight: '600' },
    submittedSub: { fontSize: 11, color: C.textMuted, marginTop: 3 },

    submitBtn: {
      backgroundColor: C.primary,
      borderRadius: Radius.lg,
      paddingVertical: 10,
      alignItems: 'center',
    },
    resubmitBtn: { backgroundColor: C.pending },
    submitBtnText: { color: C.bg, fontSize: 13, fontWeight: '700' },
  });
}

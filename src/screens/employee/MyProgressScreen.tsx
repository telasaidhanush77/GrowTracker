import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Header from '../../components/Header';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { Radius, Shadow, Spacing, Typography } from '../../theme';
import type { ColorPalette } from '../../theme';
import { Goal, ScreenProps } from '../../types';
import { calcQuarterScore, CATEGORY_CONFIG, formatDate, STATUS_CONFIG } from '../../utils';

export default function MyProgressScreen({ navigation, currentUserId }: ScreenProps) {
  const { employees, goals } = useApp();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const employee = employees.find(e => e.id === currentUserId);
  const myGoals = goals.filter(g => g.employeeId === currentUserId);

  const q1Goals = myGoals.filter(g => g.quarter === 'Q1');
  const q2Goals = myGoals.filter(g => g.quarter === 'Q2');

  const q1Score = calcQuarterScore(myGoals, 'Q1');
  const q2Score = calcQuarterScore(myGoals, 'Q2');

  const approvedGoals = myGoals.filter(g => g.status === 'approved');
  const rejectedGoals = myGoals.filter(g => g.status === 'rejected');
  const reviewedGoals = myGoals.filter(g => g.managerRating);

  const avgRating = reviewedGoals.length > 0
    ? (reviewedGoals.reduce((s, g) => s + (g.managerRating ?? 0), 0) / reviewedGoals.length)
    : 0;

  const scoreColor = (s: number) =>
    s >= 75 ? colors.approved : s >= 50 ? colors.pending : s > 0 ? colors.rejected : colors.textMuted;

  return (
    <View style={styles.root}>
      <Header
        title="My Progress"
        subtitle={employee?.name ?? ''}
        color={colors.bgElevated}
        accentColor={colors.employeePrimary}
        onBack={navigation.goBack}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Score summary */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreRow}>
            {[
              { label: 'Q1 Score', score: q1Score },
              { label: 'Q2 Score', score: q2Score },
              { label: 'Avg Rating', score: avgRating * 20, raw: avgRating > 0 ? `${avgRating.toFixed(1)}★` : '—' },
            ].map((item, i) => (
              <View key={item.label} style={[styles.scoreCell, i > 0 && styles.scoreCellBorder]}>
                <Text style={[styles.scoreBig, { color: item.score > 0 ? scoreColor(item.score) : colors.textMuted }]}>
                  {item.raw ?? (item.score > 0 ? `${Math.round(item.score)}%` : '—')}
                </Text>
                <Text style={styles.scoreLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          {q1Score > 0 && q2Score > 0 && (() => {
            const delta = Math.round(q2Score - q1Score);
            const improved = delta > 0;
            const neutral = delta === 0;
            const fg = neutral ? colors.textMuted : improved ? colors.approved : colors.rejected;
            return (
              <View style={[styles.deltaRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.deltaText, { color: fg }]}>
                  {neutral ? '→ No change Q1 → Q2'
                    : improved ? `↑ Improved by ${delta} pts from Q1 to Q2`
                    : `↓ Declined by ${Math.abs(delta)} pts from Q1 to Q2`}
                </Text>
                {!neutral && (
                  <Text style={[styles.deltaTip, { color: fg + 'AA' }]}>
                    {improved
                      ? 'Great work! Keep submitting strong evidence.'
                      : 'Focus on quality of evidence and timely submissions to recover.'}
                  </Text>
                )}
              </View>
            );
          })()}
        </View>

        {/* KPI strip */}
        <View style={styles.kpiStrip}>
          <View style={styles.kpiCell}>
            <Text style={[styles.kpiVal, { color: colors.approved }]}>{approvedGoals.length}</Text>
            <Text style={styles.kpiLbl}>Approved</Text>
          </View>
          <View style={[styles.kpiCell, styles.kpiBorder]}>
            <Text style={[styles.kpiVal, { color: colors.rejected }]}>{rejectedGoals.length}</Text>
            <Text style={styles.kpiLbl}>Rejected</Text>
          </View>
          <View style={[styles.kpiCell, styles.kpiBorder]}>
            <Text style={[styles.kpiVal, { color: colors.textPrimary }]}>{myGoals.length}</Text>
            <Text style={styles.kpiLbl}>Total Goals</Text>
          </View>
          <View style={[styles.kpiCell, styles.kpiBorder]}>
            <Text style={[styles.kpiVal, { color: colors.approved }]}>
              {myGoals.length > 0 ? `${Math.round((approvedGoals.length / myGoals.length) * 100)}%` : '—'}
            </Text>
            <Text style={styles.kpiLbl}>Approval Rate</Text>
          </View>
        </View>

        {/* Per-quarter goal breakdown */}
        {[
          { label: 'Q1 Goal Performance', goals: q1Goals, score: q1Score },
          { label: 'Q2 Goal Performance', goals: q2Goals, score: q2Score },
        ].map(({ label, goals: qGoals, score }) => {
          if (qGoals.length === 0) return null;
          const totalWeight = qGoals.reduce((s, g) => s + g.weight, 0);
          return (
            <View key={label}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{label}</Text>
                {score > 0 && (
                  <View style={[styles.scorePill, { backgroundColor: scoreColor(score) + '22' }]}>
                    <Text style={[styles.scorePillText, { color: scoreColor(score) }]}>{score}%</Text>
                  </View>
                )}
              </View>
              {qGoals.map(goal => (
                <GoalProgressCard
                  key={goal.id}
                  goal={goal}
                  totalWeight={totalWeight}
                  colors={colors}
                  styles={styles}
                  onPress={() => navigation.navigate('submit-evidence', { goalId: goal.id })}
                />
              ))}
            </View>
          );
        })}

        {/* Insights */}
        {(approvedGoals.length > 0 || rejectedGoals.length > 0) && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Insights</Text>
            </View>
            <View style={styles.insightsCard}>
              {approvedGoals.length > 0 && (
                <View style={styles.insightRow}>
                  <View style={[styles.insightIcon, { backgroundColor: colors.approvedBg }]}>
                    <Text style={{ fontSize: 16 }}>✓</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.insightTitle, { color: colors.approved }]}>
                      {approvedGoals.length} goal{approvedGoals.length !== 1 ? 's' : ''} approved
                    </Text>
                    <Text style={styles.insightSub}>
                      {approvedGoals.filter(g => g.evidence?.managerFeedback).length > 0
                        ? `Manager left feedback on ${approvedGoals.filter(g => g.evidence?.managerFeedback).length} goal${approvedGoals.filter(g => g.evidence?.managerFeedback).length !== 1 ? 's' : ''}.`
                        : 'Well done on the approved submissions!'}
                    </Text>
                  </View>
                </View>
              )}
              {rejectedGoals.length > 0 && (
                <View style={[styles.insightRow, { marginTop: 12 }]}>
                  <View style={[styles.insightIcon, { backgroundColor: colors.rejectedBg }]}>
                    <Text style={{ fontSize: 16 }}>✕</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.insightTitle, { color: colors.rejected }]}>
                      {rejectedGoals.length} goal{rejectedGoals.length !== 1 ? 's' : ''} rejected
                    </Text>
                    <Text style={styles.insightSub}>
                      {rejectedGoals.some(g => g.evidence?.managerFeedback)
                        ? 'Review manager feedback below and resubmit with stronger evidence.'
                        : 'Resubmit with more detailed evidence to improve your score.'}
                    </Text>
                  </View>
                </View>
              )}
              {avgRating > 0 && (
                <View style={[styles.insightRow, { marginTop: 12 }]}>
                  <View style={[styles.insightIcon, { backgroundColor: colors.inProgressBg }]}>
                    <Text style={{ fontSize: 16 }}>★</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.insightTitle, { color: colors.inProgress }]}>
                      Average rating {avgRating.toFixed(1)}/5
                    </Text>
                    <Text style={styles.insightSub}>
                      {avgRating >= 4 ? 'Excellent performance — above expectations.' :
                       avgRating >= 3 ? 'Good performance. Target 4+ stars consistently.' :
                       'Aim for higher-quality evidence and stronger outcomes.'}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function GoalProgressCard({
  goal,
  totalWeight,
  colors,
  styles,
  onPress,
}: {
  goal: Goal;
  totalWeight: number;
  colors: ColorPalette;
  styles: ReturnType<typeof createStyles>;
  onPress: () => void;
}) {
  const sc = STATUS_CONFIG[goal.status];
  const cc = CATEGORY_CONFIG[goal.category];
  const contribution = totalWeight > 0 && goal.managerRating
    ? Math.round((goal.weight / totalWeight) * (goal.managerRating / 5) * 100)
    : null;
  const ratingPct = goal.managerRating ? (goal.managerRating / 5) * 100 : 0;
  const barColor = goal.status === 'approved' ? colors.approved
    : goal.status === 'rejected' ? colors.rejected
    : colors.pending;

  return (
    <View style={styles.goalCard}>
      {/* Header */}
      <View style={styles.goalCardHeader}>
        <View style={[styles.categoryDot, { backgroundColor: cc.color + '30' }]}>
          <Text style={[styles.categoryDotText, { color: cc.color }]}>{cc.label.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.goalTitle}>{goal.title}</Text>
          <Text style={styles.goalMeta}>{cc.label} · {goal.weight} cr · Due {formatDate(goal.targetDate)}</Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: sc.bg }]}>
          <Text style={[styles.statusChipText, { color: sc.color }]}>{sc.label}</Text>
        </View>
      </View>

      {/* Rating bar */}
      {goal.managerRating ? (
        <View style={styles.ratingSection}>
          <View style={styles.ratingLabelRow}>
            <Text style={styles.ratingLabel}>Manager Rating</Text>
            <Text style={[styles.ratingValue, { color: barColor }]}>
              {'★'.repeat(goal.managerRating)}{'☆'.repeat(5 - goal.managerRating)} {goal.managerRating}/5
            </Text>
          </View>
          <View style={styles.ratingBarTrack}>
            <View style={[styles.ratingBar, { width: `${ratingPct}%` as any, backgroundColor: barColor }]} />
          </View>
          {contribution !== null && (
            <Text style={[styles.contributionText, { color: barColor }]}>
              Contributed ~{contribution}% to quarter score
            </Text>
          )}
        </View>
      ) : (
        <Text style={styles.noRatingText}>Awaiting manager review</Text>
      )}

      {/* Manager feedback */}
      {goal.evidence?.managerFeedback && (
        <View style={[styles.feedbackBox, {
          backgroundColor: goal.status === 'approved' ? colors.approvedBg : colors.rejectedBg,
        }]}>
          <Text style={[styles.feedbackLabel, {
            color: goal.status === 'approved' ? colors.approved : colors.rejected,
          }]}>
            {goal.status === 'approved' ? '✓ Manager feedback' : '✕ Rejection reason'}
          </Text>
          <Text style={styles.feedbackText}>{goal.evidence.managerFeedback}</Text>
        </View>
      )}

      {/* Resubmit button for rejected */}
      {goal.status === 'rejected' && (
        <TouchableOpacity style={[styles.resubmitBtn, { backgroundColor: colors.rejectedBg }]} onPress={onPress} activeOpacity={0.8}>
          <Text style={[styles.resubmitBtnText, { color: colors.rejected }]}>🔁 Resubmit Evidence</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function createStyles(C: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    content: { padding: Spacing.lg },

    scoreCard: {
      backgroundColor: C.card,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: Spacing.lg,
      overflow: 'hidden',
      ...Shadow.md,
    },
    scoreRow: { flexDirection: 'row' },
    scoreCell: { flex: 1, alignItems: 'center', paddingVertical: Spacing.lg },
    scoreCellBorder: { borderLeftWidth: 1, borderLeftColor: C.border },
    scoreBig: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5, marginBottom: 2 },
    scoreLabel: { fontSize: 10, fontWeight: '700', color: C.textMuted },

    deltaRow: { borderTopWidth: 1, padding: Spacing.md, alignItems: 'center' },
    deltaText: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
    deltaTip: { fontSize: 11, textAlign: 'center', marginTop: 4, lineHeight: 16 },

    kpiStrip: {
      flexDirection: 'row',
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: Spacing.lg,
      overflow: 'hidden',
      ...Shadow.sm,
    },
    kpiCell: { flex: 1, alignItems: 'center', paddingVertical: 14 },
    kpiBorder: { borderLeftWidth: 1, borderLeftColor: C.border },
    kpiVal: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
    kpiLbl: { fontSize: 9, color: C.textMuted, fontWeight: '600', marginTop: 2, textAlign: 'center' },

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.md,
      marginTop: 4,
    },
    sectionTitle: { ...Typography.label, color: C.textMuted },
    scorePill: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3 },
    scorePillText: { fontSize: 11, fontWeight: '800' },

    goalCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: C.border,
      ...Shadow.sm,
    },
    goalCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
    categoryDot: {
      width: 34, height: 34, borderRadius: Radius.md,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    categoryDotText: { fontSize: 13, fontWeight: '800' },
    goalTitle: { fontSize: 14, fontWeight: '700', color: C.textPrimary, lineHeight: 18 },
    goalMeta: { fontSize: 11, color: C.textMuted, marginTop: 2 },
    statusChip: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
    statusChipText: { fontSize: 10, fontWeight: '700' },

    ratingSection: { marginBottom: 8 },
    ratingLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    ratingLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted },
    ratingValue: { fontSize: 13, fontWeight: '700' },
    ratingBarTrack: { height: 8, backgroundColor: C.bgElevated, borderRadius: Radius.full, overflow: 'hidden', marginBottom: 4 },
    ratingBar: { height: 8, borderRadius: Radius.full },
    contributionText: { fontSize: 10, fontWeight: '700', marginTop: 2 },
    noRatingText: { fontSize: 12, color: C.textMuted, fontStyle: 'italic', marginBottom: 4 },

    feedbackBox: { borderRadius: Radius.md, padding: 10, marginTop: 6 },
    feedbackLabel: { fontSize: 10, fontWeight: '800', marginBottom: 4 },
    feedbackText: { fontSize: 12, color: C.textSecondary, lineHeight: 17 },

    resubmitBtn: { borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
    resubmitBtnText: { fontSize: 13, fontWeight: '700' },

    insightsCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: C.border,
      ...Shadow.sm,
      marginBottom: Spacing.lg,
    },
    insightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    insightIcon: {
      width: 36, height: 36, borderRadius: Radius.md,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    insightTitle: { fontSize: 13, fontWeight: '700', marginBottom: 3 },
    insightSub: { fontSize: 12, color: C.textSecondary, lineHeight: 17 },
  });
}

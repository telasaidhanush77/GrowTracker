import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Header from '../../components/Header';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { Radius, Shadow, Spacing } from '../../theme';
import type { ColorPalette } from '../../theme';
import { Goal, ScreenProps } from '../../types';
import { calcCompletionRate, CATEGORY_CONFIG, calcQuarterScore, getGoalStats, PRIORITY_CONFIG, STATUS_CONFIG } from '../../utils';

export default function FYReportScreen({ navigation, params }: ScreenProps) {
  const { employees, goals } = useApp();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const employee = employees.find(e => e.id === params.employeeId);
  const manager = employees.find(e => e.id === employee?.managerId);
  const empGoals = goals.filter(g => g.employeeId === params.employeeId);

  const q1Goals = empGoals.filter(g => g.quarter === 'Q1');
  const q2Goals = empGoals.filter(g => g.quarter === 'Q2');

  const q1Score = calcQuarterScore(empGoals, 'Q1');
  const q2Score = calcQuarterScore(empGoals, 'Q2');
  const q1Stats = getGoalStats(empGoals, 'Q1');
  const q2Stats = getGoalStats(empGoals, 'Q2');
  const q1Completion = calcCompletionRate(empGoals, 'Q1');
  const q2Completion = calcCompletionRate(empGoals, 'Q2');
  const fyCompletion = empGoals.length > 0
    ? Math.round(((q1Stats.approved + q2Stats.approved) / empGoals.length) * 100)
    : 0;

  const fyScore = (q1Score > 0 || q2Score > 0)
    ? Math.round((q1Score + q2Score) / ((q1Score > 0 && q2Score > 0) ? 2 : 1))
    : 0;

  const reviewedGoals = empGoals.filter(g => g.managerRating);
  const avgManagerRating = reviewedGoals.length > 0
    ? (reviewedGoals.reduce((s, g) => s + (g.managerRating ?? 0), 0) / reviewedGoals.length)
    : 0;

  const isComplete = employee?.status === 'completed_fiscal_year';

  const scoreColor = (s: number) =>
    s >= 75 ? colors.approved : s >= 50 ? colors.pending : s > 0 ? colors.rejected : colors.textMuted;

  if (!employee) {
    return (
      <View style={styles.root}>
        <Header title="FY Report" color={colors.bgElevated} accentColor={colors.primary} onBack={navigation.goBack} />
        <View style={styles.empty}><Text style={styles.emptyText}>Employee not found.</Text></View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Header
        title="FY 2026 Report"
        subtitle={employee.name}
        color={colors.bgElevated}
        accentColor={isComplete ? colors.approved : colors.primary}
        onBack={navigation.goBack}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── HERO SCORECARD ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarText}>{employee.avatarInitials}</Text>
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.heroName}>{employee.name}</Text>
              <Text style={styles.heroDesig}>{employee.designation}</Text>
              {manager && <Text style={styles.heroMgr}>Reports to {manager.name}</Text>}
            </View>
            <View style={[styles.fyBadge, { backgroundColor: isComplete ? colors.approvedBg : colors.pendingBg }]}>
              <Text style={[styles.fyBadgeText, { color: isComplete ? colors.approved : colors.pending }]}>
                {isComplete ? 'Complete' : 'In Progress'}
              </Text>
            </View>
          </View>

          <View style={styles.scoreRow}>
            {[
              { label: 'Q1', score: q1Score, total: q1Stats.total, approved: q1Stats.approved, completion: q1Completion },
              { label: 'Q2', score: q2Score, total: q2Stats.total, approved: q2Stats.approved, completion: q2Completion },
              { label: 'FY', score: fyScore, total: empGoals.length, approved: q1Stats.approved + q2Stats.approved, completion: fyCompletion },
            ].map((item, i) => (
              <View key={item.label} style={[styles.scoreCell, i > 0 && styles.scoreCellBorder]}>
                <Text style={[styles.scoreBig, { color: item.score > 0 ? scoreColor(item.score) : colors.textMuted }]}>
                  {item.score > 0 ? `${item.score}` : '—'}
                </Text>
                <Text style={styles.scoreUnit}>{item.score > 0 ? '%' : ''}</Text>
                <Text style={styles.scoreLabel}>{item.label} Score</Text>
                <Text style={styles.scoreSub}>{item.approved}/{item.total} approved</Text>
                {item.completion > 0 && (
                  <Text style={[styles.scoreCompletion, { color: colors.approved }]}>{item.completion}% done</Text>
                )}
              </View>
            ))}
          </View>

          {q1Score > 0 && q2Score > 0 && (() => {
            const delta = Math.round(q2Score - q1Score);
            const improved = delta > 0;
            const neutral = delta === 0;
            const fg = neutral ? colors.textMuted : improved ? colors.approved : colors.rejected;
            return (
              <View style={[styles.heroDeltas, { borderTopWidth: 1, borderTopColor: colors.border }]}>
                <Text style={[styles.heroDeltaText, { color: fg }]}>
                  {neutral ? '→ No change' : improved ? `↑ Improved by ${delta} pts` : `↓ Declined by ${Math.abs(delta)} pts`}
                  {' '} from Q1 to Q2
                </Text>
              </View>
            );
          })()}
        </View>

        {/* ── RATINGS SUMMARY ── */}
        {reviewedGoals.length > 0 && (
          <>
            <SectionLabel title="Ratings Summary" colors={colors} />
            <View style={styles.ratingsCard}>
              {[
                { label: 'Manager Avg', value: avgManagerRating, count: reviewedGoals.length, sub: 'manager reviews' },
                { label: 'Out of 5', value: 5, count: null, sub: 'maximum rating' },
              ].map((item, i) => (
                <View key={item.label} style={[styles.ratingCell, i > 0 && styles.ratingCellBorder]}>
                  <Text style={styles.ratingStars}>
                    {item.value > 0 ? '★'.repeat(Math.round(item.value)) + '☆'.repeat(5 - Math.round(item.value)) : '—'}
                  </Text>
                  <Text style={styles.ratingValue}>{item.value > 0 ? item.value.toFixed(1) : '—'}</Text>
                  <Text style={styles.ratingLabel}>{item.label}</Text>
                  <Text style={styles.ratingSub}>{item.count !== null ? `${item.count} ` : ''}{item.sub}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Q1 GOALS ── */}
        {q1Goals.length > 0 && (
          <>
            <SectionLabel title="Q1 Goals · Jan–Jun 2026" colors={colors} pill={`${q1Stats.approved}/${q1Stats.total} approved`} pillColor={colors.approved} />
            {q1Goals.map(goal => <GoalReportCard key={goal.id} goal={goal} colors={colors} styles={styles} />)}
          </>
        )}

        {/* ── Q2 GOALS ── */}
        {q2Goals.length > 0 && (
          <>
            <SectionLabel title="Q2 Goals · Jul–Dec 2026" colors={colors} pill={`${q2Stats.approved}/${q2Stats.total} approved`} pillColor={colors.approved} />
            {q2Goals.map(goal => <GoalReportCard key={goal.id} goal={goal} colors={colors} styles={styles} />)}
          </>
        )}

        {empGoals.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No goals assigned yet for FY 2026.</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function SectionLabel({ title, colors, pill, pillColor }: { title: string; colors: ColorPalette; pill?: string; pillColor?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.lg, marginBottom: Spacing.sm }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, flex: 1 }}>
        {title}
      </Text>
      {pill && (
        <View style={{ backgroundColor: (pillColor ?? colors.approved) + '20', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: pillColor ?? colors.approved }}>{pill}</Text>
        </View>
      )}
    </View>
  );
}

function GoalReportCard({ goal, colors, styles }: { goal: Goal; colors: ColorPalette; styles: ReturnType<typeof createStyles> }) {
  const sc = STATUS_CONFIG[goal.status];
  const cc = CATEGORY_CONFIG[goal.category];
  const pc = PRIORITY_CONFIG[goal.priority];

  return (
    <View style={styles.goalCard}>
      {/* Chips row */}
      <View style={styles.goalChips}>
        <View style={[styles.chip, { backgroundColor: cc.color + '22' }]}>
          <Text style={[styles.chipText, { color: cc.color }]}>{cc.label}</Text>
        </View>
        <View style={[styles.chip, { backgroundColor: pc.bg }]}>
          <Text style={[styles.chipText, { color: pc.color }]}>{pc.label}</Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: sc.bg }]}>
          <Text style={[styles.statusChipText, { color: sc.color }]}>{sc.label}</Text>
        </View>
      </View>

      <Text style={styles.goalTitle}>{goal.title}</Text>
      <Text style={styles.goalDesc} numberOfLines={2}>{goal.description}</Text>

      {/* Manager rating */}
      {goal.managerRating && (
        <View style={styles.goalRatingRow}>
          <Text style={styles.goalRatingLabel}>Manager: </Text>
          <Text style={styles.goalStars}>
            {'★'.repeat(goal.managerRating)}{'☆'.repeat(5 - goal.managerRating)}
          </Text>
          <Text style={styles.goalRatingVal}> {goal.managerRating}/5</Text>
        </View>
      )}

      {/* Evidence description */}
      {goal.evidence?.description && (
        <View style={styles.evidenceBox}>
          <Text style={styles.evidenceLabel}>Evidence</Text>
          <Text style={styles.evidenceText} numberOfLines={3}>{goal.evidence.description}</Text>
        </View>
      )}

      {/* Manager feedback */}
      {goal.evidence?.managerFeedback && (
        <View style={[styles.feedbackBox, { backgroundColor: goal.status === 'approved' ? colors.approvedBg : colors.rejectedBg }]}>
          <Text style={[styles.feedbackLabel, { color: goal.status === 'approved' ? colors.approved : colors.rejected }]}>
            {goal.status === 'approved' ? '✓ Feedback' : '✕ Rejection reason'}
          </Text>
          <Text style={[styles.feedbackText, { color: goal.status === 'approved' ? colors.approved + 'CC' : colors.rejected + 'CC' }]}>
            {goal.evidence.managerFeedback}
          </Text>
        </View>
      )}
    </View>
  );
}

function createStyles(C: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    content: { padding: Spacing.lg },

    empty: { alignItems: 'center', paddingTop: 60 },
    emptyText: { fontSize: 15, color: C.textMuted },

    heroCard: {
      backgroundColor: C.card,
      borderRadius: Radius.xl,
      padding: Spacing.md,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: C.border,
      ...Shadow.md,
    },
    heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Spacing.md },
    heroAvatar: {
      width: 52, height: 52, borderRadius: Radius.full,
      backgroundColor: C.bgElevated,
      borderWidth: 1, borderColor: C.border,
      alignItems: 'center', justifyContent: 'center',
    },
    heroAvatarText: { fontSize: 18, fontWeight: '800', color: C.textPrimary },
    heroInfo: { flex: 1 },
    heroName: { fontSize: 16, fontWeight: '800', color: C.textPrimary },
    heroDesig: { fontSize: 12, color: C.textSecondary, marginTop: 1 },
    heroMgr: { fontSize: 11, color: C.textMuted, marginTop: 2 },
    fyBadge: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
    fyBadgeText: { fontSize: 11, fontWeight: '700' },

    scoreRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.border, paddingTop: Spacing.md },
    scoreCell: { flex: 1, alignItems: 'center' },
    scoreCellBorder: { borderLeftWidth: 1, borderLeftColor: C.border },
    scoreBig: { fontSize: 32, fontWeight: '900', lineHeight: 36 },
    scoreUnit: { fontSize: 14, fontWeight: '700', color: C.textMuted, marginTop: -4 },
    scoreLabel: { fontSize: 11, fontWeight: '700', color: C.textSecondary, marginTop: 4 },
    scoreSub: { fontSize: 10, color: C.textMuted, marginTop: 2 },
    scoreCompletion: { fontSize: 10, fontWeight: '700', marginTop: 2 },
    heroDeltas: { paddingTop: Spacing.sm, alignItems: 'center' },
    heroDeltaText: { fontSize: 12, fontWeight: '700' },

    ratingsCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      flexDirection: 'row',
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: C.border,
      ...Shadow.sm,
      overflow: 'hidden',
    },
    ratingCell: { flex: 1, alignItems: 'center', padding: Spacing.md },
    ratingCellBorder: { borderLeftWidth: 1, borderLeftColor: C.border },
    ratingStars: { fontSize: 14, color: '#F59E0B', marginBottom: 2 },
    ratingValue: { fontSize: 20, fontWeight: '900', color: C.textPrimary },
    ratingLabel: { fontSize: 10, fontWeight: '700', color: C.textSecondary, marginTop: 2 },
    ratingSub: { fontSize: 9, color: C.textMuted, marginTop: 1, textAlign: 'center' },

    goalCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: C.border,
      ...Shadow.sm,
    },
    goalChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    chip: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
    chipText: { fontSize: 10, fontWeight: '600' },
    statusChip: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 'auto' },
    statusChipText: { fontSize: 10, fontWeight: '700' },
    goalTitle: { fontSize: 14, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
    goalDesc: { fontSize: 12, color: C.textSecondary, lineHeight: 17, marginBottom: 8 },

    goalRatingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    goalRatingLabel: { fontSize: 11, color: C.textMuted, width: 58 },
    goalStars: { fontSize: 13, color: '#F59E0B' },
    goalRatingVal: { fontSize: 11, color: C.textMuted },

    evidenceBox: {
      backgroundColor: C.bgElevated,
      borderRadius: Radius.sm,
      padding: 10,
      marginTop: 8,
      marginBottom: 4,
      borderWidth: 1,
      borderColor: C.border,
    },
    evidenceLabel: { fontSize: 10, fontWeight: '700', color: C.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    evidenceText: { fontSize: 12, color: C.textSecondary, lineHeight: 17 },

    feedbackBox: { borderRadius: Radius.md, padding: 10, marginTop: 6 },
    feedbackLabel: { fontSize: 10, fontWeight: '800', marginBottom: 4 },
    feedbackText: { fontSize: 12, lineHeight: 17 },
  });
}

import { useState, useMemo } from 'react';
import {
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
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { Radius, Shadow, Spacing } from '../../theme';
import type { ColorPalette } from '../../theme';
import { ScreenProps } from '../../types';
import { CATEGORY_CONFIG, formatDate, PRIORITY_CONFIG, timeAgo } from '../../utils';

type Tab = 'pending' | 'reviewed';

export default function ReviewEvidence({ navigation, currentUserId }: ScreenProps) {
  const { employees, goals, reviewEvidence, addNotification } = useApp();
  const { showToast } = useToast();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [tab, setTab] = useState<Tab>('pending');
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
  const [ratings, setRatings] = useState<Record<string, number>>({});

  const team = employees.filter(e => e.managerId === currentUserId && e.role === 'employee');
  const teamGoals = goals.filter(g => team.some(e => e.id === g.employeeId));

  const pendingGoals = teamGoals.filter(g => g.status === 'submitted');
  const reviewedGoals = teamGoals.filter(
    g => g.status === 'approved' || g.status === 'rejected',
  );

  function handleApprove(goalId: string, employeeId: string, goalTitle: string) {
    const r = ratings[goalId];
    if (!r || r < 1) {
      showToast('Please set a star rating (1–5) before approving.', 'warning', 'Rating Required');
      return;
    }
    const feedback = feedbacks[goalId]?.trim() ?? '';
    reviewEvidence(goalId, true, feedback, r);
    addNotification({
      recipientId: employeeId,
      type: 'evidence_approved',
      title: 'Evidence Approved ✓',
      message: `Your submission for "${goalTitle}" has been approved with ${r} star${r !== 1 ? 's' : ''}!${feedback ? ` Feedback: "${feedback}"` : ''}`,
      read: false,
      createdAt: new Date().toISOString(),
      relatedGoalId: goalId,
    });
    showToast(`"${goalTitle}" approved with ${r}/5 stars. Employee notified.`, 'success', 'Evidence Approved');
  }

  function handleReject(goalId: string, employeeId: string, goalTitle: string) {
    const feedback = feedbacks[goalId]?.trim();
    if (!feedback) {
      showToast('Please provide feedback explaining why the evidence was rejected.', 'warning', 'Feedback Required');
      return;
    }
    reviewEvidence(goalId, false, feedback);
    addNotification({
      recipientId: employeeId,
      type: 'evidence_rejected',
      title: 'Evidence Rejected',
      message: `Your submission for "${goalTitle}" was rejected. Feedback: "${feedback}"`,
      read: false,
      createdAt: new Date().toISOString(),
      relatedGoalId: goalId,
    });
    showToast(`"${goalTitle}" rejected. Feedback sent to employee.`, 'info', 'Evidence Rejected');
  }

  const displayGoals = tab === 'pending' ? pendingGoals : reviewedGoals;

  return (
    <View style={styles.root}>
      <Header
        title="Review Evidence"
        subtitle={`${pendingGoals.length} pending`}
        color={colors.bgElevated}
        accentColor={colors.managerPrimary}
        onBack={navigation.goBack}
      />

      <View style={styles.tabRow}>
        {(['pending', 'reviewed'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'pending'
                ? `Pending (${pendingGoals.length})`
                : `Reviewed (${reviewedGoals.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {displayGoals.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>{tab === 'pending' ? '✅' : '📂'}</Text>
            <Text style={styles.emptyText}>
              {tab === 'pending'
                ? 'No pending submissions — you\'re all caught up!'
                : 'No reviewed submissions yet.'}
            </Text>
          </View>
        )}

        {displayGoals.map(goal => {
          const emp = employees.find(e => e.id === goal.employeeId);
          const ev = goal.evidence!;
          const cc = CATEGORY_CONFIG[goal.category];
          const pc = PRIORITY_CONFIG[goal.priority];
          const isPending = goal.status === 'submitted';

          return (
            <View key={goal.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.avatar, { backgroundColor: colors.employeeLight }]}>
                  <Text style={[styles.avatarText, { color: colors.employeePrimary }]}>
                    {emp?.avatarInitials ?? '?'}
                  </Text>
                </View>
                <View style={styles.headerInfo}>
                  <Text style={styles.empName}>{emp?.name ?? 'Unknown'}</Text>
                  <Text style={styles.empDesig}>{emp?.designation}</Text>
                </View>
                <View style={styles.badges}>
                  <View style={styles.qBadge}>
                    <Text style={styles.qBadgeText}>{goal.quarter}</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.goalTitle}>{goal.title}</Text>
              <Text style={styles.goalDesc}>{goal.description}</Text>

              <View style={styles.metaRow}>
                <View style={[styles.chip, { backgroundColor: cc.color + '40' }]}>
                  <Text style={[styles.chipText, { color: cc.color }]}>{cc.label}</Text>
                </View>
                <View style={[styles.chip, { backgroundColor: pc.bg }]}>
                  <Text style={[styles.chipText, { color: pc.color }]}>{pc.label}</Text>
                </View>
                <Text style={styles.dueText}>Due {formatDate(goal.targetDate)}</Text>
              </View>

              <View style={styles.divider} />

              <Text style={styles.evidenceLabel}>📎 Evidence Submitted</Text>
              <Text style={styles.evidenceText}>{ev.description}</Text>

              {ev.links.length > 0 && (
                <View style={styles.linksBox}>
                  {ev.links.map((l, i) => (
                    <Text key={i} style={styles.link}>🔗 {l}</Text>
                  ))}
                </View>
              )}


              <Text style={styles.submittedAt}>Submitted {timeAgo(ev.submittedAt)}</Text>

              {!isPending && (
                <View
                  style={[
                    styles.reviewedBanner,
                    {
                      backgroundColor:
                        goal.status === 'approved' ? colors.approvedBg : colors.rejectedBg,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontWeight: '700',
                      color: goal.status === 'approved' ? colors.approved : colors.rejected,
                      fontSize: 13,
                    }}
                  >
                    {goal.status === 'approved' ? '✓ Approved' : '✕ Rejected'}
                    {goal.managerRating ? ` · ${goal.managerRating}/5 ★` : ''}
                  </Text>
                  {ev.managerFeedback ? (
                    <Text style={styles.reviewedFeedback}>{ev.managerFeedback}</Text>
                  ) : null}
                  {ev.reviewedAt && (
                    <Text style={styles.reviewedAt}>{timeAgo(ev.reviewedAt)}</Text>
                  )}
                </View>
              )}

              {isPending && (
                <View style={styles.actionArea}>
                  <View style={styles.divider} />
                  <Text style={styles.ratingPrompt}>Your rating for this work:</Text>
                  <View style={styles.ratingRow}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <TouchableOpacity
                        key={s}
                        onPress={() => setRatings(prev => ({ ...prev, [goal.id]: s }))}
                      >
                        <Text
                          style={[
                            styles.ratingStarLg,
                            s <= (ratings[goal.id] ?? 0) && styles.ratingStarFilled,
                          ]}
                        >
                          ★
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {ratings[goal.id] && (
                      <Text style={styles.ratingLabel}>{ratings[goal.id]}/5</Text>
                    )}
                  </View>

                  <TextInput
                    style={styles.feedbackInput}
                    value={feedbacks[goal.id] ?? ''}
                    onChangeText={t =>
                      setFeedbacks(prev => ({ ...prev, [goal.id]: t }))
                    }
                    placeholder="Add feedback (required for rejection, optional for approval)"
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={2}
                  />

                  <View style={styles.decisionRow}>
                    <AnimatedButton
                      style={styles.rejectBtn}
                      onPress={() => handleReject(goal.id, goal.employeeId, goal.title)}
                      activeScale={0.96}
                    >
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </AnimatedButton>
                    <AnimatedButton
                      style={styles.approveBtn}
                      onPress={() => handleApprove(goal.id, goal.employeeId, goal.title)}
                      activeScale={0.96}
                    >
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </AnimatedButton>
                  </View>
                </View>
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
    tabActive: { backgroundColor: C.managerPrimary },
    tabText: { fontSize: 13, fontWeight: '600', color: C.textMuted },
    tabTextActive: { color: '#fff' },
    content: { paddingHorizontal: Spacing.lg },

    emptyState: { alignItems: 'center', paddingTop: 60 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyText: { fontSize: 15, color: C.textMuted, textAlign: 'center' },

    card: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: 14,
      ...Shadow.md,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    avatar: { width: 42, height: 42, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 16, fontWeight: '700' },
    headerInfo: { flex: 1 },
    empName: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
    empDesig: { fontSize: 12, color: C.textSecondary },
    badges: { flexDirection: 'row', gap: 6 },
    qBadge: { backgroundColor: C.managerLight, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
    qBadgeText: { fontSize: 12, fontWeight: '700', color: C.managerPrimary },
    goalTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
    goalDesc: { fontSize: 12, color: C.textSecondary, marginBottom: 8, lineHeight: 16 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    chip: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
    chipText: { fontSize: 11, fontWeight: '600' },
    dueText: { fontSize: 11, color: C.textMuted },
    divider: { height: 1, backgroundColor: C.divider, marginVertical: 10 },

    evidenceLabel: { fontSize: 13, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
    evidenceText: { fontSize: 13, color: C.textSecondary, lineHeight: 18, marginBottom: 8 },
    linksBox: { backgroundColor: C.bg, borderRadius: Radius.sm, padding: 8, gap: 4, marginBottom: 8 },
    link: { fontSize: 12, color: C.inProgress },

    stars: { flexDirection: 'row' },
    star: { fontSize: 16, color: C.border },
    starFilled: { color: '#F59E0B' },
    submittedAt: { fontSize: 11, color: C.textMuted, marginBottom: 4 },

    reviewedBanner: { borderRadius: Radius.md, padding: 10, marginTop: 8 },
    reviewedFeedback: { fontSize: 12, color: C.textSecondary, marginTop: 4 },
    reviewedAt: { fontSize: 11, color: C.textMuted, marginTop: 4 },

    actionArea: {},
    ratingPrompt: { fontSize: 13, fontWeight: '600', color: C.textSecondary, marginBottom: 6 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    ratingStarLg: { fontSize: 32, color: C.border },
    ratingStarFilled: { color: '#F59E0B' },
    ratingLabel: { fontSize: 14, color: C.textSecondary, fontWeight: '600' },
    feedbackInput: {
      backgroundColor: C.bg,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
      color: C.textPrimary,
      height: 70,
      textAlignVertical: 'top',
      marginBottom: 12,
    },
    decisionRow: { flexDirection: 'row', gap: 10 },
    rejectBtn: {
      flex: 1,
      borderWidth: 2,
      borderColor: C.rejected,
      borderRadius: Radius.lg,
      paddingVertical: 12,
      alignItems: 'center',
    },
    rejectBtnText: { fontSize: 14, fontWeight: '700', color: C.rejected },
    approveBtn: {
      flex: 2,
      backgroundColor: C.approved,
      borderRadius: Radius.lg,
      paddingVertical: 12,
      alignItems: 'center',
    },
    approveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  });
}

import { useState, useMemo } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Linking,
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

  // Memoized on the underlying data so typing in a feedback/rating field
  // (which updates state every keystroke) does not re-filter the team goals.
  const { pendingGoals, reviewedGoals } = useMemo(() => {
    const team = employees.filter(e => e.managerId === currentUserId && e.role === 'employee');
    const teamGoals = goals.filter(g => team.some(e => e.id === g.employeeId));
    return {
      pendingGoals: teamGoals.filter(g => g.status === 'submitted'),
      reviewedGoals: teamGoals.filter(g => g.status === 'approved' || g.status === 'rejected'),
    };
  }, [employees, goals, currentUserId]);

  function handleApprove(goalId: string, employeeId: string, goalTitle: string) {
    const r = ratings[goalId];
    if (!r || r < 1) {
      showToast('Please set a star rating (1–5) before approving.', 'warning', 'Rating Required');
      return;
    }
    const feedback = feedbacks[goalId]?.trim() ?? '';
    reviewEvidence(goalId, true, feedback, r, () => {
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
    });
  }

  function handleReject(goalId: string, employeeId: string, goalTitle: string) {
    const feedback = feedbacks[goalId]?.trim();
    if (!feedback) {
      showToast('Please provide feedback explaining why the evidence was rejected.', 'warning', 'Feedback Required');
      return;
    }
    reviewEvidence(goalId, false, feedback, undefined, () => {
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
    });
  }

  const displayGoals = tab === 'pending' ? pendingGoals : reviewedGoals;

  return (
    <KeyboardAvoidingView style={styles.root} behavior="padding">
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

      <FlatList
        data={displayGoals}
        keyExtractor={goal => goal.id}
        extraData={{ feedbacks, ratings, tab }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>{tab === 'pending' ? '✅' : '📂'}</Text>
            <Text style={styles.emptyText}>
              {tab === 'pending'
                ? 'No pending submissions — you\'re all caught up!'
                : 'No reviewed submissions yet.'}
            </Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 32 }} />}
        renderItem={({ item: goal }) => {
          const emp = employees.find(e => e.id === goal.employeeId);
          const ev = goal.evidence;
          if (!ev) return null;
          const cc = CATEGORY_CONFIG[goal.category];
          const pc = PRIORITY_CONFIG[goal.priority];
          const isPending = goal.status === 'submitted';
          const daysSince = Math.floor((Date.now() - new Date(ev.submittedAt).getTime()) / 86400000);
          const isAging = isPending && daysSince >= 3;

          return (
            <View style={styles.card}>
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

              {ev.attachments && ev.attachments.length > 0 && (
                <View style={styles.attachmentsBox}>
                  <Text style={styles.attachmentsLabel}>📎 Attachments ({ev.attachments.length})</Text>
                  {ev.attachments.map((a, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.attachmentRow}
                      onPress={() => Linking.openURL(a.uri)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.attachmentIcon}>
                        {a.mimeType.includes('pdf') ? '📄' : a.mimeType.includes('image') ? '🖼' : '📁'}
                      </Text>
                      <Text style={styles.attachmentName} numberOfLines={1}>{a.name}</Text>
                      {a.size ? <Text style={styles.attachmentSize}>{(a.size / 1024).toFixed(0)} KB</Text> : null}
                      <Text style={styles.attachmentOpen}>Open →</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={[styles.submittedAt, isAging && { color: colors.pending, fontWeight: '600' }]}>
                {isAging ? `⏳ Pending ${daysSince}d — awaiting your review` : `Submitted ${timeAgo(ev.submittedAt)}`}
              </Text>

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
                  <View style={styles.rubricRow}>
                    {(['1★ Did not meet', '2★ Partially met', '3★ Met', '4★ Exceeded', '5★ Far exceeded'] as const).map((label, i) => (
                      <Text key={i} style={[styles.rubricItem, (ratings[goal.id] ?? 0) === i + 1 && { color: colors.managerPrimary, fontWeight: '700' }]}>
                        {label}
                      </Text>
                    ))}
                  </View>
                  <View style={styles.ratingRow}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <TouchableOpacity
                        key={s}
                        onPress={() => setRatings(prev => ({ ...prev, [goal.id]: s }))}
                      >
                        <Text style={[styles.ratingStarLg, s <= (ratings[goal.id] ?? 0) && styles.ratingStarFilled]}>
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
                    onChangeText={t => setFeedbacks(prev => ({ ...prev, [goal.id]: t }))}
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
        }}
      />
    </KeyboardAvoidingView>
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
    attachmentsBox: { backgroundColor: C.bg, borderRadius: Radius.sm, padding: 8, gap: 4, marginBottom: 8 },
    attachmentsLabel: { fontSize: 12, fontWeight: '700', color: C.textSecondary, marginBottom: 2 },
    attachmentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
    attachmentIcon: { fontSize: 14 },
    attachmentName: { flex: 1, fontSize: 12, color: C.textPrimary },
    attachmentSize: { fontSize: 10, color: C.textMuted },
    attachmentOpen: { fontSize: 11, color: C.inProgress, fontWeight: '600' },

    reviewedBanner: { borderRadius: Radius.md, padding: 10, marginTop: 8 },
    reviewedFeedback: { fontSize: 12, color: C.textSecondary, marginTop: 4 },
    reviewedAt: { fontSize: 11, color: C.textMuted, marginTop: 4 },

    actionArea: {},
    ratingPrompt: { fontSize: 13, fontWeight: '600', color: C.textSecondary, marginBottom: 6 },
    rubricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
    rubricItem: { fontSize: 10, color: C.textMuted, backgroundColor: C.bgElevated, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
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

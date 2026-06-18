import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AnimatedButton } from '../../components/AnimatedButton';
import GoalStatusBar from '../../components/charts/GoalStatusBar';
import Header from '../../components/Header';
import BottomTabBar, { TabDef } from '../../components/BottomTabBar';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { Radius, Shadow, Spacing, Typography } from '../../theme';
import type { ColorPalette } from '../../theme';
import { GoalStatus, ScreenProps } from '../../types';
import { calcQuarterScore, getGoalStats, isOverdue, STATUS_CONFIG } from '../../utils';

const EMP_TABS: TabDef[] = [
  { key: 'overview',  label: 'Overview',  icon: '⌂' },
  { key: 'analysis',  label: 'Analysis',  icon: '▲' },
  { key: 'actions',   label: 'Actions',   icon: '⚡' },
];

type Tab = 'Overview' | 'Analysis' | 'Actions';


export default function EmployeeDashboard({
  navigation,
  currentUserId,
  onLogout,
  onSwitchAccount,
}: ScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { employees, goals, notifications } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  const employee = employees.find(e => e.id === currentUserId);
  const manager = employees.find(e => e.id === employee?.managerId);
  const myGoals = goals.filter(g => g.employeeId === currentUserId);

  const notifCount = notifications.filter(n => n.recipientId === currentUserId && !n.read).length;

  const q1Stats = getGoalStats(myGoals, 'Q1');
  const q2Stats = getGoalStats(myGoals, 'Q2');
  const q1Score = calcQuarterScore(myGoals, 'Q1');
  const q2Score = calcQuarterScore(myGoals, 'Q2');

  const rejectedQ1 = myGoals.filter(g => g.quarter === 'Q1' && g.status === 'rejected');
  const actionableGoals = myGoals
    .filter(g => g.status === 'in_progress' || g.status === 'not_started')
    .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
  const overdueGoals = actionableGoals.filter(g => isOverdue(g.targetDate));

  const userInitials = employee?.avatarInitials ?? '';

  return (
    <View style={styles.root}>
      <Header
        title={employee?.name.split(' ')[0] ?? 'Dashboard'}
        subtitle={employee?.designation}
        color={colors.bgElevated}
        accentColor={colors.employeePrimary}
        onLogout={onLogout}
        onSwitchAccount={onSwitchAccount}
        onNotif={() => navigation.navigate('notifications')}
        onProfile={() => navigation.navigate('profile')}
        notifCount={notifCount}
        userInitials={userInitials}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: 72 }]} showsVerticalScrollIndicator={false}>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'Overview' && (
          <>
            {/* Overdue alert */}
            {overdueGoals.length > 0 && (
              <TouchableOpacity
                style={styles.alertCard}
                onPress={() => navigation.navigate('goals-list')}
                activeOpacity={0.8}
              >
                <View style={styles.alertIconWrap}>
                  <Text style={styles.alertIconText}>!</Text>
                </View>
                <View style={styles.alertBody}>
                  <Text style={styles.alertTitle}>
                    {overdueGoals.length} goal{overdueGoals.length !== 1 ? 's' : ''} overdue
                  </Text>
                  <Text style={styles.alertSub}>Submit evidence to avoid escalation</Text>
                </View>
                <Text style={styles.alertArrow}>›</Text>
              </TouchableOpacity>
            )}

            {/* Carry-over nudge */}
            {rejectedQ1.length > 0 && (
              <View style={styles.nudgeCard}>
                <View style={styles.nudgeLeft}>
                  <Text style={styles.nudgeIcon}>↻</Text>
                </View>
                <View style={styles.nudgeBody}>
                  <Text style={styles.nudgeTitle}>Q1 Goals to Revisit</Text>
                  <Text style={styles.nudgeSub}>
                    {rejectedQ1.length} rejected goal{rejectedQ1.length !== 1 ? 's' : ''} — resubmit evidence for review
                  </Text>
                  {rejectedQ1.map(g => (
                    <AnimatedButton
                      key={g.id}
                      style={styles.nudgeGoalBtn}
                      onPress={() => navigation.navigate('submit-evidence', { goalId: g.id })}
                      activeScale={0.97}
                    >
                      <View style={styles.nudgeGoalRow}>
                        <View style={styles.nudgeGoalDot} />
                        <Text style={styles.nudgeGoal} numberOfLines={1}>{g.title}</Text>
                        <Text style={styles.nudgeGoalArrow}>›</Text>
                      </View>
                    </AnimatedButton>
                  ))}
                </View>
              </View>
            )}

            {/* FY Complete celebration banner */}
            {employee?.status === 'completed_fiscal_year' && (
              <View style={styles.fyCompleteCard}>
                <View style={styles.fyCompleteLeft}>
                  <Text style={styles.fyCompleteEmoji}>🎉</Text>
                </View>
                <View style={styles.fyCompleteBody}>
                  <Text style={styles.fyCompleteTitle}>FY 2026 Complete!</Text>
                  <Text style={styles.fyCompleteSub}>All your goals have been finalized. Excellent work this fiscal year!</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('fy-report', { employeeId: currentUserId! })}
                    style={styles.fyReportBtn}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.fyReportBtnText}>View Full Report →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Quarter performance rings */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Performance Score</Text>
            </View>

            <View style={styles.ringsRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={{ flex: 1 }}
                onPress={() => navigation.navigate('goals-list', { filterQuarter: 'Q1' })}
              >
                <QuarterScoreCard
                  quarter="Q1"
                  period="Jan – Jun 2026"
                  score={q1Score}
                  stats={q1Stats}
                  colors={colors}
                  isComplete={q1Stats.total > 0 && q1Stats.inProgress === 0 && q1Stats.notStarted === 0}
                  onStatusPress={(status) => navigation.navigate('goals-list', { filterStatus: status, filterQuarter: 'Q1' })}
                />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                style={{ flex: 1 }}
                onPress={() => navigation.navigate('goals-list', { filterQuarter: 'Q2' })}
              >
                <QuarterScoreCard
                  quarter="Q2"
                  period="Jul – Dec 2026"
                  score={q2Score}
                  stats={q2Stats}
                  colors={colors}
                  isActive
                  onStatusPress={(status) => navigation.navigate('goals-list', { filterStatus: status, filterQuarter: 'Q2' })}
                />
              </TouchableOpacity>
            </View>

            {/* Performance score breakdown */}
            {(q1Score > 0 || q2Score > 0) && (() => {
              const breakdownGoals = myGoals.filter(g => g.managerRating && g.managerRating > 0);
              if (breakdownGoals.length === 0) return null;
              return (
                <View style={styles.scoreBreakdownCard}>
                  <Text style={styles.scoreBreakdownTitle}>Score Breakdown</Text>
                  <Text style={styles.scoreBreakdownSub}>Each goal's contribution to your performance score</Text>
                  {breakdownGoals.map(g => {
                    const contribution = Math.round((g.weight * (g.managerRating ?? 0)) / 5);
                    const barPct = ((g.managerRating ?? 0) / 5) * 100;
                    const barColor = g.status === 'approved' ? colors.approved : g.status === 'rejected' ? colors.rejected : colors.pending;
                    return (
                      <View key={g.id} style={styles.scoreBreakdownRow}>
                        <View style={styles.scoreBreakdownLeft}>
                          <Text style={styles.scoreBreakdownGoal}>{g.title}</Text>
                          <Text style={styles.scoreBreakdownMeta}>{g.quarter} · {g.weight} cr · {g.managerRating}/5 ★</Text>
                        </View>
                        <View style={styles.scoreBreakdownBarWrap}>
                          <View style={[styles.scoreBreakdownBar, { width: `${barPct}%` as any, backgroundColor: barColor }]} />
                        </View>
                        <Text style={[styles.scoreBreakdownContrib, { color: barColor }]}>+{contribution}</Text>
                      </View>
                    );
                  })}
                  <View style={styles.scoreBreakdownFormula}>
                    <Text style={styles.scoreBreakdownFormulaText}>
                      Score = Σ(credits × rating/5) ÷ total credits × 100
                    </Text>
                  </View>
                </View>
              );
            })()}

            {q1Score > 0 && q2Score > 0 && (() => {
              const delta = Math.round(q2Score - q1Score);
              const improved = delta > 0;
              const neutral = delta === 0;
              const bg = neutral ? colors.bgElevated : improved ? colors.approvedBg : colors.rejectedBg;
              const fg = neutral ? colors.textMuted : improved ? colors.approved : colors.rejected;
              const icon = neutral ? '→' : improved ? '↑' : '↓';
              const label = neutral ? 'No change Q1 → Q2'
                : improved ? `+${delta} pts improvement Q1 → Q2`
                : `${delta} pts decline Q1 → Q2`;
              return (
                <View style={[styles.deltaCard, { backgroundColor: bg, borderColor: fg + '40' }]}>
                  <Text style={[styles.deltaIcon, { color: fg }]}>{icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.deltaLabel, { color: fg }]}>{label}</Text>
                    <Text style={[styles.deltaSub, { color: fg + 'AA' }]}>
                      Q1: {q1Score}pts · Q2: {q2Score}pts
                    </Text>
                  </View>
                </View>
              );
            })()}

            {/* FY Performance Summary */}
            {employee?.status === 'completed_fiscal_year' && (() => {
              const q1Goals = myGoals.filter(g => g.quarter === 'Q1');
              const q2Goals = myGoals.filter(g => g.quarter === 'Q2');
              const q1Approved = q1Goals.filter(g => g.status === 'approved').length;
              const q2Approved = q2Goals.filter(g => g.status === 'approved').length;
              return (
                <View style={styles.fySummaryCard}>
                  <Text style={styles.fySummaryTitle}>FY 2026 Performance Summary</Text>
                  <View style={styles.fyScoreRow}>
                    {[
                      { label: 'Q1 Score', value: q1Score !== null ? `${q1Score}` : '—', sub: `${q1Approved}/${q1Goals.length} approved` },
                      { label: 'Q2 Score', value: q2Score !== null ? `${q2Score}` : '—', sub: `${q2Approved}/${q2Goals.length} approved` },
                      { label: 'FY Score', value: q1Score !== null && q2Score !== null && (q1Score > 0 || q2Score > 0) ? `${Math.round((q1Score + q2Score) / 2)}` : '—', sub: 'overall' },
                    ].map(item => (
                      <View key={item.label} style={styles.fyScoreCell}>
                        <Text style={styles.fyScoreValue}>{item.value}</Text>
                        <Text style={styles.fyScoreLabel}>{item.label}</Text>
                        <Text style={styles.fyScoreSub}>{item.sub}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })()}

            {/* Reporting to — slim inline row */}
            {manager && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>My Manager</Text>
                </View>
                <View style={styles.reportingRow}>
                  <View style={[styles.reportingAvatar, { backgroundColor: colors.bgElevated }]}>
                    <Text style={[styles.reportingAvatarText, { color: colors.textSecondary }]}>
                      {manager.avatarInitials}
                    </Text>
                  </View>
                  <View style={styles.reportingInfo}>
                    <Text style={styles.reportingName}>{manager.name}</Text>
                    <Text style={styles.reportingDesig}>{manager.designation}</Text>
                  </View>
                  <View style={[styles.reportingDot, { backgroundColor: colors.approved }]} />
                </View>
              </>
            )}

            {/* My Workspace */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Workspace</Text>
            </View>
            <View style={styles.navGroup}>
              <TouchableOpacity
                style={[styles.navRow, styles.navRowFirst]}
                onPress={() => navigation.navigate('goals-list')}
                activeOpacity={0.7}
              >
                <Text style={styles.navIcon}>◎</Text>
                <Text style={styles.navLabel}>My Goals</Text>
                <Text style={styles.navTrailing}>{myGoals.length} goals</Text>
                <Text style={styles.navArrow}>›</Text>
              </TouchableOpacity>
              <View style={styles.navDivider} />
              <TouchableOpacity
                style={styles.navRow}
                onPress={() => navigation.navigate('daily-log')}
                activeOpacity={0.7}
              >
                <Text style={styles.navIcon}>📋</Text>
                <Text style={styles.navLabel}>Daily Work Log</Text>
                <Text style={styles.navTrailing}>Record today</Text>
                <Text style={styles.navArrow}>›</Text>
              </TouchableOpacity>
              <View style={styles.navDivider} />
              <TouchableOpacity
                style={[styles.navRow, styles.navRowLast]}
                onPress={() => employee?.status === 'completed_fiscal_year'
                  ? navigation.navigate('fy-report', { employeeId: currentUserId! })
                  : navigation.navigate('my-progress')}
                activeOpacity={0.7}
              >
                <Text style={styles.navIcon}>📊</Text>
                <Text style={styles.navLabel}>
                  {employee?.status === 'completed_fiscal_year' ? 'FY Report' : 'My Progress'}
                </Text>
                <Text style={styles.navTrailing}>
                  {employee?.status === 'completed_fiscal_year' ? 'Full year summary' : 'View progress'}
                </Text>
                <Text style={styles.navArrow}>›</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── ANALYSIS TAB ── */}
        {activeTab === 'Analysis' && (() => {
          const analysisQ1Score = calcQuarterScore(myGoals, 'Q1');
          const analysisQ2Score = calcQuarterScore(myGoals, 'Q2');
          const improved = analysisQ2Score > analysisQ1Score;
          const delta = Math.abs(analysisQ2Score - analysisQ1Score);

          return (
          <>
            {/* Goal Performance Breakdown */}
            {['Q1', 'Q2'].map(quarter => {
              const qGoals = myGoals.filter(g => g.quarter === quarter && g.managerRating);
              if (qGoals.length === 0) return null;
              return (
                <View key={quarter} style={styles.goalBreakdownSection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{quarter} Goal Ratings</Text>
                  </View>
                  {qGoals.map(g => {
                    const pct = ((g.managerRating ?? 0) / 5) * 100;
                    const barColor = g.status === 'approved' ? colors.approved : g.status === 'rejected' ? colors.rejected : colors.pending;
                    return (
                      <View key={g.id} style={styles.goalBreakdownRow}>
                        <View style={styles.goalBreakdownLeft}>
                          <Text style={styles.goalBreakdownTitle}>{g.title}</Text>
                          <Text style={styles.goalBreakdownWeight}>{g.weight} cr</Text>
                        </View>
                        <View style={styles.goalBreakdownBarWrap}>
                          <View style={[styles.goalBreakdownBar, { width: `${pct}%` as any, backgroundColor: barColor }]} />
                        </View>
                        <Text style={[styles.goalBreakdownRating, { color: barColor }]}>{g.managerRating}/5 ★</Text>
                      </View>
                    );
                  })}
                </View>
              );
            })}

            {/* Quarter comparison */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quarter Comparison</Text>
            </View>
            <View style={styles.compareCard}>
              <View style={styles.compareRow}>
                <CompareBlock quarter="Q1" score={analysisQ1Score} stats={q1Stats} color={colors.textSecondary} />
                <View style={styles.compareSep} />
                <View style={cStyles.block}>
                  <Text style={[cStyles.qLabel, { color: colors.textPrimary }]}>Q2</Text>
                  <Text style={[cStyles.score, { color: colors.textPrimary }]}>{analysisQ2Score > 0 ? `${analysisQ2Score}%` : '—'}</Text>
                  {analysisQ1Score > 0 && analysisQ2Score > 0 && (
                    <Text style={[cStyles.deltaText, { color: improved ? colors.approved : colors.rejected }]}>
                      {improved ? '↑' : '↓'} {delta}pts vs Q1
                    </Text>
                  )}
                  <Text style={cStyles.goals}>{q2Stats.total} goals</Text>
                  <Text style={cStyles.approvedText}>{q2Stats.approved} approved</Text>
                </View>
              </View>
              <View style={styles.compareBarSection}>
                <Text style={styles.compareBarLabel}>Approval Rate</Text>
                <View style={styles.compareBarRow}>
                  <View style={styles.compareBarTrack}>
                    <View style={[styles.compareBarFill, {
                      width: `${q1Stats.total > 0 ? (q1Stats.approved / q1Stats.total) * 100 : 0}%` as any,
                      backgroundColor: colors.textSecondary,
                    }]} />
                  </View>
                  <Text style={[styles.compareBarPct, { color: colors.textSecondary }]}>
                    {q1Stats.total > 0 ? Math.round((q1Stats.approved / q1Stats.total) * 100) : 0}%
                  </Text>
                </View>
                <View style={styles.compareBarRow}>
                  <View style={styles.compareBarTrack}>
                    <View style={[styles.compareBarFill, {
                      width: `${q2Stats.total > 0 ? (q2Stats.approved / q2Stats.total) * 100 : 0}%` as any,
                      backgroundColor: colors.textPrimary,
                    }]} />
                  </View>
                  <Text style={[styles.compareBarPct, { color: colors.textPrimary }]}>
                    {q2Stats.total > 0 ? Math.round((q2Stats.approved / q2Stats.total) * 100) : 0}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Manager Ratings */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Manager Ratings</Text>
            </View>
            {(() => {
              const ratedGoals = myGoals.filter(g => g.managerRating && g.managerRating > 0);

              if (ratedGoals.length === 0) {
                return (
                  <View style={styles.ratingsEmptyCard}>
                    <Text style={styles.ratingsEmptyText}>No ratings yet — ratings appear once your manager reviews your evidence.</Text>
                  </View>
                );
              }

              const sorted = [...ratedGoals].sort((a, b) => (b.managerRating ?? 0) - (a.managerRating ?? 0));
              const avgRating = ratedGoals.reduce((s, g) => s + (g.managerRating ?? 0), 0) / ratedGoals.length;

              return (
                <View style={styles.managerRatingsCard}>
                  <View style={styles.managerRatingsHeader}>
                    <Text style={styles.managerRatingsTitle}>Manager Ratings</Text>
                    <Text style={styles.managerRatingsAvg}>Avg {avgRating.toFixed(1)}★</Text>
                  </View>
                  {sorted.map(goal => {
                    const sc = STATUS_CONFIG[goal.status];
                    const barPct = ((goal.managerRating ?? 0) / 5) * 100;
                    const barColor = goal.status === 'approved' ? colors.approved : goal.status === 'rejected' ? colors.rejected : colors.pending;
                    return (
                      <View key={goal.id} style={styles.ratingGoalRow}>
                        <View style={styles.ratingGoalInfo}>
                          <Text style={styles.ratingGoalTitle} numberOfLines={1}>{goal.title}</Text>
                          <View style={styles.ratingGoalMeta}>
                            <Text style={styles.ratingGoalQ}>{goal.quarter}</Text>
                            <View style={[styles.ratingStatusChip, { backgroundColor: sc.bg }]}>
                              <Text style={[styles.ratingStatusText, { color: sc.color }]}>{sc.label}</Text>
                            </View>
                          </View>
                        </View>
                        <View style={styles.ratingBarWrap}>
                          <View style={[styles.ratingBar, { width: `${barPct}%` as any, backgroundColor: barColor }]} />
                        </View>
                        <Text style={[styles.ratingStars, { color: barColor }]}>
                          {'★'.repeat(goal.managerRating ?? 0)}{'☆'.repeat(5 - (goal.managerRating ?? 0))}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              );
            })()}
          </>
          );
        })()}

        {/* ── ACTIONS TAB ── */}
        {activeTab === 'Actions' && (
          <>
            {(() => {
              const todos: Array<{ type: 'submit' | 'resubmit' | 'log'; goal?: typeof myGoals[0] }> = [];

              myGoals.filter(g => (g.status === 'not_started' || g.status === 'in_progress') && !g.evidence)
                .forEach(g => todos.push({ type: 'submit', goal: g }));

              myGoals.filter(g => g.status === 'rejected')
                .forEach(g => todos.push({ type: 'resubmit', goal: g }));

              const iconMap = { submit: '📝', resubmit: '🔄', log: '📅' };
              const titleMap = { submit: 'Submit Evidence', resubmit: 'Resubmit Evidence', log: "Today's Log" };

              return (
                <View>
                  {todos.length === 0 && (
                    <View style={styles.actionsDoneCard}>
                      <Text style={styles.actionsDoneEmoji}>✅</Text>
                      <Text style={styles.actionsDoneTitle}>All caught up!</Text>
                      <Text style={styles.actionsDoneSub}>No pending actions for your goals right now.</Text>
                    </View>
                  )}

                  {todos.map((todo, i) => (
                    <TouchableOpacity
                      key={todo.goal?.id ?? `todo-${i}`}
                      style={styles.actionTodoCard}
                      onPress={() => {
                        if (todo.goal) navigation.navigate('submit-evidence', { goalId: todo.goal.id });
                        else navigation.navigate('daily-log');
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.actionTodoIcon, todo.type === 'resubmit' && { backgroundColor: colors.rejectedBg }]}>
                        <Text style={styles.actionTodoIconText}>{iconMap[todo.type]}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.actionTodoTitle}>{titleMap[todo.type]}</Text>
                        {todo.goal && (
                          <>
                            <Text style={styles.actionTodoGoal} numberOfLines={1}>{todo.goal.title}</Text>
                            <View style={styles.actionTodoMeta}>
                              <View style={styles.actionTodoQChip}>
                                <Text style={styles.actionTodoQText}>{todo.goal.quarter}</Text>
                              </View>
                              <Text style={styles.actionTodoWeight}>{todo.goal.weight} cr</Text>
                            </View>
                          </>
                        )}
                      </View>
                      <Text style={styles.actionTodoArrow}>›</Text>
                    </TouchableOpacity>
                  ))}

                  {/* Daily log shortcut always shown at bottom */}
                  <TouchableOpacity
                    style={styles.actionTodoCard}
                    onPress={() => navigation.navigate('daily-log')}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.actionTodoIcon, { backgroundColor: colors.inProgressBg }]}>
                      <Text style={styles.actionTodoIconText}>📅</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.actionTodoTitle}>Today's Daily Log</Text>
                      <Text style={styles.actionTodoGoal}>Record your work activities</Text>
                    </View>
                    <Text style={styles.actionTodoArrow}>›</Text>
                  </TouchableOpacity>
                </View>
              );
            })()}
          </>
        )}

        <View style={{ height: 36 }} />
      </ScrollView>
      <BottomTabBar
        tabs={EMP_TABS}
        activeKey={activeTab.toLowerCase()}
        onSelect={tab => setActiveTab((tab.charAt(0).toUpperCase() + tab.slice(1)) as Tab)}
      />
    </View>
  );
}

function QuarterScoreCard({
  quarter,
  period,
  score,
  stats,
  colors,
  isActive,
  isComplete,
  onStatusPress,
}: {
  quarter: string;
  period: string;
  score: number;
  stats: ReturnType<typeof getGoalStats>;
  colors: ColorPalette;
  isActive?: boolean;
  isComplete?: boolean;
  onStatusPress?: (status: GoalStatus) => void;
}) {
  const qStyles = useMemo(() => createQStyles(colors), [colors]);
  const scoreColor = score >= 75 ? colors.approved : score >= 50 ? colors.pending : score > 0 ? colors.rejected : colors.textMuted;
  return (
    <View style={[qStyles.card, isActive && { borderColor: colors.textSecondary }]}>
      <View style={qStyles.header}>
        <Text style={qStyles.qLabel}>{quarter}</Text>
        {isActive && <View style={[qStyles.activePip, { backgroundColor: colors.approved }]} />}
        {isComplete && (
          <View style={[qStyles.completeBadge, { backgroundColor: colors.approvedBg }]}>
            <Text style={[qStyles.completeBadgeText, { color: colors.approved }]}>Done</Text>
          </View>
        )}
      </View>
      <Text style={qStyles.period}>{period}</Text>
      <Text style={[qStyles.scoreNum, { color: scoreColor }]}>
        {score > 0 ? `${score}%` : '—'}
      </Text>
      <GoalStatusBar stats={stats} height={5} onSegmentPress={onStatusPress} />
      <View style={qStyles.statsRow}>
        <View style={qStyles.statBlock}>
          <Text style={[qStyles.statNum, { color: colors.approved }]}>{stats.approved}</Text>
          <Text style={qStyles.statLbl}>Approved</Text>
        </View>
        <View style={qStyles.statBlock}>
          <Text style={[qStyles.statNum, { color: colors.pending }]}>{stats.submitted}</Text>
          <Text style={qStyles.statLbl}>Pending</Text>
        </View>
        <View style={qStyles.statBlock}>
          <Text style={[qStyles.statNum, { color: colors.rejected }]}>{stats.rejected}</Text>
          <Text style={qStyles.statLbl}>Rejected</Text>
        </View>
        <View style={qStyles.statBlock}>
          <Text style={[qStyles.statNum, { color: colors.textMuted }]}>{stats.inProgress}</Text>
          <Text style={qStyles.statLbl}>Active</Text>
        </View>
      </View>
    </View>
  );
}

function CompareBlock({
  quarter,
  score,
  stats,
  color,
}: {
  quarter: string;
  score: number;
  stats: ReturnType<typeof getGoalStats>;
  color: string;
}) {
  return (
    <View style={cStyles.block}>
      <Text style={[cStyles.qLabel, { color }]}>{quarter}</Text>
      <Text style={[cStyles.score, { color }]}>{score > 0 ? `${score}%` : '—'}</Text>
      <Text style={cStyles.goals}>{stats.total} goals</Text>
      <Text style={cStyles.approvedText}>{stats.approved} approved</Text>
    </View>
  );
}

function createQStyles(C: ColorPalette) {
  return StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      ...Shadow.sm,
      borderWidth: 1,
      borderColor: C.border,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
    qLabel: { ...Typography.h4, color: C.textPrimary },
    activePip: { width: 7, height: 7, borderRadius: 4 },
    completeBadge: { marginLeft: 'auto', borderRadius: Radius.xs, paddingHorizontal: 6, paddingVertical: 2 },
    completeBadgeText: { fontSize: 9, fontWeight: '800' },
    period: { fontSize: 9, color: C.textMuted, marginBottom: 8 },
    scoreNum: { fontSize: 28, fontWeight: '800', letterSpacing: -1, marginBottom: 2 },
    statsRow: { flexDirection: 'row', marginTop: 6 },
    statBlock: { flex: 1, alignItems: 'center' },
    statNum: { fontSize: 14, fontWeight: '800' },
    statLbl: { fontSize: 9, color: C.textMuted, marginTop: 1 },
  });
}

const cStyles = StyleSheet.create({
  block: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  qLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  score: { fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  deltaText: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  goals: { fontSize: 11, marginTop: 2 },
  approvedText: { fontSize: 11, fontWeight: '600', marginTop: 2 },
});

function createStyles(C: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1 },
    content: { padding: Spacing.lg },

    reportingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: Spacing.lg,
      paddingHorizontal: 2,
    },
    reportingAvatar: {
      width: 32, height: 32, borderRadius: Radius.full,
      alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    },
    reportingAvatarText: { fontSize: 12, fontWeight: '800' },
    reportingInfo: { flex: 1 },
    reportingName: { fontSize: 13, fontWeight: '700', color: C.textPrimary },
    reportingDesig: { fontSize: 11, color: C.textSecondary, marginTop: 1 },
    reportingDot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },

    alertCard: {
      backgroundColor: C.rejectedBg,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: Spacing.lg,
      borderLeftWidth: 3,
      borderLeftColor: C.rejected,
      borderWidth: 1,
      borderColor: C.rejectedBg,
    },
    alertIconWrap: {
      width: 30, height: 30, borderRadius: Radius.full,
      backgroundColor: C.rejected,
      alignItems: 'center', justifyContent: 'center',
    },
    alertIconText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    alertBody: { flex: 1 },
    alertTitle: { fontSize: 14, fontWeight: '700', color: C.rejected },
    alertSub: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
    alertArrow: { fontSize: 20, color: C.rejected },

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.md,
      marginTop: 4,
    },
    sectionTitle: { ...Typography.label, color: C.textMuted },
    sectionPill: {
      fontSize: 11, fontWeight: '600', color: C.textMuted,
      backgroundColor: C.bgElevated,
      borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3,
      borderWidth: 1, borderColor: C.border,
    },

    ringsRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.lg },

    deltaCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: Radius.lg,
      borderWidth: 1,
      padding: Spacing.md,
      marginBottom: Spacing.md,
    },
    deltaIcon: { fontSize: 22, fontWeight: '900', width: 28, textAlign: 'center' },
    deltaLabel: { fontSize: 13, fontWeight: '700' },
    deltaSub: { fontSize: 11, marginTop: 2 },

    scoreBreakdownCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: C.border,
      ...Shadow.sm,
    },
    scoreBreakdownTitle: { fontSize: 13, fontWeight: '700', color: C.textPrimary, marginBottom: 2 },
    scoreBreakdownSub: { fontSize: 11, color: C.textMuted, marginBottom: 10 },
    scoreBreakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    scoreBreakdownLeft: { width: 100 },
    scoreBreakdownGoal: { fontSize: 11, fontWeight: '600', color: C.textPrimary, lineHeight: 15 },
    scoreBreakdownMeta: { fontSize: 9, color: C.textMuted, marginTop: 1 },
    scoreBreakdownBarWrap: { flex: 1, height: 6, backgroundColor: C.bgElevated, borderRadius: Radius.full, overflow: 'hidden' },
    scoreBreakdownBar: { height: 6, borderRadius: Radius.full },
    scoreBreakdownContrib: { fontSize: 11, fontWeight: '800', width: 28, textAlign: 'right' },
    scoreBreakdownFormula: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.divider },
    scoreBreakdownFormulaText: { fontSize: 10, color: C.textMuted, fontStyle: 'italic', textAlign: 'center' },

    nudgeCard: {
      backgroundColor: C.pendingBg,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      flexDirection: 'row',
      gap: 12,
      marginBottom: Spacing.lg,
      borderLeftWidth: 3,
      borderLeftColor: C.pending,
      borderWidth: 1,
      borderColor: C.pendingBg,
    },
    nudgeLeft: {
      width: 28, height: 28, borderRadius: Radius.full,
      backgroundColor: C.pending,
      alignItems: 'center', justifyContent: 'center',
    },
    nudgeIcon: { color: '#000', fontSize: 16, fontWeight: '800' },
    nudgeBody: { flex: 1 },
    nudgeTitle: { fontSize: 14, fontWeight: '700', color: C.pending },
    nudgeSub: { fontSize: 12, color: C.textSecondary, marginTop: 2, lineHeight: 17, marginBottom: 6 },
    nudgeGoalBtn: { marginTop: 6 },
    nudgeGoalRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.pending + '18', borderRadius: Radius.sm, paddingVertical: 6, paddingHorizontal: 8 },
    nudgeGoalDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.pending },
    nudgeGoal: { fontSize: 12, color: C.textSecondary, flex: 1 },
    nudgeGoalArrow: { fontSize: 14, color: C.pending, fontWeight: '700' },

    navGroup: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: C.border,
      ...Shadow.sm,
      marginBottom: Spacing.lg,
      overflow: 'hidden',
    },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: Spacing.md,
      paddingVertical: 14,
      backgroundColor: C.card,
    },
    navRowFirst: {},
    navRowLast: {},
    navDivider: { height: 1, backgroundColor: C.divider, marginLeft: Spacing.md + 32 + 12 },
    navIcon: { fontSize: 18, width: 32, textAlign: 'center' },
    navLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: C.textPrimary },
    navTrailing: { fontSize: 12, color: C.textMuted, fontWeight: '500', marginRight: 4 },
    navArrow: { fontSize: 18, color: C.textMuted },

    compareCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: C.border,
      ...Shadow.sm,
    },
    compareRow: { flexDirection: 'row', marginBottom: 16 },
    compareSep: { width: 1, backgroundColor: C.divider, marginHorizontal: 12 },
    compareBarSection: {},
    compareBarLabel: { ...Typography.label, color: C.textMuted, marginBottom: 8 },
    compareBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    compareBarTrack: {
      flex: 1, height: 8,
      backgroundColor: C.chartTrack,
      borderRadius: 4, overflow: 'hidden',
    },
    compareBarFill: { height: '100%', borderRadius: 4 },
    compareBarPct: { fontSize: 12, fontWeight: '700', width: 38, textAlign: 'right' },

    fyCompleteCard: {
      backgroundColor: C.approvedBg,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: C.approved + '40',
      ...Shadow.sm,
    },
    fyCompleteLeft: { width: 44, height: 44, borderRadius: Radius.full, backgroundColor: C.approved + '20', alignItems: 'center', justifyContent: 'center' },
    fyCompleteEmoji: { fontSize: 24 },
    fyCompleteBody: { flex: 1 },
    fyCompleteTitle: { fontSize: 15, fontWeight: '800', color: C.approved, marginBottom: 3 },
    fyCompleteSub: { fontSize: 12, color: C.textSecondary, lineHeight: 17 },
    fyReportBtn: { marginTop: 8, alignSelf: 'flex-start' },
    fyReportBtnText: { fontSize: 12, fontWeight: '700', color: C.approved },

    fySummaryCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: C.approvedBg,
      ...Shadow.sm,
    },
    fySummaryTitle: { fontSize: 13, fontWeight: '700', color: C.textSecondary, marginBottom: Spacing.md },
    fyScoreRow: { flexDirection: 'row', gap: 8 },
    fyScoreCell: { flex: 1, alignItems: 'center', backgroundColor: C.bgElevated, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: C.border },
    fyScoreValue: { fontSize: 26, fontWeight: '900', color: C.approved, marginBottom: 2 },
    fyScoreLabel: { fontSize: 11, fontWeight: '700', color: C.textSecondary },
    fyScoreSub: { fontSize: 10, color: C.textMuted, marginTop: 2 },

    // Manager Ratings card (Analysis tab)
    managerRatingsCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: C.border,
      ...Shadow.sm,
    },
    managerRatingsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
    managerRatingsTitle: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
    managerRatingsAvg: { fontSize: 13, fontWeight: '700', color: C.approved },
    ratingGoalRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    ratingGoalInfo: { flex: 1 },
    ratingGoalTitle: { fontSize: 13, fontWeight: '600', color: C.textPrimary },
    ratingGoalMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    ratingGoalQ: { fontSize: 10, color: C.textMuted, fontWeight: '700' },
    ratingStatusChip: { borderRadius: Radius.xs, paddingHorizontal: 6, paddingVertical: 2 },
    ratingStatusText: { fontSize: 9, fontWeight: '700' },
    ratingBarWrap: { flex: 1, height: 6, backgroundColor: C.bgElevated, borderRadius: Radius.full, overflow: 'hidden' },
    ratingBar: { height: 6, borderRadius: Radius.full },
    ratingStars: { fontSize: 14, fontWeight: '700' },
    ratingsEmptyCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.xl,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: 'center',
    },
    ratingsEmptyText: { fontSize: 13, color: C.textSecondary, textAlign: 'center', lineHeight: 19 },

    // Goal Performance Breakdown (Analysis tab)
    goalBreakdownSection: { marginBottom: Spacing.lg },
    goalBreakdownRow: { flexDirection: 'column', marginBottom: 10, backgroundColor: C.bgElevated, borderRadius: Radius.md, padding: 8 },
    goalBreakdownLeft: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    goalBreakdownTitle: { fontSize: 12, fontWeight: '600', color: C.textPrimary, lineHeight: 17, flex: 1 },
    goalBreakdownWeight: { fontSize: 10, color: C.textMuted, marginLeft: 6 },
    goalBreakdownBarWrap: { height: 8, backgroundColor: C.card, borderRadius: Radius.full, overflow: 'hidden' },
    goalBreakdownBar: { height: 8, borderRadius: Radius.full },
    goalBreakdownRating: { fontSize: 10, fontWeight: '700', textAlign: 'right', marginTop: 4 },

    // Actions tab to-do list
    actionsDoneCard: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: Spacing.lg },
    actionsDoneEmoji: { fontSize: 32 },
    actionsDoneTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary, marginTop: 8 },
    actionsDoneSub: { fontSize: 13, color: C.textMuted, textAlign: 'center', marginTop: 4 },
    actionTodoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: C.border,
      ...Shadow.sm,
    },
    actionTodoIcon: {
      width: 44,
      height: 44,
      borderRadius: Radius.md,
      backgroundColor: C.approvedBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionTodoIconText: { fontSize: 22 },
    actionTodoTitle: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
    actionTodoGoal: { fontSize: 12, color: C.textSecondary, marginTop: 1 },
    actionTodoMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    actionTodoQChip: {
      backgroundColor: C.bgElevated,
      borderRadius: Radius.full,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    actionTodoQText: { fontSize: 10, color: C.textMuted, fontWeight: '700' },
    actionTodoWeight: { fontSize: 11, color: C.textMuted },
    actionTodoArrow: { fontSize: 18, color: C.textMuted },
  });
}

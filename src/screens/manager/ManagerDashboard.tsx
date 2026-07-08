import React, { useState, useMemo } from 'react';
import { ActivityIndicator, DimensionValue, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MiniBarChart, { BarDatum } from '../../components/charts/MiniBarChart';
import BottomTabBar, { TabDef } from '../../components/BottomTabBar';
import Header from '../../components/Header';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useTriggerCoaching } from '../../hooks/useAIReports';
import { Radius, Shadow, Spacing, Typography } from '../../theme';
import type { ColorPalette } from '../../theme';
import { ScreenProps } from '../../types';
import { calcQuarterScore, getGoalStats } from '../../utils';

type Tab = 'Dashboard' | 'Analytics' | 'Team';

const MGR_TABS: TabDef[] = [
  { key: 'Dashboard', label: 'Dashboard', icon: '⌂' },
  { key: 'Team',      label: 'Team',      icon: '◈' },
  { key: 'Analytics', label: 'Analytics', icon: '▲' },
];

export default function ManagerDashboard({
  navigation,
  currentUserId,
  onLogout,
  onSwitchAccount,
}: ScreenProps) {
  const { employees, goals, notifications } = useApp();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { showToast } = useToast();
  const coachingMutation = useTriggerCoaching();
  const [activeTab, setActiveTab] = useState<Tab>('Dashboard');

  // Heavy per-team analytics (O(team × goals)). Memoized on the underlying data
  // so tab switches and other unrelated re-renders don't recompute it.
  const {
    manager, team, pendingReviews, overdueTeamGoals, overdueEmployees,
    q1Stats, q2Stats, totalGoals, approvedAll, userInitials, teamData,
  } = useMemo(() => {
    const manager = employees.find(e => e.id === currentUserId);
    const team = employees.filter(e => e.managerId === currentUserId && e.role === 'employee');
    const teamGoals = goals.filter(g => team.some(e => e.id === g.employeeId));

    const pendingReviews = teamGoals.filter(g => g.status === 'submitted').length;

    const todayMs = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })();
    const overdueTeamGoals = teamGoals.filter(g =>
      (g.status === 'not_started' || g.status === 'in_progress') &&
      new Date(g.targetDate + 'T00:00:00').getTime() < todayMs
    );
    const overdueEmployees = team.filter(emp => overdueTeamGoals.some(g => g.employeeId === emp.id));

    const q1Stats = getGoalStats(teamGoals, 'Q1');
    const q2Stats = getGoalStats(teamGoals, 'Q2');

    const teamData = team.map(emp => {
      const empGoals = goals.filter(g => g.employeeId === emp.id);
      const q1Score = calcQuarterScore(empGoals, 'Q1');
      const q2Score = calcQuarterScore(empGoals, 'Q2');
      const combined = Math.round((q1Score + q2Score) / (q1Score > 0 && q2Score > 0 ? 2 : 1)) || 0;
      const empStats = getGoalStats(empGoals, 'Q2');
      return { emp, q1Score, q2Score, combined, empStats, empGoals };
    });

    return {
      manager, team, pendingReviews, overdueTeamGoals, overdueEmployees,
      q1Stats, q2Stats, totalGoals: teamGoals.length,
      approvedAll: q1Stats.approved + q2Stats.approved,
      userInitials: manager?.avatarInitials ?? '', teamData,
    };
  }, [employees, goals, currentUserId]);

  const notifCount = useMemo(
    () => notifications.filter(n => n.recipientId === currentUserId && !n.read).length,
    [notifications, currentUserId],
  );

  const teamBarData: BarDatum[] = useMemo(() => teamData.map(d => ({
    label: d.emp.name.split(' ')[0],
    value: d.q2Score,
    color: d.q2Score >= 75 ? colors.approved : d.q2Score >= 50 ? colors.pending : colors.rejected,
  })), [teamData, colors]);

  const statusDist: BarDatum[] = useMemo(() => [
    { label: 'Approved', value: q1Stats.approved + q2Stats.approved, color: colors.approved },
    { label: 'In Progress', value: q1Stats.inProgress + q2Stats.inProgress, color: colors.inProgress },
    { label: 'Pending', value: q1Stats.submitted + q2Stats.submitted, color: colors.pending },
    { label: 'Rejected', value: q1Stats.rejected + q2Stats.rejected, color: colors.rejected },
    { label: 'Not Started', value: q1Stats.notStarted + q2Stats.notStarted, color: colors.notStarted },
  ], [q1Stats, q2Stats, colors]);

  return (
    <View style={styles.root}>
      <Header
        title={manager?.name.split(' ')[0] ?? 'Dashboard'}
        subtitle={`${team.length} direct reports`}
        color={colors.bgElevated}
        accentColor={colors.managerPrimary}
        onLogout={onLogout}
        onSwitchAccount={onSwitchAccount}
        onNotif={() => navigation.navigate('notifications')}
        onProfile={() => navigation.navigate('profile')}
        onPrivacySecurity={() => navigation.navigate('privacy-security')}
        notifCount={notifCount}
        userInitials={userInitials}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: 72 }]} showsVerticalScrollIndicator={false}>

        {activeTab === 'Dashboard' && (
          <>
            <View style={styles.kpiStrip}>
              <View style={styles.kpiCell}>
                <Text style={[styles.kpiValue, { color: colors.managerPrimary }]}>{team.length}</Text>
                <Text style={styles.kpiLabel}>Team Size</Text>
              </View>
              <View style={[styles.kpiCell, styles.kpiCellBorder]}>
                <Text style={[styles.kpiValue, { color: colors.pending }]}>{pendingReviews}</Text>
                <Text style={styles.kpiLabel}>Pending Reviews</Text>
              </View>
              <View style={[styles.kpiCell, styles.kpiCellBorder]}>
                <Text style={[styles.kpiValue, { color: colors.approved }]}>{approvedAll}</Text>
                <Text style={styles.kpiLabel}>Total Approved</Text>
              </View>
            </View>

            {pendingReviews > 0 && (
              <TouchableOpacity
                style={styles.alertCard}
                onPress={() => navigation.navigate('review-evidence')}
                activeOpacity={0.8}
              >
                <View style={styles.alertDot}>
                  <Text style={styles.alertDotText}>{pendingReviews}</Text>
                </View>
                <View style={styles.alertBody}>
                  <Text style={styles.alertTitle}>
                    {pendingReviews} submission{pendingReviews !== 1 ? 's' : ''} awaiting your review
                  </Text>
                  <Text style={styles.alertSub}>Provide feedback to keep your team on track</Text>
                </View>
                <Text style={styles.alertArrow}>›</Text>
              </TouchableOpacity>
            )}

            {overdueEmployees.length > 0 && (
              <View style={styles.overdueCard}>
                <Text style={styles.overdueCardIcon}>⚠</Text>
                <View style={styles.overdueCardBody}>
                  <Text style={styles.overdueCardTitle}>
                    {overdueEmployees.length} team member{overdueEmployees.length !== 1 ? 's' : ''} with overdue goals
                  </Text>
                  <Text style={styles.overdueCardSub}>
                    {overdueEmployees.map(e => e.name.split(' ')[0]).join(', ')} — goal{overdueTeamGoals.length !== 1 ? 's' : ''} past target date
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate('team-overview')}
                  style={styles.overdueViewBtn}
                >
                  <Text style={styles.overdueViewBtnText}>View</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Team Performance</Text>
              <Text style={styles.sectionPill}>Q1 vs Q2</Text>
            </View>

            <View style={styles.teamPerfCard}>
              {teamData.map(({ emp, q1Score, q2Score }) => (
                <View key={emp.id} style={styles.teamPerfRow}>
                  <Text style={styles.teamPerfName} numberOfLines={1}>{emp.name.split(' ')[0]}</Text>
                  <View style={styles.teamPerfBars}>
                    <View style={styles.teamPerfBarWrap}>
                      <View style={[styles.teamPerfBar, {
                        width: `${Math.min(q1Score, 100)}%` as DimensionValue,
                        backgroundColor: colors.textSecondary,
                      }]} />
                    </View>
                    <View style={styles.teamPerfBarWrap}>
                      <View style={[styles.teamPerfBar, {
                        width: `${Math.min(q2Score, 100)}%` as DimensionValue,
                        backgroundColor: q2Score >= 75 ? colors.approved : q2Score >= 50 ? colors.pending : q2Score > 0 ? colors.rejected : colors.chartTrack,
                      }]} />
                    </View>
                  </View>
                  <View style={styles.teamPerfScores}>
                    <Text style={[styles.teamPerfScore, { color: colors.textMuted }]}>{q1Score > 0 ? `${q1Score}` : '—'}</Text>
                    <Text style={[styles.teamPerfScore, { color: q2Score >= 75 ? colors.approved : q2Score >= 50 ? colors.pending : q2Score > 0 ? colors.rejected : colors.textMuted }]}>{q2Score > 0 ? `${q2Score}` : '—'}</Text>
                  </View>
                </View>
              ))}
              <View style={styles.inlineLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.textSecondary }]} />
                  <Text style={styles.legendLabel}>Q1</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.approved }]} />
                  <Text style={styles.legendLabel}>Q2 ≥75%</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.pending }]} />
                  <Text style={styles.legendLabel}>Q2 50–74%</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.rejected }]} />
                  <Text style={styles.legendLabel}>Q2 &lt;50%</Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
            </View>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('team-overview')} activeOpacity={0.8}>
                <Text style={styles.actionIcon}>⊞</Text>
                <Text style={styles.actionLabel}>Team Overview</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, pendingReviews > 0 && styles.actionBtnHighlight]} onPress={() => navigation.navigate('review-evidence')} activeOpacity={0.8}>
                <Text style={styles.actionIcon}>◈</Text>
                <Text style={styles.actionLabel}>Review Evidence</Text>
                {pendingReviews > 0 && (
                  <View style={styles.actionBadge}>
                    <Text style={styles.actionBadgeText}>{pendingReviews}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.teamActivityBtn}
              onPress={() => navigation.navigate('team-daily-logs')}
              activeOpacity={0.82}
            >
              <View style={[styles.teamActivityIcon, { backgroundColor: colors.managerLight }]}>
                <Text style={{ fontSize: 20 }}>📋</Text>
              </View>
              <View style={styles.teamActivityBody}>
                <Text style={styles.teamActivityTitle}>Team Daily Activity</Text>
                <Text style={styles.teamActivitySub}>View your team's daily work logs</Text>
              </View>
              <Text style={[styles.teamActivityArrow, { color: colors.managerPrimary }]}>›</Text>
            </TouchableOpacity>

            {/* AI Smart Coaching */}
            <TouchableOpacity
              style={[styles.coachingCard, coachingMutation.isPending && styles.coachingCardDisabled]}
              onPress={async () => {
                try {
                  const result = await coachingMutation.mutateAsync({});
                  showToast(`Sent ${result.sent} coaching message${result.sent !== 1 ? 's' : ''}`, 'success');
                } catch (err: unknown) {
                  showToast(err instanceof Error ? err.message : 'Coaching failed', 'error');
                }
              }}
              disabled={coachingMutation.isPending}
              activeOpacity={0.82}
            >
              <View style={styles.coachingLeft}>
                <Text style={styles.coachingIcon}>✦</Text>
                <View style={styles.coachingBody}>
                  <Text style={styles.coachingTitle}>Send Smart Coaching</Text>
                  <Text style={styles.coachingSub}>
                    Claude analyzes your team's streaks and deadlines to send personalized nudges
                  </Text>
                </View>
              </View>
              {coachingMutation.isPending
                ? <ActivityIndicator color={colors.managerPrimary} size="small" />
                : <Text style={styles.coachingArrow}>›</Text>
              }
            </TouchableOpacity>

            <View style={[styles.sectionHeader, { marginTop: Spacing.lg }]}>
              <Text style={styles.sectionTitle}>Team Snapshot</Text>
              <TouchableOpacity onPress={() => navigation.navigate('team-overview')}>
                <Text style={styles.seeAll}>See All ›</Text>
              </TouchableOpacity>
            </View>

            {teamData.map(({ emp, q1Score, q2Score, empStats, empGoals }) => (
              <TouchableOpacity
                key={emp.id}
                style={styles.teamCard}
                onPress={() => {
                  if (emp.status === 'completed_fiscal_year') {
                    navigation.navigate('fy-report', { employeeId: emp.id });
                  } else {
                    navigation.navigate('set-goals', { employeeId: emp.id });
                  }
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.teamAvatar, { backgroundColor: colors.employeeLight }]}>
                  <Text style={[styles.teamAvatarText, { color: colors.employeePrimary }]}>
                    {emp.avatarInitials}
                  </Text>
                </View>
                <View style={styles.teamInfo}>
                  <View style={styles.teamNameRow}>
                    <Text style={styles.teamName}>{emp.name}</Text>
                    {emp.status === 'onboarding' && (
                      <View style={styles.onboardBadge}>
                        <Text style={styles.onboardBadgeText}>Onboarding</Text>
                      </View>
                    )}
                    {emp.status === 'completed_fiscal_year' && (
                      <TouchableOpacity
                        onPress={() => navigation.navigate('fy-report', { employeeId: emp.id })}
                        style={[styles.onboardBadge, { backgroundColor: colors.approvedBg }]}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.onboardBadgeText, { color: colors.approved }]}>FY Done ✓ →</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.teamDesig}>{emp.designation}</Text>
                  <View style={styles.scoreChips}>
                    <ScoreChip label="Q1" value={q1Score} />
                    <ScoreChip label="Q2" value={q2Score} />
                    <Text style={styles.goalsCount}>{empGoals.length} goals</Text>
                    {(() => {
                      if (q1Score <= 0 || q2Score <= 0) return null;
                      const delta = Math.round(q2Score - q1Score);
                      const improved = delta >= 0;
                      return (
                        <View style={[styles.teamDeltaBadge, {
                          backgroundColor: improved ? colors.approvedBg : colors.rejectedBg,
                        }]}>
                          <Text style={[styles.teamDeltaText, { color: improved ? colors.approved : colors.rejected }]}>
                            {improved ? `↑ +${delta}` : `↓ ${delta}`} pts
                          </Text>
                        </View>
                      );
                    })()}
                  </View>
                </View>
                {empStats.submitted > 0 && (
                  <View style={styles.reviewBadge}>
                    <Text style={styles.reviewBadgeNum}>{empStats.submitted}</Text>
                    <Text style={styles.reviewBadgeLabel}>review</Text>
                  </View>
                )}
                <Text style={styles.goArrow}>›</Text>
              </TouchableOpacity>
            ))}

          </>
        )}

        {activeTab === 'Analytics' && (
          <>
            {/* FY Completions Report */}
            {teamData.some(d => d.emp.status === 'completed_fiscal_year') && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>FY 2026 Completions</Text>
                  <Text style={styles.sectionPill}>
                    {teamData.filter(d => d.emp.status === 'completed_fiscal_year').length} complete
                  </Text>
                </View>
                <View style={styles.fyCompletionsCard}>
                  {teamData
                    .filter(d => d.emp.status === 'completed_fiscal_year')
                    .sort((a, b) => b.combined - a.combined)
                    .map(({ emp, q1Score, q2Score, combined }, idx) => (
                      <TouchableOpacity
                        key={emp.id}
                        style={styles.fyCompRow}
                        onPress={() => navigation.navigate('fy-report', { employeeId: emp.id })}
                        activeOpacity={0.8}
                      >
                        <View style={styles.fyCompRank}>
                          <Text style={styles.fyCompRankText}>{idx + 1}</Text>
                        </View>
                        <View style={styles.fyCompAvatar}>
                          <Text style={styles.fyCompAvatarText}>{emp.avatarInitials}</Text>
                        </View>
                        <View style={styles.fyCompInfo}>
                          <Text style={styles.fyCompName}>{emp.name}</Text>
                          <Text style={styles.fyCompDesig}>{emp.designation}</Text>
                        </View>
                        <View style={styles.fyCompScores}>
                          <View style={styles.fyCompScoreChip}>
                            <Text style={styles.fyCompScoreLabel}>Q1</Text>
                            <Text style={[styles.fyCompScore, { color: q1Score >= 75 ? colors.approved : q1Score >= 50 ? colors.pending : colors.rejected }]}>
                              {q1Score > 0 ? `${q1Score}%` : '—'}
                            </Text>
                          </View>
                          <View style={styles.fyCompScoreChip}>
                            <Text style={styles.fyCompScoreLabel}>Q2</Text>
                            <Text style={[styles.fyCompScore, { color: q2Score >= 75 ? colors.approved : q2Score >= 50 ? colors.pending : colors.rejected }]}>
                              {q2Score > 0 ? `${q2Score}%` : '—'}
                            </Text>
                          </View>
                          <View style={[styles.fyCompScoreChip, { backgroundColor: combined >= 75 ? colors.approvedBg : combined >= 50 ? colors.pendingBg : colors.rejectedBg }]}>
                            <Text style={styles.fyCompScoreLabel}>FY</Text>
                            <Text style={[styles.fyCompScore, { color: combined >= 75 ? colors.approved : combined >= 50 ? colors.pending : colors.rejected }]}>
                              {combined > 0 ? `${combined}%` : '—'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.fyCompArrow}>›</Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Team Q2 Performance</Text>
              <Text style={styles.sectionPill}>Score %</Text>
            </View>
            <View style={styles.chartCard}>
              <MiniBarChart
                data={teamBarData}
                maxValue={100}
                height={100}
                showValues
                showLabels
                valueSuffix="%"
              />
              <View style={styles.chartLegendRow}>
                {[
                  { label: '≥75% Excellent', color: colors.approved },
                  { label: '50–74% On Track', color: colors.pending },
                  { label: '<50% Needs Attention', color: colors.rejected },
                ].map(l => (
                  <View key={l.label} style={styles.chartLegendItem}>
                    <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                    <Text style={styles.chartLegendText}>{l.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Goal Status Distribution</Text>
              <Text style={styles.sectionPill}>{totalGoals} total</Text>
            </View>
            <View style={styles.chartCard}>
              {statusDist.map(item => {
                const pct = totalGoals > 0 ? Math.round((item.value / totalGoals) * 100) : 0;
                return (
                  <View key={item.label} style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: item.color }]} />
                    <Text style={styles.statusRowLabel}>{item.label}</Text>
                    <View style={styles.statusBarTrack}>
                      <View style={[styles.statusBarFill, { width: `${pct}%` as DimensionValue, backgroundColor: item.color }]} />
                    </View>
                    <Text style={[styles.statusRowCount, { color: item.color }]}>{item.value}</Text>
                    <Text style={styles.statusRowPct}>{pct}%</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Individual Performance</Text>
            </View>
            {teamData.map(({ emp, q1Score, q2Score, combined, empStats }) => (
              <View key={emp.id} style={styles.analyticsCard}>
                <View style={styles.analyticsTop}>
                  <View style={[styles.analyticsAvatar, { backgroundColor: colors.employeeLight }]}>
                    <Text style={[styles.analyticsAvatarText, { color: colors.employeePrimary }]}>
                      {emp.avatarInitials}
                    </Text>
                  </View>
                  <View style={styles.analyticsInfo}>
                    <Text style={styles.analyticsName}>{emp.name}</Text>
                    <Text style={styles.analyticsDesig}>{emp.designation}</Text>
                  </View>
                  <View style={styles.analyticsScoreWrap}>
                    <Text style={[styles.analyticsCombined, {
                      color: combined >= 75 ? colors.approved : combined >= 50 ? colors.pending : combined > 0 ? colors.rejected : colors.textMuted,
                    }]}>
                      {combined > 0 ? `${combined}%` : '—'}
                    </Text>
                    <Text style={styles.analyticsCombinedLabel}>Overall</Text>
                  </View>
                </View>
                <View style={styles.analyticsBarSection}>
                  <AnalyticsBar label="Q1" value={q1Score} color={colors.managerPrimary} />
                  <AnalyticsBar label="Q2" value={q2Score} color={colors.employeePrimary} />
                </View>
                <View style={styles.analyticsStats}>
                  {[
                    { label: 'Approved', val: empStats.approved, color: colors.approved },
                    { label: 'Pending', val: empStats.submitted, color: colors.pending },
                    { label: 'Progress', val: empStats.inProgress, color: colors.inProgress },
                    { label: 'Rejected', val: empStats.rejected, color: colors.rejected },
                  ].map(s => (
                    <View key={s.label} style={styles.analyticsStat}>
                      <Text style={[styles.analyticsStatVal, { color: s.color }]}>{s.val}</Text>
                      <Text style={styles.analyticsStatLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </>
        )}

        {activeTab === 'Team' && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Team Members</Text>
              <Text style={styles.sectionPill}>{team.length} total</Text>
            </View>

            {teamData.map(({ emp, q1Score, q2Score, empStats }) => (
              <View key={emp.id} style={styles.fullTeamCard}>
                <View style={styles.fullTeamHeader}>
                  <View style={[styles.teamAvatar, { backgroundColor: colors.employeeLight, width: 48, height: 48 }]}>
                    <Text style={[styles.teamAvatarText, { color: colors.employeePrimary, fontSize: 18 }]}>
                      {emp.avatarInitials}
                    </Text>
                  </View>
                  <View style={styles.teamInfo}>
                    <Text style={styles.teamName}>{emp.name}</Text>
                    <Text style={styles.teamDesig}>{emp.designation} · {emp.department}</Text>
                    <Text style={styles.teamEmail}>{emp.email}</Text>
                  </View>
                  {emp.status === 'onboarding' ? (
                    <View style={[styles.statusBadge, { backgroundColor: colors.pendingBg, borderColor: colors.pending }]}>
                      <Text style={[styles.statusBadgeText, { color: colors.pending }]}>Onboarding</Text>
                    </View>
                  ) : (
                    <View style={[styles.statusBadge, { backgroundColor: colors.approvedBg, borderColor: colors.approved }]}>
                      <Text style={[styles.statusBadgeText, { color: colors.approved }]}>Active</Text>
                    </View>
                  )}
                </View>

                <View style={styles.fullTeamBars}>
                  <AnalyticsBar label="Q1 Score" value={q1Score} color={colors.managerPrimary} />
                  <AnalyticsBar label="Q2 Score" value={q2Score} color={colors.employeePrimary} />
                </View>

                <View style={styles.fullTeamActions}>
                  <TouchableOpacity
                    style={styles.fullTeamBtn}
                    onPress={() => navigation.navigate('set-goals', { employeeId: emp.id })}
                  >
                    <Text style={styles.fullTeamBtnText}>Set Goals</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.fullTeamBtn, styles.viewGoalsBtn]}
                    onPress={() => navigation.navigate('goals-list', { viewEmployeeId: emp.id, readOnly: true })}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.viewGoalsBtnText}>View Goals</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.fullTeamBtn, styles.fullTeamBtnSecondary]}
                    onPress={() => navigation.navigate('review-evidence')}
                  >
                    <Text style={[styles.fullTeamBtnText, styles.fullTeamBtnTextSecondary]}>
                      Review{empStats.submitted > 0 ? ` (${empStats.submitted})` : ''}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={{ height: 36 }} />
      </ScrollView>
      <BottomTabBar
        tabs={MGR_TABS}
        activeKey={activeTab}
        onSelect={tab => setActiveTab(tab as Tab)}
      />
    </View>
  );
}

function ScoreChip({ label, value }: { label: string; value: number }) {
  const { colors } = useTheme();
  const color = value >= 75 ? colors.approved : value >= 50 ? colors.pending : value > 0 ? colors.rejected : colors.notStarted;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.bgElevated, borderRadius: Radius.xs, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: colors.border }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>{label}</Text>
      <Text style={{ fontSize: 11, fontWeight: '800', color }}>{value > 0 ? `${value}%` : '—'}</Text>
    </View>
  );
}

function AnalyticsBar({ label, value, color }: { label: string; value: number; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <Text style={{ width: 60, fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>{label}</Text>
      <View style={{ flex: 1, height: 6, backgroundColor: colors.chartTrack, borderRadius: 3, overflow: 'hidden' }}>
        <View style={{ height: '100%', borderRadius: 3, width: `${Math.min(value, 100)}%` as DimensionValue, backgroundColor: color }} />
      </View>
      <Text style={{ width: 38, fontSize: 11, fontWeight: '700', textAlign: 'right', color }}>{value > 0 ? `${value}%` : '—'}</Text>
    </View>
  );
}

function createStyles(C: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1 },
    content: { padding: Spacing.lg },

    kpiStrip: {
      flexDirection: 'row',
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: C.border,
      overflow: 'hidden',
      marginBottom: Spacing.lg,
      ...Shadow.md,
    },
    kpiCell: { flex: 1, alignItems: 'center', paddingVertical: 16 },
    kpiCellBorder: { borderLeftWidth: 1, borderLeftColor: C.divider },
    kpiValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    kpiLabel: { fontSize: 9, color: C.textMuted, marginTop: 3, fontWeight: '600', textAlign: 'center' },

    alertCard: {
      backgroundColor: C.pendingBg,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: Spacing.lg,
      borderLeftWidth: 3,
      borderLeftColor: C.pending,
      borderWidth: 1,
      borderColor: C.pendingBg,
      ...Shadow.sm,
    },
    alertDot: {
      width: 34, height: 34, borderRadius: Radius.full,
      backgroundColor: C.pending,
      alignItems: 'center', justifyContent: 'center',
    },
    alertDotText: { color: '#000', fontSize: 14, fontWeight: '800' },
    alertBody: { flex: 1 },
    alertTitle: { fontSize: 14, fontWeight: '700', color: C.pending },
    alertSub: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
    alertArrow: { fontSize: 20, color: C.pending },

    sectionHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: Spacing.md, marginTop: 4,
    },
    sectionTitle: { ...Typography.label, color: C.textMuted },
    sectionPill: {
      fontSize: 11, fontWeight: '600', color: C.textMuted,
      backgroundColor: C.bgElevated, borderRadius: Radius.full,
      paddingHorizontal: 10, paddingVertical: 3,
      borderWidth: 1, borderColor: C.border,
    },
    seeAll: { fontSize: 12, fontWeight: '600', color: C.textSecondary },

    teamPerfCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: C.border,
      ...Shadow.md,
      gap: 10,
    },
    teamPerfRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    teamPerfName: { fontSize: 11, fontWeight: '700', color: C.textSecondary, width: 52 },
    teamPerfBars: { flex: 1, gap: 3 },
    teamPerfBarWrap: { height: 6, backgroundColor: C.chartTrack, borderRadius: 3, overflow: 'hidden' },
    teamPerfBar: { height: 6, borderRadius: 3 },
    teamPerfScores: { alignItems: 'flex-end', gap: 2, width: 28 },
    teamPerfScore: { fontSize: 9, fontWeight: '800' },
    inlineLegend: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 8,
      marginTop: 4, paddingTop: 10,
      borderTopWidth: 1, borderTopColor: C.divider,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendLabel: { fontSize: 11, color: C.textSecondary },

    teamCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: C.border,
      ...Shadow.sm,
    },
    teamAvatar: {
      width: 42, height: 42, borderRadius: Radius.full,
      alignItems: 'center', justifyContent: 'center',
    },
    teamAvatarText: { fontSize: 15, fontWeight: '800' },
    teamInfo: { flex: 1 },
    teamNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
    teamName: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
    teamDesig: { fontSize: 11, color: C.textSecondary, marginBottom: 6 },
    teamEmail: { fontSize: 10, color: C.textMuted },
    onboardBadge: {
      backgroundColor: C.pendingBg, borderRadius: Radius.xs,
      paddingHorizontal: 6, paddingVertical: 2,
    },
    onboardBadgeText: { fontSize: 9, fontWeight: '700', color: C.pending },
    scoreChips: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    goalsCount: { fontSize: 10, color: C.textMuted, fontWeight: '600' },
    teamDeltaBadge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 4 },
    teamDeltaText: { fontSize: 10, fontWeight: '800' },
    reviewBadge: {
      backgroundColor: C.pendingBg, borderRadius: Radius.md,
      paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center',
    },
    reviewBadgeNum: { fontSize: 14, fontWeight: '800', color: C.pending },
    reviewBadgeLabel: { fontSize: 9, color: C.pending, fontWeight: '600' },
    goArrow: { fontSize: 22, color: C.textMuted },

    actionsRow: { flexDirection: 'row', gap: 10 },
    actionBtn: {
      flex: 1,
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: C.border,
      ...Shadow.sm,
      position: 'relative',
    },
    actionBtnHighlight: { borderColor: C.pending },
    actionIcon: { fontSize: 22, color: C.textSecondary },
    actionLabel: { fontSize: 12, fontWeight: '600', color: C.textSecondary, textAlign: 'center' },
    actionBadge: {
      position: 'absolute', top: 10, right: 10,
      backgroundColor: C.pending, borderRadius: Radius.full,
      width: 18, height: 18, alignItems: 'center', justifyContent: 'center',
    },
    actionBadgeText: { fontSize: 10, fontWeight: '800', color: '#000' },

    teamActivityBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginTop: 10,
      gap: Spacing.md,
      borderWidth: 1,
      borderColor: C.border,
      ...Shadow.sm,
    },
    teamActivityIcon: {
      width: 44,
      height: 44,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    teamActivityBody: { flex: 1 },
    teamActivityTitle: { fontSize: 14, fontWeight: '700', color: C.textPrimary, marginBottom: 3 },
    teamActivitySub: { fontSize: 12, color: C.textMuted },
    teamActivityArrow: { fontSize: 22, fontWeight: '700', lineHeight: 28 },

    coachingCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginTop: 10,
      gap: Spacing.md,
      borderWidth: 1,
      borderColor: C.managerPrimary + '40',
      ...Shadow.sm,
    },
    coachingCardDisabled: { opacity: 0.6 },
    coachingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    coachingIcon: { fontSize: 22, color: C.managerPrimary },
    coachingBody: { flex: 1 },
    coachingTitle: { fontSize: 14, fontWeight: '700', color: C.textPrimary, marginBottom: 3 },
    coachingSub: { fontSize: 12, color: C.textMuted, lineHeight: 17 },
    coachingArrow: { fontSize: 22, color: C.managerPrimary, fontWeight: '700' },

    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    statusDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
    statusRowLabel: { fontSize: 12, color: C.textSecondary, width: 76, fontWeight: '500' },
    statusBarTrack: {
      flex: 1,
      height: 6,
      backgroundColor: C.chartTrack,
      borderRadius: Radius.full,
      overflow: 'hidden',
    },
    statusBarFill: { height: '100%', borderRadius: Radius.full },
    statusRowCount: { fontSize: 12, fontWeight: '800', minWidth: 18, textAlign: 'right' },
    statusRowPct: { fontSize: 11, color: C.textMuted, minWidth: 30, textAlign: 'right' },

    chartCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: C.border,
      ...Shadow.sm,
    },
    chartLegendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    chartLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    chartLegendText: { fontSize: 10, color: C.textSecondary },

    analyticsCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: C.border,
      ...Shadow.sm,
    },
    analyticsTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
    analyticsAvatar: {
      width: 40, height: 40, borderRadius: Radius.full,
      alignItems: 'center', justifyContent: 'center',
    },
    analyticsAvatarText: { fontSize: 14, fontWeight: '800' },
    analyticsInfo: { flex: 1 },
    analyticsName: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
    analyticsDesig: { fontSize: 11, color: C.textSecondary, marginTop: 2 },
    analyticsScoreWrap: { alignItems: 'flex-end' },
    analyticsCombined: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    analyticsCombinedLabel: { fontSize: 9, color: C.textMuted, fontWeight: '600', marginTop: 1, textAlign: 'right' },
    analyticsBarSection: { marginBottom: 12 },
    analyticsStats: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.divider, paddingTop: 10 },
    analyticsStat: { flex: 1, alignItems: 'center' },
    analyticsStatVal: { fontSize: 16, fontWeight: '800' },
    analyticsStatLabel: { fontSize: 9, color: C.textMuted, fontWeight: '600', marginTop: 2 },

    fullTeamCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: C.border,
      ...Shadow.sm,
    },
    fullTeamHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
    statusBadge: {
      borderRadius: Radius.xs,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderWidth: 1,
    },
    statusBadgeText: { fontSize: 10, fontWeight: '700' },
    fullTeamBars: { marginBottom: 12 },
    fullTeamActions: { flexDirection: 'row', gap: 8 },
    fullTeamBtn: {
      flex: 1,
      backgroundColor: C.bgElevated,
      borderRadius: Radius.md,
      paddingVertical: 9,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.border,
    },
    fullTeamBtnSecondary: {
      backgroundColor: C.card,
      borderColor: C.border,
    },
    fullTeamBtnText: { fontSize: 12, fontWeight: '700', color: C.textPrimary },
    fullTeamBtnTextSecondary: { color: C.textSecondary },
    viewGoalsBtn: {
      backgroundColor: C.bgElevated,
      borderColor: C.border,
    },
    viewGoalsBtnText: { fontSize: 12, fontWeight: '600', color: C.textSecondary },

    fyCompletionsCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: C.border,
      overflow: 'hidden',
      marginBottom: Spacing.lg,
      ...Shadow.sm,
    },
    fyCompRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    fyCompRank: {
      width: 24, height: 24,
      borderRadius: Radius.full,
      backgroundColor: C.bgElevated,
      borderWidth: 1, borderColor: C.border,
      alignItems: 'center', justifyContent: 'center',
    },
    fyCompRankText: { fontSize: 11, fontWeight: '800', color: C.textMuted },
    fyCompAvatar: {
      width: 36, height: 36, borderRadius: Radius.full,
      backgroundColor: C.employeeLight,
      alignItems: 'center', justifyContent: 'center',
    },
    fyCompAvatarText: { fontSize: 13, fontWeight: '800', color: C.employeePrimary },
    fyCompInfo: { flex: 1 },
    fyCompName: { fontSize: 13, fontWeight: '700', color: C.textPrimary },
    fyCompDesig: { fontSize: 11, color: C.textMuted },
    fyCompScores: { flexDirection: 'row', gap: 4 },
    fyCompScoreChip: {
      alignItems: 'center',
      backgroundColor: C.bgElevated,
      borderRadius: Radius.sm,
      paddingHorizontal: 8,
      paddingVertical: 4,
      minWidth: 36,
    },
    fyCompScoreLabel: { fontSize: 9, color: C.textMuted, fontWeight: '600' },
    fyCompScore: { fontSize: 13, fontWeight: '800' },
    fyCompArrow: { fontSize: 18, color: C.textMuted },

    overdueCard: {
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
      ...Shadow.sm,
    },
    overdueCardIcon: { fontSize: 20 },
    overdueCardBody: { flex: 1 },
    overdueCardTitle: { fontSize: 14, fontWeight: '700', color: C.rejected },
    overdueCardSub: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
    overdueViewBtn: {
      backgroundColor: C.rejected,
      borderRadius: Radius.md,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    overdueViewBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  });
}

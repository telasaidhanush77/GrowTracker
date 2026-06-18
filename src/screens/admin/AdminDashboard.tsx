import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AnimatedButton } from '../../components/AnimatedButton';
import BottomTabBar, { TabDef } from '../../components/BottomTabBar';
import Header from '../../components/Header';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { Radius, Shadow, Spacing, Typography } from '../../theme';
import type { ColorPalette } from '../../theme';
import { ScreenProps } from '../../types';
import { calcQuarterScore, formatDate, NOTIF_ICONS, timeAgo } from '../../utils';

type Tab = 'overview' | 'people' | 'actions';
type PeopleFilter = 'all' | 'managers' | 'employees';

const ADMIN_TABS: TabDef[] = [
  { key: 'overview', label: 'Overview', icon: '◉' },
  { key: 'actions',  label: 'Actions',  icon: '⚡' },
  { key: 'people',   label: 'People',   icon: '◈' },
];

export default function AdminDashboard({ navigation, currentUserId, onLogout, onSwitchAccount }: ScreenProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const DEPT_COLORS = useMemo(() => [
    colors.textPrimary,
    colors.textSecondary,
    colors.textMuted,
    colors.approved,
    colors.inProgress,
  ], [colors]);

  const STATUS_COLORS: Record<string, { color: string; bg: string; label: string }> = useMemo(() => ({
    active:               { color: colors.approved,  bg: colors.approvedBg,  label: 'Active' },
    onboarding:           { color: colors.pending,   bg: colors.pendingBg,   label: 'Onboarding' },
    completed_fiscal_year:{ color: colors.inProgress,bg: colors.inProgressBg,label: 'FY Complete' },
  }), [colors]);

  const { showToast } = useToast();
  const { employees, goals, notifications, removeEmployee, updateEmployee } = useApp();
  const [tab, setTab] = useState<Tab>('overview');
  const [peopleFilter, setPeopleFilter] = useState<PeopleFilter>('all');
  const [peopleSearch, setPeopleSearch] = useState('');
  const [peopleQuarterFilter, setPeopleQuarterFilter] = useState<'all' | 'Q1' | 'Q2'>('all');

  const notifCount = notifications.filter(n => n.recipientId === currentUserId && !n.read).length;

  const allEmployees = employees.filter(e => e.role === 'employee');
  const managers     = employees.filter(e => e.role === 'manager');
  const onboarding   = allEmployees.filter(e => e.status === 'onboarding');
  const active       = allEmployees.filter(e => e.status === 'active');

  const totalGoals    = goals.length;
  const approved      = goals.filter(g => g.status === 'approved').length;
  const submitted     = goals.filter(g => g.status === 'submitted').length;
  const rejected      = goals.filter(g => g.status === 'rejected').length;
  const inProgress    = goals.filter(g => g.status === 'in_progress').length;
  const notStarted    = goals.filter(g => g.status === 'not_started').length;
  const approvalRate  = totalGoals > 0 ? Math.round((approved / totalGoals) * 100) : 0;

  const deptMap: Record<string, number> = {};
  allEmployees.forEach(e => {
    deptMap[e.department] = (deptMap[e.department] || 0) + 1;
  });
  const deptEntries = Object.entries(deptMap).sort((a, b) => b[1] - a[1]);
  const maxDept = deptEntries[0]?.[1] ?? 1;

  const basePeopleList =
    peopleFilter === 'managers'
      ? managers
      : peopleFilter === 'employees'
      ? allEmployees
      : [...managers, ...allEmployees];

  const filteredPeople = basePeopleList.filter(person => {
    const query = peopleSearch.toLowerCase().trim();
    const matchesSearch = query.length === 0
      || person.name.toLowerCase().includes(query)
      || (person.employeeCode?.toLowerCase() ?? '').includes(query);

    const matchesQuarter = peopleQuarterFilter === 'all'
      || goals.some(g => g.employeeId === person.id && g.quarter === peopleQuarterFilter);

    return matchesSearch && matchesQuarter;
  });

  return (
    <View style={styles.root}>
      <Header
        title="Admin Panel"
        subtitle="GrowTracker"
        color={colors.bgElevated}
        accentColor={colors.adminPrimary}
        onBack={onLogout}
        onLogout={onLogout}
        onSwitchAccount={onSwitchAccount}
        onProfile={() => navigation.navigate('profile')}
        onNotif={() => navigation.navigate('notifications')}
        notifCount={notifCount}
        userInitials="SA"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 72 }]}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'overview' && (
          <>
            {/* Headcount KPIs */}
            <View style={styles.kpiRow}>
              <KpiCell value={allEmployees.length} label="Total" color={colors.textPrimary} />
              <View style={styles.kpiDivider} />
              <KpiCell value={managers.length} label="Managers" color={colors.textSecondary} />
              <View style={styles.kpiDivider} />
              <KpiCell value={active.length} label="Active" color={colors.approved} />
              <View style={styles.kpiDivider} />
              <KpiCell value={onboarding.length} label="Onboarding" color={colors.pending} />
            </View>

            {/* Goal Status Distribution */}
            <SectionLabel title="Goal Status Distribution" />
            <View style={styles.statusDistCard}>
              {[
                { label: 'Approved',   count: approved,   color: colors.approved },
                { label: 'In Progress',count: inProgress, color: colors.inProgress },
                { label: 'Pending',    count: submitted,  color: colors.pending },
                { label: 'Rejected',   count: rejected,   color: colors.rejected },
                { label: 'Not Started',count: notStarted, color: colors.notStarted },
              ].map(item => (
                <StatusDistRow
                  key={item.label}
                  label={item.label}
                  count={item.count}
                  total={totalGoals}
                  color={item.color}
                />
              ))}
            </View>

            {/* Department Roster */}
            {deptEntries.length > 0 && (
              <>
                <SectionLabel title="Department Roster" />
                <View style={styles.deptCard}>
                  {deptEntries.map(([dept, count], i) => (
                    <View key={dept} style={styles.deptRow}>
                      <Text style={styles.deptLabel} numberOfLines={1}>{dept}</Text>
                      <View style={styles.deptBarTrack}>
                        <View
                          style={[
                            styles.deptBarFill,
                            {
                              width: `${Math.round((count / maxDept) * 100)}%` as any,
                              backgroundColor: DEPT_COLORS[i % DEPT_COLORS.length],
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.deptCount, { color: DEPT_COLORS[i % DEPT_COLORS.length] }]}>
                        {count}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Recent Activity */}
            {(() => {
              const recent = [...notifications]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 6);
              if (recent.length === 0) return null;
              return (
                <>
                  <SectionLabel title="Recent Activity" />
                  <View style={styles.activityCard}>
                    {recent.map((notif, i) => (
                      <View key={notif.id} style={[styles.activityRow, i < recent.length - 1 && styles.activityRowBorder]}>
                        <Text style={styles.activityIcon}>{NOTIF_ICONS[notif.type] ?? '📌'}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.activityText} numberOfLines={1}>{notif.message}</Text>
                          <Text style={styles.activityTime}>{timeAgo(notif.createdAt)}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              );
            })()}
          </>
        )}

        {tab === 'people' && (
          <>
            <View style={styles.filterRow}>
              {(['all', 'managers', 'employees'] as PeopleFilter[]).map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, peopleFilter === f && styles.filterChipActive]}
                  onPress={() => setPeopleFilter(f)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterChipText, peopleFilter === f && styles.filterChipTextActive]}>
                    {f === 'all' ? `All (${managers.length + allEmployees.length})` :
                     f === 'managers' ? `Managers (${managers.length})` :
                     `Employees (${allEmployees.length})`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Search bar */}
            <View style={styles.peopleSearchBar}>
              <Text style={styles.peopleSearchIcon}>🔍</Text>
              <TextInput
                style={styles.peopleSearchInput}
                placeholder="Search by name or ID…"
                placeholderTextColor={colors.textMuted}
                value={peopleSearch}
                onChangeText={setPeopleSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {peopleSearch.length > 0 && (
                <TouchableOpacity onPress={() => setPeopleSearch('')}>
                  <Text style={styles.peopleSearchClear}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Quarter filter chips */}
            <View style={styles.quarterFilterRow}>
              {(['all', 'Q1', 'Q2'] as const).map(q => (
                <TouchableOpacity
                  key={q}
                  style={[styles.quarterChip, peopleQuarterFilter === q && styles.quarterChipActive]}
                  onPress={() => setPeopleQuarterFilter(q)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.quarterChipText, peopleQuarterFilter === q && styles.quarterChipTextActive]}>
                    {q === 'all' ? 'All' : q}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {filteredPeople.map(person => {
              const isManager = person.role === 'manager';
              const teamSize = isManager ? employees.filter(e => e.managerId === person.id).length : 0;
              const empGoals = !isManager ? goals.filter(g => g.employeeId === person.id) : [];
              const mgr = !isManager ? employees.find(e => e.id === person.managerId) : null;
              const sc = STATUS_COLORS[person.status] ?? STATUS_COLORS.active;

              return (
                <TouchableOpacity
                  key={person.id}
                  style={[styles.personCard, isManager && styles.personCardManager]}
                  activeOpacity={!isManager && person.status !== 'onboarding' ? 0.75 : 1}
                  onPress={() => {
                    if (isManager) return;
                    if (person.status === 'onboarding') {
                      showToast('No goals yet — goals will appear once the manager sets them.', 'info', 'Onboarding');
                      return;
                    }
                    if (person.status === 'completed_fiscal_year') {
                      navigation.navigate('fy-report', { employeeId: person.id });
                    } else {
                      navigation.navigate('goals-list', { viewEmployeeId: person.id, readOnly: true });
                    }
                  }}
                >
                  <View style={styles.personCardLeft}>
                    <View
                      style={[
                        styles.avatar,
                        {
                          backgroundColor: colors.bgElevated,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.avatarText,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {person.avatarInitials}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.personInfo}>
                    <View style={styles.personNameRow}>
                      <Text style={styles.personName}>{person.name}</Text>
                      {person.employeeCode && (
                        <View style={styles.codeChip}>
                          <Text style={styles.codeChipText}>{person.employeeCode}</Text>
                        </View>
                      )}
                      <View style={[styles.rolePill, { backgroundColor: colors.bgElevated }]}>
                        <Text style={[styles.rolePillText, { color: colors.textMuted }]}>
                          {isManager ? 'MANAGER' : 'EMPLOYEE'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.personDesig}>{person.designation} · {person.department}</Text>
                    {isManager ? (
                      <Text style={styles.personMeta}>{teamSize} direct report{teamSize !== 1 ? 's' : ''}</Text>
                    ) : (
                      <Text style={styles.personMeta}>
                        Reports to {mgr?.name ?? 'Unassigned'} · {empGoals.length} goal{empGoals.length !== 1 ? 's' : ''}
                      </Text>
                    )}
                    <Text style={styles.personJoin}>Joined {formatDate(person.joinDate)}</Text>
                    {person.role === 'employee' && person.status === 'onboarding' && (
                      <TouchableOpacity
                        style={styles.activateBtn}
                        onPress={() => {
                          Alert.alert(
                            'Activate Employee',
                            `Mark ${person.name} as an active employee?\n\nThey will appear as a full team member once their manager assigns goals.`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Activate',
                                onPress: () => {
                                  updateEmployee(person.id, { status: 'active' });
                                  showToast(`${person.name} is now an active employee.`, 'success', 'Activated');
                                },
                              },
                            ]
                          );
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.activateBtnText, { color: colors.approved }]}>Activate ✓</Text>
                      </TouchableOpacity>
                    )}
                    {person.role === 'employee' && (
                      <TouchableOpacity
                        style={styles.offboardBtn}
                        onPress={() => {
                          Alert.alert(
                            'Offboard Employee',
                            `Remove ${person.name} (${person.employeeCode ?? person.id}) from the system?\n\nThis will permanently delete their goals and all associated records.`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Offboard',
                                style: 'destructive',
                                onPress: () => {
                                  removeEmployee(person.id);
                                  showToast(`${person.name} has been offboarded.`, 'success', 'Offboarded');
                                },
                              },
                            ]
                          );
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.offboardBtnText, { color: colors.rejected }]}>Offboard ×</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={[styles.statusChip, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusChipText, { color: sc.color }]}>{sc.label}</Text>
                  </View>
                  {!isManager && person.status !== 'onboarding' && (
                    <Text style={styles.peopleCardArrow}>›</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {tab === 'actions' && (
          <>
            <SectionLabel title="Quick Actions" />

            <AnimatedButton
              style={styles.actionPrimary}
              onPress={() => navigation.navigate('onboard-employee')}
            >
              <View style={styles.actionPrimaryInner}>
                <View style={styles.actionIcon}>
                  <Text style={{ fontSize: 22 }}>👤</Text>
                </View>
                <View style={styles.actionBody}>
                  <Text style={styles.actionTitle}>Onboard New Employee</Text>
                  <Text style={styles.actionSub}>Add a new hire and assign a reporting manager</Text>
                </View>
                <Text style={styles.actionArrow}>›</Text>
              </View>
            </AnimatedButton>

            <AnimatedButton
              style={[styles.actionPrimary, { borderColor: colors.rejected + '60' }]}
              onPress={() => {
                setTab('people');
                setPeopleFilter('employees');
              }}
            >
              <View style={styles.actionPrimaryInner}>
                <View style={[styles.actionIcon, { backgroundColor: colors.rejected + '18' }]}>
                  <Text style={{ fontSize: 22 }}>✕</Text>
                </View>
                <View style={styles.actionBody}>
                  <Text style={[styles.actionTitle, { color: colors.rejected }]}>Offboard Employee</Text>
                  <Text style={styles.actionSub}>Remove an employee from the organisation</Text>
                </View>
                <Text style={[styles.actionArrow, { color: colors.rejected }]}>›</Text>
              </View>
            </AnimatedButton>

            <TouchableOpacity
              style={styles.actionSecondary}
              onPress={() => navigation.navigate('notifications')}
              activeOpacity={0.75}
            >
              <View style={styles.actionSecondaryInner}>
                <View style={[styles.actionIcon, { backgroundColor: colors.adminLight }]}>
                  <Text style={{ fontSize: 18 }}>🔔</Text>
                </View>
                <View style={styles.actionBody}>
                  <Text style={styles.actionSecTitle}>Notifications</Text>
                  <Text style={styles.actionSecSub}>
                    {notifCount > 0 ? `${notifCount} unread alert${notifCount !== 1 ? 's' : ''}` : 'All caught up'}
                  </Text>
                </View>
                {notifCount > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>{notifCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {/* Performance Distribution */}
            {(() => {
              const activeEmps = employees.filter(e => e.role === 'employee' && (e.status === 'active' || e.status === 'completed_fiscal_year'));
              const scored = activeEmps.map(e => {
                const empGoals = goals.filter(g => g.employeeId === e.id);
                const q1 = calcQuarterScore(empGoals, 'Q1');
                const q2 = calcQuarterScore(empGoals, 'Q2');
                const combined = q1 > 0 && q2 > 0 ? Math.round((q1 + q2) / 2) : q1 > 0 ? q1 : q2;
                return combined;
              }).filter(s => s > 0);

              const high = scored.filter(s => s >= 75).length;
              const medium = scored.filter(s => s >= 50 && s < 75).length;
              const low = scored.filter(s => s < 50).length;
              const total = scored.length;

              if (total === 0) return null;

              const rows = [
                { label: 'High (75%+)', count: high, color: colors.approved, bg: colors.approvedBg },
                { label: 'Medium (50–74%)', count: medium, color: colors.pending, bg: colors.pendingBg },
                { label: 'Needs Work (<50%)', count: low, color: colors.rejected, bg: colors.rejectedBg },
              ];

              return (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Performance Distribution</Text>
                    <Text style={styles.sectionSub}>{total} active employees</Text>
                  </View>
                  <View style={styles.perfDistCard}>
                    {rows.map(row => (
                      <View key={row.label} style={styles.perfDistRow}>
                        <Text style={styles.perfDistLabel}>{row.label}</Text>
                        <View style={styles.perfDistBarBg}>
                          <View style={[styles.perfDistBar, {
                            width: total > 0 ? `${(row.count / total) * 100}%` as any : '0%',
                            backgroundColor: row.color,
                          }]} />
                        </View>
                        <View style={[styles.perfDistCount, { backgroundColor: row.bg }]}>
                          <Text style={[styles.perfDistCountText, { color: row.color }]}>{row.count}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              );
            })()}

            {/* Recent Activity */}
            {(() => {
              const recent = [...notifications]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5);

              if (recent.length === 0) return null;

              return (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                  </View>
                  <View style={styles.activityCard}>
                    {recent.map((notif, i) => (
                      <View key={notif.id} style={[styles.activityRow, i < recent.length - 1 && styles.activityRowBorder]}>
                        <Text style={styles.activityIcon}>{NOTIF_ICONS[notif.type] ?? '📌'}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.activityText} numberOfLines={1}>{notif.message}</Text>
                          <Text style={styles.activityTime}>{timeAgo(notif.createdAt)}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              );
            })()}

            <SectionLabel title="Organisation Summary" />
            <View style={styles.summaryCard}>
              <SummaryRow label="Total Headcount"  value={`${allEmployees.length} employees`} />
              <View style={styles.sumDivider} />
              <SummaryRow label="Reporting Managers" value={`${managers.length} manager${managers.length !== 1 ? 's' : ''}`} />
              <View style={styles.sumDivider} />
              <SummaryRow label="Currently Onboarding" value={`${onboarding.length} employee${onboarding.length !== 1 ? 's' : ''}`} />
              <View style={styles.sumDivider} />
              <SummaryRow label="Goals Assigned (FY)" value={`${totalGoals} total`} />
              <View style={styles.sumDivider} />
              <SummaryRow label="Approval Rate" value={`${approvalRate}%`} highlight={colors.approved} />
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
      <BottomTabBar
        tabs={ADMIN_TABS}
        activeKey={tab}
        onSelect={t => setTab(t as Tab)}
      />
    </View>
  );
}

function KpiCell({ value, label, color }: { value: number; label: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 16 }}>
      <Text style={{ fontSize: 26, fontWeight: '800', letterSpacing: -0.5, color }}>{value}</Text>
      <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '600', marginTop: 2 }}>{label}</Text>
    </View>
  );
}


function StatusDistRow({
  label, count, total, color,
}: { label: string; count: number; total: number; color: string }) {
  const { colors } = useTheme();
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <Text style={{ fontSize: 12, color: colors.textSecondary, width: 88, fontWeight: '500' }}>{label}</Text>
      <View style={{ flex: 1, height: 6, backgroundColor: colors.border, borderRadius: Radius.full, overflow: 'hidden' }}>
        <View style={{ height: '100%', borderRadius: Radius.full, width: `${pct}%` as any, backgroundColor: color }} />
      </View>
      <Text style={{ fontSize: 12, fontWeight: '700', minWidth: 24, textAlign: 'right', color }}>{count}</Text>
    </View>
  );
}

function SectionLabel({ title, pill }: { title: string; pill?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md, marginTop: 4 }}>
      <Text style={{ ...Typography.label, color: colors.textMuted }}>{title}</Text>
      {pill && (
        <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textMuted, backgroundColor: colors.bgElevated, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colors.border }}>
          {pill}
        </Text>
      )}
    </View>
  );
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
      <Text style={{ flex: 1, fontSize: 13, color: colors.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color: highlight ?? colors.textPrimary }}>{value}</Text>
    </View>
  );
}

function createStyles(C: ColorPalette, isDark: boolean) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1 },
    content: { padding: Spacing.lg, paddingTop: Spacing.md },

    kpiRow: {
      flexDirection: 'row',
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: C.border,
      overflow: 'hidden',
      marginBottom: Spacing.lg,
      ...Shadow.md,
    },
    kpiDivider: { width: 1, backgroundColor: C.divider },

    metricsGrid: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: C.border,
      overflow: 'hidden',
      marginBottom: Spacing.lg,
      ...Shadow.md,
    },
    metricsRow: { flexDirection: 'row' },
    metricsRowDivider: { height: 1, backgroundColor: C.divider },
    metricCell: { flex: 1, alignItems: 'center', paddingVertical: Spacing.lg },
    metricCellRight: { borderLeftWidth: 1, borderLeftColor: C.divider },
    metricNum: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
    metricLabel: { fontSize: 11, color: C.textMuted, fontWeight: '600' },

    statusDistCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: C.border,
      ...Shadow.sm,
    },

    deptCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: C.border,
      ...Shadow.sm,
      gap: 10,
    },
    deptRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    deptLabel: { width: 90, fontSize: 12, color: C.textSecondary, fontWeight: '500' },
    deptBarTrack: { flex: 1, height: 8, backgroundColor: C.border, borderRadius: Radius.full, overflow: 'hidden' },
    deptBarFill: { height: '100%', borderRadius: Radius.full },
    deptCount: { fontSize: 12, fontWeight: '800', minWidth: 20, textAlign: 'right' },

    filterRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: Spacing.lg,
      flexWrap: 'wrap',
    },
    filterChip: {
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: Radius.full,
      paddingHorizontal: 12,
      paddingVertical: 7,
      backgroundColor: C.card,
    },
    filterChipActive: { backgroundColor: C.primary, borderColor: C.primary },
    filterChipText: { fontSize: 12, fontWeight: '600', color: C.textMuted },
    filterChipTextActive: { color: C.bg },

    personCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: C.border,
      ...Shadow.sm,
    },
    personCardManager: {
      borderLeftWidth: 3,
      borderLeftColor: C.textSecondary,
    },
    personCardLeft: { justifyContent: 'flex-start' },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
    },
    avatarText: { fontSize: 17, fontWeight: '700' },
    personInfo: { flex: 1, gap: 2 },
    personNameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    personName: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
    rolePill: {
      borderRadius: Radius.xs,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    rolePillText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    personDesig: { fontSize: 12, color: C.textSecondary },
    personMeta: { fontSize: 11, color: C.textMuted },
    personJoin: { fontSize: 10, color: C.textMuted },
    statusChip: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: Radius.full,
      alignSelf: 'flex-start',
    },
    statusChipText: { fontSize: 10, fontWeight: '700' },
    peopleCardArrow: { fontSize: 18, color: C.textMuted, marginLeft: 'auto' as any },

    actionPrimary: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 10,
      ...Shadow.sm,
    },
    actionPrimaryInner: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.md,
      gap: 14,
    },
    actionIcon: {
      width: 44,
      height: 44,
      borderRadius: Radius.md,
      backgroundColor: C.primary + '22',
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionBody: { flex: 1 },
    actionTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 2 },
    actionSecTitle: { fontSize: 14, fontWeight: '700', color: C.textPrimary, marginBottom: 2 },
    actionSub: { fontSize: 12, color: C.textSecondary, lineHeight: 16 },
    actionSecSub: { fontSize: 12, color: C.textMuted, lineHeight: 16 },
    actionArrow: { fontSize: 22, color: C.primary, fontWeight: '300' },

    actionSecondary: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: C.border,
      ...Shadow.sm,
    },
    actionDisabled: {
      opacity: 0.7,
      borderColor: C.approved,
    },
    actionSecondaryInner: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.md,
      gap: 14,
    },
    notifBadge: {
      width: 24,
      height: 24,
      borderRadius: Radius.full,
      backgroundColor: C.rejected,
      alignItems: 'center',
      justifyContent: 'center',
    },
    notifBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },

    summaryCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      paddingHorizontal: Spacing.md,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: C.border,
      ...Shadow.sm,
    },
    sumDivider: { height: 1, backgroundColor: C.divider },

    emptyPipeline: { backgroundColor: C.card, borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: C.border, marginBottom: Spacing.md },
    emptyPipelineText: { fontSize: 13, color: C.textMuted },
    pipelineCard: { backgroundColor: C.card, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: C.border, ...Shadow.sm },
    pipelineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: Spacing.md },
    pipelineAvatar: { width: 38, height: 38, borderRadius: Radius.full, backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
    pipelineAvatarText: { fontSize: 13, fontWeight: '800', color: C.textPrimary },
    pipelineInfo: { flex: 1 },
    pipelineName: { fontSize: 13, fontWeight: '700', color: C.textPrimary },
    pipelineDesig: { fontSize: 11, color: C.textMuted, marginTop: 1 },

    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md, marginTop: 4 },
    sectionTitle: { ...Typography.label, color: C.textMuted },
    sectionSub: { fontSize: 11, color: C.textMuted },

    perfDistCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: C.border,
      padding: Spacing.md,
      gap: 10,
      marginBottom: Spacing.lg,
      ...Shadow.sm,
    },
    perfDistRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    perfDistLabel: { fontSize: 11, color: C.textSecondary, width: 120, fontWeight: '600' },
    perfDistBarBg: { flex: 1, height: 8, backgroundColor: C.bgElevated, borderRadius: Radius.full, overflow: 'hidden' },
    perfDistBar: { height: 8, borderRadius: Radius.full },
    perfDistCount: { width: 28, height: 22, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
    perfDistCountText: { fontSize: 11, fontWeight: '800' },

    activityCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: C.border,
      overflow: 'hidden',
      marginBottom: Spacing.lg,
      ...Shadow.sm,
    },
    activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: Spacing.md },
    activityRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
    activityIcon: { fontSize: 16 },
    activityText: { fontSize: 12, color: C.textSecondary, lineHeight: 16 },
    activityTime: { fontSize: 10, color: C.textMuted, marginTop: 2 },

    codeChip: {
      backgroundColor: C.bgElevated,
      borderRadius: Radius.sm ?? 4,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    codeChipText: { fontSize: 10, color: C.textMuted, fontFamily: 'monospace', fontWeight: '700', letterSpacing: 0.5 },

    peopleSearchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: Spacing.md,
      paddingVertical: 8,
      marginBottom: 10,
      gap: 8,
    },
    peopleSearchIcon: { fontSize: 14, color: C.textMuted },
    peopleSearchInput: { flex: 1, fontSize: 13, color: C.textPrimary, padding: 0 },
    peopleSearchClear: { fontSize: 14, color: C.textMuted },

    quarterFilterRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
    quarterChip: {
      borderRadius: Radius.full,
      paddingHorizontal: 14,
      paddingVertical: 6,
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.border,
    },
    quarterChipActive: { backgroundColor: C.primary, borderColor: C.primary },
    quarterChipText: { fontSize: 12, fontWeight: '700', color: C.textSecondary },
    quarterChipTextActive: { color: C.textOnPrimary ?? '#FFFFFF' },

    activateBtn: { marginTop: 6, alignSelf: 'flex-end' },
    activateBtnText: { fontSize: 11, fontWeight: '700' },
    offboardBtn: { marginTop: 4, alignSelf: 'flex-end' },
    offboardBtnText: { fontSize: 11, fontWeight: '700' },
  });
}

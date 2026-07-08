import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useRef, useState } from 'react';
import { Alert, DimensionValue, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
    inactive:             { color: colors.rejected,  bg: colors.rejectedBg,  label: 'Inactive' },
  }), [colors]);

  const { showToast } = useToast();
  const { employees, goals, notifications, removeEmployee, updateEmployee, addNotification } = useApp();

  const [tab, setTab] = useState<Tab>('overview');
  const [peopleFilter, setPeopleFilter] = useState<PeopleFilter>('all');
  const [peopleSearch, setPeopleSearch] = useState('');
  const [peopleQuarterFilter, setPeopleQuarterFilter] = useState<'all' | 'Q1' | 'Q2'>('all');
  const [showOffboardPanel, setShowOffboardPanel] = useState(false);
  const [offboardQuery, setOffboardQuery] = useState('');
  const offboardInputRef = useRef<TextInput>(null);

  const [showChangeMgrPanel, setShowChangeMgrPanel] = useState(false);
  const [changeMgrQuery, setChangeMgrQuery] = useState('');
  const [changeMgrSelectedEmp, setChangeMgrSelectedEmp] = useState<typeof employees[0] | null>(null);
  const [changeMgrNewMgr, setChangeMgrNewMgr] = useState<typeof employees[0] | null>(null);
  const changeMgrInputRef = useRef<TextInput>(null);

  const notifCount = notifications.filter(n => n.recipientId === currentUserId && !n.read).length;

  const allEmployees = employees.filter(e => e.role === 'employee');
  const managers     = employees.filter(e => e.role === 'manager');
  const onboarding   = allEmployees.filter(e => e.status === 'onboarding');
  const active       = allEmployees.filter(e => e.status === 'active');
  const fyComplete   = allEmployees.filter(e => e.status === 'completed_fiscal_year');

  const totalGoals  = goals.length;
  const approved    = goals.filter(g => g.status === 'approved').length;
  const submitted   = goals.filter(g => g.status === 'submitted').length;
  const rejected    = goals.filter(g => g.status === 'rejected').length;
  const inProgress  = goals.filter(g => g.status === 'in_progress').length;
  const notStarted  = goals.filter(g => g.status === 'not_started').length;
  const approvalRate = totalGoals > 0 ? Math.round((approved / totalGoals) * 100) : 0;

  // Performance metrics
  const { scoredData, avgScore, highPerf, medPerf, lowPerf } = useMemo(() => {
    const activeEmps = employees.filter(e =>
      e.role === 'employee' &&
      (e.status === 'active' || e.status === 'completed_fiscal_year'),
    );
    const data = activeEmps.map(e => {
      const empGoals = goals.filter(g => g.employeeId === e.id);
      const q1 = calcQuarterScore(empGoals, 'Q1');
      const q2 = calcQuarterScore(empGoals, 'Q2');
      return q1 > 0 && q2 > 0 ? Math.round((q1 + q2) / 2) : q1 > 0 ? q1 : q2;
    }).filter(s => s > 0);
    return {
      scoredData: data,
      avgScore: data.length > 0 ? Math.round(data.reduce((a, b) => a + b, 0) / data.length) : 0,
      highPerf: data.filter(s => s >= 75).length,
      medPerf:  data.filter(s => s >= 50 && s < 75).length,
      lowPerf:  data.filter(s => s < 50).length,
    };
  }, [employees, goals]);

  const deptMap: Record<string, number> = {};
  allEmployees.forEach(e => { deptMap[e.department] = (deptMap[e.department] || 0) + 1; });
  const deptEntries = Object.entries(deptMap).sort((a, b) => b[1] - a[1]);
  const maxDept = deptEntries[0]?.[1] ?? 1;

  // Offboard search — matches name, email, or employee code (min 2 chars)
  const offboardResults = offboardQuery.trim().length >= 2
    ? [...managers, ...allEmployees].filter(p => {
        const q = offboardQuery.toLowerCase().trim();
        return p.name.toLowerCase().includes(q)
          || p.email.toLowerCase().includes(q)
          || (p.employeeCode ?? '').toLowerCase().includes(q);
      })
    : [];

  // Change Manager search — employees only, step 1
  const changeMgrResults = !changeMgrSelectedEmp && changeMgrQuery.trim().length >= 2
    ? allEmployees.filter(p => {
        const q = changeMgrQuery.toLowerCase().trim();
        return p.name.toLowerCase().includes(q)
          || p.email.toLowerCase().includes(q)
          || (p.employeeCode ?? '').toLowerCase().includes(q);
      })
    : [];

  const basePeopleList =
    peopleFilter === 'managers'  ? managers :
    peopleFilter === 'employees' ? allEmployees :
    [...managers, ...allEmployees];

  const filteredPeople = basePeopleList.filter(person => {
    const query = peopleSearch.toLowerCase().trim();
    const matchesSearch = query.length === 0
      || person.name.toLowerCase().includes(query)
      || (person.employeeCode?.toLowerCase() ?? '').includes(query);
    const matchesQuarter = peopleQuarterFilter === 'all'
      || goals.some(g => g.employeeId === person.id && g.quarter === peopleQuarterFilter);
    return matchesSearch && matchesQuarter;
  });

  function handleChangeManagerConfirm() {
    if (!changeMgrSelectedEmp || !changeMgrNewMgr) return;

    function wouldCreateCycle(empId: string, mgrid: string): boolean {
      const visited = new Set<string>();
      let current: string | undefined = mgrid;
      while (current) {
        if (current === empId) return true;
        if (visited.has(current)) break;
        visited.add(current);
        current = employees.find(e => e.id === current)?.managerId ?? undefined;
      }
      return false;
    }

    if (wouldCreateCycle(changeMgrSelectedEmp.id, changeMgrNewMgr.id)) {
      showToast(
        `${changeMgrNewMgr.name} reports to ${changeMgrSelectedEmp.name} — this would create a circular reporting chain.`,
        'error',
        'Circular Assignment',
      );
      return;
    }

    const currentMgrName = employees.find(e => e.id === changeMgrSelectedEmp.managerId)?.name ?? 'Unassigned';
    Alert.alert(
      'Change Reporting Manager',
      `Reassign ${changeMgrSelectedEmp.name} from ${currentMgrName} to ${changeMgrNewMgr.name}?\n\nThis update takes effect immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            const now = new Date().toISOString();
            updateEmployee(changeMgrSelectedEmp.id, { managerId: changeMgrNewMgr.id });

            // Notify the employee
            addNotification({
              recipientId: changeMgrSelectedEmp.id,
              type: 'manager_changed',
              title: 'Reporting Manager Updated',
              message: `Your reporting manager has been changed from ${currentMgrName} to ${changeMgrNewMgr.name}.`,
              read: false,
              createdAt: now,
              relatedEmployeeId: changeMgrSelectedEmp.id,
            });

            // Notify the new manager
            addNotification({
              recipientId: changeMgrNewMgr.id,
              type: 'manager_changed',
              title: 'New Team Member Assigned',
              message: `${changeMgrSelectedEmp.name} has been reassigned to your team.`,
              read: false,
              createdAt: now,
              relatedEmployeeId: changeMgrSelectedEmp.id,
            });

            // Notify the old manager (if there was one)
            if (changeMgrSelectedEmp.managerId) {
              addNotification({
                recipientId: changeMgrSelectedEmp.managerId,
                type: 'manager_changed',
                title: 'Team Member Reassigned',
                message: `${changeMgrSelectedEmp.name} has been reassigned from your team to ${changeMgrNewMgr.name}.`,
                read: false,
                createdAt: now,
                relatedEmployeeId: changeMgrSelectedEmp.id,
              });
            }

            showToast(`${changeMgrSelectedEmp.name} now reports to ${changeMgrNewMgr.name}`, 'success', 'Manager Updated');
            setShowChangeMgrPanel(false);
            setChangeMgrQuery('');
            setChangeMgrSelectedEmp(null);
            setChangeMgrNewMgr(null);
          },
        },
      ]
    );
  }

  function handleOffboardConfirm(personId: string, personName: string, code: string) {
    Alert.alert(
      'Confirm Offboard',
      `Permanently remove ${personName} (${code}) from the system?\n\nAll their goals and records will be deleted. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Offboard',
          style: 'destructive',
          onPress: () => {
            const person = employees.find(e => e.id === personId);
            if (person?.managerId) {
              addNotification({
                recipientId: person.managerId,
                type: 'employee_offboarded',
                title: 'Team Member Offboarded',
                message: `${personName} has been removed from the organisation and is no longer part of your team.`,
                read: false,
                createdAt: new Date().toISOString(),
                relatedEmployeeId: personId,
              });
            }
            removeEmployee(personId);
            setShowOffboardPanel(false);
            setOffboardQuery('');
            showToast(`${personName} has been offboarded.`, 'success', 'Offboarded');
          },
        },
      ]
    );
  }

  const goalStatusSegments = [
    { count: approved,   color: colors.approved   },
    { count: inProgress, color: colors.inProgress  },
    { count: submitted,  color: colors.pending     },
    { count: rejected,   color: colors.rejected    },
    { count: notStarted, color: colors.notStarted  },
  ].filter(s => s.count > 0);

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
        onPrivacySecurity={() => navigation.navigate('privacy-security')}
        notifCount={notifCount}
        userInitials="SA"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 72 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── OVERVIEW TAB ─────────────────────────────────────────── */}
        {tab === 'overview' && (
          <>
            {/* Headcount KPIs */}
            <View style={styles.kpiRow}>
              <KpiCell value={allEmployees.length} label="Employees" color={colors.textPrimary} />
              <View style={styles.kpiDivider} />
              <KpiCell value={managers.length} label="Managers" color={colors.textSecondary} />
              <View style={styles.kpiDivider} />
              <KpiCell value={active.length} label="Active" color={colors.approved} />
              <View style={styles.kpiDivider} />
              <KpiCell value={onboarding.length} label="Onboarding" color={colors.pending} />
            </View>

            {/* Stacked Goal Status Bar */}
            {totalGoals > 0 && (
              <>
                <SectionLabel title="Goal Status At a Glance" pill={`${totalGoals} total`} />
                <View style={styles.stackedBarCard}>
                  <View style={styles.stackedBarRow}>
                    {goalStatusSegments.map((s, i) => (
                      <View key={i} style={{ flex: s.count, backgroundColor: s.color }} />
                    ))}
                  </View>
                  <View style={styles.stackedBarLegend}>
                    {[
                      { label: 'Approved',    color: colors.approved,   count: approved   },
                      { label: 'In Progress', color: colors.inProgress,  count: inProgress },
                      { label: 'Pending',     color: colors.pending,    count: submitted  },
                      { label: 'Rejected',    color: colors.rejected,   count: rejected   },
                      { label: 'Not Started', color: colors.notStarted, count: notStarted },
                    ].filter(s => s.count > 0).map(item => (
                      <View key={item.label} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                        <Text style={styles.legendLabel}>{item.label}</Text>
                        <Text style={[styles.legendCount, { color: item.color }]}>{item.count}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}

            {/* Goal Status Distribution — detail bars */}
            <SectionLabel title="Goal Status Distribution" />
            <View style={styles.statusDistCard}>
              {[
                { label: 'Approved',    count: approved,   color: colors.approved   },
                { label: 'In Progress', count: inProgress, color: colors.inProgress  },
                { label: 'Pending',     count: submitted,  color: colors.pending    },
                { label: 'Rejected',    count: rejected,   color: colors.rejected   },
                { label: 'Not Started', count: notStarted, color: colors.notStarted },
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

            {/* Performance Overview */}
            {scoredData.length > 0 && (
              <>
                <SectionLabel title="Performance Overview" pill={`${scoredData.length} scored`} />
                <View style={styles.perfOverviewCard}>
                  <View style={styles.perfOverviewTop}>
                    {/* Avg score donut */}
                    <View style={styles.perfDonutOuter}>
                      <View style={[styles.perfDonutRing, { borderColor: avgScore >= 75 ? colors.approved : avgScore >= 50 ? colors.pending : colors.rejected }]}>
                        <View style={styles.perfDonutInner}>
                          <Text style={[styles.perfDonutNum, { color: avgScore >= 75 ? colors.approved : avgScore >= 50 ? colors.pending : colors.rejected }]}>{avgScore}%</Text>
                          <Text style={styles.perfDonutLabel}>Avg Score</Text>
                        </View>
                      </View>
                    </View>
                    {/* Tier breakdown */}
                    <View style={styles.perfTierCol}>
                      {[
                        { label: 'High Performers',  sub: '75%+',     count: highPerf, color: colors.approved,  bg: colors.approvedBg  },
                        { label: 'On Track',         sub: '50–74%',   count: medPerf,  color: colors.pending,   bg: colors.pendingBg   },
                        { label: 'Needs Support',    sub: 'Below 50%',count: lowPerf,  color: colors.rejected,  bg: colors.rejectedBg  },
                      ].map(tier => (
                        <View key={tier.label} style={styles.perfTierRow}>
                          <View>
                            <Text style={styles.perfTierName}>{tier.label}</Text>
                            <Text style={styles.perfTierSub}>{tier.sub}</Text>
                          </View>
                          <View style={[styles.perfTierBadge, { backgroundColor: tier.bg }]}>
                            <Text style={[styles.perfTierCount, { color: tier.color }]}>{tier.count}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                  {/* Distribution stacked bar */}
                  <View style={styles.perfBarWrap}>
                    <View style={styles.stackedBarRow}>
                      {[
                        { count: highPerf, color: colors.approved  },
                        { count: medPerf,  color: colors.pending   },
                        { count: lowPerf,  color: colors.rejected  },
                      ].filter(s => s.count > 0).map((s, i) => (
                        <View key={i} style={{ flex: s.count, backgroundColor: s.color }} />
                      ))}
                    </View>
                    <Text style={styles.perfBarSub}>Performance score distribution across active employees</Text>
                  </View>
                </View>
              </>
            )}

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
                              width: `${Math.round((count / maxDept) * 100)}%` as DimensionValue,
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

            {/* Headcount Breakdown chart */}
            {allEmployees.length > 0 && (
              <>
                <SectionLabel title="Headcount Breakdown" />
                <View style={styles.headcountCard}>
                  <View style={styles.headcountSegRow}>
                    {[
                      { label: 'Active',      count: active.length,     color: colors.approved   },
                      { label: 'Onboarding',  count: onboarding.length, color: colors.pending    },
                      { label: 'FY Complete', count: fyComplete.length, color: colors.inProgress },
                    ].filter(s => s.count > 0).map((s, i, arr) => (
                      <View key={s.label} style={[
                        styles.headcountSeg,
                        { backgroundColor: s.color + '22', flex: s.count },
                        i === 0 && { borderTopLeftRadius: Radius.md, borderBottomLeftRadius: Radius.md },
                        i === arr.length - 1 && { borderTopRightRadius: Radius.md, borderBottomRightRadius: Radius.md },
                      ]}>
                        <Text style={[styles.headcountSegNum, { color: s.color }]}>{s.count}</Text>
                        <Text style={[styles.headcountSegLabel, { color: s.color }]}>{s.label}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.headcountBar}>
                    {[
                      { count: active.length,     color: colors.approved   },
                      { count: onboarding.length, color: colors.pending    },
                      { count: fyComplete.length, color: colors.inProgress },
                    ].filter(s => s.count > 0).map((s, i) => (
                      <View key={i} style={{ flex: s.count, backgroundColor: s.color }} />
                    ))}
                  </View>
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

        {/* ── PEOPLE TAB ───────────────────────────────────────────── */}
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
                    {f === 'all'       ? `All (${managers.length + allEmployees.length})` :
                     f === 'managers'  ? `Managers (${managers.length})` :
                     `Employees (${allEmployees.length})`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

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
              const teamSize  = isManager ? employees.filter(e => e.managerId === person.id).length : 0;
              const empGoals  = !isManager ? goals.filter(g => g.employeeId === person.id) : [];
              const mgr       = !isManager ? employees.find(e => e.id === person.managerId) : null;
              const sc        = STATUS_COLORS[person.status] ?? STATUS_COLORS.active;

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
                    <View style={[styles.avatar, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
                      <Text style={[styles.avatarText, { color: colors.textPrimary }]}>{person.avatarInitials}</Text>
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
                    {person.role === 'employee' && person.status === 'active' && (
                      <TouchableOpacity
                        style={styles.deactivateBtn}
                        onPress={() => {
                          Alert.alert(
                            'Deactivate Employee',
                            `Set ${person.name} as inactive?\n\nThey can be reactivated at any time.`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Deactivate',
                                style: 'destructive',
                                onPress: () => {
                                  updateEmployee(person.id, { status: 'inactive' });
                                  showToast(`${person.name} has been deactivated.`, 'info', 'Deactivated');
                                },
                              },
                            ]
                          );
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.deactivateBtnText, { color: colors.rejected }]}>Deactivate</Text>
                      </TouchableOpacity>
                    )}
                    {person.role === 'employee' && person.status === 'inactive' && (
                      <TouchableOpacity
                        style={styles.activateBtn}
                        onPress={() => {
                          updateEmployee(person.id, { status: 'active' });
                          showToast(`${person.name} has been reactivated.`, 'success', 'Reactivated');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.activateBtnText, { color: colors.approved }]}>Reactivate ✓</Text>
                      </TouchableOpacity>
                    )}
                    {person.role === 'employee' && (
                      <TouchableOpacity
                        style={styles.offboardBtn}
                        onPress={() => handleOffboardConfirm(person.id, person.name, person.employeeCode ?? person.id)}
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

        {/* ── ACTIONS TAB ──────────────────────────────────────────── */}
        {tab === 'actions' && (
          <>
            {/* Primary action buttons — no heading, neatly aligned */}
            <AnimatedButton
              style={styles.actionPrimary}
              onPress={() => navigation.navigate('onboard-employee')}
            >
              <View style={styles.actionPrimaryInner}>
                <View style={styles.actionIcon}>
                  <MaterialCommunityIcons name="account-plus" size={22} color={colors.primary} />
                </View>
                <View style={styles.actionBody}>
                  <Text style={styles.actionTitle}>Onboard New Employee</Text>
                  <Text style={styles.actionSub}>Add a new hire and assign a reporting manager</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={colors.primary} />
              </View>
            </AnimatedButton>

            <AnimatedButton
              style={[styles.actionPrimary, { borderColor: colors.rejected + '60' }]}
              onPress={() => {
                setShowOffboardPanel(prev => !prev);
                setOffboardQuery('');
                if (!showOffboardPanel) {
                  setTimeout(() => offboardInputRef.current?.focus(), 200);
                }
              }}
            >
              <View style={styles.actionPrimaryInner}>
                <View style={[styles.actionIcon, { backgroundColor: colors.rejected + '18' }]}>
                  <MaterialCommunityIcons name="account-remove" size={22} color={colors.rejected} />
                </View>
                <View style={styles.actionBody}>
                  <Text style={[styles.actionTitle, { color: colors.rejected }]}>Offboard Employee</Text>
                  <Text style={styles.actionSub}>
                    {showOffboardPanel ? 'Tap to close search panel' : 'Search by name, email, or ID'}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={showOffboardPanel ? 'chevron-up' : 'chevron-down'}
                  size={22}
                  color={colors.rejected}
                />
              </View>
            </AnimatedButton>

            {/* Inline offboard search panel */}
            {showOffboardPanel && (
              <View style={styles.offboardPanel}>
                <Text style={styles.offboardPanelTitle}>Find person to offboard</Text>
                <View style={styles.offboardSearchBar}>
                  <Text style={styles.offboardSearchIcon}>🔍</Text>
                  <TextInput
                    ref={offboardInputRef}
                    style={styles.offboardSearchInput}
                    placeholder="Enter name, email or employee ID…"
                    placeholderTextColor={colors.textMuted}
                    value={offboardQuery}
                    onChangeText={setOffboardQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {offboardQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setOffboardQuery('')}>
                      <Text style={styles.offboardSearchClear}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {offboardQuery.trim().length >= 2 && offboardResults.length === 0 && (
                  <Text style={styles.offboardNoResult}>No matching employees found</Text>
                )}
                {offboardResults.map(person => {
                  const sc = STATUS_COLORS[person.status] ?? STATUS_COLORS.active;
                  return (
                    <TouchableOpacity
                      key={person.id}
                      style={styles.offboardResultRow}
                      activeOpacity={0.75}
                      onPress={() => handleOffboardConfirm(person.id, person.name, person.employeeCode ?? person.id)}
                    >
                      <View style={styles.offboardResultAvatar}>
                        <Text style={styles.offboardResultInitials}>{person.avatarInitials}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.offboardResultName}>{person.name}</Text>
                        <Text style={styles.offboardResultMeta}>{person.email} · {person.employeeCode ?? '—'}</Text>
                        <Text style={styles.offboardResultDept}>{person.designation} · {person.department}</Text>
                      </View>
                      <View style={[styles.offboardResultBadge, { backgroundColor: sc.bg }]}>
                        <Text style={[styles.offboardResultBadgeText, { color: sc.color }]}>{sc.label}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {offboardQuery.trim().length < 2 && (
                  <Text style={styles.offboardHint}>Type at least 2 characters to search</Text>
                )}
              </View>
            )}

            {/* ── Change Reporting Manager ── */}
            <AnimatedButton
              style={[styles.actionPrimary, { borderColor: colors.primary + '50' }]}
              onPress={() => {
                setShowChangeMgrPanel(prev => !prev);
                setChangeMgrQuery('');
                setChangeMgrSelectedEmp(null);
                setChangeMgrNewMgr(null);
                if (!showChangeMgrPanel) {
                  setTimeout(() => changeMgrInputRef.current?.focus(), 200);
                }
              }}
            >
              <View style={styles.actionPrimaryInner}>
                <View style={[styles.actionIcon, { backgroundColor: colors.primary + '18' }]}>
                  <MaterialCommunityIcons name="account-switch" size={22} color={colors.primary} />
                </View>
                <View style={styles.actionBody}>
                  <Text style={styles.actionTitle}>Change Reporting Manager</Text>
                  <Text style={styles.actionSub}>
                    {showChangeMgrPanel ? 'Tap to close panel' : 'Reassign an employee to a different manager'}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={showChangeMgrPanel ? 'chevron-up' : 'chevron-down'}
                  size={22}
                  color={colors.primary}
                />
              </View>
            </AnimatedButton>

            {showChangeMgrPanel && (
              <View style={styles.changeMgrPanel}>
                <Text style={styles.changeMgrPanelTitle}>Change Reporting Manager</Text>

                {/* Step 1: Search for employee */}
                {!changeMgrSelectedEmp && (
                  <>
                    <Text style={styles.changeMgrStep}>Step 1 — Find the employee to reassign</Text>
                    <View style={styles.offboardSearchBar}>
                      <Text style={styles.offboardSearchIcon}>🔍</Text>
                      <TextInput
                        ref={changeMgrInputRef}
                        style={styles.offboardSearchInput}
                        placeholder="Enter name, email or employee ID…"
                        placeholderTextColor={colors.textMuted}
                        value={changeMgrQuery}
                        onChangeText={setChangeMgrQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      {changeMgrQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setChangeMgrQuery('')}>
                          <Text style={styles.offboardSearchClear}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {changeMgrQuery.trim().length >= 2 && changeMgrResults.length === 0 && (
                      <Text style={styles.offboardNoResult}>No matching employees found</Text>
                    )}
                    {changeMgrResults.map(person => {
                      const currentMgr = employees.find(e => e.id === person.managerId);
                      return (
                        <TouchableOpacity
                          key={person.id}
                          style={styles.changeMgrResultRow}
                          activeOpacity={0.75}
                          onPress={() => {
                            setChangeMgrSelectedEmp(person);
                            setChangeMgrNewMgr(null);
                          }}
                        >
                          <View style={styles.changeMgrResultAvatar}>
                            <Text style={styles.changeMgrResultInitials}>{person.avatarInitials}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.offboardResultName}>{person.name}</Text>
                            <Text style={styles.offboardResultMeta}>{person.email} · {person.employeeCode ?? '—'}</Text>
                            <Text style={styles.offboardResultDept}>
                              {person.designation} · Reports to {currentMgr?.name ?? 'Unassigned'}
                            </Text>
                          </View>
                          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.primary} />
                        </TouchableOpacity>
                      );
                    })}
                    {changeMgrQuery.trim().length < 2 && (
                      <Text style={styles.offboardHint}>Type at least 2 characters to search</Text>
                    )}
                  </>
                )}

                {/* Step 2: Pick a new manager */}
                {changeMgrSelectedEmp && (() => {
                  const currentMgr = employees.find(e => e.id === changeMgrSelectedEmp.managerId);
                  return (
                    <>
                      <TouchableOpacity
                        style={styles.changeMgrBack}
                        onPress={() => { setChangeMgrSelectedEmp(null); setChangeMgrNewMgr(null); }}
                      >
                        <MaterialCommunityIcons name="arrow-left" size={14} color={colors.primary} />
                        <Text style={[styles.changeMgrBackText, { color: colors.primary }]}>Search again</Text>
                      </TouchableOpacity>

                      <View style={styles.changeMgrEmpCard}>
                        <View style={styles.changeMgrResultAvatar}>
                          <Text style={styles.changeMgrResultInitials}>{changeMgrSelectedEmp.avatarInitials}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.offboardResultName}>{changeMgrSelectedEmp.name}</Text>
                          <Text style={styles.offboardResultMeta}>{changeMgrSelectedEmp.designation} · {changeMgrSelectedEmp.department}</Text>
                          <Text style={[styles.offboardResultDept, { color: colors.textMuted }]}>
                            Current manager: {currentMgr?.name ?? 'Unassigned'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.changeMgrStep}>Step 2 — Select new reporting manager</Text>
                      <View style={styles.changeMgrMgrList}>
                        {managers.map(mgr => {
                          const isSelected = changeMgrNewMgr?.id === mgr.id;
                          const isCurrent = mgr.id === changeMgrSelectedEmp.managerId;
                          return (
                            <TouchableOpacity
                              key={mgr.id}
                              style={[
                                styles.changeMgrMgrChip,
                                isSelected && { borderColor: colors.primary, backgroundColor: colors.primary + '14' },
                                isCurrent && { opacity: 0.5 },
                              ]}
                              activeOpacity={isCurrent ? 1 : 0.7}
                              onPress={() => {
                                if (isCurrent) return;
                                setChangeMgrNewMgr(mgr);
                              }}
                            >
                              <View style={styles.changeMgrMgrAvatar}>
                                <Text style={[styles.changeMgrMgrAvatarText, { color: isSelected ? colors.primary : colors.textSecondary }]}>
                                  {mgr.avatarInitials}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.changeMgrMgrName, { color: isSelected ? colors.primary : colors.textPrimary }]}>
                                  {mgr.name}
                                </Text>
                                <Text style={styles.changeMgrMgrDept}>{mgr.department}{isCurrent ? ' · Current' : ''}</Text>
                              </View>
                              {isSelected && (
                                <MaterialCommunityIcons name="check-circle" size={18} color={colors.primary} />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {changeMgrNewMgr && changeMgrNewMgr.id !== changeMgrSelectedEmp.managerId && (
                        <TouchableOpacity
                          style={[styles.changeMgrConfirmBtn, { backgroundColor: colors.primary }]}
                          activeOpacity={0.8}
                          onPress={handleChangeManagerConfirm}
                        >
                          <MaterialCommunityIcons name="account-switch" size={16} color="#FFFFFF" />
                          <Text style={styles.changeMgrConfirmText}>
                            Reassign to {changeMgrNewMgr.name}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </>
                  );
                })()}
              </View>
            )}

            {/* Performance Distribution */}
            {scoredData.length > 0 && (() => {
              const total = scoredData.length;
              const rows = [
                { label: 'High (75%+)',       count: highPerf, color: colors.approved,  bg: colors.approvedBg  },
                { label: 'Medium (50–74%)',   count: medPerf,  color: colors.pending,   bg: colors.pendingBg   },
                { label: 'Needs Work (<50%)', count: lowPerf,  color: colors.rejected,  bg: colors.rejectedBg  },
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
                            width: (total > 0 ? `${(row.count / total) * 100}%` : '0%') as DimensionValue,
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

            {/* Organisation Summary */}
            <SectionLabel title="Organisation Summary" />
            <View style={styles.summaryCard}>
              <SummaryRow label="Employee Count"      value={`${allEmployees.length} employee${allEmployees.length !== 1 ? 's' : ''}`} />
              <View style={styles.sumDivider} />
              <SummaryRow label="Active Employees"    value={`${active.length} active`} highlight={colors.approved} />
              <View style={styles.sumDivider} />
              <SummaryRow label="Reporting Managers"  value={`${managers.length} manager${managers.length !== 1 ? 's' : ''}`} />
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

// ── Sub-components ────────────────────────────────────────────

function KpiCell({ value, label, color }: { value: number; label: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 16 }}>
      <Text style={{ fontSize: 26, fontWeight: '800', letterSpacing: -0.5, color }}>{value}</Text>
      <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '600', marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function StatusDistRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const { colors } = useTheme();
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <Text style={{ fontSize: 12, color: colors.textSecondary, width: 88, fontWeight: '500' }}>{label}</Text>
      <View style={{ flex: 1, height: 6, backgroundColor: colors.border, borderRadius: Radius.full, overflow: 'hidden' }}>
        <View style={{ height: '100%', borderRadius: Radius.full, width: `${pct}%` as DimensionValue, backgroundColor: color }} />
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

// ── Styles ────────────────────────────────────────────────────

function createStyles(C: ColorPalette, _isDark: boolean) {
  return StyleSheet.create({
    root:    { flex: 1, backgroundColor: C.bg },
    scroll:  { flex: 1 },
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

    // Stacked bar chart
    stackedBarCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: C.border,
      overflow: 'hidden',
      marginBottom: Spacing.lg,
      ...Shadow.sm,
    },
    stackedBarRow: {
      flexDirection: 'row',
      height: 14,
      overflow: 'hidden',
    },
    stackedBarLegend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      padding: Spacing.md,
      paddingTop: Spacing.sm,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendDot:  { width: 8, height: 8, borderRadius: 4 },
    legendLabel:{ fontSize: 11, color: C.textSecondary, fontWeight: '500' },
    legendCount:{ fontSize: 11, fontWeight: '800' },

    // Status dist card
    statusDistCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: C.border,
      ...Shadow.sm,
    },

    // Performance Overview (overview tab)
    perfOverviewCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: C.border,
      overflow: 'hidden',
      marginBottom: Spacing.lg,
      ...Shadow.md,
    },
    perfOverviewTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      padding: Spacing.md,
    },
    perfDonutOuter: { alignItems: 'center', justifyContent: 'center' },
    perfDonutRing: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 7,
      alignItems: 'center',
      justifyContent: 'center',
    },
    perfDonutInner: { alignItems: 'center' },
    perfDonutNum:   { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
    perfDonutLabel: { fontSize: 9, color: C.textMuted, fontWeight: '600', marginTop: 1 },
    perfTierCol:    { flex: 1, gap: 8 },
    perfTierRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    perfTierName:   { fontSize: 12, color: C.textPrimary, fontWeight: '600' },
    perfTierSub:    { fontSize: 10, color: C.textMuted, marginTop: 1 },
    perfTierBadge:  { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full },
    perfTierCount:  { fontSize: 13, fontWeight: '800' },
    perfBarWrap:    { borderTopWidth: 1, borderTopColor: C.divider },
    perfBarSub:     { fontSize: 10, color: C.textMuted, paddingHorizontal: Spacing.md, paddingVertical: 8 },

    // Headcount breakdown
    headcountCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: C.border,
      overflow: 'hidden',
      marginBottom: Spacing.lg,
      ...Shadow.sm,
    },
    headcountSegRow: { flexDirection: 'row', padding: Spacing.sm, gap: 6 },
    headcountSeg:    { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: Radius.md },
    headcountSegNum: { fontSize: 22, fontWeight: '800' },
    headcountSegLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },
    headcountBar:    { flexDirection: 'row', height: 6, overflow: 'hidden' },

    // Department Roster
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
    deptRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
    deptLabel:    { width: 118, fontSize: 12, color: C.textSecondary, fontWeight: '500' },
    deptBarTrack: { flex: 1, height: 8, backgroundColor: C.border, borderRadius: Radius.full, overflow: 'hidden' },
    deptBarFill:  { height: '100%', borderRadius: Radius.full },
    deptCount:    { fontSize: 12, fontWeight: '800', minWidth: 20, textAlign: 'right' },

    // People tab
    filterRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.lg, flexWrap: 'wrap' },
    filterChip: { borderWidth: 1, borderColor: C.border, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: C.card },
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
    personCardManager: { borderLeftWidth: 3, borderLeftColor: C.textSecondary },
    personCardLeft:    { justifyContent: 'flex-start' },
    avatar: {
      width: 46, height: 46, borderRadius: Radius.full,
      alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
    },
    avatarText:  { fontSize: 17, fontWeight: '700' },
    personInfo:  { flex: 1, gap: 2 },
    personNameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    personName:  { fontSize: 14, fontWeight: '700', color: C.textPrimary },
    rolePill:    { borderRadius: Radius.xs, paddingHorizontal: 6, paddingVertical: 2 },
    rolePillText:{ fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    personDesig: { fontSize: 12, color: C.textSecondary },
    personMeta:  { fontSize: 11, color: C.textMuted },
    personJoin:  { fontSize: 10, color: C.textMuted },
    statusChip:  { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full, alignSelf: 'flex-start' },
    statusChipText: { fontSize: 10, fontWeight: '700' },
    peopleCardArrow: { fontSize: 18, color: C.textMuted, marginLeft: 'auto' },

    // Actions tab
    actionPrimary: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 10,
      ...Shadow.sm,
    },
    actionPrimaryInner: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: 14 },
    actionIcon: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: C.primary + '22', alignItems: 'center', justifyContent: 'center' },
    actionBody:     { flex: 1 },
    actionTitle:    { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 2 },
    actionSub:      { fontSize: 12, color: C.textSecondary, lineHeight: 16 },
    actionArrow:    { fontSize: 22, color: C.primary, fontWeight: '300' },

    // Offboard inline panel
    offboardPanel: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: C.rejected + '40',
      padding: Spacing.md,
      marginBottom: 10,
      gap: 10,
      ...Shadow.sm,
    },
    offboardPanelTitle: { fontSize: 13, fontWeight: '700', color: C.textPrimary },
    offboardSearchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.bgElevated,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
    },
    offboardSearchIcon:  { fontSize: 14, color: C.textMuted },
    offboardSearchInput: { flex: 1, fontSize: 13, color: C.textPrimary, padding: 0 },
    offboardSearchClear: { fontSize: 14, color: C.textMuted },
    offboardHint:        { fontSize: 11, color: C.textMuted, textAlign: 'center', paddingVertical: 6 },
    offboardNoResult:    { fontSize: 12, color: C.textMuted, textAlign: 'center', paddingVertical: 8 },
    offboardResultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: C.border,
    },
    offboardResultAvatar: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: C.rejected + '18',
      alignItems: 'center', justifyContent: 'center',
    },
    offboardResultInitials: { fontSize: 13, fontWeight: '800', color: C.rejected },
    offboardResultName: { fontSize: 13, fontWeight: '700', color: C.textPrimary },
    offboardResultMeta: { fontSize: 11, color: C.textMuted },
    offboardResultDept: { fontSize: 10, color: C.textMuted },
    offboardResultBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
    offboardResultBadgeText: { fontSize: 10, fontWeight: '700' },

    // Performance Distribution (actions tab)
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md, marginTop: 4 },
    sectionTitle:  { ...Typography.label, color: C.textMuted },
    sectionSub:    { fontSize: 11, color: C.textMuted },
    perfDistCard: {
      backgroundColor: C.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border,
      padding: Spacing.md, gap: 10, marginBottom: Spacing.lg, ...Shadow.sm,
    },
    perfDistRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
    perfDistLabel:    { fontSize: 11, color: C.textSecondary, width: 120, fontWeight: '600' },
    perfDistBarBg:    { flex: 1, height: 8, backgroundColor: C.bgElevated, borderRadius: Radius.full, overflow: 'hidden' },
    perfDistBar:      { height: 8, borderRadius: Radius.full },
    perfDistCount:    { width: 28, height: 22, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
    perfDistCountText:{ fontSize: 11, fontWeight: '800' },

    // Activity feed
    activityCard: {
      backgroundColor: C.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border,
      overflow: 'hidden', marginBottom: Spacing.lg, ...Shadow.sm,
    },
    activityRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: Spacing.md },
    activityRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
    activityIcon:      { fontSize: 16 },
    activityText:      { fontSize: 12, color: C.textSecondary, lineHeight: 16 },
    activityTime:      { fontSize: 10, color: C.textMuted, marginTop: 2 },

    // Summary card
    summaryCard: {
      backgroundColor: C.card, borderRadius: Radius.lg, paddingHorizontal: Spacing.md,
      marginBottom: Spacing.md, borderWidth: 1, borderColor: C.border, ...Shadow.sm,
    },
    sumDivider: { height: 1, backgroundColor: C.divider },

    // People search
    peopleSearchBar: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
      borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border,
      paddingHorizontal: Spacing.md, paddingVertical: 8, marginBottom: 10, gap: 8,
    },
    peopleSearchIcon:  { fontSize: 14, color: C.textMuted },
    peopleSearchInput: { flex: 1, fontSize: 13, color: C.textPrimary, padding: 0 },
    peopleSearchClear: { fontSize: 14, color: C.textMuted },

    quarterFilterRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
    quarterChip: {
      borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 6,
      backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    },
    quarterChipActive:     { backgroundColor: C.primary, borderColor: C.primary },
    quarterChipText:       { fontSize: 12, fontWeight: '700', color: C.textSecondary },
    quarterChipTextActive: { color: '#FFFFFF' },

    codeChip: {
      backgroundColor: C.bgElevated, borderRadius: Radius.sm ?? 4, borderWidth: 1,
      borderColor: C.border, paddingHorizontal: 6, paddingVertical: 2,
    },
    codeChipText: { fontSize: 10, color: C.textMuted, fontFamily: 'monospace', fontWeight: '700', letterSpacing: 0.5 },

    activateBtn:     { marginTop: 6, alignSelf: 'flex-end' },
    activateBtnText: { fontSize: 11, fontWeight: '700' },
    deactivateBtn:     { marginTop: 4, alignSelf: 'flex-end' },
    deactivateBtnText: { fontSize: 11, fontWeight: '700' },
    offboardBtn:     { marginTop: 4, alignSelf: 'flex-end' },
    offboardBtnText: { fontSize: 11, fontWeight: '700' },

    // Change Manager panel
    changeMgrPanel: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: C.primary + '40',
      padding: Spacing.md,
      marginBottom: 10,
      gap: 10,
      ...Shadow.sm,
    },
    changeMgrPanelTitle: { fontSize: 13, fontWeight: '700', color: C.textPrimary },
    changeMgrStep:       { fontSize: 11, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
    changeMgrResultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: C.border,
    },
    changeMgrResultAvatar: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: C.primary + '18',
      alignItems: 'center', justifyContent: 'center',
    },
    changeMgrResultInitials: { fontSize: 13, fontWeight: '800', color: C.primary },
    changeMgrBack:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
    changeMgrBackText: { fontSize: 12, fontWeight: '600' },
    changeMgrEmpCard: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: C.bgElevated, borderRadius: Radius.md,
      padding: Spacing.sm, borderWidth: 1, borderColor: C.border,
    },
    changeMgrMgrList:  { gap: 8 },
    changeMgrMgrChip: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      borderWidth: 1.5, borderColor: C.border, borderRadius: Radius.md,
      padding: Spacing.sm, backgroundColor: C.bgElevated,
    },
    changeMgrMgrAvatar: {
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
      alignItems: 'center', justifyContent: 'center',
    },
    changeMgrMgrAvatarText: { fontSize: 12, fontWeight: '800' },
    changeMgrMgrName:       { fontSize: 13, fontWeight: '700' },
    changeMgrMgrDept:       { fontSize: 11, color: C.textMuted, marginTop: 1 },
    changeMgrConfirmBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, paddingVertical: 12, borderRadius: Radius.md,
    },
    changeMgrConfirmText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  });
}

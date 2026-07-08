import { useState, useMemo } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { ToastType, useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { Radius, Shadow, Spacing } from '../../theme';
import type { ColorPalette } from '../../theme';
import { Attachment, GoalCategory, GoalPriority, GoalStatus, Quarter, ScreenProps } from '../../types';
import {
  CATEGORY_CONFIG,
  formatDate,
  isOverdue,
  PRIORITY_CONFIG,
  STATUS_CONFIG,
} from '../../utils';

async function pickAttachment(showToast: (msg: string, type?: ToastType, title?: string) => void): Promise<Attachment | null> {
  if (Platform.OS !== 'web') {
    showToast('File attachments are available in the web app.', 'info', 'Web Only');
    return null;
  }
  return new Promise(resolve => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input = (document as any).createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png,.xml,.doc,.docx,.xlsx,.csv,.txt';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    input.onchange = (e: any) => {
      const f = e.target?.files?.[0];
      if (!f) { resolve(null); return; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reader = new (window as any).FileReader();
      reader.onload = () => {
        resolve({ name: f.name, uri: reader.result as string, mimeType: f.type || 'application/octet-stream', size: f.size });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(f);
    };
    input.click();
  });
}

function autoFormatDate(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function isValidISODate(str: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str + 'T00:00:00');
  return !isNaN(d.getTime());
}

const CATEGORIES: GoalCategory[] = [
  'technical',
  'project_delivery',
  'soft_skills',
  'learning',
  'leadership',
];
const PRIORITIES: GoalPriority[] = ['high', 'medium', 'low'];

export default function SetGoals({ navigation, params, currentUserId }: ScreenProps) {
  const { employees, goals, addGoal, updateGoal, updateEmployee, deleteGoal, addNotification } = useApp();
  const { showToast } = useToast();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const employeeId = params.employeeId ?? '';
  const employee = employees.find(e => e.id === employeeId);

  const [activeQ, setActiveQ] = useState<Quarter>(params.filterQuarter ?? 'Q2');
  const [activeStatusFilter, setActiveStatusFilter] = useState<GoalStatus | null>(params.filterStatus ?? null);
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GoalCategory>('technical');
  const [priority, setPriority] = useState<GoalPriority>('medium');
  const [targetDate, setTargetDate] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  if (!employeeId) {
    return null; // should never happen — set-goals always receives employeeId
  }

  const empGoals = goals.filter(g => g.employeeId === employeeId);
  const qGoals = empGoals.filter(g => g.quarter === activeQ);
  const q2GoalTitles = new Set(empGoals.filter(g => g.quarter === 'Q2').map(g => g.title));
  const archivedStatuses: GoalStatus[] = ['approved', 'rejected'];
  const visibleQGoals = showArchived ? qGoals : qGoals.filter(g => !archivedStatuses.includes(g.status));
  const filteredGoals = activeStatusFilter ? visibleQGoals.filter(g => g.status === activeStatusFilter) : visibleQGoals;
  const archivedCount = qGoals.filter(g => archivedStatuses.includes(g.status)).length;

  function resetForm() {
    setTitle('');
    setDescription('');
    setCategory('technical');
    setPriority('medium');
    setTargetDate('');
    setAttachments([]);
    setShowForm(false);
    setEditingGoalId(null);
    setEditMode(false);
  }

  function handleEditGoal(goalId: string) {
    const goal = qGoals.find(g => g.id === goalId);
    if (!goal) return;
    setEditingGoalId(goalId);
    setTitle(goal.title);
    setDescription(goal.description);
    setCategory(goal.category);
    setPriority(goal.priority);
    setTargetDate(goal.targetDate);
    setAttachments(goal.attachments ?? []);
    setShowForm(false);
    setEditMode(true);
  }

  function handleSaveEdit() {
    if (!editingGoalId) return;
    if (!title.trim() || !description.trim() || !targetDate.trim()) {
      showToast('Please fill in title, description, and target date.', 'error', 'Missing Fields');
      return;
    }
    if (!isValidISODate(targetDate.trim())) {
      showToast('Target date must be in YYYY-MM-DD format (e.g. 2026-06-30).', 'error', 'Invalid Date');
      return;
    }
    updateGoal(editingGoalId, {
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      targetDate: targetDate.trim(),
    });
    if (employee) {
      addNotification({
        recipientId: employeeId,
        type: 'goal_adjusted',
        title: 'Goal Updated',
        message: `${currentUserId ? employees.find(e => e.id === currentUserId)?.name ?? 'Your manager' : 'Your manager'} updated your ${activeQ} goal: "${title.trim()}"`,
        read: false,
        createdAt: new Date().toISOString(),
        relatedGoalId: editingGoalId,
      });
    }
    showToast('Goal updated successfully.', 'success', 'Goal Updated');
    resetForm();
  }

  async function handlePickFile() {
    const file = await pickAttachment(showToast);
    if (file) setAttachments(prev => [...prev, file]);
  }

  function removeAttachment(idx: number) {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  }

  function handleAddGoal() {
    if (!title.trim() || !description.trim() || !targetDate.trim()) {
      showToast('Please fill in title, description, and target date.', 'error', 'Missing Fields');
      return;
    }
    if (!isValidISODate(targetDate.trim())) {
      showToast('Target date must be in YYYY-MM-DD format (e.g. 2026-06-30).', 'error', 'Invalid Date');
      return;
    }
    const newGoal = addGoal({
      employeeId: employeeId,
      title: title.trim(),
      description: description.trim(),
      quarter: activeQ,
      category,
      priority,
      targetDate: targetDate.trim(),
      weight: 1,
      status: 'not_started',
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    if (employee) {
      // goal_assigned notification is created by the handle_goal_inserted DB trigger

      // Transition from onboarding → active when the first goal is set
      if (employee.status === 'onboarding') {
        updateEmployee(employeeId, { status: 'active' });
        addNotification({
          recipientId: employeeId,
          type: 'goal_assigned',
          title: 'Onboarding Complete',
          message: 'Your goals have been set and you are now an active team member. Welcome!',
          read: false,
          createdAt: new Date().toISOString(),
          relatedEmployeeId: employeeId,
        });
      }
    }
    showToast(`"${newGoal.title}" added to ${activeQ}.`, 'success', 'Goal Created');
    resetForm();
  }

  function handleDelete(goalId: string, isTerminal: boolean) {
    if (isTerminal) {
      showToast('Goals that have been submitted or reviewed cannot be deleted.', 'error', 'Cannot Delete');
      return;
    }
    Alert.alert('Delete Goal', 'Are you sure you want to delete this goal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteGoal(goalId) },
    ]);
  }

  if (!employee) {
    return (
      <View style={styles.root}>
        <Header title="Set Goals" color={colors.bgElevated} accentColor={colors.managerPrimary} onBack={navigation.goBack} />
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Employee not found.</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior="padding"
    >
      <Header
        title={`Goals · ${employee.name}`}
        subtitle={employee.designation}
        color={colors.bgElevated}
        accentColor={colors.managerPrimary}
        onBack={navigation.goBack}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.tabs}>
          {(['Q1', 'Q2'] as Quarter[]).map(q => (
            <TouchableOpacity
              key={q}
              style={[styles.tab, activeQ === q && styles.tabActive]}
              onPress={() => { setActiveQ(q); setShowForm(false); setActiveStatusFilter(null); }}
            >
              <Text style={[styles.tabText, activeQ === q && styles.tabTextActive]}>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {archivedCount > 0 && (
          <TouchableOpacity
            style={styles.archiveToggle}
            onPress={() => setShowArchived(v => !v)}
            activeOpacity={0.7}
          >
            <Text style={styles.archiveToggleText}>
              {showArchived ? `▲ Hide completed goals (${archivedCount})` : `▼ Show completed goals (${archivedCount})`}
            </Text>
          </TouchableOpacity>
        )}

        {activeQ === 'Q1' && (() => {
          const unfinished = qGoals.filter(g =>
            (g.status === 'not_started' || g.status === 'in_progress' || g.status === 'rejected') &&
            !q2GoalTitles.has(g.title),
          );
          if (unfinished.length === 0) return null;
          return (
            <TouchableOpacity
              style={styles.bulkCarryBtn}
              onPress={() => {
                Alert.alert(
                  'Carry All to Q2',
                  `Copy ${unfinished.length} unfinished Q1 goal${unfinished.length !== 1 ? 's' : ''} into Q2 as new goals?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Carry Over',
                      onPress: () => {
                        unfinished.forEach(g => {
                          addGoal({
                            employeeId,
                            title: g.title,
                            description: g.description,
                            quarter: 'Q2',
                            category: g.category,
                            priority: g.priority,
                            targetDate: g.targetDate,
                            weight: 1,
                            status: 'not_started',
                            attachments: g.attachments,
                          });
                        });
                        showToast(`${unfinished.length} goal${unfinished.length !== 1 ? 's' : ''} carried to Q2.`, 'success', 'Carried to Q2');
                      },
                    },
                  ],
                );
              }}
              activeOpacity={0.75}
            >
              <Text style={styles.bulkCarryBtnText}>↩ Carry all unfinished to Q2 ({unfinished.length})</Text>
            </TouchableOpacity>
          );
        })()}

        {activeStatusFilter && (
          <View style={styles.filterBanner}>
            <Text style={styles.filterBannerText}>
              Showing: <Text style={{ fontWeight: '800' }}>{STATUS_CONFIG[activeStatusFilter].label}</Text> goals
            </Text>
            <TouchableOpacity onPress={() => setActiveStatusFilter(null)} hitSlop={8}>
              <Text style={styles.filterBannerClear}>Clear ×</Text>
            </TouchableOpacity>
          </View>
        )}

        {filteredGoals.length === 0 && (
          <View style={styles.emptyQ}>
            <Text style={styles.emptyQText}>
              {activeStatusFilter
                ? `No ${STATUS_CONFIG[activeStatusFilter].label.toLowerCase()} goals in ${activeQ}.`
                : `No ${activeQ} goals yet — add one below.`}
            </Text>
          </View>
        )}

        {filteredGoals.map(goal => {
          const sc = STATUS_CONFIG[goal.status];
          const pc = PRIORITY_CONFIG[goal.priority];
          const cc = CATEGORY_CONFIG[goal.category];
          const overdue = goal.status !== 'approved' && isOverdue(goal.targetDate);
          const isTerminal = goal.status === 'submitted' || goal.status === 'approved' || goal.status === 'rejected';
          const canEdit = goal.status === 'not_started' || goal.status === 'in_progress';
          return (
            <View key={goal.id} style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <Text style={styles.goalTitle} numberOfLines={2}>{goal.title}</Text>
                <View style={styles.cardActions}>
                  {canEdit && (
                    <TouchableOpacity
                      onPress={() => handleEditGoal(goal.id)}
                      hitSlop={8}
                      style={styles.editBtn}
                    >
                      <Text style={styles.editBtnText}>✎</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => handleDelete(goal.id, isTerminal)}
                    hitSlop={8}
                    style={styles.deleteBtn}
                  >
                    <Text style={[styles.deleteBtnText, isTerminal && styles.deleteBtnMuted]}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.goalDesc} numberOfLines={2}>{goal.description}</Text>

              <View style={styles.goalMeta}>
                <View style={[styles.chip, { backgroundColor: cc.color + '40' }]}>
                  <Text style={[styles.chipText, { color: cc.color }]}>{cc.label}</Text>
                </View>
                <View style={[styles.chip, { backgroundColor: pc.bg }]}>
                  <Text style={[styles.chipText, { color: pc.color }]}>{pc.label}</Text>
                </View>
                <View style={[styles.chip, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.chipText, { color: sc.color }]}>{sc.label}</Text>
                </View>
              </View>

              <View style={styles.goalFooter}>
                <Text style={[styles.goalDate, overdue && styles.overdueText]}>
                  {overdue ? '⚠ Overdue · ' : ''}Due {formatDate(goal.targetDate)}
                </Text>
                {activeQ === 'Q1' && (goal.status === 'rejected' || goal.status === 'in_progress') && (
                  <TouchableOpacity
                    style={styles.carryBtn}
                    onPress={() => {
                      addGoal({
                        employeeId,
                        title: goal.title,
                        description: goal.description,
                        quarter: 'Q2',
                        category: goal.category,
                        priority: goal.priority,
                        targetDate: goal.targetDate,
                        weight: 1,
                        status: 'not_started',
                        attachments: goal.attachments,
                      });
                      showToast(`"${goal.title}" carried to Q2.`, 'success', 'Carried to Q2');
                    }}
                    hitSlop={6}
                  >
                    <Text style={styles.carryBtnText}>↩ Carry to Q2</Text>
                  </TouchableOpacity>
                )}
              </View>

              {goal.evidence?.managerFeedback && (
                <View style={styles.feedbackBox}>
                  <Text style={styles.feedbackLabel}>Your feedback:</Text>
                  <Text style={styles.feedbackText}>{goal.evidence.managerFeedback}</Text>
                </View>
              )}
            </View>
          );
        })}

        {editMode && editingGoalId && (() => {
          const editingGoal = qGoals.find(g => g.id === editingGoalId);
          const isEditable = editingGoal?.status === 'not_started' || editingGoal?.status === 'in_progress';
          return (
            <View style={styles.form}>
              <Text style={styles.formTitle}>Edit Goal</Text>
              {!isEditable && (
                <View style={styles.viewOnlyBanner}>
                  <Text style={styles.viewOnlyText}>This goal is in "{editingGoal?.status.replace('_', ' ')}" status and cannot be edited.</Text>
                </View>
              )}

              <Label text="Title *" colors={colors} />
              <TextInput
                style={[styles.input, !isEditable && styles.inputReadOnly]}
                value={title}
                onChangeText={isEditable ? setTitle : undefined}
                placeholder="e.g. Implement user dashboard"
                placeholderTextColor={colors.textMuted}
                editable={isEditable}
              />

              <Label text="Description *" colors={colors} />
              <TextInput
                style={[styles.input, styles.inputMulti, !isEditable && styles.inputReadOnly]}
                value={description}
                onChangeText={isEditable ? setDescription : undefined}
                placeholder="What should the employee achieve and how will success be measured?"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                editable={isEditable}
              />

              <Label text="Category" colors={colors} />
              <View style={styles.chipRow}>
                {CATEGORIES.map(c => {
                  const cfg = CATEGORY_CONFIG[c];
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.selectChip,
                        category === c && { backgroundColor: cfg.color, borderColor: cfg.color },
                        !isEditable && styles.chipDisabled,
                      ]}
                      onPress={() => isEditable && setCategory(c)}
                      disabled={!isEditable}
                    >
                      <Text
                        style={[
                          styles.selectChipText,
                          { color: category === c ? '#fff' : cfg.color },
                        ]}
                      >
                        {cfg.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Label text="Priority" colors={colors} />
              <View style={styles.chipRow}>
                {PRIORITIES.map(p => {
                  const cfg = PRIORITY_CONFIG[p];
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.selectChip,
                        priority === p && { backgroundColor: cfg.color, borderColor: cfg.color },
                        !isEditable && styles.chipDisabled,
                      ]}
                      onPress={() => isEditable && setPriority(p)}
                      disabled={!isEditable}
                    >
                      <Text
                        style={[styles.selectChipText, { color: priority === p ? '#fff' : cfg.color }]}
                      >
                        {cfg.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Label text="Target Date *" colors={colors} />
              <TextInput
                style={[styles.input, !isEditable && styles.inputReadOnly]}
                value={targetDate}
                onChangeText={isEditable ? (text => setTargetDate(autoFormatDate(text))) : undefined}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                maxLength={10}
                editable={isEditable}
              />

              <View style={styles.formActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={resetForm} activeOpacity={0.7}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                {isEditable && (
                  <AnimatedButton style={styles.saveBtn} onPress={handleSaveEdit}>
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  </AnimatedButton>
                )}
              </View>
            </View>
          );
        })()}

        {!showForm && !editMode ? (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowForm(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.addBtnText}>+ Add Goal</Text>
          </TouchableOpacity>
        ) : showForm ? (
          <View style={styles.form}>
            <Text style={styles.formTitle}>New {activeQ} Goal</Text>

            <Label text="Title *" colors={colors} />
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Implement user dashboard"
              placeholderTextColor={colors.textMuted}
            />

            <Label text="Description *" colors={colors} />
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={description}
              onChangeText={setDescription}
              placeholder="What should the employee achieve and how will success be measured?"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />

            <Label text="Attachments (optional)" colors={colors} />
            <Text style={styles.attachHint}>Attach briefs, specs, or reference documents (PDF, image, XML, etc.)</Text>
            <TouchableOpacity style={styles.attachBtn} onPress={handlePickFile} activeOpacity={0.75}>
              <Text style={styles.attachBtnIcon}>📎</Text>
              <Text style={styles.attachBtnText}>Attach File</Text>
            </TouchableOpacity>
            {attachments.map((a, i) => (
              <View key={i} style={styles.attachItem}>
                <Text style={styles.attachItemIcon}>{a.mimeType.includes('pdf') ? '📄' : a.mimeType.includes('image') ? '🖼' : '📁'}</Text>
                <Text style={styles.attachItemName} numberOfLines={1}>{a.name}</Text>
                {a.size ? <Text style={styles.attachItemSize}>{(a.size / 1024).toFixed(0)}KB</Text> : null}
                <TouchableOpacity onPress={() => removeAttachment(i)} hitSlop={8}>
                  <Text style={styles.attachRemove}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            <Label text="Category" colors={colors} />
            <View style={styles.chipRow}>
              {CATEGORIES.map(c => {
                const cfg = CATEGORY_CONFIG[c];
                return (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.selectChip,
                      category === c && { backgroundColor: cfg.color, borderColor: cfg.color },
                    ]}
                    onPress={() => setCategory(c)}
                  >
                    <Text
                      style={[
                        styles.selectChipText,
                        { color: category === c ? '#fff' : cfg.color },
                      ]}
                    >
                      {cfg.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Label text="Priority" colors={colors} />
            <View style={styles.chipRow}>
              {PRIORITIES.map(p => {
                const cfg = PRIORITY_CONFIG[p];
                return (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.selectChip,
                      priority === p && { backgroundColor: cfg.color, borderColor: cfg.color },
                    ]}
                    onPress={() => setPriority(p)}
                  >
                    <Text
                      style={[styles.selectChipText, { color: priority === p ? '#fff' : cfg.color }]}
                    >
                      {cfg.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Label text="Target Date *" colors={colors} />
            <TextInput
              style={styles.input}
              value={targetDate}
              onChangeText={text => setTargetDate(autoFormatDate(text))}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              maxLength={10}
            />

            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={resetForm} activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <AnimatedButton style={styles.saveBtn} onPress={handleAddGoal}>
                <Text style={styles.saveBtnText}>Save Goal</Text>
              </AnimatedButton>
            </View>
          </View>
        ) : null}

        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Label({ text, colors }: { text: string; colors: ColorPalette }) {
  return <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 10 }}>{text}</Text>;
}

function createStyles(C: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyText: { color: C.textMuted },
    content: { padding: Spacing.lg },

    tabs: {
      flexDirection: 'row',
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: 4,
      marginBottom: 14,
      ...Shadow.sm,
    },
    tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: Radius.md },
    tabActive: { backgroundColor: C.primary },
    tabText: { fontSize: 14, fontWeight: '600', color: C.textMuted },
    tabTextActive: { color: C.bg },

    archiveToggle: {
      alignSelf: 'flex-start',
      marginBottom: 10,
      paddingVertical: 4,
      paddingHorizontal: 10,
      backgroundColor: C.bgElevated,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: C.border,
    },
    archiveToggleText: { fontSize: 12, color: C.textSecondary, fontWeight: '600' },

    bulkCarryBtn: {
      backgroundColor: C.pending + '18',
      borderRadius: Radius.lg,
      paddingVertical: 10,
      paddingHorizontal: 14,
      alignItems: 'center',
      marginBottom: 12,
      borderWidth: 1,
      borderColor: C.pending + '60',
    },
    bulkCarryBtnText: { fontSize: 13, fontWeight: '700', color: C.pending },

    filterBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: C.managerLight,
      borderRadius: Radius.md,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: C.primary + '40',
    },
    filterBannerText: { fontSize: 12, color: C.primary },
    filterBannerClear: { fontSize: 12, fontWeight: '700', color: C.primary },

    emptyQ: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: 24,
      alignItems: 'center',
      marginBottom: 12,
    },
    emptyQText: { color: C.textMuted, fontStyle: 'italic' },

    goalCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: 10,
      ...Shadow.sm,
    },
    goalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
    goalTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: C.textPrimary },
    cardActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    editBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: C.bgElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    editBtnText: { fontSize: 14, color: C.textSecondary },
    deleteBtn: { padding: 4 },
    deleteBtnText: { fontSize: 14, color: C.rejected },
    deleteBtnMuted: { color: C.textMuted },
    goalDesc: { fontSize: 12, color: C.textSecondary, marginBottom: 8, lineHeight: 16 },
    goalMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    chip: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
    chipText: { fontSize: 11, fontWeight: '600' },
    goalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    goalDate: { fontSize: 11, color: C.textMuted },
    carryBtn: {
      backgroundColor: C.pending + '25',
      borderRadius: Radius.full,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderWidth: 1,
      borderColor: C.pending,
    },
    carryBtnText: { fontSize: 11, fontWeight: '700', color: C.pending },
    overdueText: { color: C.rejected, fontWeight: '600' },
    feedbackBox: { backgroundColor: C.pendingBg, borderRadius: Radius.sm, padding: 8, marginTop: 8 },
    feedbackLabel: { fontSize: 11, fontWeight: '700', color: C.pending, marginBottom: 2 },
    feedbackText: { fontSize: 12, color: C.textSecondary },

    addBtn: {
      borderWidth: 2,
      borderColor: C.primary,
      borderStyle: 'dashed',
      borderRadius: Radius.lg,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: 12,
    },
    addBtnText: { fontSize: 15, fontWeight: '700', color: C.primary },

    form: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: 12,
      ...Shadow.md,
      borderWidth: 2,
      borderColor: C.border,
    },
    formTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
    input: {
      backgroundColor: C.bg,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === 'ios' ? 10 : 8,
      fontSize: 14,
      color: C.textPrimary,
    },
    inputMulti: { height: 80, textAlignVertical: 'top' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    selectChip: {
      borderWidth: 1.5,
      borderColor: C.border,
      borderRadius: Radius.full,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    selectChipText: { fontSize: 12, fontWeight: '600' },
    row2: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    formActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
    cancelBtn: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: C.border,
      borderRadius: Radius.lg,
      paddingVertical: 12,
      alignItems: 'center',
    },
    cancelBtnText: { fontSize: 14, fontWeight: '600', color: C.textSecondary },
    saveBtn: {
      flex: 2,
      backgroundColor: C.primary,
      borderRadius: Radius.lg,
      paddingVertical: 12,
      alignItems: 'center',
    },
    saveBtnText: { fontSize: 14, fontWeight: '700', color: C.bg },

    viewOnlyBanner: {
      backgroundColor: C.pendingBg,
      borderRadius: Radius.sm,
      padding: 8,
      marginBottom: 8,
    },
    viewOnlyText: { fontSize: 12, color: C.pending, fontStyle: 'italic' },
    inputReadOnly: { opacity: 0.55 },
    chipDisabled: { opacity: 0.5 },

    attachHint: { fontSize: 11, color: C.textMuted, marginBottom: 6, lineHeight: 16 },
    attachBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1.5,
      borderColor: C.border,
      borderStyle: 'dashed',
      borderRadius: Radius.md,
      paddingVertical: 9,
      paddingHorizontal: 14,
      marginBottom: 6,
    },
    attachBtnIcon: { fontSize: 16 },
    attachBtnText: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
    attachItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: C.bg,
      borderRadius: Radius.sm,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginBottom: 4,
      borderWidth: 1,
      borderColor: C.border,
    },
    attachItemIcon: { fontSize: 14 },
    attachItemName: { flex: 1, fontSize: 12, color: C.textPrimary },
    attachItemSize: { fontSize: 10, color: C.textMuted, flexShrink: 0 },
    attachRemove: { fontSize: 13, color: C.rejected, marginLeft: 4 },
  });
}

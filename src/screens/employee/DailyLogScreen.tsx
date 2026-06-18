import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Header from '../../components/Header';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { Radius, Shadow, Spacing, Typography } from '../../theme';
import type { ColorPalette } from '../../theme';
import { DailyTask, ScreenProps } from '../../types';

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayString() {
  const d = new Date();
  if (d.getDay() === 0) d.setDate(d.getDate() - 1);
  return toLocalDateString(d);
}

function formatDisplayDate(date: string) {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function shiftDateForward(date: string): string {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return toLocalDateString(d);
}

function shiftDateBackward(date: string): string {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  if (d.getDay() === 0) d.setDate(d.getDate() - 1);
  return toLocalDateString(d);
}

export default function DailyLogScreen({ navigation, currentUserId, onLogout }: ScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { dailyLogs, saveDailyLog, notifications } = useApp();

  const today = todayString();
  const [selectedDate, setSelectedDate] = useState(today);

  const existingLog = dailyLogs.find(
    l => l.employeeId === currentUserId && l.date === selectedDate,
  );

  const [tasks, setTasks] = useState<DailyTask[]>(existingLog?.tasks ?? []);
  const [notes, setNotes] = useState(existingLog?.notes ?? '');
  const [newTask, setNewTask] = useState('');
  const [saved, setSaved] = useState(false);

  const notifCount = notifications.filter(n => n.recipientId === currentUserId && !n.read).length;

  function loadDateData(date: string) {
    const log = dailyLogs.find(l => l.employeeId === currentUserId && l.date === date);
    setTasks(log?.tasks ?? []);
    setNotes(log?.notes ?? '');
    setSaved(false);
    setNewTask('');
  }

  function handleDateChange(newDate: string) {
    setSelectedDate(newDate);
    loadDateData(newDate);
  }

  function addTask() {
    const trimmed = newTask.trim();
    if (!trimmed) return;
    const task: DailyTask = { id: `task-${Date.now()}`, description: trimmed };
    setTasks(prev => [...prev, task]);
    setNewTask('');
    setSaved(false);
  }

  function removeTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id));
    setSaved(false);
  }

  function handleSave() {
    if (!currentUserId) return;
    saveDailyLog(currentUserId, selectedDate, tasks, notes);
    setSaved(true);
  }

  const isToday = selectedDate === today;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        title="Daily Log"
        subtitle="Record your work activities"
        color={colors.bgElevated}
        accentColor={colors.employeePrimary}
        onBack={() => navigation.goBack()}
        onLogout={onLogout}
        onNotif={() => navigation.navigate('notifications')}
        notifCount={notifCount}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Date navigation */}
        <View style={styles.dateNav}>
          <TouchableOpacity style={styles.dateArrowBtn} onPress={() => handleDateChange(shiftDateBackward(selectedDate))}>
            <Text style={[styles.dateArrow, { color: colors.employeePrimary }]}>‹</Text>
          </TouchableOpacity>

          <View style={styles.dateLabelWrap}>
            <Text style={styles.dateLabel}>{formatDisplayDate(selectedDate)}</Text>
            {isToday && (
              <View style={[styles.todayChip, { backgroundColor: colors.employeeLight }]}>
                <Text style={[styles.todayChipText, { color: colors.employeePrimary }]}>Today</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.dateArrowBtn}
            onPress={() => handleDateChange(shiftDateForward(selectedDate))}
          >
            <Text style={[styles.dateArrow, { color: colors.employeePrimary }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Tasks section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tasks Completed</Text>
          <Text style={styles.sectionCount}>{tasks.length}</Text>
        </View>

        {tasks.length === 0 && (
          <View style={styles.emptyTasks}>
            <Text style={styles.emptyText}>No tasks recorded yet.</Text>
            <Text style={styles.emptyHint}>Add what you accomplished today.</Text>
          </View>
        )}

        {tasks.map((task, idx) => (
          <View key={task.id} style={styles.taskRow}>
            <View style={[styles.taskNum, { backgroundColor: colors.employeeLight }]}>
              <Text style={[styles.taskNumText, { color: colors.employeePrimary }]}>{idx + 1}</Text>
            </View>
            <Text style={styles.taskDesc}>{task.description}</Text>
            <TouchableOpacity onPress={() => removeTask(task.id)} style={styles.removeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.removeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Add task input */}
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            placeholder="Describe a task you completed..."
            placeholderTextColor={colors.textMuted}
            value={newTask}
            onChangeText={t => { setNewTask(t); setSaved(false); }}
            onSubmitEditing={addTask}
            returnKeyType="done"
            multiline={false}
          />
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.employeePrimary }, !newTask.trim() && styles.addBtnDisabled]}
            onPress={addTask}
            disabled={!newTask.trim()}
          >
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Notes section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.sectionOptional}>optional</Text>
        </View>

        <TextInput
          style={styles.notesInput}
          placeholder="Any additional notes, blockers, or highlights..."
          placeholderTextColor={colors.textMuted}
          value={notes}
          onChangeText={t => { setNotes(t); setSaved(false); }}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Save button */}
        <TouchableOpacity
          style={[
            styles.saveBtn,
            { backgroundColor: saved ? colors.approved : colors.employeePrimary },
            tasks.length === 0 && styles.saveBtnDisabled,
          ]}
          onPress={handleSave}
          disabled={tasks.length === 0}
          activeOpacity={0.82}
        >
          <Text style={styles.saveBtnText}>
            {saved ? '✓ Saved' : 'Save Daily Log'}
          </Text>
        </TouchableOpacity>

        {tasks.length === 0 && (
          <Text style={styles.saveHint}>Add at least one task to save your log.</Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(C: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1 },
    content: { paddingHorizontal: Spacing.xl, paddingBottom: 48 },

    dateNav: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      marginTop: Spacing.lg,
      marginBottom: Spacing.md,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.sm,
      ...Shadow.sm,
    },
    dateArrowBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateArrowDisabled: { opacity: 0.3 },
    dateArrow: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
    dateLabelWrap: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
    },
    dateLabel: { ...Typography.h4, color: C.textPrimary, textAlign: 'center' },
    todayChip: {
      borderRadius: Radius.full,
      paddingHorizontal: 10,
      paddingVertical: 2,
    },
    todayChipText: { fontSize: 11, fontWeight: '700' },

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.sm,
      marginTop: Spacing.md,
      gap: 8,
    },
    sectionTitle: { ...Typography.h4, color: C.textPrimary, flex: 1 },
    sectionCount: {
      fontSize: 13,
      fontWeight: '700',
      color: C.employeePrimary,
      backgroundColor: C.employeeLight,
      borderRadius: Radius.full,
      paddingHorizontal: 10,
      paddingVertical: 2,
    },
    sectionOptional: { fontSize: 12, color: C.textMuted },

    emptyTasks: {
      backgroundColor: C.card,
      borderRadius: Radius.md,
      padding: Spacing.md,
      alignItems: 'center',
      marginBottom: Spacing.sm,
      borderWidth: 1,
      borderColor: C.border,
      borderStyle: 'dashed',
    },
    emptyText: { ...Typography.body, color: C.textSecondary, marginBottom: 4 },
    emptyHint: { fontSize: 12, color: C.textMuted },

    taskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.card,
      borderRadius: Radius.md,
      padding: Spacing.sm,
      marginBottom: 6,
      gap: Spacing.sm,
      ...Shadow.sm,
    },
    taskNum: {
      width: 28,
      height: 28,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    taskNumText: { fontSize: 12, fontWeight: '700' },
    taskDesc: { flex: 1, ...Typography.body, color: C.textPrimary, lineHeight: 20 },
    removeBtn: { padding: 4 },
    removeBtnText: { fontSize: 12, color: C.textMuted },

    addRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginTop: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    addInput: {
      flex: 1,
      backgroundColor: C.card,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: Spacing.md,
      paddingVertical: 10,
      color: C.textPrimary,
      fontSize: 14,
      ...Shadow.sm,
    },
    addBtn: {
      width: 44,
      height: 44,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      ...Shadow.sm,
    },
    addBtnDisabled: { opacity: 0.4 },
    addBtnText: { color: '#fff', fontSize: 24, fontWeight: '700', lineHeight: 28 },

    notesInput: {
      backgroundColor: C.card,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      color: C.textPrimary,
      fontSize: 14,
      minHeight: 100,
      marginBottom: Spacing.lg,
      ...Shadow.sm,
    },

    saveBtn: {
      borderRadius: Radius.md,
      paddingVertical: 14,
      alignItems: 'center',
      ...Shadow.sm,
    },
    saveBtnDisabled: { opacity: 0.4 },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    saveHint: {
      textAlign: 'center',
      fontSize: 12,
      color: C.textMuted,
      marginTop: 8,
    },
  });
}

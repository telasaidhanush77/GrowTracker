import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Header from '../../components/Header';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { AIReport, AIReportType, useAIReports, useGenerateReport } from '../../hooks/useAIReports';
import { Radius, Shadow, Spacing } from '../../theme';
import type { ColorPalette } from '../../theme';
import { ScreenProps } from '../../types';

type Filter = 'all' | AIReportType;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'goal', label: 'Goal' },
  { key: 'quarterly', label: 'Quarterly' },
  { key: 'fiscal_year', label: 'Fiscal Year' },
];

const REPORT_TYPE_LABELS: Record<AIReportType, string> = {
  goal: 'Goal Report',
  quarterly: 'Quarterly Report',
  fiscal_year: 'Fiscal Year Report',
};

const REPORT_TYPE_ICONS: Record<AIReportType, string> = {
  goal: '🎯',
  quarterly: '📊',
  fiscal_year: '🏆',
};

function scoreColor(score: number | null, C: ColorPalette): string {
  if (score === null) return C.textMuted;
  if (score >= 75) return C.approved;
  if (score >= 50) return C.pending;
  return C.rejected;
}

function formatDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString('en-US', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function AIReportsScreen({ navigation, params, currentUserId }: ScreenProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { showToast } = useToast();
  const { goals } = useApp();

  const targetEmployeeId = params.employeeId ?? currentUserId ?? '';
  const { data: reports = [], isLoading } = useAIReports(targetEmployeeId);
  const generateMutation = useGenerateReport();

  const [filter, setFilter] = useState<Filter>('all');
  const [showGenerator, setShowGenerator] = useState(false);
  const [genType, setGenType] = useState<AIReportType>('quarterly');
  const [genQuarter, setGenQuarter] = useState<'Q1' | 'Q2'>('Q1');
  const [genGoalId, setGenGoalId] = useState<string>('');

  const myGoals = goals.filter(g => g.employeeId === targetEmployeeId);

  const filtered = filter === 'all' ? reports : reports.filter(r => r.report_type === filter);

  async function handleGenerate() {
    if (genType === 'goal' && !genGoalId) {
      showToast('Please select a goal', 'error');
      return;
    }
    try {
      await generateMutation.mutateAsync({
        employeeId: targetEmployeeId,
        reportType: genType,
        goalId: genType === 'goal' ? genGoalId : undefined,
        quarter: genType === 'quarterly' ? genQuarter : undefined,
      });
      setShowGenerator(false);
      showToast('AI report generated', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Generation failed';
      showToast(msg, 'error');
    }
  }

  return (
    <View style={styles.root}>
      <Header
        title="AI Reports"
        subtitle="Powered by Claude"
        color={colors.bgElevated}
        accentColor={colors.primary}
        onBack={navigation.goBack}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Generate Section ── */}
        <TouchableOpacity
          style={[styles.generateToggle, showGenerator && styles.generateToggleActive]}
          onPress={() => setShowGenerator(v => !v)}
          activeOpacity={0.8}
        >
          <Text style={styles.generateToggleIcon}>{showGenerator ? '✕' : '✦'}</Text>
          <Text style={[styles.generateToggleText, showGenerator && { color: colors.primary }]}>
            {showGenerator ? 'Cancel' : 'Generate New Report'}
          </Text>
        </TouchableOpacity>

        {showGenerator && (
          <View style={styles.generatorCard}>
            <Text style={styles.generatorLabel}>Report Type</Text>
            <View style={styles.typeRow}>
              {(['goal', 'quarterly', 'fiscal_year'] as AIReportType[]).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, genType === t && styles.typeChipActive]}
                  onPress={() => setGenType(t)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.typeChipText, genType === t && styles.typeChipTextActive]}>
                    {REPORT_TYPE_ICONS[t]} {t === 'fiscal_year' ? 'FY' : t === 'quarterly' ? 'Quarterly' : 'Goal'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {genType === 'quarterly' && (
              <>
                <Text style={styles.generatorLabel}>Quarter</Text>
                <View style={styles.typeRow}>
                  {(['Q1', 'Q2'] as const).map(q => (
                    <TouchableOpacity
                      key={q}
                      style={[styles.typeChip, genQuarter === q && styles.typeChipActive]}
                      onPress={() => setGenQuarter(q)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.typeChipText, genQuarter === q && styles.typeChipTextActive]}>{q}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {genType === 'goal' && (
              <>
                <Text style={styles.generatorLabel}>Select Goal</Text>
                {myGoals.length === 0 ? (
                  <Text style={styles.noGoalsText}>No goals found.</Text>
                ) : (
                  myGoals.map(g => (
                    <TouchableOpacity
                      key={g.id}
                      style={[styles.goalOption, genGoalId === g.id && styles.goalOptionActive]}
                      onPress={() => setGenGoalId(g.id)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.goalOptionDot}>
                        {genGoalId === g.id && <View style={styles.goalOptionDotInner} />}
                      </View>
                      <View style={styles.goalOptionText}>
                        <Text style={styles.goalOptionTitle} numberOfLines={1}>{g.title}</Text>
                        <Text style={styles.goalOptionSub}>{g.quarter} · {g.status.replace('_', ' ')}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </>
            )}

            <TouchableOpacity
              style={[styles.generateBtn, generateMutation.isPending && styles.btnDisabled]}
              onPress={handleGenerate}
              disabled={generateMutation.isPending}
              activeOpacity={0.85}
            >
              {generateMutation.isPending ? (
                <View style={styles.generateBtnRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.generateBtnText}>Analyzing with Claude…</Text>
                </View>
              ) : (
                <Text style={styles.generateBtnText}>✦ Generate Report</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Filter chips ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Reports list ── */}
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✦</Text>
            <Text style={styles.emptyTitle}>No Reports Yet</Text>
            <Text style={styles.emptySub}>
              Generate your first AI-powered performance report to get personalized insights and coaching.
            </Text>
          </View>
        ) : (
          filtered.map(report => (
            <ReportCard
              key={report.id}
              report={report}
              colors={colors}
              styles={styles}
              onPress={() => navigation.navigate('ai-report-detail', { reportId: report.id, employeeId: targetEmployeeId })}
            />
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function ReportCard({
  report,
  colors,
  styles,
  onPress,
}: {
  report: AIReport;
  colors: ColorPalette;
  styles: ReturnType<typeof createStyles>;
  onPress: () => void;
}) {
  const score = report.overall_score;
  const sc = scoreColor(score, colors);

  return (
    <TouchableOpacity style={styles.reportCard} onPress={onPress} activeOpacity={0.82}>
      <View style={styles.reportCardHeader}>
        <View style={styles.reportTypePill}>
          <Text style={styles.reportTypeIcon}>{REPORT_TYPE_ICONS[report.report_type]}</Text>
          <Text style={styles.reportTypeLabel}>{REPORT_TYPE_LABELS[report.report_type]}</Text>
          {report.quarter && <Text style={styles.reportQuarter}> · {report.quarter}</Text>}
        </View>
        {score !== null && (
          <View style={[styles.scoreBadge, { backgroundColor: sc + '20' }]}>
            <Text style={[styles.scoreBadgeText, { color: sc }]}>{score}</Text>
          </View>
        )}
      </View>

      {report.summary && (
        <Text style={styles.reportSummary} numberOfLines={2}>{report.summary}</Text>
      )}

      <View style={styles.reportFooter}>
        <Text style={styles.reportDate}>{formatDate(report.generated_at)}</Text>
        <Text style={styles.reportChevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

function createStyles(C: ColorPalette, isDark: boolean) {
  const inputBg = isDark ? '#1E1E1E' : '#F7F8FA';

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1 },
    content: { padding: Spacing.lg, paddingBottom: 48 },

    generateToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: 14,
      marginBottom: Spacing.md,
      borderWidth: 1.5,
      borderColor: C.border,
      borderStyle: 'dashed',
    },
    generateToggleActive: { borderColor: C.primary + '60', borderStyle: 'solid' },
    generateToggleIcon: { fontSize: 16, color: C.primary },
    generateToggleText: { fontSize: 14, fontWeight: '700', color: C.textSecondary },

    generatorCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: C.border,
      ...Shadow.md,
    },
    generatorLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: C.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.7,
      marginBottom: 8,
      marginTop: 12,
    },
    typeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
    typeChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: Radius.full,
      backgroundColor: inputBg,
      borderWidth: 1,
      borderColor: C.border,
    },
    typeChipActive: { backgroundColor: C.primary + '18', borderColor: C.primary },
    typeChipText: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
    typeChipTextActive: { color: C.primary },

    goalOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: Radius.md,
      backgroundColor: inputBg,
      marginBottom: 6,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    goalOptionActive: { borderColor: C.primary, backgroundColor: C.primary + '10' },
    goalOptionDot: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: C.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    goalOptionDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary },
    goalOptionText: { flex: 1 },
    goalOptionTitle: { fontSize: 13, fontWeight: '600', color: C.textPrimary },
    goalOptionSub: { fontSize: 11, color: C.textMuted, marginTop: 1, textTransform: 'capitalize' },
    noGoalsText: { fontSize: 13, color: C.textMuted, padding: 8 },

    generateBtn: {
      backgroundColor: C.primary,
      borderRadius: Radius.md,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: Spacing.md,
      ...Shadow.sm,
    },
    btnDisabled: { opacity: 0.55 },
    generateBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    generateBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

    filterScroll: { marginBottom: Spacing.md },
    filterRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: Radius.full,
      backgroundColor: C.bgElevated,
      borderWidth: 1,
      borderColor: C.border,
    },
    filterChipActive: { backgroundColor: C.primary, borderColor: C.primary },
    filterChipText: { fontSize: 12, fontWeight: '600', color: C.textSecondary },
    filterChipTextActive: { color: '#fff' },

    center: { paddingTop: 48, alignItems: 'center' },

    emptyState: {
      alignItems: 'center',
      paddingTop: 48,
      paddingHorizontal: Spacing.xl,
    },
    emptyIcon: { fontSize: 40, color: C.primary + '60', marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary, marginBottom: 8 },
    emptySub: { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 21 },

    reportCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: C.border,
      ...Shadow.sm,
    },
    reportCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    reportTypePill: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    reportTypeIcon: { fontSize: 14 },
    reportTypeLabel: { fontSize: 13, fontWeight: '700', color: C.textPrimary },
    reportQuarter: { fontSize: 12, color: C.textMuted, fontWeight: '500' },
    scoreBadge: {
      borderRadius: Radius.full,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    scoreBadgeText: { fontSize: 13, fontWeight: '800' },
    reportSummary: {
      fontSize: 13,
      color: C.textSecondary,
      lineHeight: 19,
      marginBottom: 10,
    },
    reportFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    reportDate: { fontSize: 11, color: C.textMuted, fontWeight: '500' },
    reportChevron: { fontSize: 18, color: C.textMuted, fontWeight: '300' },
  });
}

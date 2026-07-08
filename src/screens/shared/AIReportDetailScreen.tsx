import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Header from '../../components/Header';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Radius, Shadow, Spacing } from '../../theme';
import type { ColorPalette } from '../../theme';
import { ScreenProps } from '../../types';
import type { AIReport, AIReportType } from '../../hooks/useAIReports';

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

function scoreColor(score: number, C: ColorPalette): string {
  if (score >= 75) return C.approved;
  if (score >= 50) return C.pending;
  return C.rejected;
}

function scoreBand(score: number): string {
  if (score >= 90) return 'Exceptional';
  if (score >= 75) return 'Strong';
  if (score >= 60) return 'Meeting Expectations';
  if (score >= 45) return 'Needs Improvement';
  return 'At Risk';
}

function formatDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function AIReportDetailScreen({ navigation, params }: ScreenProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const reportId = params.reportId ?? '';

  const { data: report, isLoading } = useQuery({
    queryKey: ['ai-report', reportId],
    queryFn: async (): Promise<AIReport | null> => {
      if (!reportId) return null;
      const { data, error } = await supabase
        .from('ai_reports')
        .select('*')
        .eq('id', reportId)
        .single();
      if (error) throw new Error(error.message);
      return data as AIReport;
    },
    enabled: !!reportId,
  });

  if (isLoading) {
    return (
      <View style={styles.root}>
        <Header title="AI Report" color={colors.bgElevated} accentColor={colors.primary} onBack={navigation.goBack} />
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.root}>
        <Header title="AI Report" color={colors.bgElevated} accentColor={colors.primary} onBack={navigation.goBack} />
        <View style={styles.center}><Text style={styles.errorText}>Report not found.</Text></View>
      </View>
    );
  }

  const score = report.overall_score ?? 0;
  const sc = scoreColor(score, colors);
  const typeLabel = REPORT_TYPE_LABELS[report.report_type] ?? 'AI Report';
  const typeIcon = REPORT_TYPE_ICONS[report.report_type] ?? '✦';

  return (
    <View style={styles.root}>
      <Header
        title={typeLabel}
        subtitle={report.quarter ? `${report.quarter} · ${formatDate(report.generated_at)}` : formatDate(report.generated_at)}
        color={colors.bgElevated}
        accentColor={colors.primary}
        onBack={navigation.goBack}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Score Hero ── */}
        {report.overall_score !== null && (
          <View style={[styles.heroCard, { borderColor: sc + '40' }]}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroIcon}>{typeIcon}</Text>
              <View>
                <Text style={styles.heroType}>{typeLabel}</Text>
                {report.quarter && <Text style={styles.heroQuarter}>{report.quarter}</Text>}
              </View>
            </View>
            <View style={styles.heroRight}>
              <Text style={[styles.heroScore, { color: sc }]}>{score}</Text>
              <Text style={[styles.heroScoreUnit, { color: sc }]}>/100</Text>
              <View style={[styles.heroBand, { backgroundColor: sc + '20' }]}>
                <Text style={[styles.heroBandText, { color: sc }]}>{scoreBand(score)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Summary ── */}
        {report.summary && (
          <View style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.summaryText}>{report.summary}</Text>
          </View>
        )}

        {/* ── Strengths ── */}
        {report.strengths?.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.approved }]}>Strengths</Text>
            {report.strengths.map((s, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={[styles.bulletDot, { color: colors.approved }]}>✓</Text>
                <Text style={styles.bulletText}>{s}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Improvements ── */}
        {report.improvements?.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.pending }]}>Areas to Grow</Text>
            {report.improvements.map((s, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={[styles.bulletDot, { color: colors.pending }]}>△</Text>
                <Text style={styles.bulletText}>{s}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Recommendations ── */}
        {report.recommendations?.length > 0 && (
          <View style={[styles.section, styles.recoCard]}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Coaching Recommendations</Text>
            {report.recommendations.map((r, i) => (
              <View key={i} style={styles.recoRow}>
                <View style={[styles.recoDot, { backgroundColor: colors.primary }]}>
                  <Text style={styles.recoDotNum}>{i + 1}</Text>
                </View>
                <Text style={styles.recoText}>{r}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Full Narrative ── */}
        {report.content && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detailed Analysis</Text>
            <Text style={styles.narrativeText}>{report.content}</Text>
          </View>
        )}

        {/* ── Meta footer ── */}
        <View style={styles.metaFooter}>
          <Text style={styles.metaText}>Generated by {report.model_used}</Text>
          <Text style={styles.metaText}>{formatDate(report.generated_at)}</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function createStyles(C: ColorPalette, isDark: boolean) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1 },
    content: { padding: Spacing.lg },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    errorText: { fontSize: 15, color: C.textMuted },

    heroCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: C.card,
      borderRadius: Radius.xl,
      padding: Spacing.md,
      marginBottom: Spacing.lg,
      borderWidth: 1.5,
      ...Shadow.md,
    },
    heroLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    heroIcon: { fontSize: 28 },
    heroType: { fontSize: 14, fontWeight: '800', color: C.textPrimary },
    heroQuarter: { fontSize: 12, color: C.textMuted, marginTop: 2 },
    heroRight: { alignItems: 'flex-end' },
    heroScore: { fontSize: 44, fontWeight: '900', lineHeight: 48 },
    heroScoreUnit: { fontSize: 14, fontWeight: '700', marginTop: -6, marginBottom: 4 },
    heroBand: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3 },
    heroBandText: { fontSize: 11, fontWeight: '700' },

    summaryCard: {
      backgroundColor: C.bgElevated,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: C.border,
    },

    section: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: C.border,
      ...Shadow.sm,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      color: C.textMuted,
      marginBottom: Spacing.sm,
    },
    summaryText: { fontSize: 14, color: C.textSecondary, lineHeight: 22 },

    bulletRow: { flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'flex-start' },
    bulletDot: { fontSize: 14, fontWeight: '800', width: 18, textAlign: 'center', marginTop: 1 },
    bulletText: { flex: 1, fontSize: 14, color: C.textSecondary, lineHeight: 21 },

    recoCard: {
      backgroundColor: isDark ? C.primary + '10' : C.primary + '08',
      borderColor: C.primary + '30',
    },
    recoRow: { flexDirection: 'row', gap: 12, marginBottom: 10, alignItems: 'flex-start' },
    recoDot: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
      flexShrink: 0,
    },
    recoDotNum: { fontSize: 11, fontWeight: '800', color: '#fff' },
    recoText: { flex: 1, fontSize: 14, color: C.textSecondary, lineHeight: 21 },

    narrativeText: { fontSize: 14, color: C.textSecondary, lineHeight: 23 },

    metaFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: C.border,
      marginTop: Spacing.sm,
    },
    metaText: { fontSize: 10, color: C.textMuted + 'AA', fontWeight: '500' },
  });
}

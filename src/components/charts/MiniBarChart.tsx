import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Radius } from '../../theme';
import type { ColorPalette } from '../../theme';

export interface BarDatum {
  label: string;
  value: number;
  color: string;
}

interface Props {
  data: BarDatum[];
  maxValue?: number;
  height?: number;
  showValues?: boolean;
  showLabels?: boolean;
  valueSuffix?: string;
}

export default function MiniBarChart({
  data,
  maxValue,
  height = 72,
  showValues = true,
  showLabels = true,
  valueSuffix = '',
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const max = maxValue ?? Math.max(...data.map(d => d.value), 1);

  return (
    <View style={styles.root}>
      {/* Bars */}
      <View style={[styles.barsRow, { height }]}>
        {data.map((d, i) => {
          const pct = max > 0 ? Math.max(0, Math.min(1, d.value / max)) : 0;
          return (
            <View key={i} style={styles.barCol}>
              {showValues && (
                <Text style={[styles.barValue, { color: d.color }]}>
                  {d.value}{valueSuffix}
                </Text>
              )}
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${Math.max(pct * 100, pct > 0 ? 4 : 0)}%`,
                      backgroundColor: d.color,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>

      {/* Grid line */}
      <View style={styles.baseline} />

      {/* Labels */}
      {showLabels && (
        <View style={styles.labelsRow}>
          {data.map((d, i) => (
            <Text key={i} style={styles.barLabel} numberOfLines={1}>
              {d.label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

function createStyles(C: ColorPalette) {
  return StyleSheet.create({
    root: { width: '100%' },
    barsRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 6,
    },
    barCol: {
      flex: 1,
      alignItems: 'center',
      height: '100%',
      justifyContent: 'flex-end',
    },
    barValue: {
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 3,
    },
    barTrack: {
      width: '100%',
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: C.chartTrack,
      borderRadius: Radius.xs,
      overflow: 'hidden',
    },
    barFill: {
      width: '100%',
      borderRadius: Radius.xs,
    },
    baseline: {
      height: 1,
      backgroundColor: C.border,
      marginTop: 2,
    },
    labelsRow: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 6,
    },
    barLabel: {
      flex: 1,
      fontSize: 10,
      fontWeight: '600',
      color: C.textMuted,
      textAlign: 'center',
    },
  });
}

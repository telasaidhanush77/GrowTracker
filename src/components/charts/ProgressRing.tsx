import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import type { ColorPalette } from '../../theme';

interface Props {
  pct: number;
  size?: number;
  stroke?: number;
  color: string;
  bg?: string;
  trackColor?: string;
  label?: string;
  sublabel?: string;
}

/**
 * Donut ring chart using two half-disc clips.
 * Wrapper is rotated -90° so progress sweeps from 12 o'clock clockwise.
 */
export default function ProgressRing({
  pct,
  size = 100,
  stroke = 10,
  color,
  bg,
  trackColor,
  label,
  sublabel,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const bgColor = bg ?? colors.bgElevated;
  const trackColorFinal = trackColor ?? colors.chartTrack;

  const clamped = Math.min(100, Math.max(0, pct));
  const angle = (clamped / 100) * 360;
  const half = size / 2;

  const rightAngle = Math.min(angle, 180);
  const leftAngle = Math.max(0, angle - 180);

  return (
    // Outer wrapper: rotate -90° so arc starts at top (12 o'clock)
    <View style={{ width: size, height: size, transform: [{ rotate: '-90deg' }] }}>
      {/* Track disc */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: half,
          backgroundColor: trackColorFinal,
        }}
      />

      {/* Right half clip — fills 0 → 50% */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: half,
          height: size,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: -half,
            width: size,
            height: size,
            borderRadius: half,
            backgroundColor: color,
            transform: [{ rotate: `${rightAngle - 180}deg` }],
          }}
        />
      </View>

      {/* Left half clip — fills 50 → 100% */}
      {leftAngle > 0 && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: half,
            height: size,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: -half,
              width: size,
              height: size,
              borderRadius: half,
              backgroundColor: color,
              transform: [{ rotate: `${leftAngle - 180}deg` }],
            }}
          />
        </View>
      )}

      {/* Donut hole: bg-colored inner circle + counter-rotated label */}
      <View
        style={{
          position: 'absolute',
          top: stroke,
          left: stroke,
          width: size - stroke * 2,
          height: size - stroke * 2,
          borderRadius: (size - stroke * 2) / 2,
          backgroundColor: bgColor,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ rotate: '90deg' }],
        }}
      >
        {label !== undefined && (
          <Text style={[styles.label, { color, fontSize: size * 0.22 }]}>
            {label}
          </Text>
        )}
        {sublabel !== undefined && (
          <Text style={[styles.sublabel, { fontSize: size * 0.1 }]}>
            {sublabel}
          </Text>
        )}
      </View>
    </View>
  );
}

function createStyles(C: ColorPalette) {
  return StyleSheet.create({
    label: {
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    sublabel: {
      color: C.textMuted,
      fontWeight: '600',
      marginTop: 1,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
  });
}

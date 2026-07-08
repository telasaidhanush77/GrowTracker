import { DimensionValue, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { GoalStatus } from '../../types';

interface Segment {
  status: GoalStatus;
  pct: number;
  color: string;
}

interface GoalStatusBarProps {
  stats: {
    approved: number;
    submitted: number;
    inProgress: number;
    rejected: number;
    notStarted: number;
    total: number;
  };
  height?: number;
  onSegmentPress?: (status: GoalStatus) => void;
}

export default function GoalStatusBar({ stats, height = 6, onSegmentPress }: GoalStatusBarProps) {
  const { colors } = useTheme();
  const r = height / 2;

  if (!stats.total) {
    return (
      <View
        style={{
          height,
          backgroundColor: colors.chartTrack,
          borderRadius: r,
          marginVertical: 4,
        }}
      />
    );
  }

  const t = stats.total;
  const segments: Segment[] = ([
    { status: 'approved' as const, pct: (stats.approved / t) * 100, color: colors.approved },
    { status: 'submitted' as const, pct: (stats.submitted / t) * 100, color: colors.pending },
    { status: 'in_progress' as const, pct: (stats.inProgress / t) * 100, color: colors.inProgress },
    { status: 'rejected' as const, pct: (stats.rejected / t) * 100, color: colors.rejected },
    { status: 'not_started' as const, pct: (stats.notStarted / t) * 100, color: colors.notStarted },
  ] as Segment[]).filter(s => s.pct > 0);

  return (
    <View
      style={{
        height,
        borderRadius: r,
        flexDirection: 'row',
        overflow: 'hidden',
        backgroundColor: colors.chartTrack,
        marginVertical: 4,
      }}
    >
      {segments.map((s, i) =>
        onSegmentPress ? (
          <TouchableOpacity
            key={i}
            style={{ width: `${s.pct}%` as DimensionValue, height: '100%', backgroundColor: s.color }}
            onPress={() => onSegmentPress(s.status)}
            activeOpacity={0.7}
          />
        ) : (
          <View
            key={i}
            style={{ width: `${s.pct}%` as DimensionValue, height: '100%', backgroundColor: s.color }}
          />
        ),
      )}
    </View>
  );
}

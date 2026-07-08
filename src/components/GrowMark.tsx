import { View } from 'react-native';

interface Props {
  size: number;
  isDark: boolean;
}

export function GrowMark({ size, isDark }: Props) {
  const bg     = isDark ? '#ECECEC' : '#111111';
  const fg     = isDark ? '#0A0A0A' : '#FFFFFF';
  const bar    = Math.round(size * 0.13);
  const gap    = Math.round(size * 0.08);
  const padB   = Math.round(size * 0.17);
  const r      = Math.round(size * 0.26);
  const heights = [Math.round(size * 0.30), Math.round(size * 0.52), Math.round(size * 0.74)];

  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: bg, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: padB }}>
      <View style={{
        position: 'absolute',
        bottom: padB + heights[2] + Math.round(bar * 0.55),
        right: padB - bar * 0.1,
        width: Math.round(bar * 0.7),
        height: Math.round(bar * 0.7),
        borderRadius: bar,
        backgroundColor: fg,
        opacity: 0.55,
      }} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap }}>
        {heights.map((h, i) => (
          <View key={i} style={{ width: bar, height: h, backgroundColor: fg, borderRadius: bar }} />
        ))}
      </View>
    </View>
  );
}

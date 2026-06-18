import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Radius, Spacing } from '../theme';

export interface TabDef {
  key: string;
  label: string;
  icon: string;
}

interface Props {
  tabs: TabDef[];
  activeKey: string;
  onSelect: (key: string) => void;
}

export default function BottomTabBar({ tabs, activeKey, onSelect }: Props) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: isDark ? colors.bgElevated : colors.card,
          borderTopColor: colors.border,
        },
      ]}
    >
      {tabs.map(tab => {
        const active = tab.key === activeKey;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabBtn}
            onPress={() => onSelect(tab.key)}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.pill,
                active && {
                  backgroundColor: isDark
                    ? colors.primary + '28'
                    : colors.primary + '1A',
                },
              ]}
            >
              <Text
                style={[
                  styles.label,
                  {
                    color: active ? colors.primary : colors.textMuted,
                    fontWeight: active ? '700' : '500',
                  },
                ]}
              >
                {tab.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    borderTopWidth: 1,
    paddingHorizontal: 6,
    paddingBottom: 4,
    paddingTop: 4,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 5,
    gap: 2,
    minWidth: 64,
  },
  label: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
});

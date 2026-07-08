import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface Props {
  message: string;
  onOpenSettings: () => void;
}

export function PermissionDeniedBanner({ message, onOpenSettings }: Props) {
  const { colors } = useTheme();
  return (
    <View
      testID="permission-denied-banner"
      style={[styles.banner, { backgroundColor: colors.rejectedBg, borderColor: colors.rejected + '40' }]}
    >
      <Text style={[styles.message, { color: colors.rejected }]}>{message}</Text>
      <TouchableOpacity
        testID="open-settings-btn"
        onPress={onOpenSettings}
        style={[styles.btn, { borderColor: colors.rejected }]}
        activeOpacity={0.75}
      >
        <Text style={[styles.btnText, { color: colors.rejected }]}>Open Settings</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    marginVertical: 8,
  },
  message: { fontSize: 13, lineHeight: 18 },
  btn: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  btnText: { fontSize: 13, fontWeight: '700' },
});

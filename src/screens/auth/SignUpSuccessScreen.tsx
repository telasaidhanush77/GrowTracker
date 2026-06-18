import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Radius, Shadow, Spacing } from '../../theme';
import type { ColorPalette } from '../../theme';

interface Props {
  uniqueId: string;
  username: string;
  onContinue: () => void;
}

export default function SignUpSuccessScreen({ uniqueId, username, onContinue }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.icon}>🎉</Text>
        <Text style={styles.heading}>Account Created!</Text>
        <Text style={styles.sub}>Your unique credentials have been generated. Keep them safe.</Text>

        <View style={styles.credCard}>
          <View style={styles.credRow}>
            <Text style={styles.credLabel}>Unique ID</Text>
            <Text style={styles.credValue}>{uniqueId}</Text>
          </View>
          <View style={styles.credDivider} />
          <View style={styles.credRow}>
            <Text style={styles.credLabel}>Username</Text>
            <Text style={styles.credValue}>{username}</Text>
          </View>
        </View>

        <Text style={styles.hint}>
          You can sign in using your unique ID, username, or email address.
        </Text>

        <TouchableOpacity style={styles.btn} onPress={onContinue} activeOpacity={0.85}>
          <Text style={styles.btnText}>Continue to Sign In →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(C: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
    card: {
      width: '100%', backgroundColor: C.card, borderRadius: Radius.xl,
      padding: Spacing.xl, alignItems: 'center', ...Shadow.md,
    },
    icon: { fontSize: 52, marginBottom: 16 },
    heading: { fontSize: 24, fontWeight: '900', color: C.textPrimary, marginBottom: 8 },
    sub: { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.xl },

    credCard: {
      width: '100%', backgroundColor: C.approvedBg, borderRadius: Radius.lg,
      padding: Spacing.lg, borderWidth: 1, borderColor: C.approved + '40', marginBottom: Spacing.lg,
    },
    credRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    credDivider: { height: 1, backgroundColor: C.approved + '30', marginVertical: 4 },
    credLabel: { fontSize: 12, fontWeight: '700', color: C.textMuted },
    credValue: { fontSize: 16, fontWeight: '900', color: C.textPrimary },

    hint: { fontSize: 12, color: C.textMuted, textAlign: 'center', lineHeight: 18, marginBottom: Spacing.xl },

    btn: {
      width: '100%', backgroundColor: C.primary, borderRadius: Radius.lg,
      paddingVertical: 16, alignItems: 'center', ...Shadow.md,
    },
    btnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  });
}

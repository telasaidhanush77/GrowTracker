import { useMemo } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GrowMark } from '../../components/GrowMark';
import { RoleIcon } from '../../components/RoleIcon';
import { useTheme } from '../../context/ThemeContext';
import { Radius, Shadow, Spacing } from '../../theme';
import type { ColorPalette } from '../../theme';
import { Role } from '../../types';

interface Props {
  onSelectRole: (role: Role) => void;
}

const ROLES: {
  role: Role;
  title: string;
  subtitle: string;
  strip: (C: ColorPalette) => string;
}[] = [
  { role: 'admin',    title: 'Admin',    subtitle: 'System administrator',  strip: C => C.adminPrimary    },
  { role: 'manager',  title: 'Manager',  subtitle: 'Reporting manager',     strip: C => C.managerPrimary  },
  { role: 'employee', title: 'Employee', subtitle: 'Team member',           strip: C => C.employeePrimary },
];

export default function SplashScreen({ onSelectRole }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      {/* ── Logo centered in upper portion ── */}
      <View style={styles.heroSection}>
        <GrowMark size={84} isDark={isDark} />
        <Text style={styles.appName}>GrowTracker</Text>
        <Text style={styles.tagline}>Track growth · Drive results</Text>
      </View>

      {/* ── Role cards anchored to bottom ── */}
      <View style={styles.cardsSection}>
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerLabel}>SIGN IN AS</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.cardsWrap}>
          {ROLES.map(r => (
            <TouchableOpacity
              key={r.role}
              style={styles.roleCard}
              onPress={() => onSelectRole(r.role)}
              activeOpacity={0.78}
            >
              <View style={[styles.strip, { backgroundColor: r.strip(colors) }]} />
              <View style={[styles.iconWrap, { backgroundColor: r.strip(colors) + '18' }]}>
                <RoleIcon role={r.role} size={24} color={r.strip(colors)} />
              </View>
              <View style={styles.info}>
                <Text style={styles.roleTitle}>{r.title}</Text>
                <Text style={styles.roleSub}>{r.subtitle}</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.footer}>GrowTracker · Performance Management</Text>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(C: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scrollContent: { flexGrow: 1 },

    // Hero — takes all remaining space, logo centered within it
    heroSection: {
      flex: 1,
      minHeight: 160,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingHorizontal: Spacing.xl,
    },
    appName: {
      fontSize: 36, fontWeight: '900', color: C.textPrimary,
      letterSpacing: -1,
    },
    tagline: { fontSize: 13, color: C.textMuted, letterSpacing: 0.3 },

    // Cards section — anchored at bottom
    cardsSection: {
      paddingHorizontal: Spacing.xl,
      paddingBottom: Spacing.xxxl,
      gap: Spacing.lg,
    },

    // Divider
    dividerRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
    dividerLabel: {
      fontSize: 10, fontWeight: '800', color: C.textMuted,
      letterSpacing: 1.5,
    },

    // Cards
    cardsWrap: { gap: 10 },
    roleCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.card,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: C.border,
      overflow: 'hidden',
      ...Shadow.sm,
    },
    strip: { width: 4, alignSelf: 'stretch' },
    iconWrap: {
      width: 44, height: 44, borderRadius: Radius.md,
      alignItems: 'center', justifyContent: 'center',
      margin: 14, marginRight: 10,
    },
    icon: { fontSize: 20 },
    info: { flex: 1, paddingVertical: 12, paddingRight: 4 },
    roleTitle: {
      fontSize: 16, fontWeight: '800', color: C.textPrimary,
    },
    roleSub: {
      fontSize: 11, color: C.textMuted, marginTop: 1,
    },
    arrow: {
      fontSize: 22, color: C.textMuted, paddingRight: 16, fontWeight: '300',
    },

    footer: {
      fontSize: 11, color: C.textMuted, textAlign: 'center', letterSpacing: 0.2,
    },
  });
}

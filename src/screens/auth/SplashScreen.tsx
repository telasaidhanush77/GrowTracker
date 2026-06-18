import { useMemo } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Radius, Shadow, Spacing } from '../../theme';
import type { ColorPalette } from '../../theme';
import { Role } from '../../types';

// ---------- unique brand mark ----------
// Three ascending bars symbolising growth — no text, no "GT"
function GrowMark({ size, isDark }: { size: number; isDark: boolean }) {
  const bg    = isDark ? '#ECECEC' : '#111111';
  const fg    = isDark ? '#0A0A0A' : '#FFFFFF';
  const bar   = Math.round(size * 0.13);
  const gap   = Math.round(size * 0.08);
  const padB  = Math.round(size * 0.17);
  const r     = Math.round(size * 0.26);
  const heights = [Math.round(size * 0.30), Math.round(size * 0.52), Math.round(size * 0.74)];

  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: bg, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: padB }}>
      {/* peak dot above tallest bar */}
      <View style={{
        position: 'absolute',
        bottom: padB + heights[2] + Math.round(bar * 0.55),
        right: padB - bar * 0.1,
        width: Math.round(bar * 0.7), height: Math.round(bar * 0.7),
        borderRadius: bar, backgroundColor: fg, opacity: 0.55,
      }} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap }}>
        {heights.map((h, i) => (
          <View key={i} style={{ width: bar, height: h, backgroundColor: fg, borderRadius: bar }} />
        ))}
      </View>
    </View>
  );
}

interface Props {
  onSelectRole: (role: Role) => void;
}

const ROLES: {
  role: Role;
  icon: string;
  title: string;
  desc: string;
  strip: (C: ColorPalette) => string;
}[] = [
  {
    role: 'admin',
    icon: '🛡',
    title: 'Admin',
    desc: 'Manage the organisation, onboard users & oversee the system',
    strip: C => C.adminPrimary,
  },
  {
    role: 'manager',
    icon: '👤',
    title: 'Manager',
    desc: 'Set goals, review evidence & coach your team to success',
    strip: C => C.managerPrimary,
  },
  {
    role: 'employee',
    icon: '📈',
    title: 'Employee',
    desc: 'View goals, submit progress & track your growth journey',
    strip: C => C.employeePrimary,
  },
];

export default function SplashScreen({ onSelectRole }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.inner}>

        {/* ── Logo section ── */}
        <View style={styles.heroSection}>
          <GrowMark size={76} isDark={isDark} />
          <Text style={styles.appName}>GrowTracker</Text>
          <Text style={styles.tagline}>Track growth · Drive results</Text>
        </View>

        {/* ── Divider ── */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerLabel}>SIGN IN AS</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* ── Role cards ── */}
        <View style={styles.cardsWrap}>
          {ROLES.map(r => (
            <TouchableOpacity
              key={r.role}
              style={styles.roleCard}
              onPress={() => onSelectRole(r.role)}
              activeOpacity={0.78}
            >
              {/* left accent strip */}
              <View style={[styles.strip, { backgroundColor: r.strip(colors) }]} />

              <View style={[styles.iconWrap, { backgroundColor: r.strip(colors) + '18' }]}>
                <Text style={styles.icon}>{r.icon}</Text>
              </View>

              <View style={styles.info}>
                <Text style={styles.roleTitle}>{r.title}</Text>
                <Text style={styles.roleDesc}>{r.desc}</Text>
              </View>

              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.footer}>GrowTracker · Performance Management</Text>
      </View>
    </SafeAreaView>
  );
}

function createStyles(C: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    inner: {
      flex: 1,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.xxxl,
      paddingBottom: Spacing.lg,
      justifyContent: 'space-between',
    },

    // Hero
    heroSection: { alignItems: 'center', gap: 10 },
    appName: {
      fontSize: 32, fontWeight: '900', color: C.textPrimary,
      letterSpacing: -1, marginTop: 4,
    },
    tagline: { fontSize: 13, color: C.textMuted, letterSpacing: 0.3 },

    // Divider
    dividerRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 4,
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
    info: { flex: 1, paddingVertical: 14, paddingRight: 4 },
    roleTitle: {
      fontSize: 16, fontWeight: '800', color: C.textPrimary, marginBottom: 2,
    },
    roleDesc: {
      fontSize: 12, color: C.textSecondary, lineHeight: 16,
    },
    arrow: {
      fontSize: 22, color: C.textMuted, paddingRight: 16, fontWeight: '300',
    },

    footer: {
      fontSize: 11, color: C.textMuted, textAlign: 'center', letterSpacing: 0.2,
    },
  });
}

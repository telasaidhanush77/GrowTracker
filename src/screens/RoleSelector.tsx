import { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { Radius, Shadow, Spacing, Typography } from '../theme';
import type { ColorPalette } from '../theme';
import { Role } from '../types';

interface Props {
  onRoleSelect: (role: Role, userId: string) => void;
  initialRole?: Role;
}

const ADMIN_ACCOUNT = {
  id: 'admin-1',
  name: 'System Admin',
  role: 'admin' as Role,
  designation: 'System Administrator',
  department: 'Corporate · All Departments',
  avatarInitials: 'SA',
};

const ROLE_META: Record<Role, { label: string; icon: string }> = {
  admin: {
    label: 'Admin',
    icon: '🏛',
  },
  manager: {
    label: 'Manager',
    icon: '👥',
  },
  employee: {
    label: 'Employee',
    icon: '💼',
  },
};

export default function RoleSelector({ onRoleSelect, initialRole }: Props) {
  const { employees } = useApp();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [step, setStep] = useState<'role' | 'user'>(initialRole ? 'user' : 'role');
  const [pickedRole, setPickedRole] = useState<Role | null>(initialRole ?? null);

  const managers = employees.filter(e => e.role === 'manager');
  const empList = employees.filter(e => e.role === 'employee');

  function roleColor(role: Role) {
    return role === 'admin'
      ? colors.adminPrimary
      : role === 'manager'
      ? colors.managerPrimary
      : colors.employeePrimary;
  }

  function roleLightColor(role: Role) {
    return role === 'admin'
      ? colors.adminLight
      : role === 'manager'
      ? colors.managerLight
      : colors.employeeLight;
  }

  function usersForRole(role: Role) {
    if (role === 'admin') return [ADMIN_ACCOUNT];
    if (role === 'manager') return managers;
    return empList;
  }

  function handleRolePick(role: Role) {
    setPickedRole(role);
    setStep('user');
  }

  function handleBack() {
    setStep('role');
    setPickedRole(null);
  }

  /* ─── Step 1: Role picker ─── */
  if (step === 'role') {
    return (
      <View style={styles.root}>
        {/* Top hero — 40% */}
        <View style={styles.heroSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoLetter}>G</Text>
          </View>
          <Text style={styles.appName}>GrowTracker</Text>
          <Text style={styles.appCaption}>Analyze and grow!</Text>
        </View>

        {/* Role cards — 50% */}
        <View style={styles.cardsSection}>
          {(['admin', 'manager', 'employee'] as Role[]).map(role => {
            const meta = ROLE_META[role];
            return (
              <TouchableOpacity
                key={role}
                style={styles.roleCard}
                onPress={() => handleRolePick(role)}
                activeOpacity={0.75}
              >
                <View style={styles.roleIconWrap}>
                  <Text style={styles.roleIcon}>{meta.icon}</Text>
                </View>
                <View style={styles.roleBody}>
                  <Text style={styles.roleLabel}>{meta.label}</Text>
                </View>
                <Text style={styles.roleArrow}>›</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bottom bar — 10% */}
        <View style={styles.versionBar}>
          <Text style={styles.versionText}>GrowTracker  ·  v1.0.0</Text>
        </View>
      </View>
    );
  }

  /* ─── Step 2: User picker ─── */
  const users = usersForRole(pickedRole!);
  const primary = roleColor(pickedRole!);
  const light = roleLightColor(pickedRole!);
  const meta = ROLE_META[pickedRole!];

  return (
    <View style={styles.root}>
      {/* Compact brand bar for step 2 */}
      <View style={styles.step2BrandBar}>
        <View style={styles.logoCircleSmall}>
          <Text style={styles.logoLetterSmall}>G</Text>
        </View>
        <Text style={styles.step2AppName}>GrowTracker</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Back + heading */}
        <TouchableOpacity style={styles.backRow} onPress={handleBack} activeOpacity={0.7}>
          <Text style={[styles.backArrow, { color: primary }]}>‹</Text>
          <Text style={[styles.backLabel, { color: primary }]}>Back</Text>
        </TouchableOpacity>

        <View style={styles.welcomeBlock}>
          <View style={[styles.stepRoleChip, { backgroundColor: light }]}>
            <Text style={{ fontSize: 14 }}>{meta.icon}</Text>
            <Text style={[styles.stepRoleChipText, { color: primary }]}>{meta.label}</Text>
          </View>
          <Text style={styles.welcomeTitle}>Select Account</Text>
          <Text style={styles.welcomeSub}>
            {users.length} account{users.length !== 1 ? 's' : ''} available
          </Text>
        </View>

        {users.map(u => (
          <TouchableOpacity
            key={u.id}
            style={[styles.userCard, { borderLeftColor: primary }]}
            onPress={() => onRoleSelect(pickedRole!, u.id)}
            activeOpacity={0.78}
          >
            <View style={[styles.avatar, { backgroundColor: light }]}>
              <Text style={[styles.avatarText, { color: primary }]}>{u.avatarInitials}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{u.name}</Text>
              <Text style={styles.userDesig}>{u.designation}</Text>
              <Text style={styles.userDept}>{u.department}</Text>
            </View>
            <View style={[styles.roleArrowCircle, { backgroundColor: primary + '18' }]}>
              <Text style={[styles.roleArrowCircleText, { color: primary }]}>›</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function createStyles(C: ColorPalette) {
  const statusBarPad = Platform.OS === 'android' ? 48 : 64;

  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: C.bg,
    },

    /* ─── Step 1 layout sections ─── */
    heroSection: {
      flex: 4,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: statusBarPad,
      paddingHorizontal: Spacing.xl,
    },
    cardsSection: {
      flex: 5,
      paddingHorizontal: Spacing.xl,
      justifyContent: 'center',
      gap: Spacing.sm,
    },
    versionBar: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: Spacing.lg,
    },

    /* ─── Hero elements ─── */
    logoCircle: {
      width: 88,
      height: 88,
      borderRadius: Radius.full,
      backgroundColor: C.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.lg,
      ...Shadow.md,
    },
    logoLetter: {
      fontSize: 40,
      fontWeight: '800',
      color: C.bg,
    },
    appName: {
      fontSize: 32,
      fontWeight: '800',
      color: C.textPrimary,
      letterSpacing: -0.5,
      marginBottom: Spacing.xs,
    },
    appCaption: {
      fontSize: 14,
      color: C.textSecondary,
      fontStyle: 'italic',
    },

    /* ─── Role cards (neutral, no left stripe) ─── */
    roleCard: {
      backgroundColor: C.card,
      borderRadius: Radius.xl,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      borderWidth: 1,
      borderColor: C.border,
      ...Shadow.sm,
    },
    roleIconWrap: {
      width: 52,
      height: 52,
      borderRadius: Radius.md,
      backgroundColor: C.bgElevated,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      borderWidth: 1,
      borderColor: C.border,
    },
    roleIcon: { fontSize: 24 },
    roleBody: { flex: 1 },
    roleLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: C.textPrimary,
    },
    roleArrow: {
      fontSize: 22,
      fontWeight: '700',
      color: C.textMuted,
      lineHeight: 28,
    },

    /* ─── Version bar ─── */
    versionText: {
      fontSize: 12,
      color: C.textMuted,
    },

    /* ─── Step 2 brand bar ─── */
    step2BrandBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingTop: statusBarPad,
      paddingBottom: Spacing.lg,
      paddingHorizontal: Spacing.xl,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    logoCircleSmall: {
      width: 36,
      height: 36,
      borderRadius: Radius.full,
      backgroundColor: C.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...Shadow.sm,
    },
    logoLetterSmall: {
      fontSize: 16,
      fontWeight: '800',
      color: C.bg,
    },
    step2AppName: {
      ...Typography.h4,
      color: C.textPrimary,
    },

    /* ─── Step 2 scroll content ─── */
    scrollContent: { paddingHorizontal: Spacing.xl, paddingBottom: 48 },

    welcomeBlock: { paddingTop: Spacing.xxl, paddingBottom: Spacing.lg },
    welcomeTitle: { ...Typography.h2, color: C.textPrimary, marginBottom: 6 },
    welcomeSub: { ...Typography.body, color: C.textSecondary, lineHeight: 22 },

    backRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: Spacing.lg,
      marginBottom: 2,
    },
    backArrow: { fontSize: 22, fontWeight: '700', lineHeight: 28 },
    backLabel: { fontSize: 14, fontWeight: '600' },

    stepRoleChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      borderRadius: Radius.full,
      paddingHorizontal: 12,
      paddingVertical: 5,
      marginBottom: 10,
    },
    stepRoleChipText: { fontSize: 12, fontWeight: '700' },

    /* ─── Step 2 user cards (keep left stripe for role identity) ─── */
    userCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      borderLeftWidth: 3,
      marginBottom: Spacing.sm,
      ...Shadow.sm,
    },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    avatarText: { fontSize: 16, fontWeight: '800' },
    userInfo: { flex: 1 },
    userName: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 2 },
    userDesig: { fontSize: 12, color: C.textSecondary, marginBottom: 1 },
    userDept: { fontSize: 11, color: C.textMuted },

    roleArrowCircle: {
      width: 30,
      height: 30,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    roleArrowCircleText: { fontSize: 20, fontWeight: '700', lineHeight: 26 },
  });
}

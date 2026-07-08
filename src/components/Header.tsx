import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { ColorPalette } from '../theme';
import { Radius, Shadow } from '../theme';

interface Props {
  title: string;
  subtitle?: string;
  color?: string;
  accentColor?: string;
  onBack?: () => void;
  onLogout?: () => void;
  onSwitchAccount?: () => void;
  onNotif?: () => void;
  onProfile?: () => void;
  onPrivacySecurity?: () => void;
  notifCount?: number;
  userInitials?: string;
}

export default function Header({
  title,
  subtitle,
  color,
  accentColor,
  onBack,
  onLogout,
  onSwitchAccount,
  onNotif,
  onProfile,
  onPrivacySecurity,
  notifCount = 0,
  userInitials,
}: Props) {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const bgColor = color ?? colors.card;
  const accent = accentColor ?? colors.primary;

  const [menuOpen, setMenuOpen] = useState(false);
  const hasMenu = !!(onProfile || onLogout);

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleHelp() {
    closeMenu();
    Alert.alert(
      'Help & Support',
      "For assistance with GrowTracker, please contact your organisation's administrator.\n\nEmail: support@growtracker.app\n\nWe aim to respond within 1–2 business days.",
      [{ text: 'OK' }],
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: bgColor }]}>
      <View style={[styles.accentLine, { backgroundColor: accent }]} />

      <View style={styles.row}>
        {/* Left — back button */}
        <View style={styles.left}>
          {onBack ? (
            <TouchableOpacity
              onPress={onBack}
              hitSlop={10}
              style={styles.iconBtn}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Text style={styles.backChevron}>‹</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Center — title */}
        <View style={styles.center}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>

        {/* Right — bell + 3-dot menu (toggle moved into dropdown) */}
        <View style={styles.right}>
          {onNotif ? (
            <TouchableOpacity
              onPress={onNotif}
              hitSlop={8}
              style={styles.iconBtn}
              accessibilityLabel={notifCount > 0 ? `Notifications — ${notifCount} unread` : 'Notifications'}
              accessibilityRole="button"
            >
              <View style={styles.bellWrap}>
                <Text style={styles.bellIcon}>🔔</Text>
                {notifCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{notifCount > 9 ? '9+' : notifCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ) : null}

          {hasMenu ? (
            <TouchableOpacity
              onPress={() => setMenuOpen(true)}
              hitSlop={8}
              style={styles.iconBtn}
              accessibilityLabel="Open menu"
              accessibilityRole="button"
            >
              <View style={styles.dotsWrap}>
                <Text style={[styles.dotsIcon, { color: accent }]}>···</Text>
              </View>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Dropdown menu */}
      <Modal
        transparent
        visible={menuOpen}
        animationType="fade"
        onRequestClose={closeMenu}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={closeMenu}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.menuPanel}>

                {/* Menu header — blue account icon + name */}
                {userInitials ? (
                  <View style={styles.menuHeaderRow}>
                    <View style={[styles.menuAvatar, { borderColor: accent }]}>
                      <MaterialCommunityIcons name="account-circle" size={22} color={accent} />
                    </View>
                    <View style={styles.menuHeaderInfo}>
                      <Text style={styles.menuHeaderName} numberOfLines={1}>{title}</Text>
                      {subtitle ? (
                        <Text style={styles.menuHeaderSub} numberOfLines={1}>{subtitle}</Text>
                      ) : null}
                    </View>
                  </View>
                ) : null}

                <View style={styles.menuDivider} />

                {/* My Profile */}
                {onProfile ? (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => { closeMenu(); onProfile(); }}
                    activeOpacity={0.7}
                    accessibilityLabel="My profile"
                    accessibilityRole="button"
                  >
                    <View style={styles.menuIconWrap}>
                      <MaterialCommunityIcons name="account-circle" size={18} color="#3B82F6" />
                    </View>
                    <Text style={styles.menuItemText}>My Profile</Text>
                    <Text style={styles.menuItemArrow}>›</Text>
                  </TouchableOpacity>
                ) : null}

                {/* Notifications */}
                {onNotif ? (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => { closeMenu(); onNotif(); }}
                    activeOpacity={0.7}
                    accessibilityLabel="Notifications"
                    accessibilityRole="button"
                  >
                    <Text style={styles.menuItemIcon}>🔔</Text>
                    <Text style={styles.menuItemText}>Notifications</Text>
                    {notifCount > 0 ? (
                      <View style={[styles.menuBadge, { backgroundColor: '#C44A42' }]}>
                        <Text style={styles.menuBadgeText}>{notifCount > 9 ? '9+' : notifCount}</Text>
                      </View>
                    ) : (
                      <Text style={styles.menuItemArrow}>›</Text>
                    )}
                  </TouchableOpacity>
                ) : null}

                {/* Privacy & Security */}
                {onPrivacySecurity ? (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => { closeMenu(); onPrivacySecurity(); }}
                    activeOpacity={0.7}
                    accessibilityLabel="Privacy and security"
                    accessibilityRole="button"
                  >
                    <Text style={styles.menuItemIcon}>🔒</Text>
                    <Text style={styles.menuItemText}>Privacy & Security</Text>
                    <Text style={styles.menuItemArrow}>›</Text>
                  </TouchableOpacity>
                ) : null}

                {/* Help & Support */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleHelp}
                  activeOpacity={0.7}
                  accessibilityLabel="Help and support"
                  accessibilityRole="button"
                >
                  <Text style={styles.menuItemIcon}>💬</Text>
                  <Text style={styles.menuItemText}>Help & Support</Text>
                  <Text style={styles.menuItemArrow}>›</Text>
                </TouchableOpacity>

                {/* Appearance — Light / Dark segmented buttons */}
                <View style={styles.menuDivider} />
                <View style={styles.appearanceSection}>
                  <Text style={styles.appearanceLabel}>Appearance</Text>
                  <View style={styles.appearanceRow}>
                    <TouchableOpacity
                      style={[styles.themeBtn, !isDark && styles.themeBtnActive]}
                      onPress={isDark ? toggleTheme : undefined}
                      activeOpacity={isDark ? 0.7 : 1}
                    >
                      <Text style={styles.themeBtnIcon}>☀️</Text>
                      <Text style={[styles.themeBtnText, !isDark && styles.themeBtnTextActive]}>Light</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.themeBtn, isDark && styles.themeBtnActive]}
                      onPress={!isDark ? toggleTheme : undefined}
                      activeOpacity={!isDark ? 0.7 : 1}
                    >
                      <Text style={styles.themeBtnIcon}>🌙</Text>
                      <Text style={[styles.themeBtnText, isDark && styles.themeBtnTextActive]}>Dark</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Switch Account / Sign Out */}
                {(onSwitchAccount || onLogout) ? (
                  <>
                    <View style={styles.menuDivider} />
                    {onSwitchAccount ? (
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => { closeMenu(); onSwitchAccount(); }}
                        activeOpacity={0.7}
                        accessibilityLabel="Switch account"
                        accessibilityRole="button"
                      >
                        <Text style={styles.menuItemIcon}>🔄</Text>
                        <Text style={styles.menuItemText}>Switch Account</Text>
                        <Text style={styles.menuItemArrow}>›</Text>
                      </TouchableOpacity>
                    ) : null}
                    {onLogout ? (
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => { closeMenu(); onLogout(); }}
                        activeOpacity={0.7}
                        accessibilityLabel="Sign out"
                        accessibilityRole="button"
                      >
                        <Text style={styles.menuItemIcon}>↩</Text>
                        <Text style={[styles.menuItemText, styles.menuItemDestructive]}>Sign Out</Text>
                      </TouchableOpacity>
                    ) : null}
                  </>
                ) : null}

              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

function createStyles(C: ColorPalette) {
  return StyleSheet.create({
    root: {
      paddingTop: Platform.OS === 'android' ? 46 : 60,
      paddingBottom: 14,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    accentLine: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 2,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 40,
    },
    left: { width: 48 },
    center: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
    right: {
      width: 88,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 4,
    },
    iconBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 44,
      minHeight: 44,
    },
    backChevron: { color: C.textPrimary, fontSize: 28, lineHeight: 32, fontWeight: '300' },
    title: { color: C.textPrimary, fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
    subtitle: { color: C.textSecondary, fontSize: 11, marginTop: 2, letterSpacing: 0.1 },

    bellWrap: {
      position: 'relative',
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bellIcon: { fontSize: 18 },
    badge: {
      position: 'absolute',
      top: -2,
      right: -4,
      backgroundColor: '#C44A42',
      borderRadius: 8,
      minWidth: 16,
      height: 16,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
      borderWidth: 1.5,
      borderColor: C.card,
    },
    badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

    dotsWrap: {
      width: 32,
      height: 32,
      borderRadius: Radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.bgElevated,
      borderWidth: 1,
      borderColor: C.border,
    },
    dotsIcon: { fontSize: 20, lineHeight: 24, fontWeight: '700', letterSpacing: -1 },

    // Modal
    overlay: {
      flex: 1,
      backgroundColor: C.overlay,
    },
    menuPanel: {
      position: 'absolute',
      top: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 70 : 120,
      right: 12,
      width: 248,
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: C.borderLight,
      ...Shadow.lg,
      overflow: 'hidden',
    },
    menuHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 14,
    },
    menuAvatar: {
      width: 36,
      height: 36,
      borderRadius: Radius.full,
      borderWidth: 1.5,
      backgroundColor: C.bgElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuHeaderInfo: { flex: 1 },
    menuHeaderName: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
    menuHeaderSub: { fontSize: 10, color: C.textMuted, marginTop: 1 },
    menuDivider: { height: 1, backgroundColor: C.divider },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 13,
      minHeight: 44,
    },
    menuIconWrap: { width: 22, alignItems: 'center' },
    menuItemIcon: { fontSize: 16, width: 22, textAlign: 'center' },
    menuItemText: { flex: 1, fontSize: 14, fontWeight: '500', color: C.textPrimary },
    menuItemArrow: { fontSize: 18, color: C.textMuted, fontWeight: '300' },
    menuItemDestructive: { color: '#C44A42' },
    menuBadge: {
      borderRadius: Radius.full,
      minWidth: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 5,
    },
    menuBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

    // Appearance section
    appearanceSection: {
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    appearanceLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: C.textMuted,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    appearanceRow: {
      flexDirection: 'row',
      gap: 8,
    },
    themeBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: Radius.sm,
      borderWidth: 1.5,
      borderColor: C.border,
      backgroundColor: C.bgElevated,
      gap: 5,
    },
    themeBtnActive: {
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59,130,246,0.10)',
    },
    themeBtnIcon: { fontSize: 13 },
    themeBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: C.textMuted,
    },
    themeBtnTextActive: {
      color: '#3B82F6',
      fontWeight: '700',
    },
  });
}

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
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
  notifCount = 0,
  userInitials,
}: Props) {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const toggleAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(toggleAnim, {
      toValue: isDark ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [isDark, toggleAnim]);

  const thumbTranslate = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 18],
  });

  const bgColor = color ?? colors.card;
  const accent = accentColor ?? colors.primary;

  const [menuOpen, setMenuOpen] = useState(false);

  const hasMenu = !!(onProfile || onLogout);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <View style={[styles.root, { backgroundColor: bgColor }]}>
      <View style={[styles.accentLine, { backgroundColor: accent }]} />

      <View style={styles.row}>
        {/* Left — back button */}
        <View style={styles.left}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} hitSlop={10} style={styles.iconBtn}>
              <Text style={styles.backChevron}>‹</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Center — title */}
        <View style={styles.center}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>

        {/* Right — toggle + bell + 3-dot menu */}
        <View style={styles.right}>
          <TouchableOpacity onPress={toggleTheme} activeOpacity={0.8} style={styles.toggleWrap}>
            <View style={[styles.toggleTrack, {
              backgroundColor: isDark ? '#383838' : '#1A1A1A',
              borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0)',
            }]}>
              <Animated.View style={[styles.toggleThumb, {
                backgroundColor: '#FFFFFF',
                transform: [{ translateX: thumbTranslate }],
              }]}>
                <Text style={[styles.toggleIcon, !isDark && { color: '#F97316' }]}>
                  {isDark ? '🌙' : '☀'}
                </Text>
              </Animated.View>
            </View>
          </TouchableOpacity>

          {onNotif ? (
            <TouchableOpacity onPress={onNotif} hitSlop={8} style={styles.iconBtn}>
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
                {/* Menu header with initials */}
                {userInitials ? (
                  <View style={styles.menuHeaderRow}>
                    <View style={[styles.menuAvatar, { borderColor: colors.border }]}>
                      <Text style={[styles.menuAvatarText, { color: colors.textPrimary }]}>
                        {userInitials}
                      </Text>
                    </View>
                    <View style={styles.menuHeaderInfo}>
                      <Text style={styles.menuHeaderName}>{title}</Text>
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
                  >
                    <Text style={styles.menuItemIcon}>👤</Text>
                    <Text style={styles.menuItemText}>My Profile</Text>
                    <Text style={styles.menuItemArrow}>›</Text>
                  </TouchableOpacity>
                ) : null}

                {/* Switch Account / Sign Out */}
                {(onSwitchAccount || onLogout) ? (
                  <>
                    <View style={styles.menuDivider} />
                    {onSwitchAccount ? (
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => { closeMenu(); onSwitchAccount(); }}
                        activeOpacity={0.7}
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
      width: 126,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 4,
    },
    iconBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 36,
      minHeight: 36,
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

    toggleWrap: { justifyContent: 'center', alignItems: 'center', marginRight: 4 },
    toggleTrack: { width: 42, height: 24, borderRadius: 12, justifyContent: 'center', borderWidth: 1, borderColor: C.border },
    toggleThumb: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', ...Shadow.sm },
    toggleIcon: { fontSize: 13 },

    // Modal
    overlay: {
      flex: 1,
      backgroundColor: C.overlay,
    },
    menuPanel: {
      position: 'absolute',
      top: Platform.OS === 'android' ? 100 : 120,
      right: 12,
      width: 230,
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
    menuAvatarText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
    menuHeaderInfo: { flex: 1 },
    menuHeaderName: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
    menuHeaderSub: { fontSize: 10, color: C.textMuted, marginTop: 1 },
    menuDivider: { height: 1, backgroundColor: C.divider, marginHorizontal: 0 },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
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
  });
}

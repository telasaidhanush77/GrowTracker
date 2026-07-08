import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTheme } from './ThemeContext';
import type { ColorPalette } from '../theme';
import { Radius, Shadow } from '../theme';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastState {
  message: string;
  type: ToastType;
  title?: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function getTypeConfig(C: ColorPalette): Record<ToastType, { color: string; bg: string; icon: string }> {
  return {
    success: { color: C.approved,    bg: C.approvedBg,   icon: '✓' },
    error:   { color: C.rejected,    bg: C.rejectedBg,   icon: '✕' },
    info:    { color: C.inProgress,  bg: C.inProgressBg, icon: 'i' },
    warning: { color: C.pending,     bg: C.pendingBg,    icon: '!' },
  };
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const [toast, setToast] = useState<ToastState | null>(null);
  const translateY = useRef(new Animated.Value(-110)).current;
  const scaleAnim  = useRef(new Animated.Value(0.88)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const timer      = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success', title?: string) => {
    if (timer.current) clearTimeout(timer.current);

    translateY.stopAnimation();
    scaleAnim.stopAnimation();
    opacity.stopAnimation();
    translateY.setValue(-110);
    scaleAnim.setValue(0.88);
    opacity.setValue(0);

    setToast({ message, type, title });

    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 90, friction: 11 }),
      Animated.spring(scaleAnim,  { toValue: 1, useNativeDriver: true, tension: 90, friction: 11 }),
      Animated.timing(opacity,    { toValue: 1, duration: 140, useNativeDriver: true }),
    ]).start();

    timer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -110, duration: 260, useNativeDriver: true }),
        Animated.timing(opacity,    { toValue: 0,    duration: 240, useNativeDriver: true }),
      ]).start(() => setToast(null));
    }, 3600);
  }, [translateY, scaleAnim, opacity]);

  const typeConfig = getTypeConfig(colors);
  const cfg = toast ? typeConfig[toast.type] : typeConfig.success;

  return (
    <ToastContext.Provider value={{ showToast }}>
      <View style={styles.root}>
        {children}
        {toast && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.toast,
              {
                backgroundColor: cfg.bg,
                borderColor: cfg.color + '55',
                transform: [{ translateY }, { scale: scaleAnim }],
                opacity,
              },
            ]}
          >
            <View style={[styles.accentBar, { backgroundColor: cfg.color }]} />
            <View style={[styles.iconWrap, { backgroundColor: cfg.color + '1A' }]}>
              <Text style={[styles.iconText, { color: cfg.color }]}>{cfg.icon}</Text>
            </View>
            <View style={styles.body}>
              {toast.title ? (
                <Text style={[styles.title, { color: cfg.color }]} numberOfLines={1}>
                  {toast.title}
                </Text>
              ) : null}
              <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={2}>
                {toast.message}
              </Text>
            </View>
            <View style={[styles.glow, { backgroundColor: cfg.color + '08' }]} />
          </Animated.View>
        )}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toast: {
    position: 'absolute',
    top: 58,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 9999,
    ...Shadow.lg,
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    marginVertical: 12,
  },
  iconText: {
    fontSize: 17,
    fontWeight: '800',
  },
  body: {
    flex: 1,
    marginLeft: 10,
    marginRight: 14,
    paddingVertical: 13,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  glow: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 80,
    bottom: 0,
  },
});

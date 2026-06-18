export const darkColors = {
  // Brand — neutral white
  primary: '#E8E8E8',
  primaryDark: '#FFFFFF',
  primaryGlow: 'rgba(255,255,255,0.06)',

  // Role accents — monochrome gray shades (no blue/purple/green)
  adminPrimary: '#D8D8D8',
  adminLight: '#242424',
  adminGlow: 'rgba(255,255,255,0.05)',
  managerPrimary: '#C8C8C8',
  managerLight: '#1E1E1E',
  managerGlow: 'rgba(255,255,255,0.04)',
  employeePrimary: '#E0E0E0',
  employeeLight: '#222222',
  employeeGlow: 'rgba(255,255,255,0.04)',

  // Goal status — semantic data colors (kept intentionally)
  approved: '#22C55E',
  approvedBg: '#0D2218',
  rejected: '#EF4444',
  rejectedBg: '#2A1212',
  pending: '#F59E0B',
  pendingBg: '#2A1E08',
  inProgress: '#60A5FA',
  inProgressBg: '#0E1E3A',
  notStarted: '#6B7280',
  notStartedBg: '#1E1E1E',

  // Priority
  high: '#EF4444',
  highBg: '#2A1212',
  medium: '#F59E0B',
  mediumBg: '#2A1E08',
  low: '#22C55E',
  lowBg: '#0D2218',

  // Category — gray shades
  technical: '#C0C0C0',
  technicalBg: '#282828',
  project_delivery: '#A8A8A8',
  project_deliveryBg: '#242424',
  soft_skills: '#B4B4B4',
  soft_skillsBg: '#262626',
  learning: '#D0D0D0',
  learningBg: '#2C2C2C',
  leadership: '#E0E0E0',
  leadershipBg: '#2E2E2E',

  // Surfaces
  bg: '#0A0A0A',
  bgElevated: '#141414',
  card: '#1E1E1E',
  cardHover: '#262626',
  border: '#303030',
  borderLight: '#262626',
  divider: '#222222',
  overlay: 'rgba(0,0,0,0.72)',

  // Text
  textPrimary: '#F0F0F0',
  textSecondary: '#9A9A9A',
  textMuted: '#585858',
  textWhite: '#FFFFFF',
  textWhiteSoft: 'rgba(255,255,255,0.8)',

  // Charts
  chartTrack: 'rgba(255,255,255,0.07)',
  chartGrid: 'rgba(255,255,255,0.03)',
};

export const lightColors = {
  // Brand — neutral dark
  primary: '#1A1A1A',
  primaryDark: '#000000',
  primaryGlow: 'rgba(0,0,0,0.04)',

  // Role accents — monochrome dark shades on light background
  adminPrimary: '#111111',
  adminLight: '#F4F4F4',
  adminGlow: 'rgba(0,0,0,0.03)',
  managerPrimary: '#333333',
  managerLight: '#F0F0F0',
  managerGlow: 'rgba(0,0,0,0.03)',
  employeePrimary: '#222222',
  employeeLight: '#F6F6F6',
  employeeGlow: 'rgba(0,0,0,0.03)',

  // Goal status — semantic data colors (kept intentionally)
  approved: '#16A34A',
  approvedBg: '#F0FDF4',
  rejected: '#DC2626',
  rejectedBg: '#FEF2F2',
  pending: '#D97706',
  pendingBg: '#FFFBEB',
  inProgress: '#2563EB',
  inProgressBg: '#EFF6FF',
  notStarted: '#9CA3AF',
  notStartedBg: '#F9FAFB',

  // Priority
  high: '#DC2626',
  highBg: '#FEF2F2',
  medium: '#D97706',
  mediumBg: '#FFFBEB',
  low: '#16A34A',
  lowBg: '#F0FDF4',

  // Category — dark gray shades for readability on white
  technical: '#374151',
  technicalBg: '#F3F4F6',
  project_delivery: '#4B5563',
  project_deliveryBg: '#F3F4F6',
  soft_skills: '#6B7280',
  soft_skillsBg: '#F9FAFB',
  learning: '#1F2937',
  learningBg: '#F3F4F6',
  leadership: '#111827',
  leadershipBg: '#F3F4F6',

  // Surfaces — bg is a soft gray so white cards stand out clearly
  bg: '#F0F2F5',
  bgElevated: '#F7F8FA',
  card: '#FFFFFF',
  cardHover: '#F5F7F9',
  border: '#DDE1E8',
  borderLight: '#E8EBF0',
  divider: '#E4E7EE',
  overlay: 'rgba(0,0,0,0.42)',

  // Text
  textPrimary: '#111111',
  textSecondary: '#555555',
  textMuted: '#999999',
  textWhite: '#FFFFFF',
  textWhiteSoft: 'rgba(255,255,255,0.9)',

  // Charts
  chartTrack: 'rgba(0,0,0,0.06)',
  chartGrid: 'rgba(0,0,0,0.03)',
};

// Backward-compat alias — use useTheme().colors in components
export const Colors = darkColors;

export type ColorPalette = typeof darkColors;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 999,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 14,
  },
};

export const Typography = {
  h1: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '700' as const },
  h4: { fontSize: 15, fontWeight: '700' as const },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  bodyMedium: { fontSize: 14, fontWeight: '600' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
  label: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const },
  metric: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -1 },
  metricSm: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.5 },
};

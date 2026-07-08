import type { Role, Screen } from './types';

const ALL_ROLES: Role[] = ['admin', 'manager', 'employee'];

export const SCREEN_ROLES: Record<Screen, Role[] | null> = {
  // Role-specific screens
  'admin-dashboard':    ['admin'],
  'onboard-employee':   ['admin'],
  'manager-dashboard':  ['manager', 'admin'],
  'team-overview':      ['manager', 'admin'],
  'set-goals':          ['manager', 'admin'],
  'review-evidence':    ['manager', 'admin'],
  'team-daily-logs':    ['manager', 'admin'],
  'employee-dashboard': ['employee'],
  'goals-list':         ['employee'],
  'submit-evidence':    ['employee'],
  'daily-log':          ['employee'],
  'my-progress':        ['employee'],
  // Shared screens — content filtered per role inside each screen
  'notifications':      ALL_ROLES,
  'profile':            ALL_ROLES,
  'privacy-security':   ALL_ROLES,
  'fy-report':          ALL_ROLES,
  'ai-reports':         ALL_ROLES,
  'ai-report-detail':   ALL_ROLES,
  // Auth screens — access controlled by the auth gate in App.tsx, not this map
  'auth-splash':             null,
  'auth-login':              null,
  'auth-signup':             null,
  'auth-forgot-username':    null,
  'auth-forgot-password':    null,
};

export function isScreenAllowed(screen: Screen, role: Role | null | undefined): boolean {
  const allowed = SCREEN_ROLES[screen];
  if (allowed === null) return true; // auth screens — no role required
  return !!role && allowed.includes(role);
}

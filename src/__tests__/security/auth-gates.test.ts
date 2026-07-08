/**
 * Security: Protected Screen Role Gates
 *
 * SCREEN_ROLES defines which roles may access each screen. isScreenAllowed()
 * is the gate function used in ThemedRoot (App.tsx) before rendering any screen.
 * These tests ensure the mapping is exhaustive and the gate logic is correct.
 */

import { SCREEN_ROLES, isScreenAllowed } from '../../screenRoles';
import type { Role, Screen } from '../../types';

// ── SCREEN_ROLES mapping completeness ─────────────────────────────────────────

describe('SCREEN_ROLES mapping', () => {
  const adminOnly: Screen[]        = ['admin-dashboard', 'onboard-employee'];
  const managerAndAdmin: Screen[]  = ['manager-dashboard', 'team-overview', 'set-goals', 'review-evidence', 'team-daily-logs'];
  const employeeOnly: Screen[]     = ['employee-dashboard', 'goals-list', 'submit-evidence', 'daily-log', 'my-progress'];
  const unrestricted: Screen[]     = ['notifications', 'profile', 'fy-report', 'ai-reports', 'ai-report-detail'];

  it('admin-only screens have exactly ["admin"]', () => {
    adminOnly.forEach(s => expect(SCREEN_ROLES[s]).toEqual(['admin']));
  });

  it('manager screens allow manager and admin, block employee', () => {
    managerAndAdmin.forEach(s => {
      expect(SCREEN_ROLES[s]).toContain('manager');
      expect(SCREEN_ROLES[s]).toContain('admin');
      expect(SCREEN_ROLES[s]).not.toContain('employee');
    });
  });

  it('employee-only screens have exactly ["employee"]', () => {
    employeeOnly.forEach(s => expect(SCREEN_ROLES[s]).toEqual(['employee']));
  });

  it('shared screens (notifications, profile, etc.) allow all roles in SCREEN_ROLES', () => {
    unrestricted.forEach(s => expect(SCREEN_ROLES[s]).toEqual(['admin', 'manager', 'employee']));
  });
});

// ── isScreenAllowed — admin screens ──────────────────────────────────────────

describe('isScreenAllowed — admin screens', () => {
  const adminScreens: Screen[] = ['admin-dashboard', 'onboard-employee'];

  it('allows admin', () => {
    adminScreens.forEach(s => expect(isScreenAllowed(s, 'admin')).toBe(true));
  });

  it('blocks manager', () => {
    adminScreens.forEach(s => expect(isScreenAllowed(s, 'manager')).toBe(false));
  });

  it('blocks employee', () => {
    adminScreens.forEach(s => expect(isScreenAllowed(s, 'employee')).toBe(false));
  });

  it('blocks unauthenticated (undefined role)', () => {
    adminScreens.forEach(s => expect(isScreenAllowed(s, undefined)).toBe(false));
  });
});

// ── isScreenAllowed — manager screens ────────────────────────────────────────

describe('isScreenAllowed — manager screens', () => {
  const managerScreens: Screen[] = ['manager-dashboard', 'team-overview', 'set-goals', 'review-evidence', 'team-daily-logs'];

  it('allows manager', () => {
    managerScreens.forEach(s => expect(isScreenAllowed(s, 'manager')).toBe(true));
  });

  it('allows admin (admins have elevated access)', () => {
    managerScreens.forEach(s => expect(isScreenAllowed(s, 'admin')).toBe(true));
  });

  it('blocks employee', () => {
    managerScreens.forEach(s => expect(isScreenAllowed(s, 'employee')).toBe(false));
  });

  it('blocks unauthenticated (undefined role)', () => {
    managerScreens.forEach(s => expect(isScreenAllowed(s, undefined)).toBe(false));
  });
});

// ── isScreenAllowed — employee screens ───────────────────────────────────────

describe('isScreenAllowed — employee screens', () => {
  const employeeScreens: Screen[] = ['employee-dashboard', 'goals-list', 'submit-evidence', 'daily-log', 'my-progress'];

  it('allows employee', () => {
    employeeScreens.forEach(s => expect(isScreenAllowed(s, 'employee')).toBe(true));
  });

  it('blocks admin from employee-only screens', () => {
    employeeScreens.forEach(s => expect(isScreenAllowed(s, 'admin')).toBe(false));
  });

  it('blocks manager from employee-only screens', () => {
    employeeScreens.forEach(s => expect(isScreenAllowed(s, 'manager')).toBe(false));
  });

  it('blocks unauthenticated (undefined role)', () => {
    employeeScreens.forEach(s => expect(isScreenAllowed(s, undefined)).toBe(false));
  });
});

// ── isScreenAllowed — unrestricted screens ────────────────────────────────────

describe('isScreenAllowed — shared/unrestricted screens', () => {
  const sharedScreens: Screen[] = ['notifications', 'profile', 'fy-report'];

  it('allows all roles on shared screens', () => {
    const roles: Role[] = ['admin', 'manager', 'employee'];
    sharedScreens.forEach(s =>
      roles.forEach(r => expect(isScreenAllowed(s, r)).toBe(true)),
    );
  });

  it('blocks unauthenticated access on shared screens (auth gate enforces login)', () => {
    // Shared screens require a valid role — unauthenticated users must log in first.
    // Supabase RLS is the authoritative guard for data access after authentication.
    sharedScreens.forEach(s => expect(isScreenAllowed(s, undefined)).toBe(false));
  });
});

// ── isScreenAllowed — auth screens ───────────────────────────────────────────

describe('isScreenAllowed — auth screens', () => {
  const authScreens: Screen[] = ['auth-splash', 'auth-login', 'auth-signup', 'auth-forgot-username', 'auth-forgot-password'];

  it('allows access to auth screens regardless of role (null allowed)', () => {
    authScreens.forEach(s => {
      expect(isScreenAllowed(s, null)).toBe(true);
      expect(isScreenAllowed(s, undefined)).toBe(true);
      expect(isScreenAllowed(s, 'employee')).toBe(true);
    });
  });
});

// ── Cross-role privilege escalation ──────────────────────────────────────────

describe('Cross-role privilege escalation prevention', () => {
  it('employee cannot access admin-dashboard', () => {
    expect(isScreenAllowed('admin-dashboard', 'employee')).toBe(false);
  });

  it('employee cannot access manager-dashboard', () => {
    expect(isScreenAllowed('manager-dashboard', 'employee')).toBe(false);
  });

  it('manager cannot access admin-dashboard', () => {
    expect(isScreenAllowed('admin-dashboard', 'manager')).toBe(false);
  });

  it('manager cannot access employee-dashboard', () => {
    expect(isScreenAllowed('employee-dashboard', 'manager')).toBe(false);
  });

  it('admin cannot access employee-only screens', () => {
    expect(isScreenAllowed('employee-dashboard', 'admin')).toBe(false);
    expect(isScreenAllowed('goals-list', 'admin')).toBe(false);
    expect(isScreenAllowed('submit-evidence', 'admin')).toBe(false);
  });
});

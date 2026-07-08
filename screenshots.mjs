import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import path from 'path';

const OUT = 'c:/Users/telas/OneDrive/dhanush claude/GrowTracker-Screenshots';
const BASE = 'http://localhost:19006';
// Mobile viewport to match app feel
const VIEWPORT = { width: 390, height: 844 };

const EMPLOYEE = { email: 'kiran.patel@growtracker.app', password: 'GrowTracker@123' };
const ADMIN    = { email: 'PLACEHOLDER_ADMIN',   password: 'PLACEHOLDER' };
const MANAGER  = { email: 'PLACEHOLDER_MANAGER', password: 'PLACEHOLDER' };

async function shot(page, name) {
  await page.waitForTimeout(1200);
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`✓ ${name}`);
}

async function waitReady(page) {
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);
}

async function login(page, email, password) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await waitReady(page);

  // Click through splash if present
  const splash = page.locator('text=Get Started').or(page.locator('text=Sign In')).first();
  if (await splash.isVisible({ timeout: 3000 }).catch(() => false)) {
    await splash.click();
    await page.waitForTimeout(600);
  }

  // Pick role — try Employee first
  const employeeBtn = page.locator('text=Employee').first();
  if (await employeeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await employeeBtn.click();
    await page.waitForTimeout(500);
  }

  // Fill email + password
  const emailInput = page.locator('input[type="email"]').or(page.locator('[placeholder*="email" i]')).or(page.locator('[placeholder*="Email" i]')).first();
  await emailInput.fill(email, { timeout: 5000 });

  const pwdInput = page.locator('input[type="password"]').or(page.locator('[placeholder*="password" i]')).first();
  await pwdInput.fill(password);

  const signIn = page.locator('text=Sign In').last();
  await signIn.click();
  await waitReady(page);
}

(async () => {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  // ── 1. UNAUTHENTICATED SCREENS ──────────────────────────────────────────────
  {
    const page = await browser.newPage();
    await page.setViewportSize(VIEWPORT);

    // Splash
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await waitReady(page);
    await shot(page, '01_splash');

    // Role selector — look for "Get Started" or role buttons
    const getStarted = page.locator('text=Get Started').first();
    if (await getStarted.isVisible({ timeout: 3000 }).catch(() => false)) {
      await getStarted.click();
      await page.waitForTimeout(600);
      await shot(page, '02_role_selector');
    } else {
      await shot(page, '02_role_selector');
    }

    // Employee login
    const employeeRole = page.locator('text=Employee').first();
    if (await employeeRole.isVisible({ timeout: 3000 }).catch(() => false)) {
      await employeeRole.click();
      await page.waitForTimeout(500);
    }
    await shot(page, '03_login_employee');

    // Forgot username
    const forgotUser = page.locator('text=Forgot username').first();
    if (await forgotUser.isVisible({ timeout: 2000 }).catch(() => false)) {
      await forgotUser.click();
      await page.waitForTimeout(500);
      await shot(page, '04_forgot_username');
      await page.goBack().catch(() => {});
      await page.waitForTimeout(400);
    }

    // Forgot password
    const forgotPwd = page.locator('text=Forgot password').first();
    if (await forgotPwd.isVisible({ timeout: 2000 }).catch(() => false)) {
      await forgotPwd.click();
      await page.waitForTimeout(500);
      await shot(page, '05_forgot_password');
      await page.goBack().catch(() => {});
      await page.waitForTimeout(400);
    }

    // Sign up
    const signUp = page.locator('text=Sign Up').first();
    if (await signUp.isVisible({ timeout: 2000 }).catch(() => false)) {
      await signUp.click();
      await page.waitForTimeout(500);
      await shot(page, '06_signup');
      await page.goBack().catch(() => {});
      await page.waitForTimeout(400);
    }

    // Manager login screen
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await waitReady(page);
    const getStarted2 = page.locator('text=Get Started').first();
    if (await getStarted2.isVisible({ timeout: 2000 }).catch(() => false)) {
      await getStarted2.click();
      await page.waitForTimeout(400);
    }
    const managerRole = page.locator('text=Manager').first();
    if (await managerRole.isVisible({ timeout: 2000 }).catch(() => false)) {
      await managerRole.click();
      await page.waitForTimeout(400);
      await shot(page, '07_login_manager');
    }

    // Admin login screen
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await waitReady(page);
    const getStarted3 = page.locator('text=Get Started').first();
    if (await getStarted3.isVisible({ timeout: 2000 }).catch(() => false)) {
      await getStarted3.click();
      await page.waitForTimeout(400);
    }
    const adminRole = page.locator('text=Admin').first();
    if (await adminRole.isVisible({ timeout: 2000 }).catch(() => false)) {
      await adminRole.click();
      await page.waitForTimeout(400);
      await shot(page, '08_login_admin');
    }

    await page.close();
  }

  // ── 2. EMPLOYEE SCREENS ─────────────────────────────────────────────────────
  {
    const page = await browser.newPage();
    await page.setViewportSize(VIEWPORT);
    await login(page, EMPLOYEE.email, EMPLOYEE.password);
    await shot(page, '09_employee_dashboard_light');

    // Dark mode toggle
    const darkBtn = page.locator('[aria-label*="dark" i]').or(page.locator('[aria-label*="theme" i]')).or(page.locator('text=🌙')).first();
    if (await darkBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await darkBtn.click();
      await page.waitForTimeout(600);
      await shot(page, '10_employee_dashboard_dark');
      await darkBtn.click(); // back to light
      await page.waitForTimeout(400);
    }

    // Scroll down on dashboard
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(500);
    await shot(page, '11_employee_dashboard_scrolled');
    await page.mouse.wheel(0, -400);
    await page.waitForTimeout(300);

    // Notifications
    const notifBtn = page.locator('[aria-label*="notif" i]').or(page.locator('text=🔔')).first();
    if (await notifBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await notifBtn.click();
      await waitReady(page);
      await shot(page, '12_notifications');
      await page.goBack().catch(async () => {
        const back = page.locator('[aria-label="Go back"]').first();
        await back.click().catch(() => {});
      });
      await page.waitForTimeout(400);
    }

    // Profile
    const profileBtn = page.locator('[aria-label*="profile" i]').or(page.locator('text=Profile')).first();
    if (await profileBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await profileBtn.click();
      await waitReady(page);
      await shot(page, '13_profile');
      const back = page.locator('[aria-label="Go back"]').first();
      await back.click().catch(() => {});
      await page.waitForTimeout(400);
    }

    // Goals / My Goals
    const goalsBtn = page.locator('text=My Goals').or(page.locator('text=Goals')).first();
    if (await goalsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await goalsBtn.click();
      await waitReady(page);
      await shot(page, '14_my_goals');

      // Click a goal for detail
      const firstGoal = page.locator('[role="button"]').nth(1);
      if (await firstGoal.isVisible({ timeout: 2000 }).catch(() => false)) {
        await firstGoal.click();
        await page.waitForTimeout(600);
        await shot(page, '15_goal_detail');
        const back = page.locator('[aria-label="Go back"]').first();
        await back.click().catch(() => {});
        await page.waitForTimeout(400);
      }

      const back = page.locator('[aria-label="Go back"]').first();
      await back.click().catch(() => {});
      await page.waitForTimeout(400);
    }

    // Submit Evidence
    const evidenceBtn = page.locator('text=Submit Evidence').or(page.locator('text=Evidence')).first();
    if (await evidenceBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await evidenceBtn.click();
      await waitReady(page);
      await shot(page, '16_submit_evidence');
      const back = page.locator('[aria-label="Go back"]').first();
      await back.click().catch(() => {});
      await page.waitForTimeout(400);
    }

    // Daily Log
    const logBtn = page.locator('text=Daily Log').or(page.locator('text=Daily Progress')).first();
    if (await logBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await logBtn.click();
      await waitReady(page);
      await shot(page, '17_daily_log');
      const back = page.locator('[aria-label="Go back"]').first();
      await back.click().catch(() => {});
      await page.waitForTimeout(400);
    }

    // FY Report
    const fyBtn = page.locator('text=FY Report').or(page.locator('text=Fiscal Year')).or(page.locator('text=Performance Report')).first();
    if (await fyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await fyBtn.click();
      await waitReady(page);
      await shot(page, '18_fy_report');
      const back = page.locator('[aria-label="Go back"]').first();
      await back.click().catch(() => {});
      await page.waitForTimeout(400);
    }

    // AI Reports
    const aiBtn = page.locator('text=AI Reports').or(page.locator('text=AI Performance')).first();
    if (await aiBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await aiBtn.click();
      await waitReady(page);
      await shot(page, '19_ai_reports_list');

      // Open report generator
      const generateBtn = page.locator('text=Generate New Report').first();
      if (await generateBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await generateBtn.click();
        await page.waitForTimeout(500);
        await shot(page, '20_ai_report_generator');
      }

      // Open an existing report if any
      const reportCard = page.locator('[role="button"]').nth(2);
      if (await reportCard.isVisible({ timeout: 2000 }).catch(() => false)) {
        await reportCard.click();
        await waitReady(page);
        await shot(page, '21_ai_report_detail');
        const back2 = page.locator('[aria-label="Go back"]').first();
        await back2.click().catch(() => {});
        await page.waitForTimeout(400);
      }

      const back = page.locator('[aria-label="Go back"]').first();
      await back.click().catch(() => {});
      await page.waitForTimeout(400);
    }

    // Three dots / overflow menu
    const dotsBtn = page.locator('[aria-label*="more" i]').or(page.locator('[aria-label*="menu" i]')).or(page.locator('[aria-label*="options" i]')).first();
    if (await dotsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dotsBtn.click();
      await page.waitForTimeout(500);
      await shot(page, '22_overflow_menu');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // Dark mode final
    const darkToggle = page.locator('[aria-label*="dark" i]').or(page.locator('[aria-label*="theme" i]')).first();
    if (await darkToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await darkToggle.click();
      await page.waitForTimeout(700);
      await shot(page, '23_dark_mode_employee');

      // Notifications in dark
      const notif2 = page.locator('[aria-label*="notif" i]').first();
      if (await notif2.isVisible({ timeout: 2000 }).catch(() => false)) {
        await notif2.click();
        await waitReady(page);
        await shot(page, '24_notifications_dark');
        const back = page.locator('[aria-label="Go back"]').first();
        await back.click().catch(() => {});
        await page.waitForTimeout(400);
      }
    }

    await page.close();
  }

  // ── 3. MANAGER SCREENS ──────────────────────────────────────────────────────
  {
    const page = await browser.newPage();
    await page.setViewportSize(VIEWPORT);

    // Navigate back to splash and pick Manager
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await waitReady(page);
    const gs = page.locator('text=Get Started').first();
    if (await gs.isVisible({ timeout: 3000 }).catch(() => false)) await gs.click();
    await page.waitForTimeout(400);
    const mgr = page.locator('text=Manager').first();
    if (await mgr.isVisible({ timeout: 3000 }).catch(() => false)) await mgr.click();
    await page.waitForTimeout(400);

    const emailInput = page.locator('input[type="email"]').or(page.locator('[placeholder*="email" i]')).first();
    await emailInput.fill(MANAGER.email).catch(() => {});
    const pwdInput = page.locator('input[type="password"]').first();
    await pwdInput.fill(MANAGER.password).catch(() => {});
    const signIn = page.locator('text=Sign In').last();
    await signIn.click();
    await waitReady(page);
    await shot(page, '25_manager_dashboard');

    // Team Overview
    const teamBtn = page.locator('text=Team').or(page.locator('text=My Team')).or(page.locator('text=Team Overview')).first();
    if (await teamBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await teamBtn.click();
      await waitReady(page);
      await shot(page, '26_team_overview');
      const back = page.locator('[aria-label="Go back"]').first();
      await back.click().catch(() => {});
      await page.waitForTimeout(400);
    }

    // Review Evidence
    const reviewBtn = page.locator('text=Review Evidence').or(page.locator('text=Review')).first();
    if (await reviewBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await reviewBtn.click();
      await waitReady(page);
      await shot(page, '27_review_evidence');
      const back = page.locator('[aria-label="Go back"]').first();
      await back.click().catch(() => {});
      await page.waitForTimeout(400);
    }

    // Set Goals
    const setGoalsBtn = page.locator('text=Set Goals').or(page.locator('text=Assign Goals')).first();
    if (await setGoalsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await setGoalsBtn.click();
      await waitReady(page);
      await shot(page, '28_set_goals');
      const back = page.locator('[aria-label="Go back"]').first();
      await back.click().catch(() => {});
      await page.waitForTimeout(400);
    }

    // Smart Coaching
    const coachBtn = page.locator('text=Smart Coaching').or(page.locator('text=Coaching')).or(page.locator('text=Send Smart')).first();
    if (await coachBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await coachBtn.click();
      await waitReady(page);
      await shot(page, '29_smart_coaching');
      await page.waitForTimeout(400);
    }

    // Daily Logs
    const logsBtn = page.locator('text=Daily Logs').or(page.locator('text=Team Logs')).first();
    if (await logsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await logsBtn.click();
      await waitReady(page);
      await shot(page, '30_team_daily_logs');
      const back = page.locator('[aria-label="Go back"]').first();
      await back.click().catch(() => {});
      await page.waitForTimeout(400);
    }

    // Dark mode
    const darkToggle = page.locator('[aria-label*="dark" i]').or(page.locator('[aria-label*="theme" i]')).first();
    if (await darkToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await darkToggle.click();
      await page.waitForTimeout(700);
      await shot(page, '31_manager_dashboard_dark');
    }

    await page.close();
  }

  // ── 4. ADMIN SCREENS ────────────────────────────────────────────────────────
  {
    const page = await browser.newPage();
    await page.setViewportSize(VIEWPORT);

    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await waitReady(page);
    const gs = page.locator('text=Get Started').first();
    if (await gs.isVisible({ timeout: 3000 }).catch(() => false)) await gs.click();
    await page.waitForTimeout(400);
    const adm = page.locator('text=Admin').first();
    if (await adm.isVisible({ timeout: 3000 }).catch(() => false)) await adm.click();
    await page.waitForTimeout(400);

    const emailInput = page.locator('input[type="email"]').or(page.locator('[placeholder*="email" i]')).first();
    await emailInput.fill(ADMIN.email).catch(() => {});
    const pwdInput = page.locator('input[type="password"]').first();
    await pwdInput.fill(ADMIN.password).catch(() => {});
    const signIn = page.locator('text=Sign In').last();
    await signIn.click();
    await waitReady(page);
    await shot(page, '32_admin_dashboard');

    // Scroll admin dashboard
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(400);
    await shot(page, '33_admin_dashboard_scrolled');
    await page.mouse.wheel(0, -400);
    await page.waitForTimeout(300);

    // Employee management
    const empMgmtBtn = page.locator('text=Employees').or(page.locator('text=Manage Employees')).or(page.locator('text=Employee Management')).first();
    if (await empMgmtBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await empMgmtBtn.click();
      await waitReady(page);
      await shot(page, '34_employee_management');
      const back = page.locator('[aria-label="Go back"]').first();
      await back.click().catch(() => {});
      await page.waitForTimeout(400);
    }

    // Onboard
    const onboardBtn = page.locator('text=Onboard').or(page.locator('text=Add Employee')).or(page.locator('text=New Employee')).first();
    if (await onboardBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await onboardBtn.click();
      await waitReady(page);
      await shot(page, '35_onboard_employee');
      const back = page.locator('[aria-label="Go back"]').first();
      await back.click().catch(() => {});
      await page.waitForTimeout(400);
    }

    // Dark mode admin
    const darkToggle = page.locator('[aria-label*="dark" i]').or(page.locator('[aria-label*="theme" i]')).first();
    if (await darkToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await darkToggle.click();
      await page.waitForTimeout(700);
      await shot(page, '36_admin_dashboard_dark');
    }

    await page.close();
  }

  await browser.close();
  console.log('\n✅ All screenshots saved to:', OUT);
})();

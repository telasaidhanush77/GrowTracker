// Comprehensive screenshot script for GrowTracker app
// Uses exact aria-labels from the source code
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import path from 'path';

const OUT  = 'c:/Users/telas/OneDrive/dhanush claude/GrowTracker-Screenshots';
const BASE = 'http://localhost:19006';
const VP   = { width: 390, height: 844 };

async function shot(page, name) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log(`  ✓ ${name}`);
}

async function netIdle(page) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(600);
}

async function clickBack(page) {
  const btn = page.locator('[aria-label="Go back"]').first();
  if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(500);
    return true;
  }
  return false;
}

async function openMenu(page) {
  await page.locator('[aria-label="Open menu"]').first().click();
  await page.waitForTimeout(600);
}

async function closeMenu(page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

// Open a fresh page to the role-selector splash
async function freshSplash(browser) {
  const page = await browser.newPage();
  await page.setViewportSize(VP);
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await netIdle(page);
  return page;
}

// Open a fresh page to the Employee login screen
async function toEmployeeLogin(browser) {
  const page = await freshSplash(browser);
  // Role cards use text, not aria-label
  await page.locator('text=Employee').first().click();
  await page.waitForTimeout(500);
  return page;
}

// Sign in as Kiran Patel (employee)
async function signInEmployee(page) {
  await page.locator('[placeholder*="email" i]').first().fill('kiran.patel@growtracker.app');
  await page.locator('input[type="password"]').first().fill('GrowTracker@123');
  await page.locator('[aria-label*="Sign in" i]').or(page.locator('text=Sign In')).last().click();
  await netIdle(page);
}

(async () => {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  // ═══ 1. AUTH SCREENS ══════════════════════════════════════════════════════

  console.log('\n[AUTH SCREENS]');

  // Splash / role selector
  {
    const page = await freshSplash(browser);
    await shot(page, 'S01_splash_role_selector');
    await page.close();
  }

  // Employee login
  {
    const page = await toEmployeeLogin(browser);
    await shot(page, 'S02_login_employee');
    await page.close();
  }

  // Manager login
  {
    const page = await freshSplash(browser);
    await page.locator('text=Manager').first().click();
    await page.waitForTimeout(500);
    await shot(page, 'S03_login_manager');
    await page.close();
  }

  // Admin login
  {
    const page = await freshSplash(browser);
    await page.locator('text=Admin').first().click();
    await page.waitForTimeout(500);
    await shot(page, 'S04_login_admin');
    await page.close();
  }

  // Forgot password
  {
    const page = await toEmployeeLogin(browser);
    await page.locator('[aria-label="Forgot password"]').first().click();
    await page.waitForTimeout(600);
    await shot(page, 'S05_forgot_password');
    await page.close();
  }

  // Forgot username
  {
    const page = await toEmployeeLogin(browser);
    await page.locator('[aria-label="Forgot username"]').first().click();
    await page.waitForTimeout(600);
    await shot(page, 'S06_forgot_username');
    await page.close();
  }

  // Sign up
  {
    const page = await toEmployeeLogin(browser);
    await page.locator('[aria-label="Sign up for a new account"]').first().click();
    await page.waitForTimeout(600);
    await shot(page, 'S07_signup_top');
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(400);
    await shot(page, 'S08_signup_bottom');
    await page.close();
  }

  // ═══ 2. EMPLOYEE DASHBOARD — LIGHT MODE ═══════════════════════════════════

  console.log('\n[EMPLOYEE DASHBOARD — LIGHT]');

  const empPage = await freshSplash(browser);
  await empPage.locator('text=Employee').first().click();
  await empPage.waitForTimeout(400);
  await signInEmployee(empPage);

  // Overview top
  await shot(empPage, 'E01_dashboard_overview_top');

  // Scroll to performance score section
  await empPage.mouse.wheel(0, 350);
  await empPage.waitForTimeout(400);
  await shot(empPage, 'E02_dashboard_performance_scores');

  // Scroll to score breakdown + AI card
  await empPage.mouse.wheel(0, 400);
  await empPage.waitForTimeout(400);
  await shot(empPage, 'E03_dashboard_ai_card');

  // Scroll to workspace
  await empPage.mouse.wheel(0, 400);
  await empPage.waitForTimeout(400);
  await shot(empPage, 'E04_dashboard_workspace');

  // Back to top
  await empPage.mouse.wheel(0, -1200);
  await empPage.waitForTimeout(400);

  // Analysis tab
  await empPage.locator('text=Analysis').first().click();
  await empPage.waitForTimeout(600);
  await shot(empPage, 'E05_dashboard_analysis_top');
  await empPage.mouse.wheel(0, 400);
  await empPage.waitForTimeout(400);
  await shot(empPage, 'E06_dashboard_analysis_scrolled');
  await empPage.mouse.wheel(0, -400);

  // Actions tab
  await empPage.locator('text=Actions').first().click();
  await empPage.waitForTimeout(600);
  await shot(empPage, 'E07_dashboard_actions');

  // Back to Overview
  await empPage.locator('text=Overview').first().click();
  await empPage.waitForTimeout(400);

  // ── Menu screenshot (open, then close) ──
  await openMenu(empPage);
  await shot(empPage, 'E08_menu_open');
  await closeMenu(empPage);    // close before navigating away

  // ── Notifications via bell icon in header (no menu needed) ──
  await empPage.locator('[aria-label^="Notifications"]').first().click();
  await netIdle(empPage);
  await shot(empPage, 'E09_notifications');
  await clickBack(empPage);

  // ── Profile via menu ("My profile" is unique to menu) ──
  await openMenu(empPage);
  await empPage.locator('[aria-label="My profile"]').first().click();
  await netIdle(empPage);
  await shot(empPage, 'E10_profile_top');
  await empPage.mouse.wheel(0, 400);
  await empPage.waitForTimeout(400);
  await shot(empPage, 'E11_profile_scrolled');
  await clickBack(empPage);

  // ── My Goals ──
  await empPage.locator('[aria-label^="My goals"]').first().click();
  await netIdle(empPage);
  await shot(empPage, 'E12_my_goals');
  // Click first goal card
  const firstGoal = empPage.locator('[role="button"]').nth(0);
  if (await firstGoal.isVisible({ timeout: 1500 }).catch(() => false)) {
    await firstGoal.click();
    await netIdle(empPage);
    await shot(empPage, 'E13_goal_detail_top');
    await empPage.mouse.wheel(0, 400);
    await empPage.waitForTimeout(400);
    await shot(empPage, 'E14_goal_detail_scrolled');
    await clickBack(empPage);
  }
  await clickBack(empPage);

  // ── Daily Work Log ──
  await empPage.locator('[aria-label^="Daily work log"]').first().click();
  await netIdle(empPage);
  await shot(empPage, 'E15_daily_log');
  await clickBack(empPage);

  // ── My Progress ──
  const progressBtn = empPage.locator('[aria-label^="My progress"]').or(empPage.locator('[aria-label^="FY report"]')).first();
  await progressBtn.click();
  await netIdle(empPage);
  await shot(empPage, 'E16_my_progress');
  await empPage.mouse.wheel(0, 400);
  await empPage.waitForTimeout(400);
  await shot(empPage, 'E17_my_progress_scrolled');
  await clickBack(empPage);

  // ── AI Reports ──
  await empPage.locator('[aria-label^="AI Performance Reports"]').first().click();
  await netIdle(empPage);
  await shot(empPage, 'E18_ai_reports_list');

  // Generator panel — Goal
  const genBtn = empPage.locator('text=Generate New Report').first();
  if (await genBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await genBtn.click();
    await empPage.waitForTimeout(500);
    await shot(empPage, 'E19_report_gen_goal');

    // Quarterly tab
    const qTab = empPage.locator('text=Quarterly').first();
    if (await qTab.isVisible({ timeout: 1000 }).catch(() => false)) {
      await qTab.click();
      await empPage.waitForTimeout(400);
      await shot(empPage, 'E20_report_gen_quarterly');
    }

    // FY tab
    const fyTab = empPage.locator('text=FY').or(empPage.locator('text=Fiscal Year')).first();
    if (await fyTab.isVisible({ timeout: 1000 }).catch(() => false)) {
      await fyTab.click();
      await empPage.waitForTimeout(400);
      await shot(empPage, 'E21_report_gen_fy');
    }

    // Close generator
    const cancelBtn = empPage.locator('text=Cancel').first();
    if (await cancelBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await cancelBtn.click();
      await empPage.waitForTimeout(400);
    }
  }

  // Open existing report if any
  const firstReport = empPage.locator('[role="button"]').first();
  if (await firstReport.isVisible({ timeout: 2000 }).catch(() => false)) {
    await firstReport.click();
    await netIdle(empPage);
    await shot(empPage, 'E22_ai_report_detail_top');
    await empPage.mouse.wheel(0, 400);
    await empPage.waitForTimeout(400);
    await shot(empPage, 'E23_ai_report_detail_scrolled');
    await empPage.mouse.wheel(0, 400);
    await empPage.waitForTimeout(400);
    await shot(empPage, 'E24_ai_report_detail_bottom');
    await clickBack(empPage);
  }
  await clickBack(empPage);

  // ═══ 3. DARK MODE ══════════════════════════════════════════════════════════

  console.log('\n[DARK MODE]');

  // Toggle dark mode: open menu → click Dark → close menu (menu stays open after toggle)
  await openMenu(empPage);
  await empPage.locator('text=Dark').first().click();
  await empPage.waitForTimeout(400);
  await closeMenu(empPage);   // close after toggling (toggle doesn't auto-close menu)
  await empPage.waitForTimeout(500);

  // Dashboard in dark
  await shot(empPage, 'D01_dashboard_dark_top');
  await empPage.mouse.wheel(0, 400);
  await empPage.waitForTimeout(400);
  await shot(empPage, 'D02_dashboard_dark_scrolled');
  await empPage.mouse.wheel(0, -400);
  await empPage.waitForTimeout(300);

  // Menu in dark mode (screenshot, then close)
  await openMenu(empPage);
  await shot(empPage, 'D03_menu_dark');
  await closeMenu(empPage);

  // Notifications in dark (bell icon in header)
  await empPage.locator('[aria-label^="Notifications"]').first().click();
  await netIdle(empPage);
  await shot(empPage, 'D04_notifications_dark');
  await clickBack(empPage);

  // Goals in dark
  await empPage.locator('[aria-label^="My goals"]').first().click();
  await netIdle(empPage);
  await shot(empPage, 'D05_goals_dark');
  await clickBack(empPage);

  // AI Reports in dark
  await empPage.locator('[aria-label^="AI Performance Reports"]').first().click();
  await netIdle(empPage);
  await shot(empPage, 'D06_ai_reports_dark');
  await clickBack(empPage);

  // Daily log in dark
  await empPage.locator('[aria-label^="Daily work log"]').first().click();
  await netIdle(empPage);
  await shot(empPage, 'D07_daily_log_dark');
  await clickBack(empPage);

  // Switch back to light: open menu → click Light → close menu
  await openMenu(empPage);
  await empPage.locator('text=Light').first().click();
  await empPage.waitForTimeout(400);
  await closeMenu(empPage);

  await empPage.close();

  // ═══ 4. SUMMARY ════════════════════════════════════════════════════════════

  await browser.close();

  const { readdirSync } = await import('fs');
  const files = readdirSync(OUT).filter(f => f.endsWith('.png')).sort();
  console.log(`\n✅ Total screenshots in folder: ${files.length}`);
  files.forEach(f => console.log(`    ${f}`));
})();

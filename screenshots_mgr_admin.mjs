// Manager + Admin screenshot script — uses aria-label for tab navigation
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import path from 'path';

const OUT  = 'c:/Users/telas/OneDrive/dhanush claude/GrowTracker-Screenshots';
const BASE = 'http://localhost:19006';
const VP   = { width: 390, height: 844 };

const shot = async (page, name) => {
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log(`  ✓ ${name}`);
};

const netIdle = async (page) => {
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(600);
};

const clickBack = async (page) => {
  const btn = page.locator('[aria-label="Go back"]').first();
  if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(500);
  }
};

const openMenu = async (page) => {
  await page.locator('[aria-label="Open menu"]').first().click();
  await page.waitForTimeout(500);
};

const closeMenu = async (page) => {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
};

// Click a tab by its aria-label (BottomTabBar uses accessibilityLabel={tab.label})
const clickTab = async (page, label) => {
  await page.locator(`[aria-label="${label}"]`).first().click();
  await page.waitForTimeout(600);
};

const freshSplash = async (browser) => {
  const page = await browser.newPage();
  await page.setViewportSize(VP);
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await netIdle(page);
  return page;
};

const signIn = async (page, role, email, password) => {
  await page.locator(`text=${role}`).first().click();
  await page.waitForTimeout(400);
  await page.locator('[placeholder*="email" i]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('[aria-label="Sign in"]').or(page.locator('text=Sign In')).last().click();
  await netIdle(page);
};

(async () => {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  // ──────────────────────────────────────────────────────────────────────────
  // MANAGER SCREENS
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[MANAGER SCREENS]');

  const mgr = await freshSplash(browser);
  await signIn(mgr, 'Manager', 'ramesh.kumar@growtracker.app', 'GrowTracker@123');

  // Dashboard tab
  await shot(mgr, 'M01_manager_dashboard_top');
  await mgr.mouse.wheel(0, 300);
  await mgr.waitForTimeout(400);
  await shot(mgr, 'M02_manager_dashboard_actions');
  await mgr.mouse.wheel(0, 350);
  await mgr.waitForTimeout(400);
  await shot(mgr, 'M03_manager_dashboard_coaching');
  await mgr.mouse.wheel(0, 350);
  await mgr.waitForTimeout(400);
  await shot(mgr, 'M04_manager_dashboard_team_snapshot');
  await mgr.mouse.wheel(0, -1100);
  await mgr.waitForTimeout(400);

  // Team tab  (aria-label="Team" on the tab button)
  await clickTab(mgr, 'Team');
  await shot(mgr, 'M05_manager_team_tab');
  await mgr.mouse.wheel(0, 400);
  await mgr.waitForTimeout(400);
  await shot(mgr, 'M06_manager_team_scrolled');
  await mgr.mouse.wheel(0, -400);

  // Analytics tab
  await clickTab(mgr, 'Analytics');
  await shot(mgr, 'M07_manager_analytics');
  await mgr.mouse.wheel(0, 400);
  await mgr.waitForTimeout(400);
  await shot(mgr, 'M08_manager_analytics_scrolled');
  await mgr.mouse.wheel(0, -400);

  // Back to Dashboard tab
  await clickTab(mgr, 'Dashboard');
  await mgr.waitForTimeout(300);

  // Menu
  await openMenu(mgr);
  await shot(mgr, 'M09_manager_menu');
  await closeMenu(mgr);

  // Notifications
  await mgr.locator('[aria-label^="Notifications"]').first().click();
  await netIdle(mgr);
  await shot(mgr, 'M10_manager_notifications');
  await clickBack(mgr);

  // Profile
  await openMenu(mgr);
  await mgr.locator('[aria-label="My profile"]').first().click();
  await netIdle(mgr);
  await shot(mgr, 'M11_manager_profile');
  await clickBack(mgr);

  // Team Overview — click via text (unique enough on dashboard)
  await mgr.locator('text=Team Overview').first().click();
  await netIdle(mgr);
  await shot(mgr, 'M12_team_overview');
  await mgr.mouse.wheel(0, 400);
  await mgr.waitForTimeout(400);
  await shot(mgr, 'M13_team_overview_scrolled');
  await clickBack(mgr);

  // Review Evidence
  await mgr.locator('text=Review Evidence').first().click();
  await netIdle(mgr);
  await shot(mgr, 'M14_review_evidence');
  await mgr.mouse.wheel(0, 400);
  await mgr.waitForTimeout(400);
  await shot(mgr, 'M15_review_evidence_scrolled');
  await clickBack(mgr);

  // Team Daily Logs — "Team Activity" button on dashboard
  await mgr.locator('text=Team Daily Activity').first().click();
  await netIdle(mgr);
  await shot(mgr, 'M16_team_daily_logs');
  await clickBack(mgr);

  // Set Goals — from Team tab, find first "Set Goals" button
  await clickTab(mgr, 'Team');
  const setGoalsBtn = mgr.locator('text=Set Goals').first();
  if (await setGoalsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await setGoalsBtn.click();
    await netIdle(mgr);
    await shot(mgr, 'M17_set_goals');
    await mgr.mouse.wheel(0, 400);
    await mgr.waitForTimeout(400);
    await shot(mgr, 'M18_set_goals_scrolled');
    await clickBack(mgr);
  } else {
    console.log('  (Set Goals not visible in Team tab — scrolling to find it)');
    await mgr.mouse.wheel(0, 400);
    await mgr.waitForTimeout(400);
    const btn2 = mgr.locator('text=Set Goals').first();
    if (await btn2.isVisible({ timeout: 1500 }).catch(() => false)) {
      await btn2.click();
      await netIdle(mgr);
      await shot(mgr, 'M17_set_goals');
      await clickBack(mgr);
    }
  }

  // Dark mode
  await clickTab(mgr, 'Dashboard');
  await openMenu(mgr);
  await mgr.locator('text=Dark').first().click();
  await mgr.waitForTimeout(400);
  await closeMenu(mgr);
  await mgr.waitForTimeout(500);
  await shot(mgr, 'M19_manager_dashboard_dark');
  // Restore light
  await openMenu(mgr);
  await mgr.locator('text=Light').first().click();
  await mgr.waitForTimeout(300);
  await closeMenu(mgr);

  await mgr.close();

  // ──────────────────────────────────────────────────────────────────────────
  // ADMIN SCREENS
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[ADMIN SCREENS]');

  const adm = await freshSplash(browser);
  await signIn(adm, 'Admin', 'john@gmail.com', 'John@123');

  // Overview tab  (admin uses lowercase key 'overview' but label 'Overview')
  await shot(adm, 'A01_admin_overview_top');
  await adm.mouse.wheel(0, 350);
  await adm.waitForTimeout(400);
  await shot(adm, 'A02_admin_overview_stats');
  await adm.mouse.wheel(0, 400);
  await adm.waitForTimeout(400);
  await shot(adm, 'A03_admin_overview_charts');
  await adm.mouse.wheel(0, -800);
  await adm.waitForTimeout(400);

  // Actions tab
  await clickTab(adm, 'Actions');
  await shot(adm, 'A04_admin_actions_top');
  await adm.mouse.wheel(0, 400);
  await adm.waitForTimeout(400);
  await shot(adm, 'A05_admin_actions_scrolled');
  await adm.mouse.wheel(0, -400);

  // People tab
  await clickTab(adm, 'People');
  await shot(adm, 'A06_admin_people_top');
  await adm.mouse.wheel(0, 400);
  await adm.waitForTimeout(400);
  await shot(adm, 'A07_admin_people_scrolled');
  await adm.mouse.wheel(0, -400);

  // Back to Overview
  await clickTab(adm, 'Overview');

  // Menu
  await openMenu(adm);
  await shot(adm, 'A08_admin_menu');
  await closeMenu(adm);

  // Notifications
  await adm.locator('[aria-label^="Notifications"]').first().click();
  await netIdle(adm);
  await shot(adm, 'A09_admin_notifications');
  await clickBack(adm);

  // Profile
  await openMenu(adm);
  await adm.locator('[aria-label="My profile"]').first().click();
  await netIdle(adm);
  await shot(adm, 'A10_admin_profile');
  await clickBack(adm);

  // Onboard Employee — from Actions tab
  await clickTab(adm, 'Actions');
  const onboardBtn = adm.locator('text=Onboard Employee').or(adm.locator('text=Onboard New')).first();
  if (await onboardBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await onboardBtn.click();
  } else {
    // Try scrolling to find it
    await adm.mouse.wheel(0, 300);
    await adm.waitForTimeout(400);
    await adm.locator('text=Onboard').first().click();
  }
  await netIdle(adm);
  await shot(adm, 'A11_onboard_employee_top');
  await adm.mouse.wheel(0, 400);
  await adm.waitForTimeout(400);
  await shot(adm, 'A12_onboard_employee_scrolled');
  await clickBack(adm);

  // Dark mode
  await clickTab(adm, 'Overview');
  await openMenu(adm);
  await adm.locator('text=Dark').first().click();
  await adm.waitForTimeout(400);
  await closeMenu(adm);
  await adm.waitForTimeout(500);
  await shot(adm, 'A13_admin_dashboard_dark');
  // Restore
  await openMenu(adm);
  await adm.locator('text=Light').first().click();
  await adm.waitForTimeout(300);
  await closeMenu(adm);

  await adm.close();
  await browser.close();

  const { readdirSync } = await import('fs');
  const files = readdirSync(OUT).filter(f => f.endsWith('.png')).sort();
  console.log(`\n✅ Total: ${files.length} screenshots`);
  files.forEach(f => console.log(`    ${f}`));
})();

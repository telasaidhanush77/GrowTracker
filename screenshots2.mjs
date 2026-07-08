import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import path from 'path';

const OUT  = 'c:/Users/telas/OneDrive/dhanush claude/GrowTracker-Screenshots';
const BASE = 'http://localhost:19006';
const VP   = { width: 390, height: 844 };
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6c25rdG10aXNndnJwcnBscWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDIwMzEsImV4cCI6MjA5NzM3ODAzMX0.VOHz4dW_SQq0wIClXcEZNhkE1WZuT8rf3oEE_adpRis';
const SB   = 'https://gzsnktmtisgvrprplqfy.supabase.co';

async function getToken(email, password) {
  const r = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  return j.access_token || null;
}

async function shot(page, name) {
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log(`✓ ${name}`);
}

async function wait(page) {
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(500);
}

// Try multiple back strategies
async function goBack(page) {
  // Try aria-label back button
  const selectors = [
    '[aria-label="Go back"]',
    '[aria-label="Back"]',
    '[aria-label="go back"]',
    'button:has-text("Back")',
    '[role="button"]:has-text("←")',
  ];
  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 800 }).catch(() => false)) {
      await el.click();
      await page.waitForTimeout(400);
      return;
    }
  }
  // Fallback: browser back
  await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(400);
}

// Reload the login screen fresh
async function openLogin(browser, role = 'Employee') {
  const page = await browser.newPage();
  await page.setViewportSize(VP);
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await wait(page);
  await page.locator(`text=${role}`).first().click();
  await page.waitForTimeout(500);
  return page;
}

(async () => {
  await mkdir(OUT, { recursive: true });

  const empToken = await getToken('kiran.patel@growtracker.app', 'GrowTracker@123');
  console.log('Employee token:', empToken ? 'OK' : 'FAILED');

  const browser = await chromium.launch({ headless: true });

  // ── A: AUTH SCREENS ────────────────────────────────────────────────────────

  // A1 - Forgot password
  {
    const page = await openLogin(browser);
    await page.locator('text=Forgot password').first().click();
    await page.waitForTimeout(600);
    await shot(page, 'A1_forgot_password');
    await page.close();
  }

  // A2 - Forgot username
  {
    const page = await openLogin(browser);
    // look for "Forgot username" link
    const fuLink = page.locator('text=/forgot.*username/i, text=/forgot.*id/i').first();
    if (await fuLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await fuLink.click();
      await page.waitForTimeout(600);
      await shot(page, 'A2_forgot_username');
    } else {
      // screenshot the login screen itself as fallback
      await shot(page, 'A2_login_employee');
    }
    await page.close();
  }

  // A3 - Sign up (full form)
  {
    const page = await openLogin(browser);
    const signUp = page.locator('text=/sign.?up/i, text=/register/i').first();
    if (await signUp.isVisible({ timeout: 2000 }).catch(() => false)) {
      await signUp.click();
      await page.waitForTimeout(600);
      await shot(page, 'A3_signup_top');
      await page.mouse.wheel(0, 350);
      await page.waitForTimeout(400);
      await shot(page, 'A4_signup_bottom');
    } else {
      await shot(page, 'A3_login_no_signup');
    }
    await page.close();
  }

  // ── B: EMPLOYEE DASHBOARD + ALL TABS + FEATURES ───────────────────────────
  {
    const page = await browser.newPage();
    await page.setViewportSize(VP);
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await wait(page);

    // Log in
    await page.locator('text=Employee').first().click();
    await page.waitForTimeout(400);
    await page.locator('[placeholder*="email" i]').first().fill('kiran.patel@growtracker.app');
    await page.locator('input[type="password"]').first().fill('GrowTracker@123');
    await page.locator('text=Sign In').last().click();
    await wait(page);

    // B01 - Dashboard overview top
    await shot(page, 'B01_dashboard_overview_light');

    // B02 - Dashboard middle
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(400);
    await shot(page, 'B02_dashboard_middle');

    // B03 - Dashboard bottom
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(400);
    await shot(page, 'B03_dashboard_bottom');
    await page.mouse.wheel(0, -800);
    await page.waitForTimeout(400);

    // B04 - Analysis tab
    const analysisTab = page.locator('text=Analysis').first();
    if (await analysisTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await analysisTab.click();
      await page.waitForTimeout(600);
      await shot(page, 'B04_dashboard_analysis');
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(400);
      await shot(page, 'B05_dashboard_analysis_scrolled');
      await page.mouse.wheel(0, -400);
    }

    // B06 - Actions tab
    const actionsTab = page.locator('text=Actions').first();
    if (await actionsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await actionsTab.click();
      await page.waitForTimeout(600);
      await shot(page, 'B06_dashboard_actions');
    }

    // Back to Overview
    const overviewTab = page.locator('text=Overview').first();
    if (await overviewTab.isVisible({ timeout: 1000 }).catch(() => false)) {
      await overviewTab.click();
      await page.waitForTimeout(400);
    }

    // B07 - Three-dots / settings menu
    const dotSelectors = [
      '[aria-label*="more" i]',
      '[aria-label*="settings" i]',
      '[aria-label*="option" i]',
      'text=⋮',
      'text=•••',
    ];
    let menuOpened = false;
    for (const sel of dotSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 600 }).catch(() => false)) {
        await el.click();
        await page.waitForTimeout(500);
        await shot(page, 'B07_menu_open');
        menuOpened = true;
        break;
      }
    }
    if (!menuOpened) {
      await shot(page, 'B07_dashboard_no_menu');
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // B08 - Notifications
    const bellSelectors = ['[aria-label*="notif" i]', '[aria-label*="bell" i]', 'text=🔔'];
    for (const sel of bellSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 600 }).catch(() => false)) {
        await el.click();
        await wait(page);
        await shot(page, 'B08_notifications');
        await goBack(page);
        break;
      }
    }

    // B09 - Profile: try via menu
    for (const sel of dotSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 600 }).catch(() => false)) {
        await el.click();
        await page.waitForTimeout(400);
        const profileOpt = page.locator('text=Profile').first();
        if (await profileOpt.isVisible({ timeout: 1000 }).catch(() => false)) {
          await profileOpt.click();
          await wait(page);
          await shot(page, 'B09_profile');
          await page.mouse.wheel(0, 300);
          await page.waitForTimeout(400);
          await shot(page, 'B10_profile_scrolled');
          await goBack(page);
        } else {
          await page.keyboard.press('Escape');
        }
        break;
      }
    }

    // B11 - My Goals
    const goalsLink = page.locator('text=My Goals').first();
    if (await goalsLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await goalsLink.click();
      await wait(page);
      await shot(page, 'B11_my_goals');

      // B12 - Goal detail
      const firstGoal = page.locator('[role="button"]').filter({ hasText: /Q[12]|goal/i }).first();
      if (await firstGoal.isVisible({ timeout: 2000 }).catch(() => false)) {
        await firstGoal.click();
        await wait(page);
        await shot(page, 'B12_goal_detail');
        await page.mouse.wheel(0, 400);
        await page.waitForTimeout(400);
        await shot(page, 'B13_goal_detail_scrolled');
        await goBack(page);
      }
      await goBack(page);
    }

    // B14 - Daily Work Log
    const dailyLog = page.locator('text=Daily Work Log, text=Daily Log').first();
    if (await dailyLog.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dailyLog.click();
      await wait(page);
      await shot(page, 'B14_daily_log');
      await goBack(page);
    }

    // B15 - My Progress / FY Report
    const progress = page.locator('text=My Progress, text=View progress').first();
    if (await progress.isVisible({ timeout: 2000 }).catch(() => false)) {
      await progress.click();
      await wait(page);
      await shot(page, 'B15_fy_progress');
      await goBack(page);
    }

    // B16 - AI Reports list
    const aiReports = page.locator('text=AI Performance, text=AI Reports').first();
    if (await aiReports.isVisible({ timeout: 2000 }).catch(() => false)) {
      await aiReports.click();
      await wait(page);
      await shot(page, 'B16_ai_reports_list');

      // B17 - Report generator panel (goal type)
      const genBtn = page.locator('text=Generate New Report').first();
      if (await genBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await genBtn.click();
        await page.waitForTimeout(500);
        await shot(page, 'B17_report_generator_goal');

        // B18 - Quarterly
        const qTab = page.locator('text=Quarterly').first();
        if (await qTab.isVisible({ timeout: 1000 }).catch(() => false)) {
          await qTab.click();
          await page.waitForTimeout(400);
          await shot(page, 'B18_report_generator_quarterly');
        }

        // B19 - FY
        const fyTab = page.locator('text=FY, text=Fiscal Year').first();
        if (await fyTab.isVisible({ timeout: 1000 }).catch(() => false)) {
          await fyTab.click();
          await page.waitForTimeout(400);
          await shot(page, 'B19_report_generator_fy');
        }

        // Cancel
        const cancelBtn = page.locator('text=Cancel').first();
        if (await cancelBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await cancelBtn.click();
          await page.waitForTimeout(400);
        }
      }

      // B20 - Open an existing report
      const reportCard = page.locator('[role="button"]').filter({ hasText: /Report|Q[12]|Fiscal/i }).first();
      if (await reportCard.isVisible({ timeout: 2000 }).catch(() => false)) {
        await reportCard.click();
        await wait(page);
        await shot(page, 'B20_ai_report_detail');
        await page.mouse.wheel(0, 400);
        await page.waitForTimeout(400);
        await shot(page, 'B21_ai_report_detail_scrolled');
        await goBack(page);
      }

      await goBack(page);
    }

    // ── C: DARK MODE ──────────────────────────────────────────────────────────
    // Attempt to toggle dark mode
    let darkModeOn = false;
    for (const sel of dotSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 600 }).catch(() => false)) {
        await el.click();
        await page.waitForTimeout(400);
        const darkOpt = page.locator('text=Dark, [aria-label*="dark" i]').first();
        if (await darkOpt.isVisible({ timeout: 1000 }).catch(() => false)) {
          await darkOpt.click();
          await page.waitForTimeout(800);
          darkModeOn = true;
        } else {
          await page.keyboard.press('Escape');
        }
        break;
      }
    }

    if (darkModeOn) {
      await shot(page, 'C01_dashboard_dark');
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(400);
      await shot(page, 'C02_dashboard_dark_scrolled');
      await page.mouse.wheel(0, -400);

      // Notifications dark
      for (const sel of bellSelectors) {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 600 }).catch(() => false)) {
          await el.click();
          await wait(page);
          await shot(page, 'C03_notifications_dark');
          await goBack(page);
          break;
        }
      }

      // Goals dark
      const goalsLinkDark = page.locator('text=My Goals').first();
      if (await goalsLinkDark.isVisible({ timeout: 2000 }).catch(() => false)) {
        await goalsLinkDark.click();
        await wait(page);
        await shot(page, 'C04_goals_dark');
        await goBack(page);
      }

      // AI reports dark
      const aiDark = page.locator('text=AI Performance, text=AI Reports').first();
      if (await aiDark.isVisible({ timeout: 2000 }).catch(() => false)) {
        await aiDark.click();
        await wait(page);
        await shot(page, 'C05_ai_reports_dark');
        await goBack(page);
      }
    }

    await page.close();
  }

  await browser.close();

  // List all captured files
  const { readdirSync } = await import('fs');
  const existing = readdirSync(OUT).filter(f => f.endsWith('.png')).sort();
  console.log(`\n✅ Total screenshots in folder: ${existing.length}`);
  existing.forEach(f => console.log(' ', f));
})();

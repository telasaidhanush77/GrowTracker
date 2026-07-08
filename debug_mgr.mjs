import { chromium } from 'playwright';
import path from 'path';

const OUT = 'c:/Users/telas/OneDrive/dhanush claude/GrowTracker-Screenshots';
const BASE = 'http://localhost:19006';
const VP = { width: 390, height: 844 };

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize(VP);
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
await page.waitForTimeout(600);

// Login as manager
await page.locator('text=Manager').first().click();
await page.waitForTimeout(400);
await page.locator('[placeholder*="email" i]').first().fill('ramesh.kuma@growtracker.app');
await page.locator('input[type="password"]').first().fill('GrowTracker@123');
await page.locator('text=Sign In').last().click();
await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(800);

// Screenshot the initial state
await page.screenshot({ path: path.join(OUT, 'debug_1_initial.png') });
console.log('debug_1 - initial dashboard');

// Scroll down a bit
await page.mouse.wheel(0, 300);
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(OUT, 'debug_2_scrolled_300.png') });
console.log('debug_2 - scrolled 300');

// Scroll back up
await page.mouse.wheel(0, -300);
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(OUT, 'debug_3_scrolled_back.png') });
console.log('debug_3 - scrolled back');

// Check what aria-labeled elements exist
const ariaElements = await page.evaluate(() => {
  const els = document.querySelectorAll('[aria-label]');
  return Array.from(els).map(el => ({
    tag: el.tagName,
    ariaLabel: el.getAttribute('aria-label'),
    role: el.getAttribute('role'),
    visible: el.getBoundingClientRect().height > 0,
    rect: JSON.stringify(el.getBoundingClientRect()),
  }));
});
console.log('\nAll aria-label elements:');
ariaElements.forEach(e => console.log(`  [${e.role}] "${e.ariaLabel}" visible=${e.visible} rect=${e.rect}`));

// Try force click on Team tab
const teamBtn = page.locator('[aria-label="Team"]').first();
const exists = await teamBtn.count();
console.log(`\n[aria-label="Team"] count: ${exists}`);

if (exists > 0) {
  await teamBtn.click({ force: true });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 'debug_4_team_tab.png') });
  console.log('debug_4 - after Team tab click (force)');
}

await browser.close();

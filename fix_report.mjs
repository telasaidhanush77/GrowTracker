import { chromium } from 'playwright';
import path from 'path';

const OUT = 'c:/Users/telas/OneDrive/dhanush claude/GrowTracker-Screenshots';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 390, height: 844 });
await page.goto('http://localhost:19006', { waitUntil: 'domcontentloaded' });
await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
await page.waitForTimeout(600);

// Login
await page.locator('text=Employee').first().click();
await page.waitForTimeout(400);
await page.locator('[placeholder*="email" i]').first().fill('kiran.patel@growtracker.app');
await page.locator('input[type="password"]').first().fill('GrowTracker@123');
await page.locator('[aria-label="Sign in"]').or(page.locator('text=Sign In')).last().click();
await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(800);

// Navigate to AI Reports
await page.locator('[aria-label^="AI Performance Reports"]').first().click();
await page.waitForTimeout(1200);

// Click the Quarterly Report card (not back button)
const reportCard = page.locator('text=Quarterly Report').first();
await reportCard.click();
await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
await page.waitForTimeout(1000);

await page.screenshot({ path: path.join(OUT, 'E22_ai_report_detail_top.png') });
console.log('✓ E22_ai_report_detail_top');

await page.mouse.wheel(0, 400);
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, 'E23_ai_report_detail_scrolled.png') });
console.log('✓ E23_ai_report_detail_scrolled');

await page.mouse.wheel(0, 600);
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, 'E24_ai_report_detail_bottom.png') });
console.log('✓ E24_ai_report_detail_bottom');

await browser.close();
console.log('Done!');

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = 'screenshots';
mkdirSync(OUT, { recursive: true });

const BASE = 'http://localhost:8081';
const consoleErrors = [];
const pageErrors = [];

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => pageErrors.push(err.message));

console.log('Navigating to', BASE);
const resp = await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
console.log('HTTP status:', resp?.status());

// Give the RN-web app time to mount and run the auth splash → login transition
await page.waitForTimeout(6000);

await page.screenshot({ path: `${OUT}/01-initial-load.png`, fullPage: true });
console.log('Saved 01-initial-load.png');

// Report what text is actually on screen so we know which screen rendered
const bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 600);
console.log('--- VISIBLE TEXT (first 600 chars) ---');
console.log(bodyText.replace(/\n{2,}/g, '\n'));
console.log('--- END VISIBLE TEXT ---');

// Try to detect the login screen and capture a focused shot
const hasLogin = await page.getByText(/sign in|log in|login|username|password/i).count().catch(() => 0);
console.log('Login-related elements found:', hasLogin);

console.log('=== CONSOLE ERRORS ===', consoleErrors.length);
consoleErrors.slice(0, 20).forEach((e) => console.log('  •', e.slice(0, 200)));
console.log('=== PAGE ERRORS ===', pageErrors.length);
pageErrors.slice(0, 20).forEach((e) => console.log('  •', e.slice(0, 200)));

await browser.close();
console.log('DONE');

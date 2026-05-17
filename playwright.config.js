// @ts-check
/**
 * AI QA Framework — Root Playwright Configuration
 * Targets the /e2e/ folder where AI-generated JavaScript tests live.
 * Browser opens in headed mode by default so you can watch like a real QA engineer.
 */
import { defineConfig, devices } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Resolve suite-scoped output root from QA_SUITE env var */
function resolveSuiteRoot() {
  const raw = process.env.QA_SUITE;
  if (!raw) return null;
  const safe = raw.replace(/[^a-z0-9-_]/gi, '-').toLowerCase();
  return path.join(__dirname, 'TestResult', safe);
}

/** Load base URL from auto-detected project config */
function loadBaseUrl() {
  try {
    const cfgPath = path.join(__dirname, 'core', 'project.config.json');
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      return process.env.QA_BASE_URL
        || cfg?.environment?.baseUrl
        || cfg?.frontend?.baseUrlGuess
        || 'http://localhost:3000';
    }
  } catch { /* ignore */ }
  return process.env.QA_BASE_URL || 'http://localhost:3000';
}

const SUITE_ROOT = resolveSuiteRoot();
const REPORTS    = SUITE_ROOT ? path.join(SUITE_ROOT, 'reports')    : path.join(__dirname, 'reports');
const TRACES_DIR = SUITE_ROOT ? path.join(SUITE_ROOT, 'traces')     : path.join(__dirname, 'traces');
const TEST_DIR   = SUITE_ROOT ? path.join(SUITE_ROOT, 'e2e', 'tests') : './e2e/tests';
const SLOWMO  = process.env.QA_SLOWMO ? Number(process.env.QA_SLOWMO) : 60;

export default defineConfig({
  testDir: TEST_DIR,                     // Suite-scoped or default e2e/tests
  fullyParallel: false,                  // One browser at a time — watch it like a real QA
  forbidOnly: !!process.env.CI,
  retries: 1,  // Always 1 retry max — fail fast, log as bug, move on
  workers: process.env.CI ? 2 : 1,

  reporter: [
    ['list'],
    ['html',  { outputFolder: path.join(REPORTS, 'playwright-html'), open: 'never' }],
    ['junit', { outputFile: path.join(REPORTS, 'junit.xml') }],
  ],

  outputDir: path.join(TRACES_DIR, 'test-results'),

  use: {
    baseURL: loadBaseUrl(),

    // ===== VISUAL EXECUTION — browser opens like a real human QA =====
    headless: false,
    viewport:  { width: 1440, height: 900 },
    actionTimeout:     15_000,
    navigationTimeout: 30_000,

    // Realistic human-speed interactions
    launchOptions: { slowMo: SLOWMO },

    // Capture for all tests (screenshots + video always)
    trace:      'on',
    screenshot: 'on',
    video:      'on',

    // Ignore HTTPS cert errors for local dev (self-signed / dev certs)
    ignoreHTTPSErrors: true,

    // Arabic locale & timezone support
    locale:     'ar-SA',
    timezoneId: 'Asia/Riyadh',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment to test cross-browser:
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit',  use: { ...devices['Desktop Safari']  } },
  ],
});

import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname      = dirname(fileURLToPath(import.meta.url));
const FRAMEWORK_ROOT = join(__dirname, '..', '..');

/**
 * Phase 5 — Test Execution
 *
 * Runs Playwright tests from /e2e/tests/ using playwright.config.js.
 * Browser opens in headed mode — visible like a real QA engineer.
 * Captures: screenshots, videos, traces, console errors, network errors.
 *
 * Modes:
 *   default  — run all tests (or a single suite) and return results
 *   list     — list all test names without running them (ctx.args.mode === 'list')
 *   single   — run one test by name via --grep (ctx.args.testName)
 */
export default async function run(ctx) {
  const cwd = FRAMEWORK_ROOT;  // Run from framework root — uses playwright.config.js

  // Verify package.json exists (npm install required)
  if (!existsSync(join(cwd, 'package.json'))) {
    throw new Error('Framework package.json not found. Run setup/bootstrap.ps1 first.');
  }

  // Verify e2e tests exist — check suite-scoped path first, then legacy
  const e2eTestsDir = ctx.paths?.e2e
    ? join(ctx.paths.e2e, 'tests')
    : join(cwd, 'e2e', 'tests');
  if (!existsSync(e2eTestsDir)) {
    throw new Error(`No e2e tests found at ${e2eTestsDir}. Run @qa generate-e2e first.`);
  }

  const mode     = ctx.args?.mode ?? 'default';
  const headed   = ctx.args?.headed !== 'false' && ctx.args?.headed !== false;
  const suite    = ctx.args?.suite;
  const safeSuite = suite ? String(suite).replace(/[^a-z0-9-_]/gi, '-').toLowerCase() : null;
  const slowMo   = ctx.args?.slowmo ?? '60';

  // ── List mode: enumerate all test names without running ───────────────────
  if (mode === 'list') {
    return await listTests(safeSuite, cwd);
  }

  // ── Single mode: run one test by exact name via --grep ────────────────────
  if (mode === 'single' && ctx.args?.testName) {
    return await runSingleNamedTest(ctx.args.testName, safeSuite, headed, slowMo, cwd);
  }

  // ── Default mode: run full suite ──────────────────────────────────────────
  const playwrightArgs = ['playwright', 'test'];
  if (headed) playwrightArgs.push('--headed');
  if (safeSuite) {
    // Pass just the filename as a regex filter — testDir is already scoped via QA_SUITE env var
    playwrightArgs.push(`${safeSuite}\\.spec\\.js`);
  }

  // Pass environment variables for configuration
  const env = {
    ...process.env,
    QA_SLOWMO: slowMo,           // Realistic human-speed interactions
    ...(safeSuite && { QA_SUITE: safeSuite }),  // Routes playwright outputs to TestResult/{suite}/
  };

  console.log(`\n🎬 Starting test execution...`);
  console.log(`   Mode    : ${headed ? 'Headed (browser visible)' : 'Headless'}`);
  console.log(`   Suite   : ${suite ?? 'all'}`);
  console.log(`   SlowMo  : ${slowMo}ms`);
  console.log(`   Config  : ${join(cwd, 'playwright.config.js')}\n`);

  const exitCode = await runCmd('npx', playwrightArgs, cwd, env);

  const status = exitCode === 0 ? '✅ All tests passed' : `❌ Tests finished with exit code ${exitCode}`;
  console.log(`\n${status}`);

  const reportsDir   = ctx.paths?.reports ?? join(cwd, 'reports');
  const junitPath    = join(reportsDir, 'junit.xml');
  const suiteRoot    = ctx.paths?.suiteRoot ?? (safeSuite ? join(cwd, 'TestResult', safeSuite) : cwd);
  const checklistPath = join(suiteRoot, 'test-checklist.md');

  // Update the test checklist with actual pass/fail results from JUnit XML
  if (existsSync(junitPath) && existsSync(checklistPath)) {
    try {
      await updateChecklist(checklistPath, junitPath);
      console.log(`\n📋 Checklist updated: ${checklistPath}`);
    } catch (e) {
      console.warn(`⚠️  Could not update checklist: ${e.message}`);
    }
  }

  return {
    exitCode,
    headed,
    suite: suite ?? 'all',
    reportPath: join(reportsDir, 'playwright-html', 'index.html'),
    junitPath,
    checklistPath: existsSync(checklistPath) ? checklistPath : null,
  };
}

// ─── Checklist updater ────────────────────────────────────────────────────────

/**
 * Parse JUnit XML and update the test-checklist.md file.
 * Marks each test as ✅ Passed, ❌ Failed, or ⏭️ Skipped.
 */
async function updateChecklist(checklistPath, junitPath) {
  const xml      = await readFile(junitPath, 'utf8');
  const content  = await readFile(checklistPath, 'utf8');

  // Parse test results from JUnit XML
  // <testcase name="TC-0001: title" ...>  — pass if no child failure/skipped element
  const results = {};
  const tcRx = /<testcase\s[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/testcase>|<testcase\s[^>]*name="([^"]+)"[^>]*\/>/g;
  let m;
  while ((m = tcRx.exec(xml)) !== null) {
    const name   = (m[1] ?? m[3]).trim();
    const body   = m[2] ?? '';
    const failed  = /<failure/i.test(body);
    const skipped = /<skipped/i.test(body);
    results[name] = failed ? 'fail' : skipped ? 'skip' : 'pass';
  }

  if (Object.keys(results).length === 0) return; // Nothing to update

  // Update each checklist line
  let passed = 0, failed = 0, skipped = 0, pending = 0;
  const updatedLines = content.split('\n').map(line => {
    const itemMatch = /^- \[[ x]\] `?([^`\s—]+)`?/.exec(line);
    if (!itemMatch) return line;

    const id = itemMatch[1];
    // Find result by matching TC ID prefix in test name
    const resultKey = Object.keys(results).find(k => k.startsWith(id));
    const result = resultKey ? results[resultKey] : null;

    if (!result) { pending++; return line; }

    const testName = resultKey;
    const [tcId, ...rest] = testName.split(':');
    const desc = rest.join(':').trim();
    const label = desc ? `\`${tcId.trim()}\` — ${desc}` : testName;

    if (result === 'pass')   { passed++;  return `- [x] ${label} ✅ Passed`; }
    if (result === 'fail')   { failed++;  return `- [x] ${label} ❌ Failed`; }
    if (result === 'skip')   { skipped++; return `- [x] ${label} ⏭️ Skipped`; }
    return line;
  });

  const total      = passed + failed + skipped + pending;
  const overallStatus = failed > 0  ? '❌ Has failures'
    : pending > 0 ? '🔄 In progress'
    : '✅ Complete';
  const date = new Date().toLocaleString('en-GB');

  // Update the header table Status row
  const withStatus = updatedLines.join('\n')
    .replace(/\| \*\*Status\*\* \|.*\|/, `| **Status** | ${overallStatus} |`)
    .replace(/\| \*\*Generated\*\* \|.*\|/, `| **Last run** | ${date} |`);

  // Update the Progress table
  const withProgress = withStatus
    .replace(/\| ✅ Passed \|.*\|/,  `| ✅ Passed | ${passed} |`)
    .replace(/\| ❌ Failed \|.*\|/,  `| ❌ Failed | ${failed} |`)
    .replace(/\| ⏭️ Skipped \|.*\|/, `| ⏭️ Skipped | ${skipped} |`)
    .replace(/\| ⏳ Pending \|.*\|/, `| ⏳ Pending | ${pending} |`);

  await writeFile(checklistPath, withProgress, 'utf8');
}

// ─── List tests (no-run) ──────────────────────────────────────────────────────

/**
 * Run `npx playwright test --list` and return the parsed test names.
 * Used by the AI per-test loop to know which tests to iterate over.
 */
async function listTests(safeSuite, cwd) {
  const args = ['playwright', 'test', '--list'];
  if (safeSuite) args.push(`${safeSuite}\\.spec\\.js`);

  const lines = await captureCmd('npx', args, cwd);
  // Playwright --list output format: "  · <test name>"  or  "    <test name>"
  const tests = lines
    .filter(l => /^\s+·?\s+\S/.test(l))
    .map(l => l.replace(/^\s+·?\s+/, '').trim())
    .filter(Boolean);

  console.log(`\n📋 Found ${tests.length} test(s) in suite '${safeSuite ?? 'all'}':`);
  tests.forEach((t, i) => console.log(`   ${i + 1}. ${t}`));

  return { tests, count: tests.length, suite: safeSuite ?? 'all' };
}

// ─── Run a single test by name ────────────────────────────────────────────────

/**
 * Run exactly one test by name using --grep, return exit code + pass/fail.
 * Used by the AI per-test fix loop to verify individual fixes.
 */
async function runSingleNamedTest(testName, safeSuite, headed, slowMo, cwd) {
  const safeTestName = testName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const args = ['playwright', 'test'];
  if (headed) args.push('--headed');
  args.push(`--grep=${safeTestName}`);
  if (safeSuite) args.push(`${safeSuite}\\.spec\\.js`);

  const env = {
    ...process.env,
    QA_SLOWMO: slowMo,
    ...(safeSuite && { QA_SUITE: safeSuite }),
  };

  console.log(`\n▶ Running single test: "${testName}"`);
  const exitCode = await runCmd('npx', args, cwd, env);
  const passed = exitCode === 0;
  console.log(`   ${passed ? '✅ Passed' : '❌ Failed'} — exit code ${exitCode}`);

  return { exitCode, passed, testName };
}

// ─── Capture stdout helper ────────────────────────────────────────────────────

function captureCmd(cmd, args, cwd) {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const lines = [];
    const child = spawn(
      isWin ? `${cmd}.cmd` : cmd,
      args,
      { cwd, shell: isWin, env: process.env },
    );
    child.stdout?.on('data', d => lines.push(...String(d).split('\n')));
    child.stderr?.on('data', d => lines.push(...String(d).split('\n')));
    child.on('exit', () => resolve(lines));
    child.on('error', () => resolve(lines));
  });
}

// ─── Command runner ───────────────────────────────────────────────────────────

function runCmd(cmd, args, cwd, env) {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const child = spawn(
      isWin ? `${cmd}.cmd` : cmd,
      args,
      { cwd, stdio: 'inherit', shell: isWin, env },
    );
    child.on('exit', (code) => resolve(code ?? 1));
    child.on('error', (err) => {
      console.error(`[test-execution] spawn error: ${err.message}`);
      resolve(1);
    });
  });
}


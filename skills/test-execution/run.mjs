import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
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

  const headed   = ctx.args?.headed !== 'false' && ctx.args?.headed !== false;
  const suite    = ctx.args?.suite;
  const safeSuite = suite ? String(suite).replace(/[^a-z0-9-_]/gi, '-').toLowerCase() : null;
  const slowMo   = ctx.args?.slowmo ?? '60';

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

  const reportsDir = ctx.paths?.reports ?? join(cwd, 'reports');

  return {
    exitCode,
    headed,
    suite: suite ?? 'all',
    reportPath: join(reportsDir, 'playwright-html', 'index.html'),
    junitPath:  join(reportsDir, 'junit.xml'),
  };
}

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


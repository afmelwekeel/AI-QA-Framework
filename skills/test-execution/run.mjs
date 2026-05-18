import { spawn }                        from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { readFile, writeFile, readdir }  from 'node:fs/promises';
import { join, dirname, resolve, extname } from 'node:path';
import { fileURLToPath }                 from 'node:url';

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
 *   default  — pre-flight review ALL specs, then run suite
 *   list     — list all test names without running (ctx.args.mode === 'list')
 *   single   — pre-flight review the target spec, then run one test by name (ctx.args.testName)
 *   review   — only run pre-flight review without executing tests (ctx.args.mode === 'review')
 *
 * Pre-flight review (runs automatically in default and single modes):
 *   1. Syntax check via `node --check`
 *   2. Import path existence check
 *   3. Test-data file existence check
 *   4. Anti-pattern detection (test.only, hardcoded URLs, deprecated API)
 *   5. Auto-fix simple deterministic issues before execution
 */
export default async function run(ctx) {
  const cwd = FRAMEWORK_ROOT;

  if (!existsSync(join(cwd, 'package.json'))) {
    throw new Error('Framework package.json not found. Run setup/bootstrap.ps1 first.');
  }

  const e2eTestsDir = ctx.paths?.e2e
    ? join(ctx.paths.e2e, 'tests')
    : join(cwd, 'e2e', 'tests');

  if (!existsSync(e2eTestsDir)) {
    throw new Error(`No e2e tests found at ${e2eTestsDir}. Run @qa generate-e2e first.`);
  }

  const mode      = ctx.args?.mode ?? 'default';
  const headed    = ctx.args?.headed !== 'false' && ctx.args?.headed !== false;
  const suite     = ctx.args?.suite;
  const safeSuite = suite ? String(suite).replace(/[^a-z0-9-_]/gi, '-').toLowerCase() : null;
  const slowMo    = ctx.args?.slowmo ?? '60';

  // ── List mode ─────────────────────────────────────────────────────────────
  if (mode === 'list') {
    return await listTests(safeSuite, cwd);
  }

  // ── Review-only mode ──────────────────────────────────────────────────────
  if (mode === 'review') {
    const specFiles = await findSpecFiles(e2eTestsDir, safeSuite);
    const report    = await preflightReviewSpecs(specFiles, ctx.paths);
    printPreflightReport(report);
    return { mode: 'review', preflightReport: report };
  }

  // ── Single mode ───────────────────────────────────────────────────────────
  if (mode === 'single' && ctx.args?.testName) {
    // Pre-flight the specific spec file before running the single test
    const specFiles = await findSpecFiles(e2eTestsDir, safeSuite);
    const report    = await preflightReviewSpecs(specFiles, ctx.paths);
    printPreflightReport(report);

    return await runSingleNamedTest(ctx.args.testName, safeSuite, headed, slowMo, cwd, report);
  }

  // ── Default mode: pre-flight → run full suite ─────────────────────────────
  const specFiles = await findSpecFiles(e2eTestsDir, safeSuite);
  if (specFiles.length === 0) {
    throw new Error(`No spec files found in ${e2eTestsDir}. Run @qa generate-e2e first.`);
  }

  // Pre-flight review — check + auto-fix before any test runs
  console.log('\n🔍 Pre-flight spec review starting...\n');
  const preflightReport = await preflightReviewSpecs(specFiles, ctx.paths);
  printPreflightReport(preflightReport);

  if (preflightReport.blockers > 0) {
    console.log(`\n❌ Pre-flight found ${preflightReport.blockers} blocker(s) that require AI review before execution.`);
    console.log(`   Rayan will now review and fix these — see prompt.md Step 0.5 for the review protocol.\n`);
    // Return the report so the AI can act on it; don't run tests with broken specs
    return {
      preflightReport,
      requiresAIReview: true,
      blockers: preflightReport.blockers,
      message: 'Pre-flight found issues that need AI review. Fix them first, then re-run.',
    };
  }

  if (preflightReport.totalIssues > 0) {
    console.log(`\n⚠️  Pre-flight fixed ${preflightReport.autoFixed} issue(s) automatically. ${preflightReport.warnings} warning(s) remain.\n`);
  } else {
    console.log('\n✅ Pre-flight passed — all spec files look clean.\n');
  }

  // Run full suite
  const playwrightArgs = ['playwright', 'test'];
  if (headed) playwrightArgs.push('--headed');
  if (safeSuite) playwrightArgs.push(`${safeSuite}\\.spec\\.js`);

  const env = {
    ...process.env,
    QA_SLOWMO: slowMo,
    ...(safeSuite && { QA_SUITE: safeSuite }),
  };

  console.log(`\n🎬 Starting test execution...`);
  console.log(`   Mode    : ${headed ? 'Headed (browser visible)' : 'Headless'}`);
  console.log(`   Suite   : ${suite ?? 'all'}`);
  console.log(`   SlowMo  : ${slowMo}ms`);
  console.log(`   Config  : ${join(cwd, 'playwright.config.js')}\n`);

  const exitCode = await runCmd('npx', playwrightArgs, cwd, env);

  const status = exitCode === 0 ? '✅ All tests passed' : `❌ Tests finished with exit code ${exitCode}`;
  console.log(`\n${status}`);

  const reportsDir    = ctx.paths?.reports ?? join(cwd, 'reports');
  const junitPath     = join(reportsDir, 'junit.xml');
  const suiteRoot     = ctx.paths?.suiteRoot ?? (safeSuite ? join(cwd, 'TestResult', safeSuite) : cwd);
  const checklistPath = join(suiteRoot, 'test-checklist.md');

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
    preflightReport,
    reportPath:    join(reportsDir, 'playwright-html', 'index.html'),
    junitPath,
    checklistPath: existsSync(checklistPath) ? checklistPath : null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRE-FLIGHT REVIEW ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Find all spec files matching the suite filter.
 */
async function findSpecFiles(testDir, safeSuite) {
  if (!existsSync(testDir)) return [];
  const files = await readdir(testDir).catch(() => []);
  return files
    .filter(f => f.endsWith('.spec.js') && (!safeSuite || f.startsWith(safeSuite)))
    .map(f => join(testDir, f));
}

/**
 * Run pre-flight checks on all spec files:
 *   1. Syntax   — node --check
 *   2. Imports  — referenced page-object files exist
 *   3. Testdata — JSON files referenced in the spec exist
 *   4. Antipatterns — .only, hardcoded URLs, deprecated API calls
 *
 * Auto-fixes applied immediately (writes back to file):
 *   • test.only / describe.only → test / describe
 *   • Import paths using wrong extension (.ts → .js when .js exists)
 *   • Backslash import separators on Windows → forward-slash
 */
async function preflightReviewSpecs(specFiles, ctxPaths) {
  const results = [];
  let totalIssues = 0;
  let autoFixed   = 0;
  let warnings    = 0;
  let blockers    = 0;

  for (const specPath of specFiles) {
    const result = await reviewOneSpec(specPath, ctxPaths);
    results.push(result);
    totalIssues += result.issues.length;
    autoFixed   += result.autoFixed;
    warnings    += result.issues.filter(i => i.severity === 'warning').length;
    blockers    += result.issues.filter(i => i.severity === 'blocker').length;
  }

  return { specFiles: results, totalIssues, autoFixed, warnings, blockers };
}

async function reviewOneSpec(specPath, ctxPaths) {
  const issues   = [];
  let autoFixed  = 0;
  let src        = '';

  if (!existsSync(specPath)) {
    return { specPath, issues: [{ severity: 'blocker', type: 'missing-file', msg: 'Spec file not found' }], autoFixed: 0 };
  }

  src = readFileSync(specPath, 'utf8');

  // ── 1. Syntax check ───────────────────────────────────────────────────────
  const syntaxResult = await checkSyntax(specPath);
  if (!syntaxResult.ok) {
    issues.push({ severity: 'blocker', type: 'syntax', msg: syntaxResult.error });
  }

  // ── 2. Import paths ────────────────────────────────────────────────────────
  const importIssues = checkImports(src, specPath);
  for (const imp of importIssues) {
    if (imp.fixedPath) {
      // Auto-fixable: wrong extension
      src = src.replace(imp.rawImport, imp.fixedPath);
      autoFixed++;
      issues.push({ severity: 'fixed', type: 'import-extension', msg: `Fixed import: ${imp.rawImport} → ${imp.fixedPath}` });
    } else {
      issues.push({ severity: 'blocker', type: 'missing-import', msg: `Missing file: ${imp.rawImport} (resolved: ${imp.resolved})` });
    }
  }

  // ── 3. Test-data file references ──────────────────────────────────────────
  const testdataIssues = checkTestdataRefs(src, specPath, ctxPaths);
  for (const td of testdataIssues) {
    issues.push({ severity: 'blocker', type: 'missing-testdata', msg: `Missing test-data file: ${td.raw} (resolved: ${td.resolved})` });
  }

  // ── 4. Anti-patterns ──────────────────────────────────────────────────────
  const { fixed: apFixed, src: srcAfterAP, antipatternIssues } = fixAntipatterns(src, specPath);
  autoFixed += apFixed;
  src        = srcAfterAP;
  issues.push(...antipatternIssues);

  // ── 5. Write back if auto-fixes were applied ──────────────────────────────
  if (autoFixed > 0) {
    writeFileSync(specPath, src, 'utf8');
  }

  return { specPath, issues, autoFixed };
}

// ── Syntax check via node --check ────────────────────────────────────────────

function checkSyntax(filePath) {
  return new Promise(resolve => {
    const proc = spawn(process.execPath, ['--check', filePath], { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    proc.stderr.on('data', d => { err += d; });
    proc.on('close', code => {
      if (code === 0) resolve({ ok: true });
      else resolve({ ok: false, error: err.trim().replace(/\n+/g, ' | ') });
    });
    proc.on('error', () => resolve({ ok: true }));
  });
}

// ── Import path existence ─────────────────────────────────────────────────────

function checkImports(src, specPath) {
  const specDir = dirname(specPath);
  const issues  = [];
  const rx      = /from\s+['"](\.[^'"]+)['"]/g;
  let m;

  while ((m = rx.exec(src)) !== null) {
    const raw      = m[1];
    const resolved = resolve(specDir, raw);

    if (existsSync(resolved)) continue;

    // Try common extension variants
    const variants = ['.js', '.mjs', '.cjs', '.ts'];
    const base     = extname(resolved) ? resolved.replace(/\.[^.]+$/, '') : resolved;
    const fixedExt = variants.find(v => existsSync(base + v) && !resolved.endsWith(v));

    if (fixedExt) {
      // Auto-fixable: just the extension is wrong
      const fixedPath = raw.replace(/\.[^.]+$/, fixedExt);
      issues.push({ rawImport: raw, resolved, fixedPath });
    } else if (!existsSync(resolved) && !existsSync(resolved + '.js')) {
      // Missing entirely — needs AI review
      issues.push({ rawImport: raw, resolved, fixedPath: null });
    }
  }

  return issues;
}

// ── Test-data file references ─────────────────────────────────────────────────

function checkTestdataRefs(src, specPath, ctxPaths) {
  const specDir = dirname(specPath);
  const issues  = [];

  // Patterns: require('../test-data/x.json'), import x from '../test-data/x.json'
  const rx = /(?:require|from)\s*\(\s*['"]([^'"]*testdata[^'"]*|[^'"]*test-data[^'"]*\.json)['"]/gi;
  let m;

  while ((m = rx.exec(src)) !== null) {
    const raw      = m[1];
    const resolved = resolve(specDir, raw);
    if (!existsSync(resolved)) {
      issues.push({ raw, resolved });
    }
  }

  return issues;
}

// ── Anti-pattern auto-fixer ───────────────────────────────────────────────────

function fixAntipatterns(src, specPath) {
  const antipatternIssues = [];
  let fixed = 0;

  // Auto-fix: test.only → test
  if (/\btest\.only\s*\(/.test(src)) {
    src = src.replace(/\btest\.only\s*\(/g, 'test(');
    fixed++;
    antipatternIssues.push({ severity: 'fixed', type: 'test-only', msg: 'Auto-fixed: test.only() → test()' });
  }

  // Auto-fix: describe.only → describe
  if (/\bdescribe\.only\s*\(/.test(src)) {
    src = src.replace(/\bdescribe\.only\s*\(/g, 'describe(');
    fixed++;
    antipatternIssues.push({ severity: 'fixed', type: 'describe-only', msg: 'Auto-fixed: describe.only() → describe()' });
  }

  // Auto-fix: test.skip on all tests (should not happen in committed specs)
  if (/\btest\.skip\s*\(/g.test(src)) {
    antipatternIssues.push({ severity: 'warning', type: 'test-skip', msg: 'test.skip() found — some tests will not run' });
  }

  // Warning: hardcoded localhost with port — should come from testData or BASE_URL
  if (/(['"`])https?:\/\/localhost:\d+/.test(src) && !/process\.env|baseURL|testData/.test(src)) {
    antipatternIssues.push({ severity: 'warning', type: 'hardcoded-url', msg: 'Hardcoded localhost URL — use testData.baseUrl or process.env.BASE_URL instead' });
  }

  // Warning: deprecated Playwright APIs
  const deprecated = [
    { rx: /\bpage\.\$\s*\(/, name: 'page.$() is deprecated — use page.locator()' },
    { rx: /\bpage\.\$\$\s*\(/, name: 'page.$$() is deprecated — use page.locator().all()' },
    { rx: /\bpage\.waitForTimeout\s*\(/, name: 'page.waitForTimeout() is a timing smell — use proper waits' },
    { rx: /\bpage\.waitForNavigation\s*\(/, name: 'page.waitForNavigation() is fragile — use page.waitForURL() or waitForLoadState()' },
  ];
  for (const { rx, name } of deprecated) {
    if (rx.test(src)) {
      antipatternIssues.push({ severity: 'warning', type: 'deprecated-api', msg: name });
    }
  }

  // Warning: missing await on common Playwright async calls (basic pattern, not AST-based)
  // Only flag clear cases: assignment or standalone call without await
  const missingAwaitRx = /^(?!\s*\/\/)(?!\s*await)(?!\s*return)\s+(?:page|locator|frame)\.\b(?:click|fill|type|goto|navigate|check|uncheck|selectOption|setInputFiles|hover|focus|press|waitFor|evaluate)\s*\(/gm;
  if (missingAwaitRx.test(src)) {
    antipatternIssues.push({ severity: 'warning', type: 'missing-await', msg: 'Possible missing await on Playwright async calls — AI review recommended' });
  }

  // Auto-fix: Windows backslash in import paths → forward slash
  const backslashImportRx = /from\s+['"](\.[^'"]*\\[^'"]+)['"]/g;
  let m;
  while ((m = backslashImportRx.exec(src)) !== null) {
    const fixed_path = m[1].replace(/\\/g, '/');
    src = src.replace(m[1], fixed_path);
    fixed++;
    antipatternIssues.push({ severity: 'fixed', type: 'backslash-import', msg: `Auto-fixed: backslash → forward-slash in import: ${m[1]}` });
  }

  return { fixed, src, antipatternIssues };
}

// ── Console reporter ──────────────────────────────────────────────────────────

function printPreflightReport(report) {
  const { specFiles, totalIssues, autoFixed, warnings, blockers } = report;

  console.log('┌─────────────────────────────────────────────────────┐');
  console.log('│              Pre-Flight Spec Review                  │');
  console.log('├─────────────────────────────────────────────────────┤');
  console.log(`│  Specs reviewed  : ${String(specFiles.length).padEnd(31)}│`);
  console.log(`│  Issues found    : ${String(totalIssues).padEnd(31)}│`);
  console.log(`│  Auto-fixed      : ${String(autoFixed).padEnd(31)}│`);
  console.log(`│  Warnings        : ${String(warnings).padEnd(31)}│`);
  console.log(`│  Blockers        : ${String(blockers).padEnd(31)}│`);
  console.log('└─────────────────────────────────────────────────────┘');

  for (const spec of specFiles) {
    if (spec.issues.length === 0 && spec.autoFixed === 0) {
      console.log(`  ✅  ${spec.specPath.split(/[/\\]/).pop()}`);
      continue;
    }
    const icon = spec.issues.some(i => i.severity === 'blocker') ? '❌' : '⚠️ ';
    console.log(`  ${icon}  ${spec.specPath.split(/[/\\]/).pop()}`);
    for (const issue of spec.issues) {
      const badge = issue.severity === 'blocker' ? '[BLOCKER]' :
                    issue.severity === 'fixed'   ? '[FIXED  ]' : '[WARN   ]';
      console.log(`       ${badge} ${issue.msg}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECKLIST UPDATER
// ═══════════════════════════════════════════════════════════════════════════════

async function updateChecklist(checklistPath, junitPath) {
  const xml     = await readFile(junitPath, 'utf8');
  const content = await readFile(checklistPath, 'utf8');

  const results = {};
  const tcRx = /<testcase\s[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/testcase>|<testcase\s[^>]*name="([^"]+)"[^>]*\/>/g;
  let m;
  while ((m = tcRx.exec(xml)) !== null) {
    const name    = (m[1] ?? m[3]).trim();
    const body    = m[2] ?? '';
    const failed  = /<failure/i.test(body);
    const skipped = /<skipped/i.test(body);
    results[name] = failed ? 'fail' : skipped ? 'skip' : 'pass';
  }

  if (Object.keys(results).length === 0) return;

  let passed = 0, failed = 0, skipped = 0, pending = 0;
  const updatedLines = content.split('\n').map(line => {
    const itemMatch = /^- \[[ x]\] `?([^`\s—]+)`?/.exec(line);
    if (!itemMatch) return line;

    const id        = itemMatch[1];
    const resultKey = Object.keys(results).find(k => k.startsWith(id));
    const result    = resultKey ? results[resultKey] : null;

    if (!result) { pending++; return line; }

    const testName  = resultKey;
    const [tcId, ...rest] = testName.split(':');
    const desc  = rest.join(':').trim();
    const label = desc ? `\`${tcId.trim()}\` — ${desc}` : testName;

    if (result === 'pass')   { passed++;  return `- [x] ${label} ✅ Passed`; }
    if (result === 'fail')   { failed++;  return `- [x] ${label} ❌ Failed`; }
    if (result === 'skip')   { skipped++; return `- [x] ${label} ⏭️ Skipped`; }
    return line;
  });

  const total         = passed + failed + skipped + pending;
  const overallStatus = failed > 0  ? '❌ Has failures'
    : pending > 0 ? '🔄 In progress'
    : '✅ Complete';
  const date = new Date().toLocaleString('en-GB');

  const withStatus = updatedLines.join('\n')
    .replace(/\| \*\*Status\*\* \|.*\|/, `| **Status** | ${overallStatus} |`)
    .replace(/\| \*\*Generated\*\* \|.*\|/, `| **Last run** | ${date} |`);

  const withProgress = withStatus
    .replace(/\| ✅ Passed \|.*\|/,  `| ✅ Passed | ${passed} |`)
    .replace(/\| ❌ Failed \|.*\|/,  `| ❌ Failed | ${failed} |`)
    .replace(/\| ⏭️ Skipped \|.*\|/, `| ⏭️ Skipped | ${skipped} |`)
    .replace(/\| ⏳ Pending \|.*\|/, `| ⏳ Pending | ${pending} |`);

  await writeFile(checklistPath, withProgress, 'utf8');
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST LISTING
// ═══════════════════════════════════════════════════════════════════════════════

async function listTests(safeSuite, cwd) {
  const args = ['playwright', 'test', '--list'];
  if (safeSuite) args.push(`${safeSuite}\\.spec\\.js`);

  const lines = await captureCmd('npx', args, cwd);
  const tests = lines
    .filter(l => /^\s+·?\s+\S/.test(l))
    .map(l => l.replace(/^\s+·?\s+/, '').trim())
    .filter(Boolean);

  console.log(`\n📋 Found ${tests.length} test(s) in suite '${safeSuite ?? 'all'}':`);
  tests.forEach((t, i) => console.log(`   ${i + 1}. ${t}`));

  return { tests, count: tests.length, suite: safeSuite ?? 'all' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLE TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

async function runSingleNamedTest(testName, safeSuite, headed, slowMo, cwd, preflightReport) {
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
  const passed   = exitCode === 0;
  console.log(`   ${passed ? '✅ Passed' : '❌ Failed'} — exit code ${exitCode}`);

  return { exitCode, passed, testName, preflightReport };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMAND HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

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
    child.on('exit',  () => resolve(lines));
    child.on('error', () => resolve(lines));
  });
}

function runCmd(cmd, args, cwd, env) {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const child = spawn(
      isWin ? `${cmd}.cmd` : cmd,
      args,
      { cwd, stdio: 'inherit', shell: isWin, env },
    );
    child.on('exit',  (code) => resolve(code ?? 1));
    child.on('error', (err)  => {
      console.error(`[test-execution] spawn error: ${err.message}`);
      resolve(1);
    });
  });
}

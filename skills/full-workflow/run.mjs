import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';

const __dirname      = dirname(fileURLToPath(import.meta.url));
const FRAMEWORK_ROOT = join(__dirname, '..', '..');
const SKILLS_ROOT    = join(FRAMEWORK_ROOT, 'skills');

/**
 * MASTER COMMAND — @qa full-workflow / @qa run-all
 *
 * Executes all 9 QA phases in sequence:
 *   Phase 0: Project Analysis  (if no config exists)
 *   Phase 1: Story Analysis    (if --story provided)
 *   Phase 2: Test Case Generation
 *   Phase 3: E2E Generation
 *   Phase 4: Test Data Generation
 *   Phase 5: Test Execution    (browser opens visually; Playwright retries each test once — failures become bugs)
 *   Phase 6: Bug Analysis
 *   Phase 7: QA Reporting
 *   Phase 8: Bug Fixing        (fix source code per bug, retest each individually)
 *
 * Usage:
 *   node core/orchestrator.mjs full-workflow --story ../docs/my-story.md --suite my-feature
 *   node core/orchestrator.mjs run-all
 */
export default async function run(ctx) {
  const startTime = Date.now();
  const trace     = [];
  let   ok        = true;

  console.log('\n' + '═'.repeat(60));
  console.log('   🚀 AI QA Framework v2 — Full Workflow (9 Phases)');
  console.log('═'.repeat(60));
  console.log(`   Story  : ${ctx.args?.story ?? '(not provided)'}`);
  console.log(`   Suite  : ${ctx.args?.suite ?? '(auto-detect)'}`);
  console.log(`   Headed : ${ctx.args?.headed !== 'false' ? 'YES — browser will open' : 'headless'}`);
  console.log('═'.repeat(60) + '\n');

  // ── Phase 0: Auto-detect project (if no config) ───────────────────────────
  if (!ctx.config) {
    const result = await runPhase('project-analysis', ctx, trace);
    if (!result.ok) {
      console.warn('⚠️  Project detection failed — continuing with defaults');
    }
  }

  // ── Phase 1: Story Analysis ───────────────────────────────────────────────
  let ast = null;
  if (ctx.args?.story) {
    const result = await runPhase('user-story-analysis', ctx, trace);
    if (result.ok) {
      ast = result.data?.ast;
      // Derive suite name from story if not provided
      if (!ctx.args.suite && ast?.id) {
        const derivedSuite = ast.id;
        // Re-derive paths so all phases write under TestResult/{derivedSuite}/
        const newPaths = ctx.buildSuitePaths
          ? ctx.buildSuitePaths(derivedSuite)
          : ctx.paths;
        ctx = { ...ctx, args: { ...ctx.args, suite: derivedSuite }, paths: newPaths };
      }
    }
  } else {
    skipPhase('user-story-analysis', 'No --story provided', trace);
  }

  // ── Phase 2: Test Case Generation ────────────────────────────────────────
  if (ast || ctx.args?.story) {
    await runPhase('test-case-generation', ctx, trace);
  } else {
    skipPhase('test-case-generation', 'No story or AST available', trace);
  }

  // ── Phase 3: E2E Test Generation ─────────────────────────────────────────
  if (ctx.args?.suite || ast?.id) {
    const suiteCtx = ast?.id
      ? { ...ctx, args: { ...ctx.args, suite: ctx.args.suite ?? ast.id } }
      : ctx;
    await runPhase('playwright-generation', suiteCtx, trace);
  } else {
    skipPhase('playwright-generation', 'No --suite name determined', trace);
  }

  // ── Phase 4: Test Data Generation ────────────────────────────────────────
  await runPhase('test-data-generation', ctx, trace);

  // ── Phase 5: Test Execution ───────────────────────────────────────────────
  console.log('\n' + '─'.repeat(60));
  console.log('   ▶️  Phase 5 — Test Execution (browser opening...)');
  console.log('─'.repeat(60));
  const execResult = await runPhase('test-execution', ctx, trace);
  if (!execResult.ok) ok = false;  // Track overall pass/fail but continue

  // ── Phase 6: Bug Analysis ─────────────────────────────────────────────────
  const bugResult = await runPhase('bug-analysis', ctx, trace);

  // ── Phase 7: QA Reporting ─────────────────────────────────────────────────
  const reportResult = await runPhase('qa-reporting', ctx, trace);

  // ── Phase 8: Bug Fixing ───────────────────────────────────────────────────
  // Only run if there are open bugs from the analysis phase
  const bugCount = bugResult?.data?.count ?? 0;
  if (bugCount > 0) {
    console.log('\n' + '─'.repeat(60));
    console.log(`   🔧 Phase 8 — Bug Fixing (${bugCount} bug(s) to fix)`);
    console.log('─'.repeat(60));
    await runPhase('bug-fixing', ctx, trace);
  } else {
    skipPhase('bug-fixing', 'No bugs found — all tests passed', trace);
  }

  // ── Final summary ─────────────────────────────────────────────────────────
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  const passed = trace.filter(t => t.status === 'passed').length;
  const failed = trace.filter(t => t.status === 'failed').length;

  const reportPath = reportResult.ok
    ? join(ctx.paths?.reports ?? join(FRAMEWORK_ROOT, 'reports'), 'qa-report.html')
    : null;

  console.log('\n' + '═'.repeat(60));
  console.log(`   ${ok ? '✅' : '⚠️ '} Full Workflow Complete`);
  console.log(`   Phases: ${passed} passed, ${failed} failed/skipped`);
  console.log(`   Duration: ${durationSec}s`);
  if (reportPath) console.log(`   Report: ${reportPath}`);
  console.log('═'.repeat(60) + '\n');

  // Save workflow trace
  const traceDir = ctx.paths?.reports ?? join(FRAMEWORK_ROOT, 'reports');
  await mkdir(traceDir, { recursive: true });
  await writeFile(
    join(traceDir, 'full-workflow-trace.json'),
    JSON.stringify({ ok, durationSec, trace, timestamp: new Date().toISOString() }, null, 2),
    'utf8',
  );

  return { ok, durationSec, phases: trace, reportPath };
}

// ── Phase runner ──────────────────────────────────────────────────────────────

async function runPhase(skillName, ctx, trace) {
  const label = getPhaseLabel(skillName);
  console.log(`\n▶ ${label}`);

  const runPath = join(SKILLS_ROOT, skillName, 'run.mjs');
  if (!existsSync(runPath)) {
    const entry = { skill: skillName, status: 'skipped', reason: 'skill not found', durationMs: 0 };
    trace.push(entry);
    console.log(`   ⏭️  Skipped — skill not found`);
    return { ok: false, ...entry };
  }

  const start = Date.now();
  try {
    const mod  = await import(pathToFileURL(runPath).href);
    const data = await mod.default(ctx);
    const durationMs = Date.now() - start;
    const entry = { skill: skillName, status: 'passed', data, durationMs };
    trace.push(entry);
    console.log(`   ✅ Done (${(durationMs / 1000).toFixed(1)}s)`);
    return { ok: true, ...entry };
  } catch (err) {
    const durationMs = Date.now() - start;
    const entry = { skill: skillName, status: 'failed', error: err?.message, durationMs };
    trace.push(entry);
    console.error(`   ❌ Failed: ${err?.message}`);
    return { ok: false, ...entry };
  }
}

function skipPhase(skillName, reason, trace) {
  trace.push({ skill: skillName, status: 'skipped', reason, durationMs: 0 });
  console.log(`   ⏭️  Skipped — ${reason}`);
}

function getPhaseLabel(skill) {
  const labels = {
    'project-analysis':     'Phase 0 — Project Analysis',
    'user-story-analysis':  'Phase 1 — Story Analysis',
    'test-case-generation': 'Phase 2 — Test Case Generation',
    'playwright-generation':'Phase 3 — E2E Test Generation',
    'test-data-generation': 'Phase 4 — Test Data Generation',
    'test-execution':       'Phase 5 — Test Execution',
    'bug-analysis':         'Phase 6 — Bug Analysis',
    'qa-reporting':         'Phase 7 — QA Reporting',
    'bug-fixing':           'Phase 8 — Bug Fixing & Verification',
  };
  return labels[skill] ?? skill;
}

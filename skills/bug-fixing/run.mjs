import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname      = dirname(fileURLToPath(import.meta.url));
const FRAMEWORK_ROOT = join(__dirname, '..', '..');

/**
 * Phase 8 — Bug Fixing & Verification
 *
 * Reads every BUG-XXXX.md in bug-reports/, extracts the failing test name,
 * and re-runs ONLY that test after the AI has applied a fix.
 *
 * This script handles only the mechanical parts:
 *   1. List all open bugs from the index
 *   2. Run a single named test to verify a fix
 *   3. Update the bug report with the retest outcome
 *
 * The actual source-code fixing is done by Claude Code following the
 * prompt.md instructions in this skill folder.
 */
export default async function run(ctx) {
  const bugDir     = ctx.paths?.bugReports ?? join(FRAMEWORK_ROOT, 'bug-reports');
  const reportsDir = ctx.paths?.reports    ?? join(FRAMEWORK_ROOT, 'reports');
  const suite      = ctx.args?.suite;

  if (!existsSync(bugDir)) {
    console.log('[bug-fixing] No bug-reports directory — nothing to fix.');
    return { fixed: 0, stillFailing: 0, bugs: [] };
  }

  // Read all BUG-XXXX.md files
  let files;
  try {
    files = (await readdir(bugDir)).filter(f => /^BUG-\d+\.md$/.test(f)).sort();
  } catch {
    return { fixed: 0, stillFailing: 0, bugs: [] };
  }

  if (files.length === 0) {
    console.log('[bug-fixing] No bug files found — all tests passed previously.');
    return { fixed: 0, stillFailing: 0, bugs: [] };
  }

  console.log(`\n🔧 Bug Fixing Phase — ${files.length} bug(s) to process`);

  const results = [];

  for (const file of files) {
    const bugPath  = join(bugDir, file);
    const bugId    = file.replace('.md', '');
    const content  = await readFile(bugPath, 'utf8');

    // Extract test name from the bug report heading (first line: # BUG-XXXX — <test name>)
    const titleMatch = content.match(/^#\s+BUG-\d+\s+—\s+(.+)$/m);
    const testName   = titleMatch ? titleMatch[1].trim() : null;

    // Extract the spec file slug from the stack trace or classname
    const classMatch = content.match(/\|\s+\*\*الموديول\*\*\s+\|\s+(.+?)\s+\|/);
    const specSlug   = classMatch ? classMatch[1].trim() : null;

    console.log(`\n  📋 ${bugId}: ${testName ?? '(unknown test)'}`);

    // Re-run just this test by name filter
    let retestCode = null;
    if (testName) {
      retestCode = await runSingleTest(testName, specSlug, suite, ctx);
      const passed = retestCode === 0;

      // Append fix-verification result to the bug report
      const stamp = new Date().toISOString();
      const statusLine = passed
        ? `\n---\n\n## ✅ تم الإصلاح — Verification Passed\n\n> تم التحقق من الإصلاح بنجاح في: ${stamp}\n`
        : `\n---\n\n## ❌ لا يزال فاشلاً — Still Failing After Fix Attempt\n\n> تم إعادة الاختبار في: ${stamp} — لا يزال الاختبار يفشل.\n`;

      if (!content.includes('تم الإصلاح') && !content.includes('لا يزال فاشلاً')) {
        await writeFile(bugPath, content + statusLine, 'utf8');
      }

      results.push({ bugId, testName, passed, retestCode });
      console.log(`     ${passed ? '✅ Fixed' : '❌ Still failing'}`);
    } else {
      console.log(`     ⚠️  Could not extract test name — skipping retest`);
      results.push({ bugId, testName: null, passed: null, retestCode: null });
    }
  }

  const fixed       = results.filter(r => r.passed === true).length;
  const stillFailing = results.filter(r => r.passed === false).length;

  console.log(`\n🔧 Bug Fix Summary: ${fixed} fixed, ${stillFailing} still failing`);

  // Update the bug index with fix status
  await updateBugIndex(bugDir, results);

  return { fixed, stillFailing, bugs: results };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function runSingleTest(testName, specSlug, suite, ctx) {
  return new Promise((resolve) => {
    const cwd  = FRAMEWORK_ROOT;
    const isWin = process.platform === 'win32';

    // Use --grep to target a single test by name
    const safeTestName = testName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const args = ['playwright', 'test', '--headed', `--grep="${safeTestName}"`];

    if (specSlug && !specSlug.includes('—')) {
      args.push(specSlug);
    } else if (suite) {
      const safeSuite = String(suite).replace(/[^a-z0-9-_]/gi, '-').toLowerCase();
      args.push(`${safeSuite}\\.spec\\.js`);
    }

    const env = {
      ...process.env,
      QA_SLOWMO: ctx.args?.slowmo ?? '60',
      ...(suite && { QA_SUITE: String(suite).replace(/[^a-z0-9-_]/gi, '-').toLowerCase() }),
    };

    const child = spawn(
      isWin ? 'npx.cmd' : 'npx',
      args,
      { cwd, stdio: 'inherit', shell: isWin, env },
    );
    child.on('exit',  code  => resolve(code ?? 1));
    child.on('error', ()    => resolve(1));
  });
}

async function updateBugIndex(bugDir, results) {
  const indexPath = join(bugDir, 'INDEX.md');
  if (!existsSync(indexPath)) return;

  let index = await readFile(indexPath, 'utf8');

  for (const r of results) {
    if (r.passed === null) continue;
    const status = r.passed ? '✅ Fixed' : '❌ Still Open';
    // Append status column if the index line contains this bug ID
    index = index.replace(
      new RegExp(`(\\| \`${r.bugId}\`[^\\n]+)(\\|)$`, 'm'),
      `$1 ${status} |`,
    );
  }

  await writeFile(indexPath, index, 'utf8');
}

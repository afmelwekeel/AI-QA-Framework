#!/usr/bin/env node
/**
 * AI QA Framework — Orchestrator
 * Single entry point for all @qa commands.
 *
 * Usage:
 *   node core/orchestrator.mjs <command> [--key value ...]
 *
 * The orchestrator is intentionally project-agnostic. It:
 *   1. Loads project.config.json (or runs detection if missing)
 *   2. Resolves the command -> skill mapping from commands/registry.yaml
 *   3. Dynamically imports skills/<skill>/run.mjs
 *   4. Returns a standard SkillResult envelope
 */

import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join, basename, extname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const FRAMEWORK_ROOT = resolve(__dirname, '..');
const PROJECT_ROOT   = resolve(FRAMEWORK_ROOT, '..');

const CONFIG_PATH = join(FRAMEWORK_ROOT, 'core', 'project.config.json');

// --- minimal arg parser -------------------------------------------------
// Supports:
//   --key value flags  (e.g. --story path/to/story.md --suite login)
//   --stories "path1 path2"  → parsed into args.stories (string array)
//   positional args    (e.g. full-workflow a.md b.md)  → collected into args.stories
// For backward-compat: if only one story, args.story is also set.
function parseArgs(argv) {
  const [, , cmd, ...rest] = argv;
  const args = {};
  const positionals = [];
  for (let i = 0; i < rest.length; i++) {
    const t = rest[i];
    if (t.startsWith('--')) {
      const key = t.slice(2);
      const val = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : true;
      args[key] = val;
    } else {
      positionals.push(t);
    }
  }
  // Resolve --stories flag (space/comma-separated string) or positional args into stories array
  if (args.stories) {
    args.stories = String(args.stories).split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
  } else if (positionals.length > 0) {
    args.stories = positionals;
  }
  if (args.stories?.length === 1) args.story = args.stories[0];
  if (args.story && !args.stories) args.stories = [args.story];
  return { cmd, args };
}

// --- command registry (kept here as JS for zero-dep startup) -----------
const COMMAND_TO_SKILL = {
  // Core pipeline
  'analyze-project':       'project-analysis',
  'analyze-story':         'user-story-analysis',
  'generate-test-cases':   'test-case-generation',
  'generate-e2e':          'playwright-generation',
  'generate-test-data':    'test-data-generation',
  'run-tests':             'test-execution',
  'analyze-bugs':          'bug-analysis',
  'generate-report':       'qa-reporting',
  // Master commands
  'full-workflow':         'full-workflow',
  'run-all':               'full-workflow',
  // Specialized
  'regression-test':       'regression-testing',
  'security-scan':         'security-validation',
  'accessibility-scan':    'accessibility-validation',
  'autonomous-run':        'autonomous-testing',
  'detect':                'project-analysis',
  // Test user management
  'fetch-test-users':      'fetch-test-users',
  'get-test-users':        'fetch-test-users',
};

async function loadConfig() {
  if (!existsSync(CONFIG_PATH)) return null;
  return JSON.parse(await readFile(CONFIG_PATH, 'utf8'));
}

async function saveConfig(cfg) {
  await mkdir(dirname(CONFIG_PATH), { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

async function runSkill(skillName, ctx) {
  const runPath = join(FRAMEWORK_ROOT, 'skills', skillName, 'run.mjs');
  if (!existsSync(runPath)) {
    return {
      ok: false,
      skill: skillName,
      errors: [`Skill handler not found: ${runPath}`],
      durationMs: 0,
    };
  }
  const mod = await import(pathToFileURL(runPath).href);
  const start = Date.now();
  try {
    const data = await mod.default(ctx);
    return { ok: true, skill: skillName, data, durationMs: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      skill: skillName,
      errors: [err?.message ?? String(err)],
      durationMs: Date.now() - start,
    };
  }
}

async function main() {
  const { cmd, args } = parseArgs(process.argv);
  if (!cmd || cmd === 'help') {
    console.log('AI QA Framework — commands:');
    for (const [c, s] of Object.entries(COMMAND_TO_SKILL)) {
      console.log(`  ${c.padEnd(24)} -> skills/${s}`);
    }
    process.exit(0);
  }

  const skill = COMMAND_TO_SKILL[cmd];
  if (!skill) {
    console.error(`Unknown command: ${cmd}`);
    process.exit(2);
  }

  const config = await loadConfig();

  // Auto-derive suite from first story filename if --suite not provided.
  // Ensures every command that receives stories writes to TestResult/{suite}/
  // with the correct folder structure, even when --suite is omitted.
  if (!args.suite && args.stories?.length > 0) {
    args.suite = basename(args.stories[0], extname(args.stories[0]));
  }

  // Resolve suite-scoped output root: TestResult/{suite}/
  const TEST_RESULT_ROOT = join(FRAMEWORK_ROOT, 'TestResult');
  const rawSuite = args.suite;
  const safeSuite = rawSuite
    ? String(rawSuite).replace(/[^a-z0-9-_]/gi, '-').toLowerCase()
    : null;
  const suiteRoot = safeSuite ? join(TEST_RESULT_ROOT, safeSuite) : null;

  /**
   * Builds output paths for a given suite name (or falls back to legacy
   * top-level folders when no suite is known).
   */
  function buildSuitePaths(suiteName) {
    const safe = suiteName
      ? String(suiteName).replace(/[^a-z0-9-_]/gi, '-').toLowerCase()
      : null;
    const root = safe ? join(TEST_RESULT_ROOT, safe) : null;
    return {
      suiteRoot:   root,
      testCases:   root ? join(root, 'test-cases')  : join(FRAMEWORK_ROOT, 'test-cases'),
      e2e:         root ? join(root, 'e2e')          : join(FRAMEWORK_ROOT, 'e2e'),
      testData:    root ? join(root, 'test-data')    : join(FRAMEWORK_ROOT, 'test-data'),
      bugReports:  root ? join(root, 'bug-reports')  : join(FRAMEWORK_ROOT, 'bug-reports'),
      reports:     root ? join(root, 'reports')      : join(FRAMEWORK_ROOT, 'reports'),
      screenshots: root ? join(root, 'screenshots')  : join(FRAMEWORK_ROOT, 'screenshots'),
      videos:      root ? join(root, 'videos')       : join(FRAMEWORK_ROOT, 'videos'),
      traces:      root ? join(root, 'traces')       : join(FRAMEWORK_ROOT, 'traces'),
    };
  }

  const ctx = {
    args,
    config,
    paths: {
      framework:       FRAMEWORK_ROOT,
      project:         PROJECT_ROOT,
      testResultRoot:  TEST_RESULT_ROOT,
      testing:         join(FRAMEWORK_ROOT, 'testing'),
      configPath:      CONFIG_PATH,
      ...buildSuitePaths(safeSuite),
    },
    // Expose helper so full-workflow can re-derive paths when suite comes from story AST
    buildSuitePaths: (name) => ({
      framework:       FRAMEWORK_ROOT,
      project:         PROJECT_ROOT,
      testResultRoot:  TEST_RESULT_ROOT,
      testing:         join(FRAMEWORK_ROOT, 'testing'),
      configPath:      CONFIG_PATH,
      ...buildSuitePaths(name),
    }),
    saveConfig,
  };

  const result = await runSkill(skill, ctx);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });

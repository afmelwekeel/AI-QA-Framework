/**
 * Bounded plan→act→observe→reflect loop for autonomous AI testing.
 * The loop is deterministic and gated by rules/quality-gates.yaml.
 *
 * Prefer using the full-workflow skill directly:
 *   node core/orchestrator.mjs full-workflow
 *
 * This loop is kept for MCP / programmatic usage.
 */
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRAMEWORK_ROOT = join(__dirname, '..');

const DEFAULT_PLAN = [
  'project-analysis',
  'user-story-analysis',
  'test-case-generation',
  'playwright-generation',
  'test-data-generation',
  'test-execution',
  'bug-analysis',
  'qa-reporting',
];

export async function autonomousRun(ctx, { plan = DEFAULT_PLAN, maxIterations = 1 } = {}) {
  const trace = [];
  for (let i = 0; i < maxIterations; i++) {
    for (const skill of plan) {
      const result = await runSkill(skill, ctx);
      trace.push(result);
      if (!result.ok && shouldStop(skill)) return { ok: false, trace };
    }
  }
  return { ok: true, trace };
}

function shouldStop(skill) {
  return ['project-analysis'].includes(skill);
}

async function runSkill(skill, ctx) {
  const runPath = join(FRAMEWORK_ROOT, 'skills', skill, 'run.mjs');
  if (!existsSync(runPath)) {
    return { ok: false, skill, errors: [`missing: ${runPath}`], durationMs: 0 };
  }
  const start = Date.now();
  try {
    const mod = await import(pathToFileURL(runPath).href);
    const data = await mod.default(ctx);
    return { ok: true, skill, data, durationMs: Date.now() - start };
  } catch (err) {
    return { ok: false, skill, errors: [err.message], durationMs: Date.now() - start };
  }
}

export default autonomousRun;

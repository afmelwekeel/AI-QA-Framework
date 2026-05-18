import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, basename, extname, resolve, isAbsolute } from 'node:path';

/**
 * Heuristic story parser. Accepts one or more story file paths via:
 *   ctx.args.stories  — string[] (preferred, from --stories or multiple positionals)
 *   ctx.args.story    — string   (single path, backward-compat)
 *
 * When multiple paths are provided, all ACs, scenarios, risks, and data are
 * merged into one unified AST. The ID/title come from the first story.
 */
export default async function run(ctx) {
  const paths = resolveStoryPaths(ctx);
  if (paths.length === 0) throw new Error('Missing --story <path> or --stories <path1> <path2> ...');

  const asts = await Promise.all(paths.map(p => parseStory(p)));
  const ast  = asts.length === 1 ? asts[0] : mergeAsts(asts);

  const outDir = join(ctx.paths.framework, 'reports', 'story-asts');
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, `${ast.id}.json`);
  await writeFile(outPath, JSON.stringify(ast, null, 2), 'utf8');
  return { ast, outPath };
}

function resolveStoryPaths(ctx) {
  const base = ctx.paths.project;
  const resolve_ = p => (isAbsolute(p) ? p : resolve(base, p));

  if (Array.isArray(ctx.args?.stories) && ctx.args.stories.length > 0) {
    return ctx.args.stories.map(resolve_);
  }
  if (typeof ctx.args?.stories === 'string' && ctx.args.stories.trim()) {
    return ctx.args.stories.trim().split(/[\s,]+/).filter(Boolean).map(resolve_);
  }
  if (ctx.args?.story) return [resolve_(ctx.args.story)];
  return [];
}

async function parseStory(storyPath) {
  const src = await readFile(storyPath, 'utf8');
  const ast = {
    id:                 basename(storyPath, extname(storyPath)),
    sourcePath:         storyPath,
    title:              extractTitle(src),
    actor:              extractMatch(src, /as an?\s+([^,\n]+)/i),
    goal:               extractMatch(src, /i\s+(?:want|need|would like)\s+to\s+([^,\n]+)/i),
    benefit:            extractMatch(src, /so\s+that\s+([^.\n]+)/i),
    acceptanceCriteria: extractAC(src),
    scenarios: { positive: [], negative: [], edge: [], security: [], permission: [] },
    risks:        [],
    dataNeeded:   [],
    dependencies: [],
  };
  ast.acceptanceCriteria.forEach((ac, i) => {
    ast.scenarios.positive.push({ id: `POS-${i + 1}`, ac, text: `Verify happy path: ${ac}` });
    ast.scenarios.negative.push({ id: `NEG-${i + 1}`, ac, text: `Verify failure path for: ${ac}` });
  });
  return ast;
}

function mergeAsts(asts) {
  const primary = asts[0];
  const merged = {
    id:           primary.id,
    sourcePaths:  asts.map(a => a.sourcePath),
    title:        primary.title,
    actor:        [...new Set(asts.map(a => a.actor).filter(Boolean))].join(' / ') || null,
    goal:         primary.goal,
    benefit:      primary.benefit,
    acceptanceCriteria: dedup(asts.flatMap(a => a.acceptanceCriteria)),
    scenarios: {
      positive:   [],
      negative:   [],
      edge:       [],
      security:   [],
      permission: [],
    },
    risks:        dedup(asts.flatMap(a => a.risks)),
    dataNeeded:   dedup(asts.flatMap(a => a.dataNeeded)),
    dependencies: dedup(asts.flatMap(a => a.dependencies)),
  };
  merged.acceptanceCriteria.forEach((ac, i) => {
    merged.scenarios.positive.push({ id: `POS-${i + 1}`, ac, text: `Verify happy path: ${ac}` });
    merged.scenarios.negative.push({ id: `NEG-${i + 1}`, ac, text: `Verify failure path for: ${ac}` });
  });
  return merged;
}

function dedup(arr) {
  return [...new Map(arr.map(v => [JSON.stringify(v), v])).values()];
}

function extractTitle(src) {
  const h1 = /^#\s+(.+)$/m.exec(src);
  return h1?.[1]?.trim() ?? null;
}
function extractMatch(src, rx) { return rx.exec(src)?.[1]?.trim() ?? null; }

function extractAC(src) {
  const acHeader = /(?:^|\n)#{1,6}\s*(?:acceptance criteria|قبول|معايير القبول)\b[^\n]*\n([\s\S]*?)(?:\n#{1,6}\s|\n*$)/i.exec(src);
  const block = acHeader?.[1] ?? src;
  return [...block.matchAll(/^\s*(?:[-*]|\d+\.)\s+(.+)$/gm)].map(m => m[1].trim());
}

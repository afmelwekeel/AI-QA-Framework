import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, basename, extname, resolve, isAbsolute } from 'node:path';

/**
 * Heuristic story parser. Extracts title, As-a/I-want/So-that, and acceptance
 * criteria bullets (lines starting with `-`, `*`, or numeric prefix in an "Acceptance" section).
 *
 * The output JSON is consumed by `test-case-generation`.
 */
export default async function run(ctx) {
  const storyArg = ctx.args.story;
  if (!storyArg) throw new Error('Missing --story <path>');
  const storyPath = isAbsolute(storyArg) ? storyArg : resolve(ctx.paths.project, storyArg);
  const src = await readFile(storyPath, 'utf8');

  const ast = {
    id: basename(storyPath, extname(storyPath)),
    sourcePath: storyPath,
    title: extractTitle(src),
    actor: extractMatch(src, /as an?\s+([^,\n]+)/i),
    goal: extractMatch(src, /i\s+(?:want|need|would like)\s+to\s+([^,\n]+)/i),
    benefit: extractMatch(src, /so\s+that\s+([^.\n]+)/i),
    acceptanceCriteria: extractAC(src),
    scenarios: { positive: [], negative: [], edge: [], security: [], permission: [] },
    risks: [],
    dataNeeded: [],
    dependencies: [],
  };

  // Default scenario seeds (1 positive + 1 negative per AC)
  ast.acceptanceCriteria.forEach((ac, i) => {
    ast.scenarios.positive.push({ id: `POS-${i + 1}`, ac, text: `Verify happy path: ${ac}` });
    ast.scenarios.negative.push({ id: `NEG-${i + 1}`, ac, text: `Verify failure path for: ${ac}` });
  });

  const outDir = join(ctx.paths.framework, 'reports', 'story-asts');
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, `${ast.id}.json`);
  await writeFile(outPath, JSON.stringify(ast, null, 2), 'utf8');
  return { ast, outPath };
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

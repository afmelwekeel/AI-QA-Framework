import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import runTests from '../test-execution/run.mjs';

export default async function run(ctx) {
  // Run tests (suite arg passes through)
  await runTests({ ...ctx, args: { ...ctx.args, headed: 'false' } });

  const junit = join(ctx.paths.framework, 'reports', 'junit.xml');
  const baselinePath = join(ctx.paths.framework, 'reports', 'baseline.json');
  const current = existsSync(junit) ? extractStatuses(await readFile(junit, 'utf8')) : {};
  const baseline = existsSync(baselinePath) ? JSON.parse(await readFile(baselinePath, 'utf8')) : {};

  const newlyFailing = [];
  const newlyPassing = [];
  for (const name of Object.keys(current)) {
    const prev = baseline[name];
    if (prev === 'passed' && current[name] === 'failed') newlyFailing.push(name);
    if (prev === 'failed' && current[name] === 'passed') newlyPassing.push(name);
  }

  const md = `# تقرير اختبار الانحدار

| الحالة | العدد |
|---|---|
| فشل جديد | ${newlyFailing.length} |
| إصلاح | ${newlyPassing.length} |

## فشل جديد
${newlyFailing.map(t => `- ${t}`).join('\n') || 'لا يوجد'}

## تم إصلاحه
${newlyPassing.map(t => `- ${t}`).join('\n') || 'لا يوجد'}
`;

  const outPath = join(ctx.paths.framework, 'reports', 'regression-diff.md');
  await mkdir(join(ctx.paths.framework, 'reports'), { recursive: true });
  await writeFile(outPath, md, 'utf8');

  // update baseline for next run
  await writeFile(baselinePath, JSON.stringify(current, null, 2), 'utf8');

  return { outPath, newlyFailing, newlyPassing };
}

function extractStatuses(xml) {
  const out = {};
  for (const m of xml.matchAll(/<testcase[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/testcase>/g)) {
    out[m[1]] = /<failure/.test(m[2]) ? 'failed' : (/<skipped/.test(m[2]) ? 'skipped' : 'passed');
  }
  return out;
}

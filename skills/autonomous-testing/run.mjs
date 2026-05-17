import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import autonomousRun from '../../core/autonomous-loop.mjs';

export default async function run(ctx) {
  const result = await autonomousRun(ctx);
  const outDir = join(ctx.paths.framework, 'reports');
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, 'autonomous-trace.json');
  await writeFile(outPath, JSON.stringify(result, null, 2), 'utf8');
  return { outPath, ok: result.ok, steps: result.trace.length };
}

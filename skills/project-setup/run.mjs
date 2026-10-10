import { existsSync } from 'node:fs';
import { join } from 'node:path';

export default async function run(ctx) {
  const out = ctx.paths.testResultRoot;
  return {
    skill: 'project-setup',
    prompt: join(ctx.paths.framework, 'skills', 'project-setup', 'prompt.md'),
    outputRoot: out,
    existing: {
      guide:  existsSync(join(out, 'EXECUTION-GUIDE.md')),
      index:  existsSync(join(out, 'INDEX.md')),
      tables: existsSync(join(out, 'DATABASE-TABLES.md')),
    },
    instruction: 'Load and follow skills/project-setup/prompt.md. Update existing documents in place; never overwrite filled values with <TODO>.',
  };
}

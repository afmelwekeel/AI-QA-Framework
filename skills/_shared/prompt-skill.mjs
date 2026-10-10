import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Shared handler for prompt-driven skills.
 * The skill does not run tests itself. It validates inputs, locates the canonical
 * prompt and returns an instruction envelope the AI driver follows.
 */
export function buildEnvelope(ctx, { skill, promptFile, inputKey, inputLabel, requireGuide = true }) {
  const fw        = ctx.paths.framework;
  const outRoot   = ctx.paths.testResultRoot;
  const guidePath = join(outRoot, 'EXECUTION-GUIDE.md');
  const errors    = [];

  const input = ctx.args?.[inputKey] ?? ctx.args?._?.[0];
  if (!input && !ctx.args?.summary) errors.push(`Missing ${inputLabel}. Pass --${inputKey} <path>.`);
  else if (input && !existsSync(resolve(input))) errors.push(`${inputLabel} not found: ${input}`);

  if (requireGuide) {
    if (!existsSync(guidePath)) errors.push(`EXECUTION-GUIDE.md missing at ${guidePath}. Run setup first.`);
    else if (/<TODO>/.test(readFileSync(guidePath, 'utf8'))) errors.push('EXECUTION-GUIDE.md still has <TODO> values. Run setup.');
  }
  if (errors.length) throw new Error(errors.join(' '));

  const headless = ctx.args?.headless === true || ctx.args?.headless === 'true';
  return {
    skill,
    prompt: join(fw, 'reusable-prompts', promptFile),
    input: input ? resolve(input) : null,
    outputRoot: outRoot,
    browserMode: headless ? 'headless' : 'visible',
    summaryMode: !!ctx.args?.summary,
    instruction: `Load and follow ${promptFile}. Replace the {{...}} placeholder with the input path. Variables come from config.yaml.`,
  };
}

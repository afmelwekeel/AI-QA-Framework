import { buildEnvelope } from '../_shared/prompt-skill.mjs';

export default async function run(ctx) {
  return buildEnvelope(ctx, {
    skill: 'fix-bug',
    promptFile: 'fix-bug.prompt.md',
    inputKey: 'bug',
    inputLabel: 'bug file',
  });
}

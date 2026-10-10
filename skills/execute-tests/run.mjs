import { buildEnvelope } from '../_shared/prompt-skill.mjs';

export default async function run(ctx) {
  return buildEnvelope(ctx, {
    skill: 'execute-tests',
    promptFile: 'execute-tests.prompt.md',
    inputKey: 'file',
    inputLabel: 'test-case file',
  });
}

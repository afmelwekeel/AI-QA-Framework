import { buildEnvelope } from '../_shared/prompt-skill.mjs';

export default async function run(ctx) {
  return buildEnvelope(ctx, {
    skill: 'write-test-cases',
    promptFile: 'write-test-cases.prompt.md',
    inputKey: 'story',
    inputLabel: 'story file',
  });
}

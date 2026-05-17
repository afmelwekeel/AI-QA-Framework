import { existsSync } from 'node:fs';
import { join } from 'node:path';

export default async function detectPM(root) {
  const found = [];
  if (existsSync(join(root, 'package-lock.json'))) found.push('npm');
  if (existsSync(join(root, 'pnpm-lock.yaml')))    found.push('pnpm');
  if (existsSync(join(root, 'yarn.lock')))         found.push('yarn');
  if (existsSync(join(root, 'bun.lockb')))         found.push('bun');
  if (existsSync(join(root, 'requirements.txt')) || existsSync(join(root, 'pyproject.toml'))) found.push('pip');
  if (existsSync(join(root, 'pom.xml')))           found.push('maven');
  if (existsSync(join(root, 'build.gradle')) || existsSync(join(root, 'build.gradle.kts'))) found.push('gradle');
  if (existsSync(join(root, 'go.mod')))            found.push('go-modules');
  // .NET
  return found;
}

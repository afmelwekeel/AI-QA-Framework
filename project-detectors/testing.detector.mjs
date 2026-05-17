import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export default async function detectTesting(root) {
  const r = { unit: [], e2e: [], signals: [] };
  const pkgPath = join(root, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
      const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
      if (deps['jest'])             r.unit.push('jest');
      if (deps['vitest'])           r.unit.push('vitest');
      if (deps['mocha'])            r.unit.push('mocha');
      if (deps['@playwright/test']) r.e2e.push('playwright');
      if (deps['cypress'])          r.e2e.push('cypress');
      if (deps['@webdriverio/cli']) r.e2e.push('webdriverio');
    } catch {}
  }
  if (existsSync(join(root, 'pytest.ini')) || existsSync(join(root, 'tox.ini'))) r.unit.push('pytest');
  return r;
}

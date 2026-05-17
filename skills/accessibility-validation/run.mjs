import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Generates an accessibility spec on the fly that visits each detected page,
 * runs @axe-core/playwright, and writes a summary.
 * Requires `npm i -D @axe-core/playwright` in testing/ (added by bootstrap).
 */
export default async function run(ctx) {
  const cfg = ctx.config;
  if (!cfg) throw new Error('Run analyze-project first.');
  const pages = (cfg.routes?.pages ?? []).slice(0, 25);
  const baseUrl = cfg.environment.baseUrl;

  const specPath = join(ctx.paths.testing, 'tests', 'a11y.generated.spec.ts');
  const spec = `import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = ${JSON.stringify(pages)};

for (const path of PAGES) {
  test(\`a11y: \${path}\`, async ({ page }, info) => {
    await page.goto('${baseUrl}' + path);
    const results = await new AxeBuilder({ page }).analyze();
    await info.attach('axe-' + path.replace(/[^a-z0-9]/gi,'-'), {
      body: JSON.stringify(results.violations, null, 2),
      contentType: 'application/json',
    });
    expect(results.violations.filter(v => v.impact === 'critical')).toEqual([]);
  });
}
`;
  await mkdir(join(ctx.paths.testing, 'tests'), { recursive: true });
  await writeFile(specPath, spec, 'utf8');
  return { specPath, pageCount: pages.length, note: 'Run @qa run-tests to execute.' };
}

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Black-box security probe over detected endpoints.
 * Pure-fetch (no extra deps). Skipped if no endpoints detected.
 */
export default async function run(ctx) {
  const cfg = ctx.config;
  if (!cfg) throw new Error('Run analyze-project first.');
  const endpoints = (cfg.routes?.endpoints ?? []).slice(0, 50);
  const baseUrl = cfg.environment.apiUrl;

  const findings = [];
  for (const ep of endpoints) {
    const [verb, path] = ep.split(' ');
    const url = baseUrl + path.replace(/\{[^}]+\}/g, '1');
    try {
      const res = await fetch(url, { method: verb, headers: { 'Accept': 'application/json' } });
      const text = await res.text().catch(() => '');
      const issues = [];
      if (res.status !== 401 && res.status !== 403 && /authoriz|token|jwt/i.test(JSON.stringify(cfg.auth))) {
        issues.push(`الوصول بدون توثيق رجع ${res.status} (متوقع 401/403)`);
      }
      if (/exception|stack trace|at \w+\./i.test(text)) issues.push('تسريب stack trace في الاستجابة');
      if (!res.headers.get('x-content-type-options')) issues.push('ترويسة X-Content-Type-Options مفقودة');
      if (!res.headers.get('strict-transport-security') && url.startsWith('https')) issues.push('HSTS مفقودة');
      if (issues.length) findings.push({ url, verb, status: res.status, issues });
    } catch (e) {
      findings.push({ url, verb, error: e.message });
    }
  }

  const md = `# تقرير الفحص الأمني

تم فحص ${endpoints.length} نهاية. عدد النتائج: ${findings.length}.

${findings.map(f => `## ${f.verb} ${f.url}
- الحالة: ${f.status ?? 'فشل الاتصال'}
${(f.issues ?? [f.error]).map(i => `- ${i}`).join('\n')}`).join('\n\n') || 'لا توجد ملاحظات.'}
`;
  const outDir = join(ctx.paths.framework, 'reports');
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, 'security-scan.md');
  await writeFile(outPath, md, 'utf8');
  return { outPath, findingsCount: findings.length };
}

import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, isAbsolute, resolve, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname      = dirname(fileURLToPath(import.meta.url));
const FRAMEWORK_ROOT = join(__dirname, '..', '..');

/**
 * Phase 6 — Bug Detection & Reporting
 *
 * Parses Playwright JUnit XML, finds failures, and generates professional
 * Arabic bug reports (Markdown) in /bug-reports/.
 *
 * Each bug report includes:
 *   - Reproduction steps
 *   - Expected vs Actual result
 *   - Severity & Priority
 *   - Root cause analysis
 *   - Suggested fix
 *   - Links to screenshot / video / trace artifacts
 */
export default async function run(ctx) {
  const reportsDir = ctx.paths?.reports     ?? join(FRAMEWORK_ROOT, 'reports');
  const bugDir     = ctx.paths?.bugReports  ?? join(FRAMEWORK_ROOT, 'bug-reports');
  const ssDir      = ctx.paths?.screenshots ?? join(FRAMEWORK_ROOT, 'screenshots');
  const vidDir     = ctx.paths?.videos      ?? join(FRAMEWORK_ROOT, 'videos');
  const traceDir   = ctx.paths?.traces      ?? join(FRAMEWORK_ROOT, 'traces');

  const junitPath = ctx.args?.junit
    ? (isAbsolute(ctx.args.junit) ? ctx.args.junit : resolve(ctx.paths?.project ?? FRAMEWORK_ROOT, ctx.args.junit))
    : join(reportsDir, 'junit.xml');

  if (!existsSync(junitPath)) {
    console.warn(`[bug-analysis] JUnit XML not found at ${junitPath} — run @qa run-tests first.`);
    return { bugs: [], count: 0, note: `No junit.xml at ${junitPath}` };
  }

  await mkdir(bugDir, { recursive: true });

  const xml   = await readFile(junitPath, 'utf8');
  const cases = [...xml.matchAll(
    /<testcase[^>]*name="([^"]+)"[^>]*classname="([^"]*)"[^>]*time="([^"]*)"[^>]*>([\s\S]*?)<\/testcase>/g,
  )];

  const bugs  = [];
  let   id    = 1;

  for (const c of cases) {
    const [, name, cls, time, body] = c;
    const failure = /<failure[^>]*message="([^"]*)"[^>]*>([\s\S]*?)<\/failure>/.exec(body);
    const error   = /<error[^>]*message="([^"]*)"[^>]*>([\s\S]*?)<\/error>/.exec(body);
    const issue   = failure ?? error;
    if (!issue) continue;

    const bugId = `BUG-${String(id++).padStart(4, '0')}`;
    const slug  = toSlug(name);

    // Resolve artifact paths relative to framework root
    const artifacts = await findArtifacts(slug, ssDir, vidDir, traceDir);

    const md = renderBugReport(bugId, name, cls, time, issue[1], issue[2], artifacts, ctx.config);
    const outPath = join(bugDir, `${bugId}.md`);
    await writeFile(outPath, md, 'utf8');

    bugs.push({ bugId, path: outPath, name, severity: inferSeverity(issue[1] + '\n' + issue[2]) });
    console.log(`  🐛 ${bugId}: ${name}`);
  }

  // Write bug index
  if (bugs.length > 0) {
    await writeBugIndex(bugDir, bugs);
    console.log(`\n✅ ${bugs.length} bug report(s) saved to: ${bugDir}`);
  } else {
    console.log(`\n✅ No failures detected — all tests passed!`);
  }

  return { bugs, count: bugs.length };
}

// ── Bug report renderer ───────────────────────────────────────────────────────

function renderBugReport(id, name, cls, time, message, stack, artifacts, config) {
  const severity = inferSeverity(message + '\n' + stack);
  const priority = severity === 'حرجة' || severity === 'عالية' ? 'عالية' : 'متوسطة';
  const rootCause = suggestRootCause(message + '\n' + stack);
  const fix = suggestFix(message + '\n' + stack);

  const artifactSection = renderArtifacts(artifacts);

  return `# ${id} — ${escapeMarkdown(name)}

> **الحالة**: جديد | **التاريخ**: ${new Date().toLocaleDateString('ar-SA')} | **المدة**: ${Number(time).toFixed(2)}ث

---

## معلومات الخطأ

| الحقل | القيمة |
|---|---|
| **Bug ID** | \`${id}\` |
| **عنوان المشكلة** | ${name} |
| **الموديول** | ${cls || '—'} |
| **مستوى الخطورة** | **${severity}** |
| **الأولوية** | ${priority} |
| **النوع** | فشل اختبار آلي |
| **البيئة** | ${config?.frontend?.framework ?? 'unknown'} + ${config?.backend?.framework ?? 'unknown'} |
| **المتصفح** | Chromium (Playwright) |

---

## وصف المشكلة

\`\`\`
${escapeCodeBlock(message)}
\`\`\`

---

## خطوات إعادة المشكلة

1. تشغيل مجموعة الاختبار: \`npx playwright test\`
2. تنفيذ الاختبار: **${name}**
3. ملاحظة الفشل التالي

---

## النتيجة الحالية (Actual Result)

\`\`\`
${truncate(stack, 3000)}
\`\`\`

---

## النتيجة المتوقعة (Expected Result)

يجب أن يمر الاختبار بنجاح وفق معايير القبول المحددة في وصف القصة الوظيفية.

---

## المرفقات (Artifacts)

${artifactSection}

---

## تحليل السبب الجذري (Root Cause Analysis)

${rootCause}

---

## الحل المقترح (Suggested Fix)

${fix}

---

## سجل التتبع الكامل (Full Stack Trace)

<details>
<summary>عرض سجل التتبع الكامل</summary>

\`\`\`
${truncate(stack, 8000)}
\`\`\`

</details>

---

*تم الإنشاء بواسطة AI QA Framework v2 — ${new Date().toISOString()}*
`;
}

function renderArtifacts(artifacts) {
  const lines = [];
  if (artifacts.screenshot) lines.push(`- 📸 **Screenshot**: \`${artifacts.screenshot}\``);
  else                       lines.push(`- 📸 **Screenshot**: لم يُلتقط (لم يحدث فشل أو الملف غير موجود)`);

  if (artifacts.video)       lines.push(`- 🎬 **Video**: \`${artifacts.video}\``);
  else                       lines.push(`- 🎬 **Video**: لم يُسجَّل`);

  if (artifacts.trace)       lines.push(`- 🔍 **Trace**: \`${artifacts.trace}\` — شغّل: \`npx playwright show-trace "${artifacts.trace}"\``);
  else                       lines.push(`- 🔍 **Trace**: غير متاح`);

  return lines.join('\n');
}

async function findArtifacts(slug, ssDir, vidDir, traceDir) {
  const results = {};

  // Check common artifact naming patterns
  const ssCandidates  = [`${slug}.png`, `${slug}-1.png`, `test-failed-1.png`];
  const vidCandidates = [`${slug}.webm`, `${slug}.mp4`];
  const trCandidates  = [`${slug}.zip`, `trace.zip`];

  for (const f of ssCandidates) {
    const p = join(ssDir, f);
    if (existsSync(p)) { results.screenshot = p; break; }
  }
  for (const f of vidCandidates) {
    const p = join(vidDir, f);
    if (existsSync(p)) { results.video = p; break; }
  }
  for (const f of trCandidates) {
    const p = join(traceDir, f);
    if (existsSync(p)) { results.trace = p; break; }
  }

  // Fallback: scan directories
  if (!results.screenshot && existsSync(ssDir)) {
    try {
      const files = await readdir(ssDir);
      const match = files.find(f => f.toLowerCase().includes(slug.slice(0, 10)));
      if (match) results.screenshot = join(ssDir, match);
    } catch {}
  }

  return results;
}

async function writeBugIndex(bugDir, bugs) {
  const lines = [
    `# Bug Index — تقرير الأخطاء`,
    '',
    `> **التاريخ**: ${new Date().toISOString()}  |  **الإجمالي**: ${bugs.length} خطأ`,
    '',
    '| Bug ID | الاختبار | الخطورة | التقرير |',
    '|---|---|---|---|',
  ];
  for (const bug of bugs) {
    lines.push(`| \`${bug.bugId}\` | ${bug.name} | ${bug.severity} | [فتح](${basename(bug.path)}) |`);
  }
  await writeFile(join(bugDir, 'INDEX.md'), lines.join('\n'), 'utf8');
}

// ── Intelligence helpers ──────────────────────────────────────────────────────

function inferSeverity(text) {
  const t = text.toLowerCase();
  if (/timeout|crashed|navigation|network error|500|503|fatal/i.test(t)) return 'حرجة';
  if (/assertion|expected.*received|not.*found|null|undefined|401|403|404/i.test(t)) return 'عالية';
  if (/warning|slow|performance|deprecat/i.test(t)) return 'منخفضة';
  return 'متوسطة';
}

function suggestRootCause(text) {
  const t = text.toLowerCase();
  if (/timeout/i.test(t))           return '**Timeout**: العنصر المطلوب لم يظهر خلال المهلة المحددة. قد يكون بسبب بطء الاستجابة أو تغيير في هيكل الصفحة.';
  if (/net::|network|fetch/i.test(t)) return '**Network Error**: فشل في الطلب الشبكي. تحقق من أن الخادم يعمل وأن العنوان صحيح.';
  if (/null|undefined|cannot read/i.test(t)) return '**Null Reference**: محاولة الوصول إلى خاصية عنصر غير موجود. تحقق من تسلسل DOM وانتظر ظهور العنصر.';
  if (/401|unauthorized/i.test(t)) return '**Authentication**: الجلسة منتهية الصلاحية أو بيانات الاعتماد غير صحيحة.';
  if (/403|forbidden/i.test(t)) return '**Authorization**: المستخدم لا يملك الصلاحيات الكافية للوصول إلى هذا المورد.';
  if (/404|not found/i.test(t)) return '**Not Found**: المسار أو المورد المطلوب غير موجود. تحقق من صحة الـ URL.';
  if (/500|server error/i.test(t)) return '**Server Error**: خطأ داخلي في الخادم. راجع سجلات الخادم.';
  if (/assertion.*failed|expect.*received/i.test(t)) return '**Assertion Failure**: قيمة الاختبار لا تطابق القيمة المتوقعة. راجع منطق التحقق.';
  return 'يتطلب تحليلاً يدوياً — راجع سجل التتبع الكامل أعلاه.';
}

function suggestFix(text) {
  const t = text.toLowerCase();
  if (/timeout/i.test(t)) return `\`\`\`javascript\n// زد مهلة الانتظار أو أضف waitFor صريح:\nawait page.waitForSelector('[data-testid="my-element"]', { timeout: 30_000 });\nawait expect(locator).toBeVisible({ timeout: 30_000 });\n\`\`\``;
  if (/network|fetch/i.test(t)) return '- تأكد من أن التطبيق يعمل على العنوان الصحيح\n- راجع `QA_BASE_URL` في متغيرات البيئة\n- تحقق من CORS والـ proxy settings';
  if (/401/i.test(t)) return '- تحقق من بيانات الاعتماد في `test-data/auth.testdata.json`\n- تأكد من أن الجلسة لا تنتهي قبل اكتمال الاختبار\n- أضف خطوة تسجيل دخول في `beforeEach`';
  if (/assertion/i.test(t)) return '- راجع قيم `testData.expectedMessages`\n- تحقق من أن المحدد (selector) يشير للعنصر الصحيح\n- استخدم `page.pause()` للتفتيش اليدوي';
  return '- راجع آخر التغييرات في الكود\n- أضف `await page.pause()` قبل السطر الفاشل للتفتيش اليدوي\n- راجع ملف الـ trace لفهم تسلسل الأحداث';
}

// ── String utilities ──────────────────────────────────────────────────────────

function toSlug(s) {
  return s.replace(/[^a-z0-9]/gi, '-').toLowerCase().replace(/-+/g, '-').slice(0, 60);
}

function truncate(s, max) {
  if (s.length <= max) return s;
  return s.slice(0, max) + '\n... [truncated]';
}

function escapeMarkdown(s) {
  return s.replace(/[*_`[\]]/g, c => `\\${c}`);
}

function escapeCodeBlock(s) {
  return s.replace(/```/g, "'''");
}


/**
 * Parses Playwright JUnit XML and produces an Arabic bug report (Markdown)
 * per failed test. Pure regex parsing — no extra deps.
 */

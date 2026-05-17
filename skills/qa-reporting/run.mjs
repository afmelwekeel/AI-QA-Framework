import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname      = dirname(fileURLToPath(import.meta.url));
const FRAMEWORK_ROOT = join(__dirname, '..', '..');
const require        = createRequire(import.meta.url);

/**
 * Phase 7 — Final QA Reporting
 *
 * Generates the consolidated QA execution report in three formats:
 *   - HTML  → /reports/qa-report.html
 *   - MD    → /reports/qa-report.md
 *   - XLSX  → /reports/qa-report.xlsx
 */
export default async function run(ctx) {
  const reportsDir = ctx.paths?.reports ?? join(FRAMEWORK_ROOT, 'reports');
  const bugDir     = ctx.paths?.bugReports ?? join(FRAMEWORK_ROOT, 'bug-reports');
  const tcDir      = ctx.paths?.testCases  ?? join(FRAMEWORK_ROOT, 'test-cases');
  await mkdir(reportsDir, { recursive: true });

  const stats = await collectStats(ctx, reportsDir, bugDir, tcDir);

  const [md, html] = [renderMd(stats, ctx.config), renderHtml(stats, ctx.config)];

  const mdPath   = join(reportsDir, 'qa-report.md');
  const htmlPath = join(reportsDir, 'qa-report.html');
  const xlsxPath = join(reportsDir, 'qa-report.xlsx');
  const csvPath  = join(reportsDir, 'qa-report.csv');

  await writeFile(mdPath,  md,   'utf8');
  await writeFile(htmlPath, html, 'utf8');
  await writeFile(csvPath, '\uFEFF' + renderCsv(stats), 'utf8');
  await writeReportXlsx(xlsxPath, stats, ctx.config);

  console.log(`\n✅ QA Report generated:`);
  console.log(`   HTML : ${htmlPath}`);
  console.log(`   MD   : ${mdPath}`);
  console.log(`   XLSX : ${xlsxPath}`);

  return { mdPath, htmlPath, xlsxPath, csvPath, stats };
}

// ── Stats collection ──────────────────────────────────────────────────────────

async function collectStats(ctx, reportsDir, bugDir, tcDir) {
  const stats = {
    total: 0, passed: 0, failed: 0, skipped: 0,
    durationSec: 0,
    passRate: 0,
    bugs: [],
    testCaseFiles: [],
    generatedAt: new Date().toISOString(),
    suites: [],
    riskLevel: 'منخفض',
    recommendations: [],
  };

  // Parse JUnit XML
  const junitPath = join(reportsDir, 'junit.xml');
  if (existsSync(junitPath)) {
    const xml = await readFile(junitPath, 'utf8');
    const suiteMatches = [...xml.matchAll(/<testsuite[^>]*name="([^"]+)"[^>]*tests="(\d+)"[^>]*failures="(\d+)"[^>]*skipped="(\d+)"[^>]*time="([^"]*)"[^>]*>/g)];
    for (const [, name, t, f, s, time] of suiteMatches) {
      stats.suites.push({ name, total: +t, failed: +f, skipped: +s, passed: +t - +f - +s, durationSec: +time });
    }
    const tests = [...xml.matchAll(/<testcase[^>]*time="([^"]*)"[^>]*>([\s\S]*?)<\/testcase>/g)];
    stats.total = tests.length;
    for (const [, time, body] of tests) {
      stats.durationSec += Number(time) || 0;
      if (/<failure|<error/.test(body))   stats.failed++;
      else if (/<skipped/.test(body))     stats.skipped++;
      else                                stats.passed++;
    }
    stats.passRate = stats.total ? Math.round((stats.passed / stats.total) * 100) : 0;
  }

  // Collect bug reports
  if (existsSync(bugDir)) {
    const files = (await readdir(bugDir)).filter(f => f.endsWith('.md') && f !== 'INDEX.md');
    stats.bugs = files.map(f => f.replace(/\.md$/, ''));
  }

  // Collect test case files
  if (existsSync(tcDir)) {
    stats.testCaseFiles = (await readdir(tcDir)).filter(f => f.endsWith('.xlsx') || f.endsWith('.md'));
  }

  // Risk analysis
  stats.riskLevel = computeRisk(stats);
  stats.recommendations = buildRecommendations(stats);

  return stats;
}

function computeRisk(stats) {
  if (stats.failed === 0 && stats.passRate >= 95) return 'منخفض ✅';
  if (stats.failed <= 2 || stats.passRate >= 80)  return 'متوسط ⚠️';
  return 'عالٍ ❌';
}

function buildRecommendations(stats) {
  const recs = [];
  if (stats.failed > 0)       recs.push('إصلاح الاختبارات الفاشلة قبل أي إصدار للإنتاج');
  if (stats.passRate < 80)    recs.push('نسبة النجاح أقل من 80% — مراجعة عاجلة مطلوبة');
  if (stats.bugs.length > 0)  recs.push(`معالجة ${stats.bugs.length} أخطاء مسجلة في /bug-reports/`);
  if (stats.skipped > 0)      recs.push(`تفعيل ${stats.skipped} اختبار/ات متجاوزة وتنفيذها`);
  if (stats.passRate === 100) recs.push('ممتاز! جميع الاختبارات ناجحة. فكّر في إضافة اختبارات edge cases إضافية.');
  if (recs.length === 0)      recs.push('الوضع مستقر — استمر في المراقبة الدورية');
  return recs;
}

// ── MD renderer ───────────────────────────────────────────────────────────────

function renderMd(s, cfg) {
  const suiteTable = s.suites.length
    ? `\n| المجموعة | الإجمالي | ناجحة | فاشلة | متجاوزة |\n|---|---|---|---|---|\n${s.suites.map(t => `| ${t.name} | ${t.total} | ${t.passed} | ${t.failed} | ${t.skipped} |`).join('\n')}\n`
    : '';

  return `# تقرير ضمان الجودة

**التاريخ**: ${new Date().toLocaleDateString('ar-SA')}
**وقت التنفيذ**: ${new Date().toLocaleTimeString('ar-SA')}

---

## نظرة عامة على المشروع

| المكوّن | القيمة |
|---|---|
| الواجهة الأمامية | \`${cfg?.frontend?.framework ?? 'غير محدد'}\` |
| الواجهة الخلفية | \`${cfg?.backend?.framework ?? 'غير محدد'}\` |
| قاعدة البيانات | \`${cfg?.database?.engine ?? 'غير محدد'}\` |
| نظام التوثيق | \`${cfg?.auth?.scheme ?? 'غير محدد'}\` |

---

## ملخص نتائج الاختبارات

| المقياس | القيمة |
|---|---|
| **الإجمالي** | **${s.total}** |
| ✅ ناجحة | ${s.passed} |
| ❌ فاشلة | ${s.failed} |
| ⏭️ متجاوزة | ${s.skipped} |
| **نسبة النجاح** | **${s.passRate}%** |
| المدة الكلية | ${s.durationSec.toFixed(1)}ث |
| **مستوى الخطر** | **${s.riskLevel}** |

${suiteTable}

---

## الأخطاء المسجلة (${s.bugs.length})

${s.bugs.length ? s.bugs.map(b => `- [\`${b}\`](../bug-reports/${b}.md)`).join('\n') : '✅ لا توجد أخطاء مسجلة.'}

---

## ملفات حالات الاختبار

${s.testCaseFiles.length ? s.testCaseFiles.map(f => `- \`test-cases/${f}\``).join('\n') : 'لم يتم إنشاء ملفات بعد.'}

---

## التوصيات

${s.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

---

*تم الإنشاء بواسطة AI QA Framework v2 — ${s.generatedAt}*
`;
}

// ── HTML renderer ─────────────────────────────────────────────────────────────

function renderHtml(s, cfg) {
  const passColor = s.passRate >= 95 ? '#27ae60' : s.passRate >= 70 ? '#f39c12' : '#e74c3c';
  const suiteRows = s.suites.map(t =>
    `<tr><td>${t.name}</td><td>${t.total}</td><td style="color:#27ae60">${t.passed}</td><td style="color:#e74c3c">${t.failed}</td><td>${t.skipped}</td></tr>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>تقرير ضمان الجودة</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #2c3e50; direction: rtl; }
  .header { background: linear-gradient(135deg, #1f4e79, #2980b9); color: #fff; padding: 32px; text-align: center; }
  .header h1 { font-size: 28px; margin-bottom: 8px; }
  .header p  { opacity: .8; font-size: 14px; }
  .container { max-width: 1200px; margin: 24px auto; padding: 0 16px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .card { background: #fff; border-radius: 12px; padding: 20px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
  .card .num { font-size: 36px; font-weight: 700; }
  .card .lbl { font-size: 13px; color: #777; margin-top: 4px; }
  .pass-card .num { color: #27ae60; }
  .fail-card .num { color: #e74c3c; }
  .skip-card .num { color: #f39c12; }
  .rate-card .num { color: ${passColor}; }
  .section { background: #fff; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
  .section h2 { font-size: 18px; margin-bottom: 16px; color: #1f4e79; border-bottom: 2px solid #e8f0fe; padding-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 10px 14px; text-align: right; border-bottom: 1px solid #f0f0f0; }
  th { background: #f8f9fc; font-weight: 600; color: #555; }
  tr:hover { background: #fafbff; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .badge-green  { background: #d4edda; color: #155724; }
  .badge-red    { background: #f8d7da; color: #721c24; }
  .badge-orange { background: #fff3cd; color: #856404; }
  .rec-list li { margin: 8px 0; padding: 10px 14px; background: #f0f7ff; border-right: 4px solid #2980b9; border-radius: 4px; }
  .risk { padding: 12px 20px; border-radius: 8px; font-size: 18px; font-weight: 700; text-align: center; }
  .risk-low  { background: #d4edda; color: #155724; }
  .risk-med  { background: #fff3cd; color: #856404; }
  .risk-high { background: #f8d7da; color: #721c24; }
</style>
</head>
<body>
<div class="header">
  <h1>📊 تقرير ضمان الجودة</h1>
  <p>${new Date().toLocaleString('ar-SA')} — AI QA Framework v2</p>
</div>
<div class="container">

  <!-- KPI Cards -->
  <div class="grid">
    <div class="card"><div class="num">${s.total}</div><div class="lbl">إجمالي الاختبارات</div></div>
    <div class="card pass-card"><div class="num">${s.passed}</div><div class="lbl">ناجحة ✅</div></div>
    <div class="card fail-card"><div class="num">${s.failed}</div><div class="lbl">فاشلة ❌</div></div>
    <div class="card skip-card"><div class="num">${s.skipped}</div><div class="lbl">متجاوزة ⏭️</div></div>
    <div class="card rate-card"><div class="num">${s.passRate}%</div><div class="lbl">نسبة النجاح</div></div>
    <div class="card"><div class="num">${s.durationSec.toFixed(0)}ث</div><div class="lbl">مدة التنفيذ</div></div>
  </div>

  <!-- Risk Level -->
  <div class="section">
    <h2>مستوى الخطر</h2>
    <div class="risk ${s.riskLevel.includes('منخفض') ? 'risk-low' : s.riskLevel.includes('متوسط') ? 'risk-med' : 'risk-high'}">${s.riskLevel}</div>
  </div>

  <!-- Project Info -->
  <div class="section">
    <h2>معلومات المشروع</h2>
    <table>
      <tr><th>المكوّن</th><th>القيمة</th></tr>
      <tr><td>الواجهة الأمامية</td><td><code>${cfg?.frontend?.framework ?? 'غير محدد'}</code></td></tr>
      <tr><td>الواجهة الخلفية</td><td><code>${cfg?.backend?.framework ?? 'غير محدد'}</code></td></tr>
      <tr><td>قاعدة البيانات</td><td><code>${cfg?.database?.engine ?? 'غير محدد'}</code></td></tr>
      <tr><td>نظام التوثيق</td><td><code>${cfg?.auth?.scheme ?? 'غير محدد'}</code></td></tr>
    </table>
  </div>

  ${suiteRows ? `
  <!-- Suite breakdown -->
  <div class="section">
    <h2>تفاصيل المجموعات</h2>
    <table>
      <tr><th>المجموعة</th><th>الإجمالي</th><th>ناجحة</th><th>فاشلة</th><th>متجاوزة</th></tr>
      ${suiteRows}
    </table>
  </div>` : ''}

  <!-- Bugs -->
  <div class="section">
    <h2>الأخطاء المسجلة (${s.bugs.length})</h2>
    ${s.bugs.length
      ? `<ul>${s.bugs.map(b => `<li><a href="../bug-reports/${b}.md">${b}</a></li>`).join('')}</ul>`
      : '<p style="color:#27ae60">✅ لا توجد أخطاء مسجلة.</p>'
    }
  </div>

  <!-- Recommendations -->
  <div class="section">
    <h2>التوصيات</h2>
    <ul class="rec-list">${s.recommendations.map(r => `<li>${r}</li>`).join('')}</ul>
  </div>

  <p style="text-align:center;color:#aaa;font-size:12px;margin-top:24px">
    تم الإنشاء بواسطة AI QA Framework v2 — ${s.generatedAt}
  </p>
</div>
</body>
</html>`;
}

// ── XLSX report ───────────────────────────────────────────────────────────────

async function writeReportXlsx(filePath, stats, config) {
  let ExcelJS;
  try {
    ExcelJS = require(join(FRAMEWORK_ROOT, 'node_modules', 'exceljs'));
  } catch {
    try { ExcelJS = require('exceljs'); } catch {
      console.warn('⚠️  ExcelJS not installed — skipping XLSX report.');
      return;
    }
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'AI QA Framework v2';
  wb.created = new Date();

  // ── Summary sheet ─────────────────────────────────────────────────────────
  const sumWs = wb.addWorksheet('ملخص', { views: [{ rightToLeft: true }] });

  const summaryData = [
    ['مقياس', 'قيمة'],
    ['إجمالي الاختبارات', stats.total],
    ['ناجحة', stats.passed],
    ['فاشلة', stats.failed],
    ['متجاوزة', stats.skipped],
    ['نسبة النجاح', `${stats.passRate}%`],
    ['مدة التنفيذ (ث)', stats.durationSec.toFixed(1)],
    ['مستوى الخطر', stats.riskLevel],
    ['عدد الأخطاء', stats.bugs.length],
    ['', ''],
    ['الواجهة الأمامية', config?.frontend?.framework ?? '—'],
    ['الواجهة الخلفية', config?.backend?.framework ?? '—'],
    ['قاعدة البيانات', config?.database?.engine ?? '—'],
    ['نظام التوثيق', config?.auth?.scheme ?? '—'],
    ['تاريخ الإنشاء', stats.generatedAt],
  ];

  for (const [label, value] of summaryData) {
    const row = sumWs.addRow([label, value]);
    if (label) {
      row.getCell(1).font = { bold: true, name: 'Arial' };
      row.getCell(2).font = { name: 'Arial' };
      row.getCell(1).alignment = { horizontal: 'right' };
      row.getCell(2).alignment = { horizontal: 'right' };
    }
  }
  sumWs.getColumn(1).width = 30;
  sumWs.getColumn(2).width = 40;

  // ── Bugs sheet ────────────────────────────────────────────────────────────
  if (stats.bugs.length > 0) {
    const bugWs = wb.addWorksheet('الأخطاء', { views: [{ rightToLeft: true }] });
    const hdr = bugWs.addRow(['Bug ID', 'الاختبار', 'ملف التقرير']);
    hdr.eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial' };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC00000' } };
      c.alignment = { horizontal: 'right' };
    });
    for (const b of stats.bugs) {
      bugWs.addRow([b, '—', `bug-reports/${b}.md`]);
    }
    [15, 50, 40].forEach((w, i) => { bugWs.getColumn(i + 1).width = w; });
  }

  // ── Recommendations sheet ─────────────────────────────────────────────────
  const recWs = wb.addWorksheet('التوصيات', { views: [{ rightToLeft: true }] });
  recWs.addRow(['#', 'التوصية']);
  stats.recommendations.forEach((r, i) => recWs.addRow([i + 1, r]));
  [5, 80].forEach((w, i) => { recWs.getColumn(i + 1).width = w; });

  await wb.xlsx.writeFile(filePath);
}

// ── CSV renderer ──────────────────────────────────────────────────────────────

function renderCsv(s) {
  const rows = [
    ['المقياس', 'القيمة'],
    ['الإجمالي', s.total],
    ['ناجحة', s.passed],
    ['فاشلة', s.failed],
    ['متجاوزة', s.skipped],
    ['نسبة النجاح', `${s.passRate}%`],
    ['عدد الأخطاء', s.bugs.length],
    ['مستوى الخطر', s.riskLevel],
    ['تاريخ الإنشاء', s.generatedAt],
  ];
  return rows.map(r => r.join(',')).join('\r\n');
}



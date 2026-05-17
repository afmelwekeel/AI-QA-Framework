import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, isAbsolute, resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import analyzeStory from '../user-story-analysis/run.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRAMEWORK_ROOT = resolve(__dirname, '..', '..');

// Load ExcelJS from framework-level node_modules
const require = createRequire(import.meta.url);

const TC_HEADERS = [
  'Test Case ID',
  'اسم السيناريو',
  'وصف السيناريو',
  'Preconditions',
  'خطوات التنفيذ',
  'البيانات المستخدمة',
  'النتيجة المتوقعة',
  'Actual Result',
  'الحالة',
  'الأولوية',
  'مستوى الخطورة',
  'نوع الاختبار',
  'ملاحظات',
];

const COL_WIDTHS = [12, 25, 35, 30, 40, 30, 35, 16, 12, 12, 16, 16, 25];

/**
 * Phase 2 — Test Case Generation
 * Outputs: /test-cases/<id>.xlsx + /test-cases/<id>.md
 */
export default async function run(ctx) {
  const ast = await loadAst(ctx);
  const rows = buildRows(ast, ctx.config);

  const outDir = ctx.paths?.testCases ?? join(FRAMEWORK_ROOT, 'test-cases');
  await mkdir(outDir, { recursive: true });

  const xlsxPath = join(outDir, `${ast.id}.xlsx`);
  const mdPath   = join(outDir, `${ast.id}.md`);
  const csvPath  = join(outDir, `${ast.id}.csv`);  // kept as reference

  // Write all three formats in parallel
  await Promise.all([
    writeXlsx(xlsxPath, rows),
    writeMd(mdPath, ast, rows),
    writeCsv(csvPath, rows),
  ]);

  console.log(`✅ Test cases generated:`);
  console.log(`   XLSX : ${xlsxPath}`);
  console.log(`   MD   : ${mdPath}`);
  console.log(`   CSV  : ${csvPath}`);

  return { xlsxPath, mdPath, csvPath, count: rows.length, storyId: ast.id };
}

// ── Data Loading ─────────────────────────────────────────────────────────────

async function loadAst(ctx) {
  if (ctx.args?.ast) {
    const p = isAbsolute(ctx.args.ast)
      ? ctx.args.ast
      : resolve(ctx.paths?.project ?? FRAMEWORK_ROOT, ctx.args.ast);
    return JSON.parse(await readFile(p, 'utf8'));
  }
  if (!ctx.args?.story) throw new Error('Provide --story <path> or --ast <path>');
  const result = await analyzeStory(ctx);
  return result.ast;
}

// ── Row Builder ───────────────────────────────────────────────────────────────

function buildRows(ast, config) {
  const rows = [];
  let idx = 1;

  const make = (sc, type, severity, priority) => [
    `TC-${String(idx++).padStart(4, '0')}`,
    sc.text || sc.ac || ast.title || 'سيناريو',
    sc.description || sc.text || sc.ac || '',
    sc.preconditions || 'النظام يعمل والمستخدم لديه الصلاحيات اللازمة',
    sc.steps || '1) فتح الشاشة\n2) إدخال البيانات\n3) تنفيذ الإجراء',
    sc.data || 'بيانات افتراضية صالحة',
    sc.expected || 'يتم تنفيذ العملية بنجاح وعرض رسالة النجاح',
    '',             // Actual Result — filled after execution
    'لم يُنفّذ',   // Status
    priority,
    severity,
    type,
    sc.notes || '',
  ];

  // Positive scenarios
  for (const sc of ast.scenarios.positive)
    rows.push(make(sc, 'وظيفي', 'متوسطة', 'عالية'));

  // Negative scenarios
  for (const sc of ast.scenarios.negative)
    rows.push(make(sc, 'تحقق من المدخلات', 'عالية', 'عالية'));

  // Edge cases
  for (const sc of ast.scenarios.edge)
    rows.push(make(sc, 'حالة حدية', 'متوسطة', 'متوسطة'));

  // Security scenarios
  for (const sc of ast.scenarios.security)
    rows.push(make(sc, 'أمان', 'حرجة', 'عالية'));

  // Permission scenarios
  for (const sc of ast.scenarios.permission)
    rows.push(make(sc, 'صلاحيات', 'عالية', 'عالية'));

  // Auto-augment based on detected auth
  if (config?.auth?.scheme && config.auth.scheme !== 'unknown') {
    rows.push(make(
      { text: `محاولة الوصول بدون توثيق (${config.auth.scheme})`, expected: 'النظام يرفض الطلب ويعيد 401' },
      'أمان', 'حرجة', 'عالية',
    ));
    rows.push(make(
      { text: 'محاولة الوصول بصلاحيات غير كافية', expected: 'النظام يرفض الطلب ويعيد 403' },
      'صلاحيات', 'عالية', 'عالية',
    ));
    rows.push(make(
      { text: 'اختبار انتهاء صلاحية الجلسة', expected: 'يتم تسجيل الخروج تلقائياً وتوجيه المستخدم لصفحة الدخول' },
      'أمان', 'عالية', 'عالية',
    ));
  }

  // Auto-augment: validation scenarios
  rows.push(make(
    { text: 'إرسال نموذج بحقول فارغة', expected: 'تظهر رسائل التحقق المناسبة لكل حقل إلزامي' },
    'تحقق من المدخلات', 'عالية', 'عالية',
  ));
  rows.push(make(
    { text: 'إدخال بيانات تتجاوز الحد الأقصى للأحرف', expected: 'النظام يرفض الإدخال ويعرض رسالة خطأ مناسبة' },
    'حالة حدية', 'متوسطة', 'متوسطة',
  ));
  rows.push(make(
    { text: 'اختبار حقن SQL في حقول الإدخال', expected: 'النظام يرفض المدخلات الخطرة ولا تحدث أي عمليات غير مصرح بها' },
    'أمان', 'حرجة', 'عالية',
  ));
  rows.push(make(
    { text: 'اختبار XSS — حقن سكريبت في حقول الإدخال', expected: 'النظام يُعقّم المدخلات ولا يُنفّذ أي كود مُحقون' },
    'أمان', 'حرجة', 'عالية',
  ));

  return rows;
}

// ── XLSX Writer ───────────────────────────────────────────────────────────────

async function writeXlsx(filePath, rows) {
  let ExcelJS;
  try {
    ExcelJS = require(join(FRAMEWORK_ROOT, 'node_modules', 'exceljs'));
  } catch {
    // Fallback: try global require
    try { ExcelJS = require('exceljs'); } catch {
      console.warn('⚠️  ExcelJS not installed — skipping XLSX generation. Run: npm install in AI-QA-FRAMEWORK/');
      return;
    }
  }

  const wb = new ExcelJS.Workbook();
  wb.creator  = 'AI QA Framework v2';
  wb.created  = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet('حالات الاختبار', {
    views: [{ rightToLeft: true }],
    pageSetup: { fitToPage: true, fitToWidth: 1, orientation: 'landscape' },
  });

  // ── Header row ────────────────────────────────────────────────────────────
  const headerRow = ws.addRow(TC_HEADERS);
  headerRow.height = 30;
  headerRow.eachCell(cell => {
    cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 11 };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border    = {
      bottom: { style: 'medium', color: { argb: 'FFAAAAAA' } },
      right:  { style: 'thin',   color: { argb: 'FFCCCCCC' } },
    };
  });

  // ── Data rows ─────────────────────────────────────────────────────────────
  const severityColors = {
    'حرجة': 'FFFF0000',
    'عالية': 'FFFF6600',
    'متوسطة': 'FFFFC000',
    'منخفضة': 'FF92D050',
  };

  for (let i = 0; i < rows.length; i++) {
    const row = ws.addRow(rows[i]);
    row.height = 55;
    const isEven = i % 2 === 0;
    const bgColor = isEven ? 'FFFCFCFC' : 'FFF0F4FA';

    row.eachCell((cell, colNum) => {
      cell.font      = { name: 'Arial', size: 10 };
      cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true, readingOrder: 'rtl' };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cell.border    = {
        top:    { style: 'hair', color: { argb: 'FFDDDDDD' } },
        bottom: { style: 'hair', color: { argb: 'FFDDDDDD' } },
        right:  { style: 'hair', color: { argb: 'FFDDDDDD' } },
        left:   { style: 'hair', color: { argb: 'FFDDDDDD' } },
      };
    });

    // Colour severity cell (col 11)
    const sevCell = row.getCell(11);
    const sevColor = severityColors[rows[i][10]] ?? 'FF808080';
    sevCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10 };
    sevCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: sevColor } };

    // Status cell (col 9) — grey for "not executed"
    const statusCell = row.getCell(9);
    statusCell.font = { name: 'Arial', size: 10, italic: true };
    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
  }

  // ── Column widths ─────────────────────────────────────────────────────────
  COL_WIDTHS.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  // ── Auto-filter ───────────────────────────────────────────────────────────
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length + 1, column: TC_HEADERS.length } };

  await wb.xlsx.writeFile(filePath);
}

// ── Markdown Writer ───────────────────────────────────────────────────────────

async function writeMd(filePath, ast, rows) {
  const lines = [
    `# حالات الاختبار — ${ast.title ?? ast.id}`,
    '',
    `> **المشروع**: ${ast.id}  |  **التاريخ**: ${new Date().toLocaleDateString('ar-SA')}  |  **الإجمالي**: ${rows.length} حالة`,
    '',
    '---',
    '',
    `| ${TC_HEADERS.join(' | ')} |`,
    `| ${TC_HEADERS.map(() => '---').join(' | ')} |`,
  ];

  for (const row of rows) {
    const cells = row.map(c => String(c).replace(/\n/g, '<br>').replace(/\|/g, '\\|'));
    lines.push(`| ${cells.join(' | ')} |`);
  }

  lines.push('', '---', '', `*تم الإنشاء بواسطة AI QA Framework v2 — ${new Date().toISOString()}*`);
  await writeFile(filePath, lines.join('\n'), 'utf8');
}

// ── CSV Writer ────────────────────────────────────────────────────────────────

function toCsv(allRows) {
  return allRows.map(r => r.map(cell => {
    const s = String(cell).replace(/\n/g, ' ');
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\r\n');
}

async function writeCsv(filePath, rows) {
  await writeFile(filePath, '\uFEFF' + toCsv([TC_HEADERS, ...rows]), 'utf8');
}



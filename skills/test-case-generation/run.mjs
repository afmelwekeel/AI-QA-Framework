import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, isAbsolute, resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import analyzeStory from '../user-story-analysis/run.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRAMEWORK_ROOT = resolve(__dirname, '..', '..');
const require = createRequire(import.meta.url);

// ── Column definitions ─────────────────────────────────────────────────────────
const TC_HEADERS = [
  'معرّف الحالة',         // 1  Test Case ID
  'عنوان حالة الاختبار', // 2  Title
  'وصف حالة الاختبار',   // 3  Description — what is being verified
  'رقم المتطلب',          // 4  Requirement ID (traceability)
  'نطاق الاختبار',        // 5  Feature area / pillar
  'الممثل',               // 6  Actor — who performs the test
  'نوع الاختبار',         // 7  Test type
  'الأولوية',             // 8  Priority
  'مستوى الخطورة',        // 9  Severity
  'الشرط المسبق',         // 10 Preconditions
  'خطوات التنفيذ',        // 11 Steps — numbered, detailed, human-readable
  'البيانات المستخدمة',   // 12 Test data
  'النتيجة المتوقعة',     // 13 Expected result
  'النتيجة الفعلية',      // 14 Actual result (filled by tester)
  'الحالة',               // 15 Status
  'صالح للـ UAT',         // 16 UAT eligible
  'ملاحظات',              // 17 Notes
];

const COL_WIDTHS = [14, 30, 40, 16, 22, 22, 18, 12, 16, 38, 62, 32, 42, 22, 14, 14, 25];

/**
 * Phase 2 — Test Case Generation
 * Outputs: /test-cases/<id>.xlsx + /test-cases/<id>.md + /test-cases/<id>.csv
 */
export default async function run(ctx) {
  const ast = await loadAst(ctx);
  const rows = buildRows(ast, ctx.config);

  const outDir = ctx.paths?.testCases ?? join(FRAMEWORK_ROOT, 'test-cases');
  await mkdir(outDir, { recursive: true });

  const xlsxPath = join(outDir, `${ast.id}.xlsx`);
  const mdPath   = join(outDir, `${ast.id}.md`);
  const csvPath  = join(outDir, `${ast.id}.csv`);

  await Promise.all([
    writeXlsx(xlsxPath, ast, rows),
    writeMd(mdPath, ast, rows),
    writeCsv(csvPath, rows),
  ]);

  console.log(`✅ Test cases generated (${rows.length} cases):`);
  console.log(`   XLSX : ${xlsxPath}`);
  console.log(`   MD   : ${mdPath}`);
  console.log(`   CSV  : ${csvPath}`);

  return { xlsxPath, mdPath, csvPath, count: rows.length, storyId: ast.id };
}

// ── Data Loading ──────────────────────────────────────────────────────────────

async function loadAst(ctx) {
  if (ctx.args?.ast) {
    const p = isAbsolute(ctx.args.ast)
      ? ctx.args.ast
      : resolve(ctx.paths?.project ?? FRAMEWORK_ROOT, ctx.args.ast);
    return JSON.parse(await readFile(p, 'utf8'));
  }
  if (!ctx.args?.story && !ctx.args?.stories) {
    throw new Error('Provide --story <path>, --stories "<path1> <path2>", or --ast <path>');
  }
  const result = await analyzeStory(ctx);
  return result.ast;
}

// ── Row Builder ───────────────────────────────────────────────────────────────

function buildRows(ast, config) {
  const rows = [];
  let idx = 1;
  const feature = ast.feature || ast.title || ast.id || '';

  const make = (sc, type, severity, priority, actor, uatEligible = 'نعم') => [
    `TC-${String(idx++).padStart(4, '0')}`,                          // 1 معرّف الحالة
    sc.title || sc.text || sc.ac || 'سيناريو',                       // 2 عنوان
    sc.description || sc.text || sc.ac || '',                         // 3 وصف
    sc.reqId || ast.reqId || '',                                       // 4 رقم المتطلب
    feature,                                                           // 5 نطاق الاختبار
    sc.actor || actor,                                                 // 6 الممثل
    type,                                                              // 7 نوع الاختبار
    priority,                                                          // 8 الأولوية
    severity,                                                          // 9 مستوى الخطورة
    sc.preconditions || defaultPreconditions(type),                   // 10 الشرط المسبق
    sc.steps || buildSteps(sc, type, ast),                            // 11 خطوات التنفيذ
    sc.data || buildData(sc, type),                                    // 12 البيانات المستخدمة
    sc.expected || 'يتم تنفيذ العملية بنجاح وتُعرض رسالة تأكيد',   // 13 النتيجة المتوقعة
    '',                                                                // 14 النتيجة الفعلية
    'لم يُنفّذ',                                                      // 15 الحالة
    uatEligible,                                                       // 16 صالح للـ UAT
    sc.notes || '',                                                    // 17 ملاحظات
  ];

  // ── Story-derived scenarios ───────────────────────────────────────────────
  for (const sc of (ast.scenarios?.positive ?? []))
    rows.push(make(sc, 'وظيفي', 'متوسطة', 'عالية', 'مستخدم نظام', 'نعم'));

  for (const sc of (ast.scenarios?.negative ?? []))
    rows.push(make(sc, 'تحقق من المدخلات', 'عالية', 'عالية', 'مستخدم نظام', 'نعم'));

  for (const sc of (ast.scenarios?.edge ?? []))
    rows.push(make(sc, 'حالة حدية', 'متوسطة', 'متوسطة', 'مستخدم نظام', 'لا'));

  for (const sc of (ast.scenarios?.security ?? []))
    rows.push(make(sc, 'أمان', 'حرجة', 'عالية', 'مختبر أمني', 'لا'));

  for (const sc of (ast.scenarios?.permission ?? []))
    rows.push(make(sc, 'صلاحيات', 'عالية', 'عالية', 'مستخدم بصلاحيات محدودة', 'نعم'));

  // ── Standard validation cases (always included) ──────────────────────────
  rows.push(make(
    {
      text: 'إرسال النموذج بحقول إلزامية فارغة',
      description: 'التحقق من أن النظام يُظهر رسائل تحقق واضحة عند ترك الحقول الإلزامية فارغة',
      steps: '1. الانتقال إلى النموذج المستهدف\n2. ترك جميع الحقول الإلزامية فارغة دون إدخال أي بيانات\n3. الضغط على زر الحفظ أو الإرسال\n4. ملاحظة رسائل التحقق الظاهرة بجانب كل حقل\n5. التحقق من أن رسالة خطأ واضحة تظهر لكل حقل إلزامي فارغ\n6. التحقق من عدم إرسال النموذج أو تنفيذ أي عملية',
      data: 'جميع الحقول فارغة',
      expected: 'تظهر رسالة تحقق واضحة تحت كل حقل إلزامي فارغ، ولا يُرسل النموذج',
    },
    'تحقق من المدخلات', 'عالية', 'عالية', 'مستخدم نظام',
  ));

  rows.push(make(
    {
      text: 'إدخال بيانات تتجاوز الحد الأقصى المسموح به',
      description: 'التحقق من أن النظام يرفض المدخلات التي تتجاوز الطول الأقصى للحقل',
      steps: '1. الانتقال إلى الحقل المستهدف في النموذج\n2. تحديد الحد الأقصى للأحرف من المواصفات (مثلاً 255 حرفاً)\n3. إدخال نص يتجاوز الحد الأقصى بحرف واحد على الأقل\n4. محاولة الحفظ أو المتابعة\n5. التحقق من أن النظام لا يقبل القيمة الزائدة\n6. التحقق من ظهور رسالة خطأ توضح الحد الأقصى المسموح',
      data: 'نص بطول يتجاوز الحد الأقصى بحرف واحد، ونص بطول الحد الأقصى بالضبط',
      expected: 'النظام يرفض النص الزائد ويُظهر رسالة توضح الحد الأقصى للأحرف',
    },
    'حالة حدية', 'متوسطة', 'متوسطة', 'مستخدم نظام', 'لا',
  ));

  // ── Security cases (always included) ─────────────────────────────────────
  rows.push(make(
    {
      text: 'اختبار حقن SQL في حقول الإدخال',
      description: 'التحقق من أن النظام يُعقّم المدخلات ويمنع تنفيذ أوامر SQL الخطرة',
      steps: '1. الانتقال إلى نموذج الإدخال أو حقل البحث المستهدف\n2. في حقل الإدخال، كتابة الكود: \' OR \'1\'=\'1\n3. الضغط على زر البحث أو الإرسال\n4. ملاحظة استجابة النظام والبيانات المُعادة\n5. التحقق من عدم ظهور أي بيانات إضافية غير مصرح بها\n6. مراجعة سجلات الخادم للتأكد من معالجة المدخل بشكل آمن',
      data: '\' OR \'1\'=\'1  |  1; DROP TABLE users--  |  " OR ""="',
      expected: 'النظام يرفض المدخل أو يُعقّمه، ولا تحدث أي عمليات غير مصرح بها في قاعدة البيانات',
    },
    'أمان', 'حرجة', 'عالية', 'مختبر أمني', 'لا',
  ));

  rows.push(make(
    {
      text: 'اختبار حقن XSS — سكريبت ضار في حقول الإدخال',
      description: 'التحقق من أن النظام يمنع تنفيذ سكريبت مُحقون عبر حقول الإدخال',
      steps: '1. الانتقال إلى حقل إدخال نصي يُعرض لاحقاً في الواجهة\n2. إدخال الكود الضار: <script>alert(\'XSS Test\')</script>\n3. حفظ البيانات أو إرسال النموذج\n4. الانتقال إلى الصفحة التي تعرض هذا الحقل\n5. ملاحظة ما إذا كانت نافذة التنبيه تظهر\n6. فحص مصدر الصفحة للتأكد من تشفير الأحرف الخاصة',
      data: '<script>alert(\'XSS Test\')</script>  |  <img src=x onerror=alert(1)>  |  javascript:alert(1)',
      expected: 'لا تظهر نافذة تنبيه؛ النظام يُشفّر الأحرف الخاصة ويعرضها كنص عادي',
    },
    'أمان', 'حرجة', 'عالية', 'مختبر أمني', 'لا',
  ));

  // ── Auth-based cases (when auth is detected) ──────────────────────────────
  if (config?.auth?.scheme && config.auth.scheme !== 'unknown') {
    rows.push(make(
      {
        text: `محاولة الوصول بدون تسجيل دخول (${config.auth.scheme})`,
        description: 'التحقق من أن النظام يمنع الوصول إلى الموارد المحمية للمستخدمين غير الموثّقين',
        steps: '1. فتح متصفح خاص (Incognito) أو حذف جميع ملفات تعريف الارتباط\n2. نسخ رابط صفحة محمية تستلزم تسجيل الدخول\n3. لصق الرابط مباشرةً في شريط العنوان والضغط على Enter\n4. ملاحظة استجابة النظام\n5. التحقق من إعادة التوجيه إلى صفحة تسجيل الدخول أو عرض رمز خطأ 401\n6. محاولة الوصول إلى نقطة API محمية مباشرةً عبر أداة مثل Postman بدون رمز توثيق',
        data: 'طلب HTTP بدون رأسية Authorization  |  Cookie منتهية الصلاحية',
        expected: 'إعادة التوجيه إلى صفحة تسجيل الدخول أو استجابة 401 Unauthorized',
        preconditions: 'لا توجد جلسة نشطة أو رمز توثيق صالح',
      },
      'أمان', 'حرجة', 'عالية', 'مستخدم غير مسجل', 'لا',
    ));

    rows.push(make(
      {
        text: 'محاولة الوصول بصلاحيات غير كافية (RBAC)',
        description: 'التحقق من أن النظام يمنع المستخدم من الوصول إلى موارد تتطلب صلاحيات أعلى من صلاحياته',
        steps: '1. تسجيل الدخول بحساب مستخدم ذو دور محدود (مثال: مستخدم عادي أو ضيف)\n2. محاولة الوصول إلى صفحة تتطلب صلاحيات أعلى (مثال: لوحة الإدارة) عبر الرابط المباشر\n3. ملاحظة استجابة النظام\n4. التحقق من ظهور رسالة "غير مصرح لك بالوصول" أو رمز 403\n5. التحقق من أن أزرار وخيارات الوظائف غير المسموح بها مخفية في الواجهة',
        data: 'حساب دور: مستخدم عادي  |  الرابط المستهدف: صفحة الإدارة',
        expected: 'يتلقى المستخدم رسالة رفض الوصول 403 أو يُعاد توجيهه، ولا تظهر له الوظائف المحظورة',
        preconditions: 'حساب مستخدم بدور محدود الصلاحيات نشط في النظام',
      },
      'صلاحيات', 'عالية', 'عالية', 'مستخدم بصلاحيات محدودة', 'نعم',
    ));

    rows.push(make(
      {
        text: 'اختبار انتهاء صلاحية جلسة المستخدم',
        description: 'التحقق من أن النظام يُنهي الجلسة تلقائياً عند انتهاء مدتها ويُوجّه المستخدم لإعادة تسجيل الدخول',
        steps: '1. تسجيل الدخول بحساب صحيح\n2. الانتظار حتى انتهاء مدة الجلسة المحددة في الإعدادات (أو تعديل وقت انتهاء الصلاحية يدوياً في اختبار الوحدة)\n3. بعد انتهاء الجلسة، محاولة تنفيذ أي إجراء يتطلب توثيقاً (مثل حفظ بيانات أو تنقل بين الصفحات)\n4. التحقق من تسجيل الخروج التلقائي\n5. التحقق من إعادة التوجيه إلى صفحة تسجيل الدخول\n6. محاولة استخدام رمز JWT القديم بعد انتهاء صلاحيته',
        data: 'رمز JWT منتهي الصلاحية  |  مدة انتهاء الجلسة حسب الإعداد',
        expected: 'تُنهى الجلسة تلقائياً ويُعاد توجيه المستخدم لصفحة الدخول، ويرفض النظام الرمز المنتهي',
        preconditions: 'مستخدم مسجل الدخول بجلسة نشطة',
      },
      'أمان', 'عالية', 'عالية', 'مستخدم نظام', 'نعم',
    ));
  }

  return rows;
}

// ── Step builders — detailed numbered steps per test type ─────────────────────

function buildSteps(sc, type, ast) {
  const text = (sc.text || sc.ac || '').toLowerCase();

  if (type === 'أمان') {
    if (text.includes('sql') || text.includes('حقن'))
      return '1. الانتقال إلى نموذج الإدخال المستهدف\n2. إدخال الكود: \' OR \'1\'=\'1 في حقل الإدخال\n3. الضغط على زر الإرسال\n4. ملاحظة استجابة النظام\n5. التحقق من عدم تسرب بيانات أو تنفيذ أوامر غير مصرح بها';
    if (text.includes('xss') || text.includes('سكريبت'))
      return '1. الانتقال إلى الحقل النصي الظاهر لاحقاً في الواجهة\n2. إدخال: <script>alert(\'XSS\')</script>\n3. حفظ البيانات وفتح الصفحة التي تعرضها\n4. ملاحظة ما إذا نُفّذ السكريبت\n5. التحقق من تشفير الأحرف الخاصة في مصدر الصفحة';
    if (text.includes('توثيق') || text.includes('دخول') || text.includes('401'))
      return '1. حذف جميع ملفات تعريف الارتباط وبيانات الجلسة\n2. الانتقال مباشرةً إلى رابط المورد المحمي\n3. ملاحظة استجابة النظام\n4. التحقق من إعادة التوجيه أو رمز 401\n5. محاولة الوصول عبر API بدون رأسية Authorization';
    if (text.includes('صلاحية') || text.includes('403'))
      return '1. تسجيل الدخول بحساب ذو صلاحيات محدودة\n2. محاولة الوصول المباشر للمورد المقيّد\n3. التحقق من رسالة الرفض أو رمز 403\n4. التحقق من إخفاء الوظائف المحظورة في الواجهة';
    return '1. تحديد المتجه الأمني المستهدف\n2. تحضير بيانات الهجوم أو الاختبار المناسبة\n3. تنفيذ الاختبار على النظام\n4. ملاحظة استجابة النظام\n5. التحقق من التعامل الصحيح مع التهديد';
  }

  if (type === 'تحقق من المدخلات') {
    if (text.includes('فارغ') || text.includes('إلزامي'))
      return '1. الانتقال إلى النموذج المستهدف\n2. ترك الحقل الإلزامي فارغاً\n3. الضغط على زر الحفظ أو الإرسال\n4. التحقق من ظهور رسالة التحقق\n5. التحقق من عدم إرسال النموذج';
    if (text.includes('أقصى') || text.includes('حد') || text.includes('طول'))
      return '1. الانتقال إلى الحقل المستهدف\n2. إدخال نص يتجاوز الحد الأقصى بحرف\n3. محاولة الحفظ\n4. التحقق من رفض النظام وعرض رسالة خطأ';
    return '1. الانتقال إلى نموذج الإدخال\n2. إدخال بيانات غير صالحة في الحقل المستهدف\n3. محاولة الحفظ أو الإرسال\n4. التحقق من رسالة التحقق الواضحة\n5. التحقق من عدم تنفيذ العملية';
  }

  if (type === 'حالة حدية')
    return '1. تحديد القيمة الحدية للحقل (الدنيا أو القصوى)\n2. إدخال القيمة الحدية بالضبط\n3. الضغط على الحفظ والتحقق من القبول\n4. إدخال قيمة أقل من الحد بوحدة والتحقق\n5. إدخال قيمة أعلى من الحد بوحدة والتحقق من الرفض';

  if (type === 'صلاحيات')
    return '1. تسجيل الدخول بحساب الدور المحدد\n2. الانتقال إلى الوظيفة أو الصفحة المستهدفة\n3. محاولة تنفيذ الإجراء المطلوب\n4. ملاحظة ما إذا كان الإجراء مسموحاً به\n5. التحقق من مطابقة السلوك لمتطلبات الصلاحيات';

  // Default: positive / functional
  return `1. تسجيل الدخول إلى النظام بحساب صحيح ومناسب\n2. الانتقال إلى ${ast.feature || 'الشاشة المستهدفة'}\n3. تنفيذ الإجراء المحدد: ${sc.text || sc.ac || 'تنفيذ العملية'}\n4. ملاحظة استجابة النظام والرسائل الظاهرة\n5. التحقق من حفظ البيانات أو تنفيذ العملية بنجاح\n6. التحقق من عرض رسالة التأكيد أو الانتقال للشاشة التالية`;
}

function buildData(sc, type) {
  if (sc.data) return sc.data;
  if (type === 'أمان')                return 'بيانات هجوم: SQL injection، XSS، بيانات ضارة';
  if (type === 'تحقق من المدخلات')   return 'بيانات فارغة، قيم خاصة، نص يتجاوز الحد الأقصى';
  if (type === 'حالة حدية')           return 'القيمة الدنيا، القيمة القصوى، القيمة الحدية ± 1';
  if (type === 'صلاحيات')             return 'حسابات بأدوار مختلفة: مدير، مستخدم عادي، ضيف';
  return 'بيانات اختبار صالحة وواقعية حسب السيناريو';
}

function defaultPreconditions(type) {
  if (type === 'أمان')    return 'النظام يعمل ونقاط الاختبار الأمني محددة مسبقاً';
  if (type === 'صلاحيات') return 'حسابات المستخدمين بالأدوار المختلفة موجودة ونشطة في النظام';
  return 'المستخدم مسجل الدخول بصلاحيات مناسبة والنظام يعمل بشكل طبيعي';
}

// ── XLSX Writer ───────────────────────────────────────────────────────────────

async function writeXlsx(filePath, ast, rows) {
  let ExcelJS;
  try {
    ExcelJS = require(join(FRAMEWORK_ROOT, 'node_modules', 'exceljs'));
  } catch {
    try { ExcelJS = require('exceljs'); } catch {
      console.warn('⚠️  ExcelJS not installed — skipping XLSX. Run: npm install in the framework folder.');
      return;
    }
  }

  const wb = new ExcelJS.Workbook();
  wb.creator  = 'AI QA Framework v2';
  wb.created  = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet('حالات الاختبار', {
    views: [{ rightToLeft: true }],
    pageSetup: { fitToPage: true, fitToWidth: 1, orientation: 'landscape', paperSize: 9 },
  });

  // ── Metadata rows ─────────────────────────────────────────────────────────
  const metaStyle = { font: { name: 'Arial', size: 10 }, alignment: { horizontal: 'right' } };
  const m1 = ws.addRow([`المشروع: ${ast.title ?? ast.id}`, '', '', '', '', `التاريخ: ${new Date().toLocaleDateString('ar-SA')}`, '', '', '', '', '', '', '', '', '', `إجمالي الحالات: ${rows.length}`, '']);
  m1.getCell(1).font  = { bold: true, name: 'Arial', size: 11, color: { argb: 'FF1F4E79' } };
  m1.getCell(6).font  = metaStyle.font;
  m1.getCell(16).font = { bold: true, name: 'Arial', size: 10 };
  ws.addRow([]);  // blank separator

  // ── Header row ────────────────────────────────────────────────────────────
  const headerRow = ws.addRow(TC_HEADERS);
  headerRow.height = 35;
  headerRow.eachCell(cell => {
    cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10 };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true, readingOrder: 'rtl' };
    cell.border    = {
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right:  { style: 'thin',   color: { argb: 'FFAAAAAA' } },
      left:   { style: 'thin',   color: { argb: 'FFAAAAAA' } },
    };
  });

  // ── Color maps ────────────────────────────────────────────────────────────
  const severityFill = {
    'حرجة':    { bg: 'FFC00000', fg: 'FFFFFFFF' },
    'عالية':   { bg: 'FFED7D31', fg: 'FFFFFFFF' },
    'متوسطة':  { bg: 'FFFFC000', fg: 'FF000000' },
    'منخفضة':  { bg: 'FF70AD47', fg: 'FFFFFFFF' },
  };
  const priorityFill = {
    'عالية':   { bg: 'FF002060', fg: 'FFFFFFFF' },
    'متوسطة':  { bg: 'FF2E75B6', fg: 'FFFFFFFF' },
    'منخفضة':  { bg: 'FF9DC3E6', fg: 'FF000000' },
  };
  const statusFill = {
    'اجتاز':      'FF70AD47',
    'فشل':        'FFC00000',
    'لم يُنفّذ':  'FFE0E0E0',
  };
  const typeFill = {
    'أمان':                  'FFFF0000',
    'صلاحيات':               'FFED7D31',
    'حالة حدية':             'FFFFC000',
    'تحقق من المدخلات':     'FF4472C4',
    'وظيفي':                 'FF70AD47',
  };

  // ── Data rows ─────────────────────────────────────────────────────────────
  for (let i = 0; i < rows.length; i++) {
    const row = ws.addRow(rows[i]);
    row.height = 90;  // taller to show full steps
    const isEven = i % 2 === 0;
    const bgColor = isEven ? 'FFFCFCFC' : 'FFF0F4FA';

    row.eachCell((cell, colNum) => {
      cell.font      = { name: 'Arial', size: 10 };
      cell.alignment = { horizontal: 'right', vertical: 'top', wrapText: true, readingOrder: 'rtl' };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cell.border    = {
        top:    { style: 'hair', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'hair', color: { argb: 'FFCCCCCC' } },
        right:  { style: 'hair', color: { argb: 'FFCCCCCC' } },
        left:   { style: 'hair', color: { argb: 'FFCCCCCC' } },
      };
    });

    // Col 1 — ID: bold, centered
    const idCell = row.getCell(1);
    idCell.font      = { bold: true, name: 'Arial', size: 10, color: { argb: 'FF1F4E79' } };
    idCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Col 7 — Test Type: colored background
    const typeVal = rows[i][6];
    const typeColor = typeFill[typeVal];
    if (typeColor) {
      const typeCell = row.getCell(7);
      typeCell.font      = { bold: true, color: { argb: typeColor === 'FFFF0000' || typeColor === 'FFED7D31' ? 'FFFFFFFF' : 'FF000000' }, name: 'Arial', size: 10 };
      typeCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: typeColor } };
      typeCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Col 8 — Priority: colored
    const priVal = rows[i][7];
    const priFill = priorityFill[priVal];
    if (priFill) {
      const priCell = row.getCell(8);
      priCell.font      = { bold: true, color: { argb: priFill.fg }, name: 'Arial', size: 10 };
      priCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: priFill.bg } };
      priCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Col 9 — Severity: colored
    const sevVal = rows[i][8];
    const sevFill = severityFill[sevVal];
    if (sevFill) {
      const sevCell = row.getCell(9);
      sevCell.font      = { bold: true, color: { argb: sevFill.fg }, name: 'Arial', size: 10 };
      sevCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: sevFill.bg } };
      sevCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Col 11 — Steps: slightly different font, left-align numbers
    const stepsCell = row.getCell(11);
    stepsCell.font      = { name: 'Arial', size: 10 };
    stepsCell.alignment = { horizontal: 'right', vertical: 'top', wrapText: true, readingOrder: 'rtl' };

    // Col 14 — Actual Result: light yellow (to-be-filled)
    row.getCell(14).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };

    // Col 15 — Status: colored
    const statusVal = rows[i][14];
    const statusColor = statusFill[statusVal] ?? 'FFE0E0E0';
    const statusCell = row.getCell(15);
    statusCell.font      = { name: 'Arial', size: 10, italic: true };
    statusCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColor } };
    statusCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Col 16 — UAT: centered
    const uatCell = row.getCell(16);
    uatCell.alignment = { horizontal: 'center', vertical: 'middle' };
    uatCell.font      = { bold: true, name: 'Arial', size: 10, color: { argb: rows[i][15] === 'نعم' ? 'FF375623' : 'FF843C0C' } };
  }

  // ── Column widths ─────────────────────────────────────────────────────────
  COL_WIDTHS.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  // ── Freeze header rows ────────────────────────────────────────────────────
  ws.views = [{ state: 'frozen', ySplit: 3, rightToLeft: true }];  // freeze meta + header

  // ── Auto-filter on header ─────────────────────────────────────────────────
  ws.autoFilter = {
    from: { row: 3, column: 1 },
    to:   { row: rows.length + 3, column: TC_HEADERS.length },
  };

  await wb.xlsx.writeFile(filePath);
}

// ── Markdown Writer ───────────────────────────────────────────────────────────

async function writeMd(filePath, ast, rows) {
  const date = new Date().toLocaleDateString('ar-SA');
  const lines = [
    `# حالات الاختبار — ${ast.title ?? ast.id}`,
    '',
    `> **المشروع:** ${ast.id} | **التاريخ:** ${date} | **إجمالي الحالات:** ${rows.length}`,
    '',
    '---',
    '',
  ];

  // Group by test type for readability
  const groups = {};
  for (const row of rows) {
    const type = row[6] || 'عام';
    if (!groups[type]) groups[type] = [];
    groups[type].push(row);
  }

  for (const [type, typeRows] of Object.entries(groups)) {
    lines.push(`## ${type} (${typeRows.length} حالات)`);
    lines.push('');

    for (const row of typeRows) {
      const [id, title, desc, reqId, area, actor, , priority, severity, pre, steps, data, expected, , status, uat, notes] = row;

      lines.push(`### ${id} — ${title}`);
      lines.push('');

      if (desc)   lines.push(`**الوصف:** ${desc}`);
      if (reqId)  lines.push(`**المتطلب:** ${reqId}`);
      if (area)   lines.push(`**النطاق:** ${area}`);
      if (actor)  lines.push(`**الممثل:** ${actor}`);
      lines.push(`**الأولوية:** ${priority} | **الخطورة:** ${severity} | **UAT:** ${uat}`);
      lines.push('');

      if (pre) {
        lines.push('**الشرط المسبق:**');
        lines.push(`> ${pre}`);
        lines.push('');
      }

      lines.push('**خطوات التنفيذ:**');
      lines.push('');
      // Each numbered step on its own line
      for (const step of steps.split('\n')) {
        if (step.trim()) lines.push(step.trim());
      }
      lines.push('');

      if (data) {
        lines.push(`**البيانات المستخدمة:** ${data}`);
        lines.push('');
      }

      lines.push(`**النتيجة المتوقعة:** ${expected}`);
      lines.push('');

      lines.push(`| الحالة | النتيجة الفعلية | ملاحظات |`);
      lines.push(`|--------|----------------|---------|`);
      lines.push(`| ${status} | _(تُملأ بعد التنفيذ)_ | ${notes || '-'} |`);
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  lines.push(`*تم الإنشاء بواسطة AI QA Framework — ${new Date().toISOString()}*`);
  await writeFile(filePath, lines.join('\n'), 'utf8');
}

// ── CSV Writer ────────────────────────────────────────────────────────────────

function toCsv(allRows) {
  return allRows.map(r => r.map(cell => {
    const s = String(cell ?? '');
    return (s.includes(',') || s.includes('"') || s.includes('\n'))
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  }).join(',')).join('\r\n');
}

async function writeCsv(filePath, rows) {
  await writeFile(filePath, '﻿' + toCsv([TC_HEADERS, ...rows]), 'utf8');
}

# Skill: Test Case Generation (Arabic XLSX)

You are a senior QA Engineer. Generate professional Arabic test cases and save them as a **properly formatted `.xlsx` Excel file** (NOT CSV) so Arabic text renders correctly in Excel on all locales.

## Output columns (exact order):

```
Test Case ID, اسم السيناريو, وصف السيناريو, Preconditions, خطوات التنفيذ, البيانات المستخدمة, النتيجة المتوقعة, Actual Result, الحالة, الأولوية, مستوى الخطورة, نوع الاختبار, ملاحظات
```

## Content Rules:
1. Quote every CSV field (`"..."`) and escape inner quotes by doubling (`""`).
2. Use `;` as the line separator inside multi-step fields (so each test case stays on one row).
3. Cover all scenario types: positive, negative, edge, security, validation, permission, API, exploratory.
4. `الأولوية` ∈ { عالية، متوسطة، منخفضة }.
5. `مستوى الخطورة` ∈ { حرجة، عالية، متوسطة، منخفضة }.
6. `نوع الاختبار` ∈ { وظيفي، تحقق، حد، أمان، صلاحيات، API، استكشافي، انحدار، أداء، إمكانية وصول }.
7. `الحالة` defaults to `لم يُنفّذ`.
8. Write at least 1 positive AND 1 negative case per acceptance criterion.
9. Add a security and a permission case whenever an auth scheme is detected.

## Output Steps (MUST follow in order):

### Step 1 — Save CSV
Use `create_file` to save the generated rows as a **plain UTF-8 CSV** (no BOM needed) at:
```
AI-QA-FRAMEWORK/reports/test-cases-<story-id>.csv
```

### Step 2 — Convert to XLSX
Run this command to convert the CSV to a properly styled xlsx file with RTL Arabic layout:
```bash
node "AI-QA-FRAMEWORK/reports/gen-xlsx.js" \
  --input  "AI-QA-FRAMEWORK/reports/test-cases-<story-id>.csv" \
  --output "AI-QA-FRAMEWORK/reports/test-cases-<story-id>.xlsx"
```

On Windows (PowerShell):
```powershell
node "AI-QA-FRAMEWORK/reports/gen-xlsx.js" `
  --input  "AI-QA-FRAMEWORK/reports/test-cases-<story-id>.csv" `
  --output "AI-QA-FRAMEWORK/reports/test-cases-<story-id>.xlsx"
```

### Step 3 — Confirm Output
Report the path to the generated `.xlsx` file to the user. The xlsx file includes:
- Right-to-left (RTL) Arabic sheet layout
- Bold blue header row with white text
- Alternating row background colors
- Wrapped cell text with `Arial` font (correct Arabic rendering)

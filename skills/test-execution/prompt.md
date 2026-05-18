# Skill: Test Execution — Per-Test Fix & Record Loop

Run Playwright tests **one at a time**. After each failure: diagnose, fix, record the bug, retest — then move to the next test. Never run all tests at once and hope for the best.

---

## Protocol

### Step 0 — Prepare
1. Confirm the spec file exists: `{output_folder}/{story_id}/e2e/tests/{suite_name}.spec.js`
2. Ensure `{output_folder}/{story_id}/bug-reports/` folder exists (create if missing).
3. Count existing `BUG-XXXX.md` files in `bug-reports/` → set `{next_bug_id}` = count + 1.
4. Initialize an in-memory **execution log** (reset each session).

### Step 1 — List All Tests
Run:
```bash
npx playwright test --list {suite_name}.spec.js
```
Parse the output to extract the ordered list of test names. Store as `{test_list}`.
Display: `📋 Found {N} tests to execute.`

### Step 2 — Per-Test Execution Loop

For each `{test_name}` in `{test_list}`:

#### 2a — Run the Single Test
```bash
npx playwright test --headed --grep "{test_name}" {suite_name}.spec.js
```
- Always headed (browser visible)
- SlowMo: 60ms
- Capture exit code

#### 2b — If the Test PASSES (exit code 0)
- Update test-checklist.md: mark `{test_name}` as ✅ Passed
- Log: `✅ PASS — {test_name}`
- Continue to next test.

#### 2c — If the Test FAILS (exit code ≠ 0)

**Diagnose:**
1. Read the error message and stack trace from the JUnit output or console
2. Read the spec file around the failing line
3. Read the Page Object file(s) referenced in the stack trace
4. Classify the failure:
   - **Test Bug** — wrong selector, wrong assertion value, wrong URL, missing `await`, bad test setup → fix the spec file or page object
   - **Source Bug** — the application itself behaves incorrectly (missing element, wrong API response, broken navigation) → fix the application source

**Apply the Fix:**
- Edit the failing file with the minimal change that corrects the root cause
- Do NOT refactor unrelated code

**Record the Bug immediately** — create `bug-reports/BUG-{next_bug_id:04d}.md`:

```markdown
# BUG-{XXXX} — {test_name}

> **الحالة**: مفتوح | **التاريخ**: {current_date} | **الجولة**: أثناء تنفيذ الاختبار

---

## معلومات الخطأ

| الحقل | القيمة |
|---|---|
| **Bug ID** | `BUG-{XXXX}` |
| **عنوان المشكلة** | {test_name} |
| **نوع الخطأ** | خطأ في ملف الاختبار / خطأ في الكود المصدري |
| **الملف المُعدَّل** | {path_of_file_that_was_fixed} |
| **مستوى الخطورة** | حرجة / عالية / متوسطة / منخفضة |
| **الأولوية** | عالية / متوسطة / منخفضة |

---

## وصف الخطأ

```
{error_message}
```

---

## تشخيص السبب الجذري

{specific_root_cause_analysis — NOT "unknown error"}

---

## الإصلاح المُطبَّق

{description of what was changed and why}

```javascript
// قبل الإصلاح (Before):
{old_code_snippet}

// بعد الإصلاح (After):
{new_code_snippet}
```

---

## سجل التتبع (Stack Trace)

<details>
<summary>عرض سجل التتبع</summary>

```
{stack_trace}
```

</details>
```

Increment `{next_bug_id}` by 1.

**Retest the Fix:**
```bash
npx playwright test --headed --grep "{test_name}" {suite_name}.spec.js
```

**Append the retest outcome to the bug report:**

If PASS:
```markdown
---

## ✅ تم الإصلاح — اجتاز الاختبار بعد الإصلاح

> تم التحقق بنجاح في: {timestamp}
```

If still FAIL:
```markdown
---

## ❌ لا يزال فاشلاً — يحتاج مراجعة

> تمت إعادة الاختبار في: {timestamp} — لا يزال يفشل.
> ما تمت محاولته: {description_of_attempted_fix}
```

**Update checklist:**
- Fixed → ✅ Passed in test-checklist.md
- Still failing → ❌ Failed in test-checklist.md

**Log to execution summary:** `🔧 FIXED — {test_name} | BUG-{XXXX} | {fix_type}` or `❌ OPEN — {test_name} | BUG-{XXXX}`

Move to next test.

---

### Step 3 — Final Full Run (for JUnit XML)
After all individual tests have been processed, run the complete suite once to generate the canonical JUnit XML file:
```bash
npx playwright test --headed {suite_name}.spec.js
```
This produces the final `junit.xml` reflecting all fixes applied.

### Step 4 — Update bug-reports/INDEX.md
Create or update `bug-reports/INDEX.md` with a table of every bug recorded this session.

### Step 5 — Print Execution Summary
```
╔══════════════════════════════════════╗
║      Test Execution Summary          ║
╠══════════════════════════════════════╣
║  Total Tests        : {total}        ║
║  ✅ Passed          : {passed}       ║
║  🔧 Fixed Inline    : {fixed_inline} ║
║  ❌ Still Failing   : {still_open}   ║
║  📋 Bugs Recorded   : {bug_count}    ║
╚══════════════════════════════════════╝
```

---

## Rules (STRICT)
- ALWAYS run headed — browser must be visible
- Fix ONE test at a time — never batch multiple test fixes in one edit
- Record the bug report BEFORE retesting (so it exists even if retest also fails)
- Root cause must be specific — never write "unknown error" or "test failed"
- If uncertain whether it's a test bug or source bug, lean toward test bug first; if unsure, ask the user
- Do NOT retry a failed fix more than once — log as ❌ Still Open and move on
- Never invent test results — always check actual exit code / JUnit output

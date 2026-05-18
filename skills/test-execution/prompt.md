# Skill: Test Execution — Pre-Flight Review + Per-Test Fix Loop

Run Playwright tests **one at a time**. **Before running any test, review the spec file and fix every issue found.** After each failure: diagnose, fix, record the bug, retest — then move to the next test. Never run tests on a broken spec file.

---

## Protocol

### Step 0 — Prepare
1. Confirm the spec file exists: `{output_folder}/{story_id}/e2e/tests/{suite_name}.spec.js`
2. Confirm the page object(s) exist: `{output_folder}/{story_id}/e2e/pages/`
3. Confirm test data file exists: `{output_folder}/{story_id}/test-data/{suite_name}.testdata.json`
4. Ensure `{output_folder}/{story_id}/bug-reports/` folder exists (create if missing).
5. Count existing `BUG-XXXX.md` files in `bug-reports/` → set `{next_bug_id}` = count + 1.
6. Initialize an in-memory **execution log** (reset each session).

---

### Step 0.5 — Pre-Execution Spec Review (MANDATORY — runs BEFORE any test)

> This step runs ONCE per spec file, before the first test in the loop.
> Purpose: catch and fix all problems in the spec that would cause false test failures.
> A test failure caused by a broken spec is waste — fix the spec first.

#### 0.5a — Run the deterministic pre-flight check

Execute the orchestrator in review mode:
```bash
node {project-root}/AI-QA-FRAMEWORK/core/orchestrator.mjs run-tests --mode review --suite {suite_name}
```

Read the JSON output. It reports:
- `[BLOCKER]` — syntax errors, missing import files, missing test-data files
- `[WARN]`    — hardcoded URLs, deprecated API calls, possible missing `await`, `test.skip`
- `[FIXED]`   — issues already auto-fixed (`.only` removal, import extension correction)

#### 0.5b — Read the spec file completely

```
Read: {output_folder}/{story_id}/e2e/tests/{suite_name}.spec.js
Read: {output_folder}/{story_id}/e2e/pages/*.page.js   (all page object files)
Read: {output_folder}/{story_id}/test-data/{suite_name}.testdata.json
```

#### 0.5c — Full review checklist

Review the spec file against **every item** in this checklist. Fix all failures before proceeding.

---

**CATEGORY 1 — File Structure & Imports**

| Check | What to verify | How to fix |
|-------|---------------|-----------|
| `IM-1` | Every `import` / `require` path resolves to a file that actually exists | Correct the path; match exact filename and casing |
| `IM-2` | Page object class names match what is `export default`-ed in the `.page.js` file | Update the class name in the import or in the page object |
| `IM-3` | Test data is imported or loaded correctly (right path, right variable name) | Fix import path; verify key names match the JSON schema |
| `IM-4` | No circular imports | Restructure if found |

---

**CATEGORY 2 — Test Data Consistency**

| Check | What to verify | How to fix |
|-------|---------------|-----------|
| `TD-1` | `testData.baseUrl` (or equivalent) matches the configured base URL in `project.config.json` | Update the testdata JSON or fix the reference |
| `TD-2` | Every key used in the spec (`testData.adminUser.email`, `testData.validInputs.name`, etc.) exists in the testdata JSON | Add missing keys to the JSON; remove references to non-existent keys |
| `TD-3` | User credentials come from `testData` or `config.yaml test_users` — NOT hardcoded strings | Replace hardcoded credentials with `testData.adminUser.email` etc. |
| `TD-4` | `testData.loginPath`, `testData.dashboardPath` etc. are correct URL paths for this project | Update to match actual route structure |
| `TD-5` | Placeholder values like `"REPLACE_WITH_REAL_PASSWORD"` have been replaced | Update with real values from `config.yaml test_users` or ask the user |

---

**CATEGORY 3 — Playwright API Correctness**

| Check | What to verify | How to fix |
|-------|---------------|-----------|
| `PW-1` | Every async Playwright call (`page.click`, `page.fill`, `page.goto`, `locator.fill`, etc.) is preceded by `await` | Add the missing `await` |
| `PW-2` | `page.locator()` is used instead of deprecated `page.$()` / `page.$$()` | Replace deprecated calls |
| `PW-3` | `page.waitForURL()` or `waitForLoadState()` is used instead of `page.waitForNavigation()` | Replace with non-deprecated equivalent |
| `PW-4` | No `page.waitForTimeout()` for waits — use `page.waitForSelector()`, `locator.waitFor()`, or `expect(locator).toBeVisible()` instead | Replace with proper explicit wait |
| `PW-5` | `expect()` assertions use `@playwright/test` expect, not Jest or Chai | Fix imports if needed |
| `PW-6` | Locators use stable selectors: `getByRole`, `getByLabel`, `getByTestId`, `getByText`, or `locator('[data-testid="..."]')` — not fragile `nth-child` or XPath unless unavoidable | Rewrite fragile selectors |

---

**CATEGORY 4 — Test Structure**

| Check | What to verify | How to fix |
|-------|---------------|-----------|
| `TS-1` | No `test.only()` or `describe.only()` in the file | Remove `.only` |
| `TS-2` | No `test.skip()` unless intentional | Investigate why it was skipped; remove or keep with comment |
| `TS-3` | Each test has a unique, descriptive name following the pattern `TC-XXXX: description` | Rename if collisions found |
| `TS-4` | `test.beforeEach` / `test.afterEach` hooks do not leave browser state dirty (navigate to login, clear cookies, etc.) | Add proper cleanup |
| `TS-5` | Login steps appear ONCE in `beforeEach` (not duplicated in every test body) | Extract to `beforeEach` |
| `TS-6` | Tests are independent — no test depends on state left by a previous test | Refactor to add proper setup in `beforeEach` |

---

**CATEGORY 5 — Page Object Correctness**

| Check | What to verify | How to fix |
|-------|---------------|-----------|
| `PO-1` | Every method called on a page object in the spec actually exists in the page object class | Add the missing method to the page object |
| `PO-2` | Page object constructor receives `page` from Playwright fixtures correctly | Fix constructor signature |
| `PO-3` | All locators in page objects are defined before use | Move or add locator definitions |
| `PO-4` | `navigate()` / `goto()` methods use `this.page.goto(baseURL + path)` not hardcoded full URLs | Fix to use relative path + baseURL |

---

**CATEGORY 6 — Authentication & Role Coverage**

| Check | What to verify | How to fix |
|-------|---------------|-----------|
| `AU-1` | Tests that require login use credentials from `testData` or `config.yaml test_users` — not hardcoded | Fix references |
| `AU-2` | Every role mentioned in the user story has at least one test covering its specific permissions | Add missing role-coverage tests |
| `AU-3` | Negative tests (wrong password, unauthorised role) use clearly invalid credentials — not real ones | Ensure invalid-credential tests use obviously fake values |

---

#### 0.5d — Apply all fixes

For each failed check:
1. Edit the spec file (or the page object file, or the testdata JSON) with the minimal fix
2. State what was changed and why: `Fixed PW-1: added await before page.click() on line 47`
3. Do NOT refactor beyond the fix

After all fixes, run the deterministic check again to confirm blockers are resolved:
```bash
node {project-root}/AI-QA-FRAMEWORK/core/orchestrator.mjs run-tests --mode review --suite {suite_name}
```
If blockers remain, fix them before proceeding. **Do not run tests while blockers are present.**

#### 0.5e — Pre-flight summary

Display before moving to Step 1:
```
✅ Pre-flight Review Complete — {suite_name}.spec.js

  Issues found   : {N}
  Auto-fixed     : {M}  (by pre-flight engine)
  AI-fixed       : {K}  (by this review)
  Warnings left  : {W}  (non-blocking, noted)

  Ready to execute {test_count} tests.
```

---

### Step 1 — List All Tests
Run:
```bash
npx playwright test --list {suite_name}.spec.js
```
Parse the output to extract the ordered list of test names. Store as `{test_list}`.
Display: `📋 Found {N} tests to execute.`

---

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
╔══════════════════════════════════════════════╗
║         Test Execution Summary               ║
╠══════════════════════════════════════════════╣
║  Spec pre-flight fixes : {preflight_fixed}   ║
║  Total Tests           : {total}             ║
║  ✅ Passed             : {passed}            ║
║  🔧 Fixed Inline       : {fixed_inline}      ║
║  ❌ Still Failing      : {still_open}        ║
║  📋 Bugs Recorded      : {bug_count}         ║
╚══════════════════════════════════════════════╝
```

---

## Rules (STRICT)
- **Pre-flight is MANDATORY** — NEVER skip Step 0.5, even for a single test run
- **Fix before run** — if blockers exist after pre-flight, fix them ALL before executing any test
- ALWAYS run headed — browser must be visible
- Fix ONE test at a time — never batch multiple test fixes in one edit
- Record the bug report BEFORE retesting (so it exists even if retest also fails)
- Root cause must be specific — never write "unknown error" or "test failed"
- If uncertain whether it's a test bug or source bug, lean toward test bug first; if unsure, ask the user
- Do NOT retry a failed fix more than once — log as ❌ Still Open and move on
- Never invent test results — always check actual exit code / JUnit output
- Warnings from pre-flight (non-blockers) are noted in the execution summary but do not block execution

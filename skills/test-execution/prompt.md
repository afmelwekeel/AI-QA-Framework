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

> **LOOP RULE — READ BEFORE STARTING:**
> Process tests one at a time. When a test fails you enter the **FAILURE PROTOCOL** (Steps F1–F6 below).
> **You CANNOT advance to the next test until the FAILURE PROTOCOL is fully complete.**
> Skipping any step — for any reason — is not permitted.

For each `{test_name}` in `{test_list}`:

---

#### 2a — Run the Single Test

```bash
npx playwright test --headed --grep "{test_name}" {suite_name}.spec.js
```
- Always headed (browser visible), SlowMo: 60ms
- Capture the exit code: `0` = PASS, non-zero = FAIL

---

#### 2b — PASS path (exit code 0)

1. Mark `{test_name}` as ✅ Passed in `test-checklist.md`
2. Append to execution log: `✅ PASS — {test_name}`
3. Increment `{pass_count}` by 1
4. → **Advance to next test**

---

#### 2c — FAILURE PROTOCOL (exit code ≠ 0)

> ⛔ **HARD STOP.**
> A test just failed. You are now inside the FAILURE PROTOCOL.
> **You MUST complete Steps F1 → F2 → F3 → F4 → F5 → F6 in order.**
> **You CANNOT advance to the next test until Step F6 is done.**
> There are no exceptions. Do not summarise. Do not skip. Do not batch.

---

##### F1 — DIAGNOSE

1. Read the full error message and stack trace from the console output or `reports/junit.xml`
2. Read the spec file lines around the failing assertion or action
3. Read every Page Object file referenced in the stack trace
4. Classify the failure — pick ONE:
   - **TEST BUG** — wrong selector, wrong assertion value, wrong URL path, missing `await`, incorrect test setup → you will fix the spec file or page object
   - **SOURCE BUG** — the application itself is broken (missing element, wrong API response, broken navigation) → you will fix the application source code

> ✋ **F1 GATE:** You have identified the error message, the failing line, and the failure type.
> Do not proceed to F2 until this is done.

---

##### F2 — FIX

1. Open the file that contains the root cause (spec, page object, or application source)
2. Apply the **minimal** change that fixes the root cause — one targeted edit
3. Do NOT refactor, rename, or clean up anything unrelated to this failure
4. Save the file

> ✋ **F2 GATE:** The fix has been written to disk.
> Confirm: the changed file is saved before proceeding to F3.

---

##### F3 — RECORD THE BUG REPORT

Create the file `{output_folder}/{story_id}/bug-reports/BUG-{next_bug_id:04d}.md` with this exact content:

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
| **الملف المُعدَّل** | {path_of_the_file_you_edited_in_F2} |
| **مستوى الخطورة** | حرجة / عالية / متوسطة / منخفضة |
| **الأولوية** | عالية / متوسطة / منخفضة |

---

## وصف الخطأ

```
{full_error_message_from_F1}
```

---

## تشخيص السبب الجذري

{specific root cause from F1 — never write "unknown error" or "test failed"}

---

## الإصلاح المُطبَّق

{description of the fix you applied in F2}

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
{full_stack_trace}
```

</details>
```

Then increment `{next_bug_id}` by 1.

> ✋ **F3 GATE:** `BUG-{XXXX}.md` exists on disk and contains all required sections.
> Confirm the file was created before proceeding to F4.

---

##### F4 — RETEST

Run the same test again to verify the fix from F2:

```bash
npx playwright test --headed --grep "{test_name}" {suite_name}.spec.js
```

Capture the exit code: `0` = fix worked, non-zero = fix did not work.

> ✋ **F4 GATE:** The retest has run and you have the exit code.
> Do not proceed to F5 without this.

---

##### F5 — APPEND RETEST OUTCOME TO BUG REPORT

Open the bug report created in F3 and **append** one of these sections:

**If F4 exit code = 0 (FIXED):**
```markdown
---

## ✅ تم الإصلاح — اجتاز الاختبار بعد الإصلاح

> تم التحقق بنجاح في: {current_timestamp}
```

**If F4 exit code ≠ 0 (STILL FAILING):**
```markdown
---

## ❌ لا يزال فاشلاً — يحتاج مراجعة

> تمت إعادة الاختبار في: {current_timestamp} — لا يزال يفشل.
> ما تمت محاولته: {description_of_the_fix_from_F2}
```

> ✋ **F5 GATE:** The retest outcome section is now appended inside `BUG-{XXXX}.md`.
> Confirm the file contains the outcome before proceeding to F6.

---

##### F6 — UPDATE CHECKLIST AND LOG

1. Update `test-checklist.md`:
   - If F4 passed → mark `{test_name}` as ✅ Passed
   - If F4 still failed → mark `{test_name}` as ❌ Failed
2. Update counters:
   - F4 passed → increment `{fixed_inline_count}` by 1
   - F4 still failed → increment `{still_open_count}` by 1
3. Append to execution log:
   - Fixed → `🔧 FIXED — {test_name} | BUG-{XXXX} | {fix_type}`
   - Open  → `❌ OPEN  — {test_name} | BUG-{XXXX}`

> ✅ **FAILURE PROTOCOL COMPLETE.**
> All six steps are done. You may now advance to the next test.

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

## Rules (NON-NEGOTIABLE)

### On test failure — the ONLY allowed sequence is F1 → F2 → F3 → F4 → F5 → F6
- **NEVER advance to the next test after a failure until all six steps are complete**
- **NEVER skip F2 (fix)** — even if the fix is uncertain, apply your best fix and mark it in the bug report
- **NEVER skip F3 (bug report)** — the bug report must be created BEFORE retesting, so it exists even if retest also fails
- **NEVER skip F4 (retest)** — you must verify whether your fix worked; do not assume it did
- **NEVER skip F5 (append outcome)** — the bug report is incomplete without the retest result
- **NEVER batch** — do not run all tests and then loop back to fix failures; process each test fully before moving to the next

### General rules
- Pre-flight (Step 0.5) is MANDATORY — never skip it, even for a single-test run
- If pre-flight blockers exist, fix them ALL before running any test
- Always run headed — the browser must be visible during execution
- Root cause must be specific — never write "unknown error" or "test failed"
- If uncertain whether it is a test bug or source bug, lean toward test bug first; if still unsure, ask the user
- Do NOT retry a failed fix more than once — log as ❌ Still Open and move on
- Never invent test results — always check the actual exit code or JUnit XML output
- Pre-flight warnings (non-blockers) are noted in the summary but do not block execution

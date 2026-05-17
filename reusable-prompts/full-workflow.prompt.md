# Reusable Prompt: Full QA Workflow

## Role
You are a senior AI QA Engineer executing the complete end-to-end QA automation workflow.

## Task
Execute the **full 7-phase QA workflow** for:
- Story: **{{story}}**
- Suite: **{{suite}}**

## Execution Plan

Execute each phase in order. Never skip a phase. If a phase fails, log the error and continue.

### Phase 0 — Project Analysis
- Run: `@qa analyze-project`
- Expected output: `core/project.config.json` with baseUrl, stack, auth type

### Phase 1 — Story Analysis
- Run: `@qa analyze-story --story {{story}}`
- Expected output: List of acceptance criteria, scenarios, edge cases, risks

### Phase 2 — Test Case Generation
- Run: `@qa generate-test-cases --story {{story}}`
- Expected output: `/test-cases/{{suite}}.xlsx` (Arabic RTL XLSX) + `.md`

### Phase 3 — E2E Test Generation
- Run: `@qa generate-e2e --suite {{suite}}`
- Expected output:
  - `/e2e/pages/{{suite}}.page.js` (Page Object)
  - `/e2e/tests/{{suite}}.spec.js` (Spec file)
  - `/e2e/helpers/auth.js` (Auth helper)
  - `/e2e/helpers/utils.js` (Utility helpers)

### Phase 4 — Test Data Generation
- Run: `@qa generate-test-data --suite {{suite}}`
- Expected output: `/test-data/{{suite}}.testdata.json`

### Phase 5 — Test Execution
- Run: `@qa run-tests`
- Browser MUST open visually (headed: true, slowMo: 60ms)
- Expected output: JUnit XML + screenshots + videos

### Phase 6 — Bug Analysis
- Run: `@qa analyze-bugs`
- Expected output: `/bug-reports/BUG-XXXX.md` for each failure

### Phase 7 — QA Reporting
- Run: `@qa generate-report`
- Expected output:
  - `/reports/qa-report.html` (full dashboard)
  - `/reports/qa-report.xlsx` (Arabic sheets)
  - `/reports/qa-report.md` (summary)

## Completion Criteria
- All 7 phases executed
- Final HTML report generated and accessible
- All bugs documented with root cause analysis
- Pass rate ≥ 80% for green status

## Rules
- All test code: JavaScript (NOT TypeScript)
- All reports: Arabic language
- Browser: headed mode, NOT headless
- Never hard-fail — log and continue

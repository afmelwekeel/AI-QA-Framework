# AI QA Framework

> Give any project a **Senior AI QA Engineer** — from user story to full QA report, automatically.

[![npm version](https://img.shields.io/npm/v/ai-qa-framework.svg)](https://www.npmjs.com/package/ai-qa-framework)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

---

## What Is This?

AI QA Framework installs a QA agent named **Rayan** into your AI assistant (Claude Code, Cursor, GitHub Copilot, Windsurf). You give Rayan a user story file and he runs the full QA lifecycle — detecting your stack, generating test cases, writing Playwright E2E tests, executing them, fixing failures, and producing a professional QA report.

**Works with any project stack** — React, Angular, Vue, .NET, Node.js, Python, any database.  
**All QA documents generated in Arabic by default** (configurable to any language).

---

## Quick Start

**1 — Install**
```bash
npx ai-qa-framework install
```
This copies the framework into `./ai-qa-framework/` and creates `config.yaml` for your project.

**2 — Activate Rayan**

Open your AI assistant and load the agent:
- **Claude Code**: type `/aiqa-help` in the chat
- **Cursor / Copilot / Windsurf**: reference `./ai-qa-framework/agents/qae.md`

**3 — Run QA on a user story**
```
/aiqa-fullworkflow docs/stories/1-1-login-feature.md
```

That's it. Rayan handles everything from stack detection to final report.

---

## Complete Workflow

```
  Your User Story File(s)
           |
           v
+==================================================================+
|         /aiqa-fullworkflow  story.md  [story2.md ...]           |
|                  RUNS ALL 8 PHASES AUTOMATICALLY                 |
+==================================================================+
           |
           |  -- OR -- run each phase separately (same result):
           |
           v
+------------------------------------------------------------------+
|  Phase 0 .  /aiqa-analyzeproject                                 |
|             Scan the project -> detect framework, base URL,      |
|             database, auth scheme, and all routes                |
|             Output -> AI-QA-FRAMEWORK/core/project.config.json  |
+-------------------------------+----------------------------------+
                                |
                         [optional] /aiqa-analyzeproject-validate
                         Verify config accuracy; fix by severity
                                |
                                v
+------------------------------------------------------------------+
|  Phase 1 .  /aiqa-analyzestory  story.md  [story2.md ...]        |
|             Read story file(s) -> extract acceptance criteria,   |
|             positive/negative scenarios, edge cases, security    |
|             scenarios, risks                                     |
|             Output -> AI-QA-FRAMEWORK/reports/story-asts/       |
+-------------------------------+----------------------------------+
                                |
                         [optional] /aiqa-analyzestory-validate
                         Verify AC completeness; fix by severity
                                |
                                v
+------------------------------------------------------------------+
|  Phase 2 .  /aiqa-generatetestcases [suitename]                  |
|             Generate structured test cases covering all ACs      |
|             (functional, validation, boundary, security, RBAC)   |
|             Output -> TestResult/{suite}/test-cases/             |
|                      {suite}-test-cases.xlsx  (Arabic, RTL)      |
|                      {suite}-test-cases.md                       |
+-------------------------------+----------------------------------+
                                |
                         [optional] /aiqa-generatetestcases-validate
                         Verify coverage & quality; fix by severity
                                |
                                v
+------------------------------------------------------------------+
|  Phase 3 .  /aiqa-generatee2e [suitename]                        |
|             Scaffold Playwright E2E tests in JavaScript          |
|             Page Object Model + spec file per suite              |
|             [!] URL review checkpoint -- Rayan shows all         |
|                 page.goto() paths and waits for your OK          |
|             Output -> TestResult/{suite}/e2e/                    |
|                       pages/{suite}.page.js                      |
|                       tests/{suite}.spec.js                      |
+-------------------------------+----------------------------------+
                                |
                         [optional] /aiqa-generatee2e-validate
                         Verify POM, spec, URLs; fix by severity
                                |
                                v
+------------------------------------------------------------------+
|  Phase 4 .  /aiqa-generatetestdata [suitename]                   |
|             Generate 3 JSON data files per suite:                |
|               - valid.json    -- realistic positive data         |
|               - edge.json     -- boundary, empty, special chars  |
|               - security.json -- SQL injection, XSS, CSRF        |
|             [!] Data review checkpoint -- Rayan shows each file  |
|                 and waits for your OK before continuing          |
|             Output -> TestResult/{suite}/test-data/              |
|             (Runs /aiqa-fetchtestusers if no test users saved)   |
+-------------------------------+----------------------------------+
                                |
                         [optional] /aiqa-generatetestdata-validate
                         Verify data files & field names; fix by severity
                                |
                                v
+------------------------------------------------------------------+
|  Phase 5 .  /aiqa-runtests [suitename]                           |
|             1. Pre-flight spec review -- fix all blockers first  |
|             2. Run each test individually (headed browser)       |
|             3. On failure: diagnose -> fix -> record bug ->      |
|                retest -> then move to next test                  |
|             Output -> TestResult/{suite}/                        |
|                       test-checklist.md  (pass/fail per test)   |
|                       reports/junit.xml                          |
|                       bug-reports/BUG-0001.md ...               |
+-------------------------------+----------------------------------+
                                |
                                v
+------------------------------------------------------------------+
|  Phase 6 .  /aiqa-analyzebugs [suitename]                        |
|             Read junit.xml -> triage every failure -> generate   |
|             one Arabic bug report per failed test with:          |
|             severity, root cause, steps to reproduce, fix hint   |
|             Output -> TestResult/{suite}/bug-reports/            |
+-------------------------------+----------------------------------+
                                |
                         [optional] /aiqa-analyzebugs-validate
                         Verify report completeness; fix by severity
                                |
                                v
+------------------------------------------------------------------+
|  Phase 7 .  /aiqa-generatereport [suitename]                     |
|             Aggregate all phase results into a QA summary:       |
|               - qa-report.html  -- interactive dashboard         |
|               - qa-report.xlsx  -- Arabic spreadsheet summary    |
|               - qa-report.md    -- Markdown report               |
|             Quality gate: pass rate must reach min_pass_rate %   |
|             Output -> TestResult/{suite}/reports/                |
+-------------------------------+----------------------------------+
                                |
                         [optional] /aiqa-generatereport-validate
                         Verify pass rate, bug count, quality gate
                                |
                                v
                    [OK]  QA Cycle Complete
```

---

## All Commands

Once the framework is installed, run commands from inside `./ai-qa-framework/`:

| npm script | Phase | What it does |
|---|---|---|
| `npm run detect` | 0 | Auto-detect stack |
| `npm run analyze-story` | 1 | Parse user story |
| `npm run test-cases` | 2 | Generate XLSX test cases |
| `npm run e2e` | 3 | Generate Playwright tests |
| `npm run test-data` | 4 | Generate test data |
| `npm run run-tests` | 5 | Execute tests (headed) |
| `npm run bugs` | 6 | Analyze failures |
| `npm run report` | 7 | Generate QA summary |
| `npm run full` | 0–7 | All phases in sequence |

Or tell Rayan directly in your AI tool:

```
# ── MASTER COMMAND ─────────────────────────────────────────────────────────────
/aiqa-fullworkflow <story.md> [story2.md ...]
   Runs all 8 phases end-to-end in one command.
   Multiple story files are merged into one unified suite.
   Includes two mandatory review checkpoints:
     - URL review after Phase 3 (confirm page routes before tests run)
     - Data review after Phase 4 (confirm test data values before tests run)

# ── SUITE SYSTEM ───────────────────────────────────────────────────────────────
# Phases 1-7 use a suite registry (TestResult/test-suites.yml) to track progress.
# After /aiqa-analyzestory runs, a suite entry is created and set as the active suite.
# All subsequent phase commands automatically use the active suite — no need to
# pass the story file path again. Pass a suitename to override the active suite.
#
# Suite status progression (enforced — commands won't run out of order):
#   story-analyzed -> test-cases-generated -> e2e-generated ->
#   test-data-generated -> tests-executed -> bugs-analyzed -> report-generated
#
# Switch active suite:  /aiqa-analyzestory --activate <suitename>

# ── PHASE COMMANDS (same result as /aiqa-fullworkflow, run in this order) ──────
/aiqa-analyzeproject
   Phase 0 — Scan the project and auto-detect the full technology stack:
   frontend framework, backend, database, auth scheme, routes and API endpoints.
   Saves results to: AI-QA-FRAMEWORK/core/project.config.json
   Run this first. All later phases read from this file.

/aiqa-analyzestory <story.md> [story2.md ...] [--suite <suitename>]
   Phase 1 — Read one or more story files and extract: acceptance criteria (ACs),
   positive and negative test scenarios, edge cases, security scenarios, and risks.
   Multiple stories are merged into one unified AC set (duplicates removed).
   Creates/updates the suite entry in TestResult/test-suites.yml and sets it active.
   --suite <name>  : override the suite name (default: derived from first filename)
   --activate <name> : just switch the active suite, skip analysis
   Saves AST to: AI-QA-FRAMEWORK/reports/story-asts/{suitename}.json

/aiqa-generatetestcases [suitename]
   Phase 2 — Generate structured Arabic test cases covering every AC.
   Requires suite status: story-analyzed (or higher).
   Uses active suite from test-suites.yml if no suitename is given.
   Covers all test types: functional, validation, boundary, security, RBAC.
   Each test case includes: ID, title, preconditions, numbered steps,
   test data, expected result, severity, priority, and UAT eligibility.
   Output: TestResult/{suite}/test-cases/{suite}-test-cases.xlsx (Arabic RTL)
           TestResult/{suite}/test-cases/{suite}-test-cases.md

/aiqa-generatee2e [suitename]
   Phase 3 — Scaffold Playwright E2E tests in JavaScript using Page Object Model.
   Requires suite status: story-analyzed (or higher).
   Uses active suite from test-suites.yml if no suitename is given.
   Generates a .page.js (locators and actions) and a .spec.js (test cases).
   Also generates test-checklist.md — one checkbox per test, updated after Phase 5.
   Output: TestResult/{suite}/e2e/pages/{suite}.page.js
           TestResult/{suite}/e2e/tests/{suite}.spec.js
           TestResult/{suite}/test-checklist.md
   [STOP] URL review checkpoint: Rayan lists all page.goto() paths and waits
   for your confirmation before finishing. Correct wrong routes here.

/aiqa-generatetestdata [suitename]
   Phase 4 — Generate three JSON data files per suite.
   Requires suite status: e2e-generated (or higher).
   Uses active suite from test-suites.yml if no suitename is given.
     - {suite}-valid.json    : realistic positive data (emails, names, form values)
     - {suite}-edge.json     : boundary values, empty strings, nulls, special chars
     - {suite}-security.json : SQL injection, XSS, CSRF, oversized inputs
   If no test users are saved in config.yaml, runs /aiqa-fetchtestusers first.
   Output: TestResult/{suite}/test-data/
   [STOP] Data review checkpoint: Rayan shows each file in full and waits
   for your confirmation before proceeding to Phase 5.

/aiqa-runtests [suitename]
   Phase 5 — Execute tests one at a time in headed mode (browser visible).
   Requires suite status: test-data-generated (or higher).
   Uses active suite from test-suites.yml if no suitename is given.
   Before any test runs: full pre-flight spec review fixes all blockers
   (imports, test data keys, missing awaits, wrong selectors, page object issues).
   For every failing test, Rayan completes this protocol before the next test:
     F1 - Diagnose: read error + stack trace, classify as test bug or source bug
     F2 - Fix: apply the minimal fix and save to disk
     F3 - Create BUG-XXXX.md with: error, root cause, fix applied, before/after code
     F4 - Retest: run the same test again to verify the fix worked
     F5 - Record outcome: append fixed or still-failing result to the bug report
     F6 - Update test-checklist.md with final pass/fail status
   Output: TestResult/{suite}/test-checklist.md
           TestResult/{suite}/reports/junit.xml
           TestResult/{suite}/bug-reports/BUG-0001.md ...
           TestResult/{suite}/bug-reports/INDEX.md

/aiqa-analyzebugs [suitename]
   Phase 6 — Read junit.xml and generate one Arabic bug report per failed test.
   Requires suite status: tests-executed (or higher).
   Uses active suite from test-suites.yml if no suitename is given.
   Each report contains: bug ID, title, description, steps to reproduce,
   actual vs expected result, severity, priority, root cause analysis,
   suggested fix, and attachment paths (screenshots, videos, traces).
   Severity classification:
     Critical : 5xx errors, login broken, payment broken
     High     : functional flow blocked with no workaround
     Medium   : UI defect that has a workaround
     Low      : cosmetic or minor wording issue
   Output: TestResult/{suite}/bug-reports/

/aiqa-generatereport [suitename]
   Phase 7 — Aggregate all results into a final QA summary report in 3 formats.
   Requires suite status: tests-executed (or higher).
   Uses active suite from test-suites.yml if no suitename is given.
     - qa-report.html : interactive dashboard with test results table
     - qa-report.xlsx : Arabic spreadsheet summary
     - qa-report.md   : Markdown report (pass rate, failed tests, severity breakdown,
                        recommended next actions)
   Evaluates quality gate: PASSED if pass rate >= min_pass_rate, FAILED if below.
   Output: TestResult/{suite}/reports/

# ── VALIDATE COMMANDS (run after each phase to verify output quality) ──────────
# Each validate command inspects the output of its corresponding phase command,
# classifies all issues by severity, and asks how you want to handle them:
#   A) Fix ALL issues       — resolve every finding regardless of severity
#   B) Fix Critical + High  — only the issues that will block or break tests
#   C) Skip                 — view the report only, apply no fixes
#
# Run validate commands any time after the phase completes — they are standalone
# and non-destructive. No status changes are made to test-suites.yml.

/aiqa-analyzeproject-validate
   Validates Phase 0 output: project.config.json
   Checks (7 total):
     Critical : config missing or invalid JSON
     High     : frontend/backend/routes fields wrong or empty (tests will get wrong URLs)
     Medium   : database or auth scheme not specified
     Low      : placeholder values remain in any field

/aiqa-analyzestory-validate [suitename]
   Validates Phase 1 output: story AST JSON
   Checks (9 total):
     Critical : AST missing, invalid JSON, or ACs fewer than story files contain
     High     : AC text paraphrased (meaning changed), fewer than 2 positive scenarios,
                or fewer than 1 negative scenario per AC
     Medium   : edge cases section empty, security scenarios missing
     Low      : risks or data-needed sections sparsely populated

/aiqa-generatetestcases-validate [suitename]
   Validates Phase 2 output: XLSX and MD test case files
   Checks (11 total):
     Critical : files missing, or any AC has zero test coverage
     High     : no negative tests, required fields blank, or duplicate test IDs
     Medium   : edge/security cases missing, placeholder values, vague expected results
     Low      : wrong language, missing test type categories

/aiqa-generatee2e-validate [suitename]
   Validates Phase 3 output: .page.js and .spec.js files
   Checks (12 total):
     Critical : files missing or wrong location, unverifiable URL routes
     High     : ACs not covered, no assertions, hardcoded base URLs, missing negative tests
     Medium   : TypeScript syntax used, POM pattern violations, arbitrary waitForTimeout()
     Low      : (none specific — all issues are Medium or above for E2E)

/aiqa-generatetestdata-validate [suitename]
   Validates Phase 4 output: valid.json, edge.json, security.json
   Checks (8 total):
     Critical : files missing or invalid JSON syntax
     High     : credentials not sourced from config.yaml, field names mismatch the spec
     Medium   : generic placeholder values, missing edge cases, missing security payloads
     Low      : wrong expected success/error messages

/aiqa-analyzebugs-validate [suitename]
   Validates Phase 6 output: BUG-XXXX.md reports in bug-reports/
   Checks (8 total):
     Critical : undocumented failures (fewer bug reports than failed tests),
                or reports missing required fields
     High     : vague root cause analysis, duplicate or out-of-sequence bug IDs
     Medium   : missing evidence (screenshots/traces), incorrect severity classification,
                no suggested fix
     Low      : wrong language

/aiqa-generatereport-validate [suitename]
   Validates Phase 7 output: qa-report.html, qa-report.xlsx, qa-report.md
   Checks (8 total):
     Critical : report files missing, pass rate incorrect, bug count incorrect
     High     : test results omitted, quality gate result not stated
     Medium   : broken HTML structure, missing MD sections
     Low      : wrong language

/aiqa-validate [suitename]
   Smart validator — reads the active suite's current status and automatically
   validates the artifacts for THAT exact phase. No need to pick the right
   -validate command; just run /aiqa-validate and it dispatches to the correct
   phase checklist based on where the active suite currently is.
   Dispatch table (current_status → checks run):
     story-analyzed       → SA-1 through SA-9  (story AST quality)
     test-cases-generated → TC-1 through TC-11 (XLSX + MD test cases)
     e2e-generated        → E2E-1 through E2E-12 (Playwright POM + spec)
     test-data-generated  → TD-1 through TD-8  (JSON data files)
     tests-executed       → P5-1 through P5-8  (execution results)
     bugs-analyzed        → BG-1 through BG-8  (bug reports)
     report-generated     → QR-1 through QR-8  (QA reports)
   After checking, reports issues by severity and asks:
     A) Fix ALL issues
     B) Fix only Critical + High
     C) Skip — no fixes
   Uses active suite from TestResult/test-suites.yml; pass [suitename] to
   target a specific suite instead.

# ── UTILITY COMMANDS ───────────────────────────────────────────────────────────
/aiqa-fetchtestusers [suitename]
   Collect and save test user credentials to config.yaml.
   If a suitename is given (or an active suite is set), story files are loaded
   automatically to extract the required roles for targeted DB queries.
   Option A: fetch from your database (SQL Server, PostgreSQL, MySQL, MongoDB, SQLite)
             filtered by the roles required by the story.
   Option B: enter users manually one by one.
   Saved credentials are reused automatically in Phases 4 and 5.
   Passwords are always masked as **** in all output.

/aiqa-securityscan
   OWASP Top 10 security scan on all endpoints detected in Phase 0.
   Tests for: SQL injection, XSS, CSRF, authentication bypass,
   broken access control, insecure input handling.
   Requires Phase 0 to have run first (project.config.json must exist).
   Output: TestResult/security-report/ (Arabic, grouped by severity)

/aiqa-accessibilityscan
   WCAG 2.1 AA accessibility audit on all pages detected in Phase 0.
   Checks: keyboard navigation, ARIA labels, color contrast, alt text,
   form label associations, semantic HTML, screen reader compatibility.
   Requires Phase 0 to have run first.
   Output: TestResult/accessibility-report/ (Arabic, grouped by severity)

/aiqa-regressiontest
   Re-run all tests tagged @regression and diff against the saved baseline.
   Reports newly passing, newly failing, and changed tests since last baseline.
   Use after code changes to catch regressions before merging.

/aiqa-autorun
   Full autonomous pipeline — same as /aiqa-fullworkflow but skips all
   review checkpoints. Rayan makes all decisions without pausing.
   Use in CI/CD or for repeat runs where data and URLs are already verified.
   Not recommended for first-time runs on a new story.

# ── FRAMEWORK MANAGEMENT ───────────────────────────────────────────────────────
/aiqa-init
   Register Rayan in the agents dropdown and create all /aiqa-* prompt files
   for VS Code / GitHub Copilot autocomplete.
   Creates: .github/agents/ai-qa-framework-qae.agent.md
            .github/prompts/aiqa-*.prompt.md (one per command)
   Safe to re-run — skips files that already exist.
   After running: reload VS Code (Ctrl+Shift+P -> Developer: Reload Window).

/aiqa-help
   Show the full command menu and current config summary:
   project name, language, test mode, browser, output folder, min pass rate.

/aiqa-chat
   Free-form chat with Rayan about any QA topic.
   Does not run any workflow or modify any files.

/aiqa-listskills
   Show all available QA skills with descriptions, output artifacts, and phase.

/aiqa-listworkflows
   Show all available workflows with descriptions and corresponding commands.

/aiqa-reset
   Wipe all test outputs and QA history for a fresh cycle.
   Deletes: TestResult/, test-results/ cache, QA history log,
            .github/agents/aiqa-* and .github/prompts/aiqa-* files.
   Does NOT delete: config.yaml, preferences, skills, or workflows.
   After reset, run /aiqa-init then start fresh with /aiqa-analyzeproject.

/aiqa-exit
   End the current Rayan session.
   Does not delete any files or outputs.
```

---

## Outputs

All generated files are saved under `TestResult/` — never in your project source:

```
TestResult/
+-- test-suites.yml                    <- suite registry (status, stories, phase completion)
+-- {suite}/                           <- one folder per story suite
    +-- test-cases/
    |   +-- {suite}-test-cases.xlsx    <- Phase 2 -- Arabic test cases
    |   +-- {suite}-test-cases.md
    +-- e2e/
    |   +-- pages/{suite}.page.js      <- Phase 3 -- Page Object Model
    |   +-- tests/{suite}.spec.js      <- Phase 3 -- Playwright spec
    +-- test-data/
    |   +-- {suite}-valid.json         <- Phase 4 -- positive data
    |   +-- {suite}-edge.json          <- Phase 4 -- edge cases
    |   +-- {suite}-security.json      <- Phase 4 -- security payloads
    +-- test-checklist.md              <- Phase 5 -- pass/fail per test
    +-- bug-reports/
    |   +-- INDEX.md                   <- Phase 5/6 -- bug summary table
    |   +-- BUG-0001.md ...            <- Phase 5/6 -- one report per failure
    +-- reports/
        +-- junit.xml                  <- Phase 5 -- raw test results
        +-- qa-report.html             <- Phase 7 -- interactive dashboard
        +-- qa-report.xlsx             <- Phase 7 -- Arabic summary
        +-- qa-report.md               <- Phase 7 -- Markdown summary
```

---

## Configuration

Edit `ai-qa-framework/config.yaml` after install. All values are read at runtime — no restart needed.

```yaml
# Project Identity
project_name: "MyApp"
user_name: "Your Name"

# Language -- set both to "Arabic" / "ar" for Arabic output
communication_language: English    # Language Rayan speaks to you
reporting_language: en             # Language for test cases and reports (en | ar)

# Test Settings
test_mode: headed                  # headed (browser visible) | headless
default_browser: chromium          # chromium | firefox | webkit
min_pass_rate: 95                  # Minimum % pass rate to PASS the quality gate

# Database (for /aiqa-fetchtestusers)
db_connection_string: ""           # Leave empty to enter test users manually
db_users_table: "users"
db_username_column: "email"
db_password_column: "password"
db_role_column: "role"

# Test users -- populated by /aiqa-fetchtestusers, reused by all phases
test_users: []
```

---

## Architecture

```
ai-qa-framework/
+-- agents/
|   +-- qae.md                 <- Rayan -- Senior AI QA Engineer persona + full menu
+-- config.yaml                <- your project settings (edit this)
+-- core/
|   +-- orchestrator.mjs       <- routes all /aiqa-* commands to the right skill
+-- workflows/                 <- one workflow folder per command (yaml + instructions)
|   +-- full-workflow/         <- master: runs all 8 phases
|   +-- analyze-project/       <- Phase 0
|   +-- analyze-story/         <- Phase 1
|   +-- generate-test-cases/   <- Phase 2
|   +-- generate-e2e/          <- Phase 3
|   +-- generate-test-data/    <- Phase 4
|   +-- run-tests/             <- Phase 5
|   +-- analyze-bugs/          <- Phase 6
|   +-- generate-report/       <- Phase 7
|   +-- fetch-test-data/       <- utility: manage test users
+-- skills/                    <- AI skill prompts used by each workflow
+-- project-detectors/         <- stack detection modules
+-- adapters/                  <- stack-specific glue (Angular, .NET, etc.)
+-- templates/                 <- report and test case templates
+-- _config/                   <- skill and workflow manifests
+-- _memory/                   <- persistent QA history across sessions
+-- TestResult/                <- all generated outputs (gitignored)
```

---

## Supported Stacks

| Layer | Supported |
|-------|-----------|
| **Frontend** | Angular, React, Vue, Blazor |
| **Backend** | .NET, Node.js, Java (Spring), Python (Django / FastAPI) |
| **Database** | SQL Server, PostgreSQL, MySQL, MongoDB, SQLite |
| **Auth** | JWT, OAuth 2.0, Cookie sessions, HTTP Basic |

---

## Requirements

- **Node.js** >= 18
- **npm** >= 9
- An AI assistant: Claude Code, Cursor, GitHub Copilot, or Windsurf

---

## License

[MIT](LICENSE) © 2026 Ahmed Al Wakeel

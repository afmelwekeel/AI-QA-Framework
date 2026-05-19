# Changelog

All notable changes to AI-QA-Framework are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [2.11.7] — 2026-05-19

### Enhanced

#### `/aiqa-generatee2e` — Source code reading before E2E generation

- **New Step 4 in `workflows/generate-e2e/instructions.xml`:** A mandatory source code analysis step now runs before any E2E file is written. The agent reads the actual host project source files (pages, components, router config) to extract real selectors, form fields, button text, `data-testid` / `data-cy` / `aria-label` attributes, navigation routes, and validation containers. Outputs a structured findings summary before proceeding.
- **Enhanced Step 5 (was Step 4):** After the orchestrator generates the scaffold, the agent is now required to immediately rewrite both files using source findings — replacing all generic placeholder locators and `// TODO` comments with real, project-specific test code. Selector priority enforced: `getByTestId` > `getByRole` (exact text) > `getByLabel` > `getByText`.
- **`skills/playwright-generation/prompt.md`:** Added a "Source Code Reading (MANDATORY)" section at the top with framework-aware file lookup patterns (Next.js pages/app router, React, Vue, Angular), extraction checklist, and strict rule: never write a selector not found in source — use `// TODO: verify selector` instead.
- **Steps renumbered:** Old steps 4→5, 5→6, 6(nested)→7(nested), 7→8. All internal references updated.

---

## [2.10.1] — 2026-05-18

### Fixed

#### Agent no longer skips fix/record steps after a test failure
- **Root cause:** `skills/test-execution/prompt.md` and `workflows/full-workflow/instructions.xml` described the failure-handling sequence as passive guidance — the agent could see "Move to next test" and jump there without completing the fix, bug-report, and retest steps.
- **Fix — `prompt.md`:** Step 2c completely rewritten as a hard 6-step **FAILURE PROTOCOL** (F1–F6) with an explicit `⛔ HARD STOP` gate at entry and `✋ GATE` checkpoints after each sub-step (Diagnose, Fix, Record Bug, Retest, Append Outcome, Update Checklist). The agent cannot advance to the next test until the F6 gate is passed.
- **Fix — `full-workflow/instructions.xml`:** Phase 5 STEP C replaced with the same F1–F6 structure and `<critical>` loop rule. Post-loop quality checklist expanded with check `P5-8` (bug report count must equal failure count) and explicit remediation for any skipped step discovered at review time.
- **Fix — `agents/qae.md`:** Added a new `<r>` rule at the Rayan agent-persona level that names all six failure-protocol steps explicitly and states they are non-negotiable and cannot be skipped or batched.

---

## [2.10.0] — 2026-05-18

### Added

#### `fetch-test-users` skill — story-driven test user fetching
- New skill `skills/fetch-test-users/` (`skill.json`, `prompt.md`, `run.mjs`)
- Reads one or more user story files to **extract required roles** (actor declarations + keyword scan)
- Detects database type from `db_connection_string` (SQL Server, PostgreSQL, MySQL, MongoDB, SQLite)
- Generates and executes a **parameterised temp query script** for the detected DB driver — filters by extracted roles so only relevant test accounts are returned
- Graceful fallback when DB driver is not installed: outputs actionable install instructions
- Supports `--role "admin,manager"` override to skip story analysis
- Normalises role aliases (e.g. `"administrator"` → `"admin"`, `"regular user"` → `"user"`)
- New orchestrator commands: `fetch-test-users`, `get-test-users`
- New npm script: `npm run fetch-test-users`
- New `db_role_column` field in `config.yaml` (default: `"role"`)
- Workflow `workflows/fetch-test-data/` enhanced with **Step 0** — story role extraction before querying
- New GitHub Copilot prompt: `.github/prompts/aiqa-fetchtestusers.prompt.md`

#### Pre-execution spec review — review + fix before every test run
- `skills/test-execution/run.mjs` now runs an automatic **pre-flight review** before executing any spec file
- New `mode: 'review'` — static analysis without running tests (`--mode review`)
- Pre-flight checks per spec:
  - **Syntax** — `node --check` for JavaScript parse errors
  - **Imports** — every `from '...'` path resolves to a real file; wrong extensions auto-corrected
  - **Test data** — JSON files referenced in the spec exist on disk
  - **Anti-patterns** — `test.only`, `describe.only`, hardcoded localhost URLs, deprecated Playwright APIs (`page.$`, `page.waitForNavigation`, `page.waitForTimeout`), likely missing `await`
- **Auto-fixes applied immediately** (no AI required): `test.only` → `test`, `describe.only` → `describe`, backslash import paths → forward-slash, wrong import file extension
- **Blocker gate**: if blockers remain after auto-fix, execution is halted and the structured report is returned for AI review; tests never run on a broken spec
- Pre-flight report printed to console with severity badges: `[BLOCKER]` / `[WARN]` / `[FIXED]`
- `skills/test-execution/prompt.md` — new **Step 0.5** with 6 review categories and 22 checks:
  - `IM` — File structure & imports
  - `TD` — Test data consistency (keys, credentials, URLs, placeholder detection)
  - `PW` — Playwright API correctness (await coverage, deprecated calls, stable selectors)
  - `TS` — Test structure (independence, unique names, `beforeEach` hygiene)
  - `PO` — Page object correctness (method existence, constructor, locator definitions)
  - `AU` — Authentication & role coverage

### Changed
- `agents/qae.md` — updated `aiqa-runtests` Copilot prompt to enforce Step 0.5; added `aiqa-fetchtestusers` to `/aiqa-init` bootstrap list
- `_config/skill-manifest.csv` — added `fetch-test-users` skill row

---

## [2.0.0] — 2026-05-17

### Added
- **NPX installer** — `npx ai-qa-framework install` interactive setup
- **11 skills** — project-analysis, user-story-analysis, test-case-generation, playwright-generation, test-data-generation, test-execution, bug-analysis, qa-reporting, regression-testing, security-validation, accessibility-validation
- **5 workflows** — full-workflow, analyze-project, analyze-story, generate-e2e, generate-report
- **8 project detectors** — frontend, backend, database, auth, routes, package-manager, testing, orchestrator
- **Rayan agent persona** (`agents/qae.md`) — BMAD-style Senior AI QA Engineer
- **BMAD-aligned config system** — `config.yaml` with runtime variable resolution
- **CSV manifest discovery** — agent, skill, workflow, and qa-help manifests
- **Memory sidecar** — persistent QA preferences across sessions
- **Multi-language support** — English and Arabic test cases, bug reports, and QA summaries
- **Playwright E2E generation** — Page Object Model + spec files auto-generated from user stories
- **XLSX test case generation** — structured test cases with acceptance criteria mapping
- **Headed execution** — tests run visually with configurable slow-motion
- **Quality gates** — configurable minimum pass rate, block on critical/high severity
- **Stack adapters** — Angular, React, Vue (frontend); .NET, Node, Java, Python (backend)
- **Open-source repository** — MIT license, CONTRIBUTING.md, issue templates, CI/CD

### Versioning Convention
- **Patch** (`2.0.x`): Bug fixes, documentation corrections
- **Minor** (`2.x.0`): New skills, new workflow, new detector, new adapter
- **Major** (`x.0.0`): Breaking changes to installer API, config schema, or skill interface

# Changelog

All notable changes to AI-QA-Framework are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

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

# Changelog

All notable changes to AI-QA-Framework are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

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

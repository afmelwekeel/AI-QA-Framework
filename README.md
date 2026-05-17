# AI-QA-Framework

> Universal AI QA Automation Framework — project-agnostic, enterprise-grade.

[![npm version](https://img.shields.io/npm/v/ai-qa-framework.svg)](https://www.npmjs.com/package/ai-qa-framework)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/afmelwekeel/AI-QA-Framework/actions/workflows/ci.yml/badge.svg)](https://github.com/afmelwekeel/AI-QA-Framework/actions/workflows/ci.yml)
[![Node.js ≥18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

```bash
npx ai-qa-framework install
```

---

## What It Does

AI-QA-Framework gives any project a **Senior AI QA Engineer** named **Rayan** — a persona-driven agent that automates the complete QA lifecycle across 9 phases:

```
Phase 0 → Auto-detect project stack (Angular, React, .NET, Node, SQL Server, JWT…)
Phase 1 → Analyze user story → extract acceptance criteria and test scenarios
Phase 2 → Generate structured test cases (XLSX + Markdown)
Phase 3 → Generate Playwright E2E tests (Page Object Model)
Phase 4 → Generate test data (valid, edge-case, and security payloads)
Phase 5 → Execute tests (headed browser, each test retried once on failure)
Phase 6 → Analyze failures → generate structured bug reports
Phase 7 → Produce QA summary report (HTML dashboard + XLSX + Markdown)
Phase 8 → Fix bugs — edit source code per bug, retest each fix individually
```

Works with any AI assistant: **Claude Code**, **Cursor**, **GitHub Copilot**, **Windsurf**.

---

## Quick Start

**Step 1 — Install**
```bash
# Install:
npx ai-qa-framework install

# Upgrade an existing installation:
npx ai-qa-framework upgrade
```

The installer asks for your project name, language, test mode, and which AI tools you use. It copies the framework into `./ai-qa-framework/` and writes a `config.yaml` tailored to your project.

**Step 2 — Activate the Rayan QA agent**

Open your AI tool and load the agent:
- **Claude Code**: Run `/qa` (stub created in `.claude/commands/`)
- **Cursor**: Reference `./ai-qa-framework/agents/qae.md`
- **GitHub Copilot**: Reference `./ai-qa-framework/agents/qae.md` via `@workspace`
- **Windsurf**: Reference `./ai-qa-framework/agents/qae.md`

**Step 3 — Run your first QA workflow**

Tell Rayan:
```
Run full workflow on ./docs/stories/my-user-story.md
```

Rayan detects your stack, generates test cases, writes Playwright tests, executes them, and delivers a full QA report — all automatically.

---

## Commands

Once the framework is installed, run commands from inside `./ai-qa-framework/`:

| npm script | What it does |
|---|---|
| `npm run detect` | Phase 0 — auto-detect stack |
| `npm run analyze-story` | Phase 1 — parse user story |
| `npm run test-cases` | Phase 2 — generate XLSX test cases |
| `npm run e2e` | Phase 3 — generate Playwright tests |
| `npm run test-data` | Phase 4 — generate test data |
| `npm run run-tests` | Phase 5 — execute tests (headed) |
| `npm run run-tests:ci` | Phase 5 — execute tests (headless) |
| `npm run bugs` | Phase 6 — analyze failures |
| `npm run report` | Phase 7 — generate QA summary |
| `npm run full` | All 9 phases in sequence (including bug-fixing) |

Or tell Rayan directly in your AI tool:
```
/AIQA-FullWorkflow ./docs/stories/feature-login.md
/AIQA-FixBugs
/AIQA-AnalyzeProject
/AIQA-SecurityScan
/AIQA-AccessibilityScan
```

---

## Upgrading

When a new version of the framework is published, run from your project root:

```bash
npx ai-qa-framework upgrade
```

The upgrade command:
- **Auto-detects** your existing installation directory
- **Preserves** your `config.yaml` (project name, language, DB config, test users — never overwritten)
- **Copies** the new framework files (skills, agents, workflows, templates)
- **Updates** npm dependencies inside the framework folder
- **Refreshes** AI tool command files (adds any new commands like `/AIQA-FixBugs`)
- Shows a clear before/after version summary

```bash
# Options
npx ai-qa-framework upgrade --yes                    # non-interactive
npx ai-qa-framework upgrade --directory qa/          # explicit path
npx ai-qa-framework upgrade --force                  # re-copy even if already latest
```

---

## Configuration

Edit `./ai-qa-framework/config.yaml` after install:

```yaml
# Project Identity
project_name: "MyApp"
user_name: "Your Name"

# Language
communication_language: English    # Rayan speaks to you in this language
reporting_language: en             # Test cases and reports use this (en | ar | fr | es)

# Test Settings
test_mode: headed                  # headed | headless
default_browser: chromium          # chromium | firefox | webkit
slow_mo_ms: 60                     # milliseconds between actions (0 = instant)

# Quality Gates
min_pass_rate: 95                  # Minimum % pass rate to consider suite green
block_on_critical: true            # Fail pipeline on critical bugs
block_on_high: true                # Fail pipeline on high-severity bugs
```

All values are read at runtime — no restart needed.

---

## Modules

Select modules during install. To add more later, re-run `npx ai-qa-framework install` and choose **"Modify Install"**, or run `npx ai-qa-framework upgrade` to pull the latest files for your current modules:

| Module | What it installs |
|---|---|
| `core` *(always)* | Orchestrator, detectors, adapters, Rayan agent |
| `e2e-playwright` | Playwright test generation + headed execution |
| `test-cases-xlsx` | Structured XLSX test case generation |
| `security-scan` | OWASP-style security validation |
| `accessibility-scan` | axe-core a11y audit |
| `regression-testing` | Baseline diff testing |

---

## Supported Project Stacks

| Layer | Supported |
|---|---|
| **Frontend** | Angular, React, Vue, Blazor |
| **Backend** | .NET, Node.js, Java (Spring), Python (Django/FastAPI), Go |
| **Database** | SQL Server, PostgreSQL, MySQL, MongoDB, SQLite |
| **Auth** | JWT, OAuth 2.0, Cookie sessions, HTTP Basic |

The auto-detector scans your project files and configures the right adapters automatically.

---

## AI Tool Integration

### Claude Code
The installer creates `.claude/commands/qa.md`. Open Claude Code and run `/qa` to activate Rayan.

### Cursor
The installer adds `.cursorrules` with a reference to `./ai-qa-framework/agents/qae.md`. Open the file in Cursor to activate.

### GitHub Copilot
The installer creates `.github/copilot-instructions.md`. In Copilot Chat, type `@workspace` — Rayan's persona is loaded automatically.

### Windsurf
Reference `./ai-qa-framework/agents/qae.md` in your Windsurf context. Rayan activates and reads `config.yaml`.

### Manual (any tool)
Attach or load `./ai-qa-framework/agents/qae.md` into your AI assistant. Rayan activates, reads `config.yaml`, and presents an interactive menu.

---

## Architecture

```
ai-qa-framework/               ← installed in your project
├── agents/qae.md              ← Rayan — Senior AI QA Engineer persona
├── config.yaml                ← your project settings (edit this)
├── core/
│   ├── orchestrator.mjs       ← routes all commands to skills
│   └── autonomous-loop.mjs    ← Plan→Act→Observe→Reflect loop
├── skills/                    ← 14 skills
│   ├── project-analysis/
│   ├── user-story-analysis/
│   ├── test-case-generation/
│   ├── playwright-generation/
│   ├── test-data-generation/
│   ├── test-execution/
│   ├── bug-analysis/
│   ├── bug-fixing/            ← Phase 8 — fix source code, retest each bug
│   ├── qa-reporting/
│   ├── regression-testing/
│   ├── security-validation/
│   └── accessibility-validation/
├── workflows/                 ← 5 named multi-phase workflows
├── project-detectors/         ← 8 stack detection modules
├── adapters/                  ← stack-specific glue (Angular, .NET, etc.)
├── templates/                 ← report and test case templates
├── rules/                     ← quality gates + selector strategies
├── _config/                   ← agent/skill/workflow manifests
├── _memory/                   ← persistent QA preferences across sessions
└── TestResult/                ← all phase outputs (gitignored)
```

---

## Requirements

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- An AI assistant (Claude Code, Cursor, GitHub Copilot, or any LLM)
- Your project must be accessible locally

---

## Contributing

Contributions are welcome! Read [CONTRIBUTING.md](CONTRIBUTING.md) to learn how to add skills, workflows, and project detectors.

```bash
git clone https://github.com/afmelwekeel/AI-QA-Framework.git
cd AI-QA-Framework
npm install
node ./core/orchestrator.mjs detect
```

---

## License

[MIT](LICENSE) © 2026 Ahmed Al Wakeel

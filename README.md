# AI QA Framework v2 — Universal AI QA Automation Framework

> **Enterprise-grade, project-independent QA automation powered by AI.**
> Analyzes user stories → generates Arabic test cases → writes JavaScript E2E tests → runs them visually → detects bugs → generates full reports.
>
> **Now BMAD-aligned**: Activate the **Layla** QA agent persona in your AI assistant for a consistent, config-driven experience. See [BMAD Integration](#bmad-integration) below.

Supports: Web Apps · APIs · Angular · React · Vue · .NET · Node.js · Java · Python · SQL · Microservices · SaaS.

---

## 1. What this framework does

It behaves like a **senior autonomous AI QA Engineer**:

1. Auto-detects the project (frontend, backend, DB, auth, routes).
2. Reads user stories and extracts acceptance criteria.
3. Generates professional **Arabic XLSX test cases** (styled Excel, RTL, color-coded severity).
4. Generates **JavaScript Playwright E2E tests** (Page Object Model, headed).
5. Generates **JSON test data** (per suite, with XSS/SQL injection payloads).
6. Executes browser automation **visually** (real browser opens, slowMo 60ms).
7. Captures screenshots, videos, traces, console + network errors.
8. Detects bugs and generates **Arabic bug reports** with root-cause analysis.
9. Produces **Arabic QA summary reports** (HTML dashboard / XLSX / MD).

---

## 2. Folder Map

```
AI-QA-FRAMEWORK/
├── config.yaml                 # ← BMAD-style user config (language, output, test settings)
├── agents/
│   └── qae.md                  # ← Layla — BMAD-style QA agent persona
├── workflows/                  # ← BMAD-style workflow YAML + XML instructions
│   ├── full-workflow/          #   (workflow.yaml + instructions.xml)
│   ├── analyze-story/
│   ├── generate-e2e/
│   ├── generate-report/
│   └── analyze-project/
├── _config/                    # ← Discovery manifests (BMAD pattern)
│   ├── agent-manifest.csv
│   ├── skill-manifest.csv
│   ├── workflow-manifest.csv
│   └── qa-help.csv
├── _memory/                    # ← Persistent QA preferences (BMAD sidecar)
│   ├── config.yaml
│   └── qae-sidecar/
│       ├── qa-preferences.md
│       └── qa-history.md
├── module-help.csv             # ← /qa-help command entries
│
├── core/
│   ├── orchestrator.mjs        # Single entry point for all @qa commands
│   ├── autonomous-loop.mjs     # Plan→act→observe loop (programmatic)
│   └── project.config.json     # Auto-detected project settings
│
├── skills/
│   ├── project-analysis/       # Phase 0 — Detect host project
│   ├── user-story-analysis/    # Phase 1 — Parse story → AC → risk
│   ├── test-case-generation/   # Phase 2 → /test-cases/ (Arabic XLSX + MD)
│   ├── playwright-generation/  # Phase 3 → /e2e/ (JavaScript POM + specs)
│   ├── test-data-generation/   # Phase 4 → /test-data/ (JSON per suite)
│   ├── test-execution/         # Phase 5 — Run Playwright (headed)
│   ├── bug-analysis/           # Phase 6 → /bug-reports/ (Arabic MD)
│   ├── qa-reporting/           # Phase 7 → /reports/ (HTML + XLSX + MD)
│   └── full-workflow/          # Master — chains all 7 phases
│
├── TestResult/                 # ← All outputs organized by story ID
│   └── {story-id}/
│       ├── test-cases/         # Phase 2 output
│       ├── e2e/                # Phase 3 output
│       ├── test-data/          # Phase 4 output
│       ├── bug-reports/        # Phase 6 output
│       └── reports/            # Phase 7 output
│
├── playwright.config.js        # Root config (headed, slowMo 60ms)
├── package.json                # ExcelJS + Playwright dependencies
├── commands/registry.yaml      # Command definitions
├── setup/bootstrap.ps1         # One-time setup (Windows)
└── setup/bootstrap.sh          # One-time setup (Linux/macOS)
```

---

## 3. Quick Start

```powershell
# 1. Install dependencies (once)
cd AI-QA-FRAMEWORK
.\setup\bootstrap.ps1
```

### Simplest command

```bash
# Pass the story file as a positional argument — no flags needed:
node ./core/orchestrator.mjs full-workflow ../docs/my-story.md

# Or using the npm alias:
npm run full
```

### With explicit flags (when you also want to name the suite)

```bash
node ./core/orchestrator.mjs full-workflow --story ../docs/my-story.md --suite login
```

### Equivalent `@qa` chat command

In Copilot Chat / any AI agent, type:

```
@qa full-workflow ../docs/my-story.md
```

or with a named suite:

```
@qa full-workflow --story ../docs/my-story.md --suite login
```

---

## 4. All Commands

| Layla Command | CLI Equivalent | Phase | Output |
|---|---|---|---|
| `/AIQA-AnalyzeStory <story>` | `orchestrator.mjs analyze-story` | 1 | Console + AST |
| `/AIQA-GenerateE2E <story>` | `orchestrator.mjs generate-e2e` | 2–3 | XLSX + JS tests |
| `/AIQA-RunTests` | `orchestrator.mjs run-tests` | 5 | JUnit XML + screenshots |
| `/AIQA-GenerateReport` | `orchestrator.mjs generate-report` | 7 | HTML + XLSX + MD |
| `/AIQA-FullWorkflow <story>` | `orchestrator.mjs full-workflow` | 0–7 | **Everything** |
| `/AIQA-AnalyzeProject` | `orchestrator.mjs analyze-project` | 0 | `core/project.config.json` |
| `/AIQA-SecurityScan` | `orchestrator.mjs security-scan` | — | Security report |
| `/AIQA-AccessibilityScan` | `orchestrator.mjs accessibility-scan` | — | a11y report |
| `/AIQA-ListSkills` | — | — | Skill list |
| `/AIQA-ListWorkflows` | — | — | Workflow list |
| `/AIQA-Help` | — | — | Redisplay menu |

---

## 5. 7-Phase Workflow

```
User Story (.md)
     │
     ▼
[Phase 0] Project Analysis ──── auto-detect stack, URLs, auth
     │
     ▼
[Phase 1] Story Analysis ─────── extract AC, scenarios, edge cases
     │
     ▼
[Phase 2] Test Case Generation ── Arabic XLSX + MD → /test-cases/
     │
     ▼
[Phase 3] E2E Generation ──────── JS Playwright POM + specs → /e2e/
     │
     ▼
[Phase 4] Test Data Generation ── JSON per suite → /test-data/
     │
     ▼
[Phase 5] Test Execution ──────── headed browser, slowMo 60ms
     │                            → screenshots / videos / JUnit XML
     ▼
[Phase 6] Bug Analysis ────────── Arabic bug reports → /bug-reports/
     │
     ▼
[Phase 7] QA Reporting ────────── HTML + XLSX + MD → /reports/
```

---

## 6. Requirements

| Tool | Version |
|---|---|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| Playwright | ≥ 1.47 (auto-installed) |
| ExcelJS | 4.4.0 (auto-installed) |

> All E2E tests are **JavaScript** (`.js`), not TypeScript. The legacy `testing/` folder with TypeScript tests is preserved for backward compatibility.

---

## 7. Adapting to a New Project

1. Copy `AI-QA-FRAMEWORK/` to your project root
2. Run `.\setup\bootstrap.ps1`
3. Update `core/project.config.json` (or let `/AIQA-AnalyzeProject` auto-detect it)
4. Run `/AIQA-FullWorkflow docs/my-story.md` — or via CLI: `node ./core/orchestrator.mjs full-workflow --story docs/my-story.md`

---

*AI QA Framework v2 — Built for WhatsApp Campaign Pro, designed to work with any project.*

| `/AIQA-GenerateReport` | QA summary (MD + HTML + CSV) |
| `/AIQA-RegressionTest` | Re-run baseline + diff |
| `/AIQA-SecurityScan` | OWASP-style validation pass |
| `/AIQA-AccessibilityScan` | a11y audit |
| `/AIQA-FullWorkflow <story>` | Full pipeline: detect → generate → run → report |

All commands are also available via CLI — see `commands/registry.yaml`.

---

## 5. Reusability Contract

This framework is **project-agnostic**. It never hard-codes:
- URLs (read from `core/project.config.json`, auto-generated)
- Selectors (POM auto-scaffolded per detected framework)
- Auth flow (adapter pattern in `adapters/auth/`)
- Tech stack (detected via `project-detectors/`)

To use in a NEW project: copy `AI-QA-FRAMEWORK/` and run `/AIQA-AnalyzeProject`.

---

## 6. Extensibility

- **MCP-ready**: skills are pure JSON-described capabilities (`skills/*/skill.json`)
- **VS Code extension-ready**: command registry mirrors VS Code command contributions
- **Autonomous-ready**: `core/autonomous-loop.mjs` provides plan→act→observe→reflect

See [core/ARCHITECTURE.md](core/ARCHITECTURE.md).

---

## 7. BMAD Integration

The AI-QA-FRAMEWORK now follows the same patterns as the [BMAD Method](./../docs/bmad-method-learnings.md).

### How it works

Just like BMAD agents, the **Layla** QA agent is activated by instructing your AI assistant to load the agent file. The agent:

1. **Loads `config.yaml`** first (BMAD's "config-first" principle)
2. **Stores session variables** — `{user_name}`, `{communication_language}`, `{reporting_language}`, `{output_folder}`, etc.
3. **Shows a menu** of available commands — waits for user input
4. **Dispatches to workflow YAML files** when a command is chosen
5. **Follows `instructions.xml`** for step-by-step execution within each workflow

### Activating Layla

In your AI assistant (GitHub Copilot Chat), load the agent file:

```
Read and follow: AI-QA-FRAMEWORK/agents/qae.md
```

Layla will greet you, show her menu, and wait for your command.

### Config-driven behavior

Edit `AI-QA-FRAMEWORK/config.yaml` to change behavior without touching any code:

```yaml
user_name: Ahmed Al Wakeel
communication_language: English
reporting_language: ar          # Change to 'en' for English reports
test_mode: headed               # Change to 'headless' for CI
default_browser: chromium
min_pass_rate: 95
output_folder: "{project-root}/AI-QA-FRAMEWORK/TestResult"
```

### Discovery system

Layla can list all available skills and workflows on demand:
- `/AIQA-ListSkills` → reads `_config/skill-manifest.csv`
- `/AIQA-ListWorkflows` → reads `_config/workflow-manifest.csv`
- `/AIQA-Help` → redisplays the full command menu

### BMAD vs CLI — two ways to work

| Mode | How | When |
|---|---|---|
| **BMAD Agent (Layla)** | Activate agent in AI chat → interactive menu | When working with AI assistant |
| **CLI (orchestrator)** | `node core/orchestrator.mjs <command>` | When automating in scripts/CI |

Both modes use the same underlying skills. The BMAD layer adds persona, config-driven settings, and structured workflow execution on top of the CLI.

### Persistent memory

Layla remembers preferences across sessions via `_memory/qae-sidecar/`:
- `qa-preferences.md` — browser, language, quality gate settings
- `qa-history.md` — log of previously tested stories and pass rates

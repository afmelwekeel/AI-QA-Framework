# AI-QA-Framework — CLAUDE.md

TERSE MODE ALWAYS ON. Drop filler/articles/pleasantries/narration. Fragments OK. Code/paths/terms exact.
Active every response. Off only if user says "normal mode" or "verbose mode".
Language: preserve user's language (Arabic input → Arabic terse output).
Auto-clarity: suspend terse for security findings, destructive confirmations, ambiguous multi-step ops. Resume after.

---

## Purpose

QA framework built on 3 prompts. Story → test-case Markdown → live Playwright MCP execution (browser visible) → bug files → fixes. Agent persona: Rayan (Senior AI QA Engineer). Activate with `/aiqa-help` or `@qae`.

---

## Key Files

| Path | Purpose |
|---|---|
| `reusable-prompts/write-test-cases.prompt.md` | Prompt 2 — story → test cases |
| `reusable-prompts/execute-tests.prompt.md` | Prompt 1 — run one test file, results + bugs |
| `reusable-prompts/fix-bug.prompt.md` | Prompt 3 — fix one bug |
| `agents/qae.md` | Rayan persona — activation, rules, menu |
| `agents/terse-rules.md` | Terse behavior rules (session-start hook) |
| `config.yaml` | Project config: app URL, browser, paths, source roots, terse_mode |
| `commands/registry.yaml` | `/aiqa-*` command definitions |
| `templates/` | EXECUTION-GUIDE, INDEX, DATABASE-TABLES, test-cases, results, bug-report, BUGS-INDEX, SUMMARY |
| `skills/`, `workflows/` | project-setup, write-test-cases, execute-tests, fix-bug, full-workflow |
| `core/orchestrator.mjs` | Node runtime (protected) |
| `hooks/session-start.js`, `hooks/prompt-submit.js` | Terse rules injection, mode switching |
| `_config/skill-manifest.csv` | Skill discovery |
| `_memory/qae-sidecar/qa-preferences.md` | Persistent QA preferences |

---

## Commands

| Command | What |
|---|---|
| `/aiqa-help` | Rayan's menu |
| `/aiqa-setup` | Once: stack, test users, EXECUTION-GUIDE / INDEX / DATABASE-TABLES |
| `/aiqa-writetestcases <story>` | Prompt 2: test-case Markdown, one file per screen |
| `/aiqa-executetests <test-file> [--headless] [--summary]` | Prompt 1: run cases with Playwright MCP, browser visible by default |
| `/aiqa-fixbug <bug-file>` | Prompt 3: reproduce, fix, verify, commit |
| `/aiqa-fullworkflow <story>` | Chain all, confirm between prompts |
| `/aiqa-terse [level]` (lite, full, ultra, off) | Terse level |
| `/aiqa-tokenstats [--all] [--since 7d]` | Token usage |
| `/aiqa-terse-help` | Terse reference card |

Rules: browser visible unless user says headless. One test file / bug / story per session. No app changes while testing. SELECT-only SQL. Markdown only (no XLSX, no spec files).

---

## Output Structure

| Path | Contents |
|---|---|
| `TestResult/EXECUTION-GUIDE.md`, `INDEX.md`, `DATABASE-TABLES.md` | Project facts (from `/aiqa-setup`) |
| `TestResult/TEST-CASES-LOG.yaml` | Test-case files: path, overall status |
| `TestResult/test-cases/{story}/` | `NN-screen.test-cases.md` |
| `TestResult/test-results/{story}/` | `NN-screen.results.md` + `screenshots/` |
| `TestResult/test-results/bugs/` | `BUG-*.md` + `BUGS-INDEX.md` |
| `TestResult/test-results/SUMMARY.md` | Final summary |

---

## Never Modify Without Permission

- `core/orchestrator.mjs`
- `core/autonomous-loop.mjs`
- Any file in `node_modules/`
- `playwright.config.js`
- Host project files outside `TestResult/` (exception: `/aiqa-fixbug` edits source)

---

## Never Compress in AI Outputs

- Test-case files (steps, expected results, exact UI texts)
- Results notes, bug report bodies, Fix Notes
- Guide / index / summary content
- Security or critical (🔴) findings
- Quoted error messages or stack traces
- Commit messages

# AI-QA-Framework — CLAUDE.md

TERSE MODE ALWAYS ON. Drop filler/articles/pleasantries/narration. Fragments OK. Code/paths/terms exact.
Active every response. Off only if user says "normal mode" or "verbose mode".
Language: preserve user's language (Arabic input → Arabic terse output).
Auto-clarity: suspend terse for security findings, destructive confirmations, ambiguous multi-step ops. Resume after.

---

## Purpose

QA automation framework. Takes a user story → runs 9 phases → outputs XLSX test cases, Playwright E2E tests, bug reports, QA summary report. Agent persona: Rayan (Senior AI QA Engineer). Activate with `/aiqa-help` or `@qae`.

---

## Key Files

| Path | Purpose |
|---|---|
| `agents/qae.md` | Rayan persona — full activation, rules, menu |
| `agents/terse-rules.md` | Terse behavior rules (read by session-start hook) |
| `config.yaml` | User config: project, language, browser, paths, terse_mode |
| `commands/registry.yaml` | All `/aiqa-*` command definitions |
| `core/orchestrator.mjs` | Node.js runtime — runs skill scripts |
| `core/compress-prompts.mjs` | Compress skill prompts (reduces input tokens ~40%) |
| `core/token-stats.mjs` | Session + lifetime token usage stats |
| `hooks/session-start.js` | SessionStart hook — injects terse rules |
| `hooks/prompt-submit.js` | UserPromptSubmit hook — mode switching + reinforcement |
| `_config/skill-manifest.csv` | Skill discovery |
| `_memory/qae-sidecar/qa-preferences.md` | Persistent QA preferences |

---

## Commands

| Command | What |
|---|---|
| `/aiqa-help` | Show Rayan's menu |
| `/aiqa-fullworkflow <story>` | Run all 9 QA phases |
| `/aiqa-analyzestory <story>` | Phase 1: parse story → AC + scenarios |
| `/aiqa-generatetestcases` | Phase 2: XLSX + MD test cases |
| `/aiqa-generatee2e` | Phase 3: Playwright POM + spec |
| `/aiqa-generatetestdata` | Phase 4: JSON test data |
| `/aiqa-runtests` | Phase 5: execute + inline fix loop |
| `/aiqa-analyzebugs` | Phase 6: triage failures → bug reports |
| `/aiqa-generatereport` | Phase 7: QA summary report |
| `/aiqa-terse [lite\|full\|ultra\|off]` | Switch terse mode level |
| `/aiqa-tokenstats [--all] [--since 7d]` | Token usage + savings |
| `/aiqa-terse-help` | Terse mode reference card |

---

## Output Structure

| Path | Contents |
|---|---|
| `TestResult/{story-id}/test-cases/` | XLSX + MD test cases |
| `TestResult/{story-id}/e2e/pages/` | Playwright Page Objects |
| `TestResult/{story-id}/e2e/tests/` | Playwright spec files |
| `TestResult/{story-id}/test-data/` | JSON data (valid/edge/security) |
| `TestResult/{story-id}/bug-reports/` | BUG-XXXX.md files |
| `TestResult/{story-id}/reports/` | QA summary (HTML + MD + XLSX) |

---

## Never Modify Without Permission

- `core/orchestrator.mjs`
- `core/autonomous-loop.mjs`
- Any file in `node_modules/`
- `playwright.config.js`
- Host project files outside `TestResult/`

---

## Never Compress in AI Outputs

- Generated E2E test code (Playwright specs/page objects)
- Excel/XLSX test case cell content
- Bug report body (Arabic RCA + steps)
- Security or critical (🔴) findings
- Quoted error messages or stack traces

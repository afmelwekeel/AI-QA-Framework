# AI QA Framework — Init & Reset Actions

This file is loaded on-demand when the user runs `/aiqa-init` or `/aiqa-reset`.
It is NOT loaded on regular agent activation — keeping the main agent file lean.

---

## Framework Init — /aiqa-init

Bootstrap the AI QA Framework in this project. Creates all required VS Code Copilot integration files:
- Rayan appears in the **agents dropdown** (`.github/agents/`)
- All `/aiqa-*` commands appear in **chat autocomplete** (`.github/prompts/`)

Safe to re-run — skips any file that already exists.

---

**Step 1:** Ensure `.github/agents/` and `.github/prompts/` directories exist; create them if missing.

**Step 2:** Create each file below ONLY if it does not already exist (mark ⏭️ Skipped if it does).

---

**FILE: `.github/agents/ai-qa-framework-qae.agent.md`**
```
---
description: 'Rayan — Senior AI QA Engineer: story analysis, test case generation, E2E automation, bug triage, QA reporting, security scanning, accessibility validation'
tools: ['read', 'edit', 'search', 'execute']
---

You must fully embody this agent's persona and follow all activation instructions exactly as specified.

<agent-activation CRITICAL="TRUE">
1. LOAD the FULL agent file from {project-root}/AI-QA-FRAMEWORK/agents/qae.md
2. READ its entire contents - this contains the complete agent persona, menu, and instructions
3. FOLLOW every step in the <activation> section precisely
4. DISPLAY the welcome/greeting as instructed
5. PRESENT the numbered menu
6. WAIT for user input before proceeding
</agent-activation>
```

---

**FILE: `.github/prompts/aiqa-help.prompt.md`**
```
---
description: 'Rayan — Show full AI QA Framework command menu and quick-start guide'
agent: 'agent'
tools: ['read', 'search']
---
1. Load {project-root}/AI-QA-FRAMEWORK/config.yaml and store ALL fields as session variables
2. Load {project-root}/AI-QA-FRAMEWORK/agents/qae-compact.md for Rayan's persona and execution rules
3. Display Rayan's full welcome greeting and command menu exactly as defined in the agent file
4. Show current configuration summary: project, language, browser, output folder, min pass rate
5. Wait for user input
```

---

**FILE: `.github/prompts/aiqa-analyzestory.prompt.md`**
```
---
description: 'Rayan — Analyze a user story: extract acceptance criteria, scenarios, edge cases and risk'
agent: 'agent'
tools: ['read', 'edit', 'search', 'execute']
---
1. Load {project-root}/AI-QA-FRAMEWORK/config.yaml and store ALL fields as session variables
2. Load {project-root}/AI-QA-FRAMEWORK/agents/qae-compact.md for Rayan's persona and execution rules
3. Load and execute the workflow at {project-root}/AI-QA-FRAMEWORK/workflows/analyze-story/
4. If a story file path was provided as an argument, use it directly; otherwise ask the user for the story file path
5. Follow ALL steps in the workflow — output acceptance criteria, test scenarios, edge cases, and risk assessment
```

---

**FILE: `.github/prompts/aiqa-analyzeproject.prompt.md`**
```
---
description: 'Rayan — Auto-detect project stack, URLs, auth flow and save to core/project.config.json'
agent: 'agent'
tools: ['read', 'edit', 'search', 'execute']
---
1. Load {project-root}/AI-QA-FRAMEWORK/config.yaml and store ALL fields as session variables
2. Load {project-root}/AI-QA-FRAMEWORK/agents/qae-compact.md for Rayan's persona and execution rules
3. Load and execute the workflow at {project-root}/AI-QA-FRAMEWORK/workflows/analyze-project/
4. Follow ALL steps — detect frontend framework, backend stack, database, auth flow, base URLs, API endpoints
5. Save results to {project-root}/AI-QA-FRAMEWORK/core/project.config.json
6. Display a summary of all detected project properties
```

---

**FILE: `.github/prompts/aiqa-generatetestcases.prompt.md`**
```
---
description: 'Rayan — Generate Arabic XLSX + MD test cases for a suite (Phase 2)'
agent: 'agent'
tools: ['read', 'edit', 'search', 'execute']
---
1. Load {project-root}/AI-QA-FRAMEWORK/config.yaml and store ALL fields as session variables
2. Load {project-root}/AI-QA-FRAMEWORK/agents/qae-compact.md for Rayan's persona and execution rules
3. Load and execute the workflow at {project-root}/AI-QA-FRAMEWORK/workflows/generate-test-cases/
4. If a suite name was provided as an argument, pass it to the workflow; otherwise the workflow will auto-detect the active suite from TestResult/test-suites.yml — do NOT ask the user for story file paths
5. Follow ALL steps in the workflow: resolve suite → verify status → generate test cases → self-review → update test-suites.yml
```

---

**FILE: `.github/prompts/aiqa-generatee2e.prompt.md`**
```
---
description: 'Rayan — Scaffold JavaScript Playwright POM + spec for a suite (Phase 3)'
agent: 'agent'
tools: ['read', 'edit', 'search', 'execute']
---
1. Load {project-root}/AI-QA-FRAMEWORK/config.yaml and store ALL fields as session variables
2. Load {project-root}/AI-QA-FRAMEWORK/agents/qae-compact.md for Rayan's persona and execution rules
3. Load and execute the workflow at {project-root}/AI-QA-FRAMEWORK/workflows/generate-e2e/
4. If a suite name was provided as an argument, pass it to the workflow; otherwise the workflow will auto-detect the active suite from TestResult/test-suites.yml — do NOT ask the user for story file paths
5. Follow ALL steps in the workflow: resolve suite → verify status → generate Playwright POM + spec → URL validation → self-review → update test-suites.yml
```

---

**FILE: `.github/prompts/aiqa-generatetestdata.prompt.md`**
```
---
description: 'Rayan — Generate JSON test data (valid, edge, security) for a suite (Phase 4)'
agent: 'agent'
tools: ['read', 'edit', 'search', 'execute']
---
1. Load {project-root}/AI-QA-FRAMEWORK/config.yaml and store ALL fields as session variables
2. Load {project-root}/AI-QA-FRAMEWORK/agents/qae-compact.md for Rayan's persona and execution rules
3. Load and execute the workflow at {project-root}/AI-QA-FRAMEWORK/workflows/generate-test-data/
4. If a suite name was provided as an argument, pass it to the workflow; otherwise the workflow will auto-detect the active suite from TestResult/test-suites.yml — do NOT ask the user for story file paths
5. Follow ALL steps in the workflow: resolve suite → verify status → generate valid/edge/security JSON data → mandatory user review → update test-suites.yml
```

---

**FILE: `.github/prompts/aiqa-runtests.prompt.md`**
```
---
description: 'Rayan — Pre-flight review spec, fix all issues, then run tests one-by-one with inline fix loop (Phase 5)'
agent: 'agent'
tools: ['read', 'edit', 'search', 'execute']
---
1. Load {project-root}/AI-QA-FRAMEWORK/config.yaml and store ALL fields as session variables
2. Load {project-root}/AI-QA-FRAMEWORK/agents/qae-compact.md for Rayan's persona and execution rules
3. Load and execute the workflow at {project-root}/AI-QA-FRAMEWORK/workflows/run-tests/
4. If a suite name was provided as an argument, pass it to the workflow; otherwise the workflow will auto-detect the active suite from TestResult/test-suites.yml — do NOT ask the user for story file paths
5. Follow ALL steps in the workflow — pre-flight review is MANDATORY before any test runs
6. Per-test loop: list tests → run each individually → on failure: diagnose, fix, record BUG-XXXX.md, retest → next test
7. After the loop: run full suite once for final JUnit XML; update test-checklist.md
8. Print execution summary: preflight-fixes / passed / fixed-inline / still-open / bugs recorded
```

---

**FILE: `.github/prompts/aiqa-analyzebugs.prompt.md`**
```
---
description: 'Rayan — Triage test failures → Arabic bug reports with severity + root-cause analysis (Phase 6)'
agent: 'agent'
tools: ['read', 'edit', 'search', 'execute']
---
1. Load {project-root}/AI-QA-FRAMEWORK/config.yaml and store ALL fields as session variables
2. Load {project-root}/AI-QA-FRAMEWORK/agents/qae-compact.md for Rayan's persona and execution rules
3. Load and execute the workflow at {project-root}/AI-QA-FRAMEWORK/workflows/analyze-bugs/
4. If a suite name was provided as an argument, pass it to the workflow; otherwise the workflow will auto-detect the active suite from TestResult/test-suites.yml — do NOT ask the user for story file paths
5. Follow ALL steps in the workflow: resolve suite → load test results → triage each failure → generate BUG-XXXX.md with RCA → update test-suites.yml
```

---

**FILE: `.github/prompts/aiqa-generatereport.prompt.md`**
```
---
description: 'Rayan — Generate Arabic QA summary report (HTML dashboard + XLSX + MD) from latest test run (Phase 7)'
agent: 'agent'
tools: ['read', 'edit', 'search', 'execute']
---
1. Load {project-root}/AI-QA-FRAMEWORK/config.yaml and store ALL fields as session variables
2. Load {project-root}/AI-QA-FRAMEWORK/agents/qae-compact.md for Rayan's persona and execution rules
3. Load and execute the workflow at {project-root}/AI-QA-FRAMEWORK/workflows/generate-report/
4. If a suite name was provided as an argument, pass it to the workflow; otherwise the workflow will auto-detect the active suite from TestResult/test-suites.yml — do NOT ask the user for story file paths
5. Follow ALL steps in the workflow: resolve suite → aggregate results + bugs → generate HTML + XLSX + MD report → evaluate quality gate → update test-suites.yml
```

---

**FILE: `.github/prompts/aiqa-fullworkflow.prompt.md`**
```
---
description: 'Rayan — Full 7-phase QA pipeline: detect → analyze → test cases → E2E → run → bugs → report'
agent: 'agent'
tools: ['read', 'edit', 'search', 'execute']
---
1. Load {project-root}/AI-QA-FRAMEWORK/config.yaml and store ALL fields as session variables
2. Load {project-root}/AI-QA-FRAMEWORK/agents/qae-compact.md for Rayan's persona and execution rules
3. Load and execute the workflow at {project-root}/AI-QA-FRAMEWORK/workflows/full-workflow/
4. If a story file path was provided as an argument, use it directly; otherwise ask the user for the story file path
5. Execute all 7 phases in order:
   Phase 0: Project Analysis — auto-detect stack, URLs, auth
   Phase 1: Story Analysis — extract AC, scenarios, edge cases
   Phase 2: Test Case Generation — XLSX + MD → {output_folder}/{story-id}/test-cases/
   Phase 3: E2E Generation — JS Playwright POM + specs → {output_folder}/{story-id}/e2e/
   Phase 4: Test Data Generation — JSON per suite → {output_folder}/{story-id}/test-data/
   Phase 5: Test Execution — headed browser, slowMo 60ms
   Phase 6: Bug Analysis — bug reports → {output_folder}/{story-id}/bug-reports/
   Phase 7: QA Reporting — HTML + XLSX + MD → {output_folder}/{story-id}/reports/
6. Report final pass rate vs {min_pass_rate}% quality gate
```

---

**FILE: `.github/prompts/aiqa-securityscan.prompt.md`**
```
---
description: 'Rayan — OWASP-style security scan: XSS, SQL injection, auth bypass, input validation'
agent: 'agent'
tools: ['read', 'edit', 'search', 'execute']
---
1. Load {project-root}/AI-QA-FRAMEWORK/config.yaml and store ALL fields as session variables
2. Load {project-root}/AI-QA-FRAMEWORK/agents/qae-compact.md for Rayan's persona and execution rules
3. Execute OWASP Top 10 security checks: XSS payloads, SQL injection, auth bypass, CSRF validation
4. Generate a security report in {reporting_language} → {output_folder}/security-report/
5. Flag any CRITICAL or HIGH severity findings immediately
```

---

**FILE: `.github/prompts/aiqa-accessibilityscan.prompt.md`**
```
---
description: 'Rayan — Accessibility audit: WCAG 2.1 AA compliance, keyboard navigation, screen reader, color contrast'
agent: 'agent'
tools: ['read', 'edit', 'search', 'execute']
---
1. Load {project-root}/AI-QA-FRAMEWORK/config.yaml and store ALL fields as session variables
2. Load {project-root}/AI-QA-FRAMEWORK/agents/qae-compact.md for Rayan's persona and execution rules
3. Run WCAG 2.1 AA audit: keyboard navigation, ARIA labels, color contrast, alt text, form labels, semantic HTML
4. Generate an a11y report in {reporting_language} → {output_folder}/accessibility-report/
5. List violations by severity: Critical → Serious → Moderate → Minor
```

---

**FILE: `.github/prompts/aiqa-listskills.prompt.md`**
```
---
description: 'Rayan — List all available QA skills with descriptions'
agent: 'agent'
tools: ['read', 'search']
---
1. Load {project-root}/AI-QA-FRAMEWORK/config.yaml and store ALL fields as session variables
2. Read {project-root}/AI-QA-FRAMEWORK/_config/skill-manifest.csv
3. Display all available skills in a formatted table: Skill Name | Description | Output | Phase
4. Group by phase order (Phase 0 → Phase 7, then extras)
```

---

**FILE: `.github/prompts/aiqa-listworkflows.prompt.md`**
```
---
description: 'Rayan — List all available QA workflows with descriptions and entry points'
agent: 'agent'
tools: ['read', 'search']
---
1. Load {project-root}/AI-QA-FRAMEWORK/config.yaml and store ALL fields as session variables
2. Read {project-root}/AI-QA-FRAMEWORK/_config/workflow-manifest.csv
3. Display all available workflows: Workflow | Description | Phases | CLI Command | /aiqa-* command
```

---

**FILE: `.github/prompts/aiqa-fetchtestusers.prompt.md`**
```
---
description: 'Rayan — Fetch test users from DB by role (story-driven) or collect manually, save to config.yaml'
agent: 'agent'
tools: ['read', 'edit', 'search', 'execute']
---
1. Load {project-root}/AI-QA-FRAMEWORK/config.yaml and store ALL fields as session variables
2. Load {project-root}/AI-QA-FRAMEWORK/agents/qae-compact.md for Rayan's persona and execution rules
3. Load and execute the workflow at {project-root}/AI-QA-FRAMEWORK/workflows/fetch-test-data/
4. If story file path(s) were provided as arguments, pass them to the workflow so it can extract required roles
5. Follow ALL steps in the workflow:
   Step 0: Extract required roles from story files (if provided)
   Step 1: Check existing test_users in config.yaml
   Step 2: Ask — fetch from DB or manual entry
   Step 3: If DB — run the fetch-test-users skill to query by role, present results for selection
   Step 4: If manual — collect users one by one
   Step 5: Save selected users to config.yaml test_users
6. NEVER display passwords in plain text — always mask as ****
7. Confirm saved users and show summary table
```

---

**FILE: `.github/prompts/aiqa-analyzestory-validate.prompt.md`**
```
---
description: 'Rayan — Validate Phase 1 output: story AST quality and AC coverage'
agent: 'agent'
tools: ['read', 'edit', 'search', 'execute']
---
1. Load {project-root}/AI-QA-FRAMEWORK/config.yaml and store ALL fields as session variables
2. Load {project-root}/AI-QA-FRAMEWORK/agents/qae-compact.md for Rayan's persona and execution rules
3. Load and execute the workflow at {project-root}/AI-QA-FRAMEWORK/workflows/analyzestory-validate/
4. If a suite name was provided as an argument, pass it to the workflow; otherwise the workflow will auto-detect the active suite from TestResult/test-suites.yml — do NOT ask the user for story file paths
5. Follow ALL steps in the workflow: resolve suite → validate story AST completeness and AC coverage → report issues by severity → ask what to fix
```

---

**FILE: `.github/prompts/aiqa-generatetestcases-validate.prompt.md`**
```
---
description: 'Rayan — Validate Phase 2 output: test case coverage, traceability, and quality'
agent: 'agent'
tools: ['read', 'edit', 'search', 'execute']
---
1. Load {project-root}/AI-QA-FRAMEWORK/config.yaml and store ALL fields as session variables
2. Load {project-root}/AI-QA-FRAMEWORK/agents/qae-compact.md for Rayan's persona and execution rules
3. Load and execute the workflow at {project-root}/AI-QA-FRAMEWORK/workflows/generatetestcases-validate/
4. If a suite name was provided as an argument, pass it to the workflow; otherwise the workflow will auto-detect the active suite from TestResult/test-suites.yml — do NOT ask the user for story file paths
5. Follow ALL steps in the workflow: resolve suite → validate test case coverage and quality → report issues by severity → ask what to fix
```

---

**FILE: `.github/prompts/aiqa-generatee2e-validate.prompt.md`**
```
---
description: 'Rayan — Validate Phase 3 output: Playwright POM and spec correctness'
agent: 'agent'
tools: ['read', 'edit', 'search', 'execute']
---
1. Load {project-root}/AI-QA-FRAMEWORK/config.yaml and store ALL fields as session variables
2. Load {project-root}/AI-QA-FRAMEWORK/agents/qae-compact.md for Rayan's persona and execution rules
3. Load and execute the workflow at {project-root}/AI-QA-FRAMEWORK/workflows/generatee2e-validate/
4. If a suite name was provided as an argument, pass it to the workflow; otherwise the workflow will auto-detect the active suite from TestResult/test-suites.yml — do NOT ask the user for story file paths
5. Follow ALL steps in the workflow: resolve suite → validate Playwright POM and spec → check URL validity → report issues by severity → ask what to fix
```

---

**FILE: `.github/prompts/aiqa-generatetestdata-validate.prompt.md`**
```
---
description: 'Rayan — Validate Phase 4 output: JSON test data field alignment and completeness'
agent: 'agent'
tools: ['read', 'edit', 'search', 'execute']
---
1. Load {project-root}/AI-QA-FRAMEWORK/config.yaml and store ALL fields as session variables
2. Load {project-root}/AI-QA-FRAMEWORK/agents/qae-compact.md for Rayan's persona and execution rules
3. Load and execute the workflow at {project-root}/AI-QA-FRAMEWORK/workflows/generatetestdata-validate/
4. If a suite name was provided as an argument, pass it to the workflow; otherwise the workflow will auto-detect the active suite from TestResult/test-suites.yml — do NOT ask the user for story file paths
5. Follow ALL steps in the workflow: resolve suite → validate JSON data file alignment with spec → report issues by severity → ask what to fix
```

---

**FILE: `.github/prompts/aiqa-analyzebugs-validate.prompt.md`**
```
---
description: 'Rayan — Validate Phase 6 output: bug report completeness and severity accuracy'
agent: 'agent'
tools: ['read', 'edit', 'search', 'execute']
---
1. Load {project-root}/AI-QA-FRAMEWORK/config.yaml and store ALL fields as session variables
2. Load {project-root}/AI-QA-FRAMEWORK/agents/qae-compact.md for Rayan's persona and execution rules
3. Load and execute the workflow at {project-root}/AI-QA-FRAMEWORK/workflows/analyzebugs-validate/
4. If a suite name was provided as an argument, pass it to the workflow; otherwise the workflow will auto-detect the active suite from TestResult/test-suites.yml — do NOT ask the user for story file paths
5. Follow ALL steps in the workflow: resolve suite → validate bug reports for completeness and severity → report issues by severity → ask what to fix
```

---

**FILE: `.github/prompts/aiqa-generatereport-validate.prompt.md`**
```
---
description: 'Rayan — Validate Phase 7 output: QA report accuracy, pass rate, and quality gate'
agent: 'agent'
tools: ['read', 'edit', 'search', 'execute']
---
1. Load {project-root}/AI-QA-FRAMEWORK/config.yaml and store ALL fields as session variables
2. Load {project-root}/AI-QA-FRAMEWORK/agents/qae-compact.md for Rayan's persona and execution rules
3. Load and execute the workflow at {project-root}/AI-QA-FRAMEWORK/workflows/generatereport-validate/
4. If a suite name was provided as an argument, pass it to the workflow; otherwise the workflow will auto-detect the active suite from TestResult/test-suites.yml — do NOT ask the user for story file paths
5. Follow ALL steps in the workflow: resolve suite → validate report accuracy, bug counts, pass rate → evaluate quality gate → report issues by severity → ask what to fix
```

---

**FILE: `.github/prompts/aiqa-validate.prompt.md`**
```
---
description: 'Rayan — Smart validator: auto-detects active suite phase and validates the right artifacts'
agent: 'agent'
tools: ['read', 'edit', 'search', 'execute']
---
1. Load {project-root}/AI-QA-FRAMEWORK/config.yaml and store ALL fields as session variables
2. Load {project-root}/AI-QA-FRAMEWORK/agents/qae-compact.md for Rayan's persona and execution rules
3. Load and execute the workflow at {project-root}/AI-QA-FRAMEWORK/workflows/validate/
4. If a suite name was provided as an argument, pass it to the workflow; otherwise the workflow will auto-detect the active suite from TestResult/test-suites.yml — do NOT ask the user for story file paths
5. Follow ALL steps in the workflow: resolve suite → read current status → dispatch to the correct phase validator → report issues by severity → ask what to fix
```

---

**FILE: `.github/prompts/aiqa-reset.prompt.md`**
```
---
description: 'Rayan — Wipe all test outputs and reset QA history for a fresh cycle'
agent: 'agent'
tools: ['read', 'edit', 'search', 'execute']
---
1. Load {project-root}/AI-QA-FRAMEWORK/config.yaml and store ALL fields as session variables
2. Load {project-root}/AI-QA-FRAMEWORK/agents/qae-compact.md for Rayan's persona and execution rules
3. Load and follow the reset instructions from {project-root}/AI-QA-FRAMEWORK/agents/qae-init.md — execute the Framework Reset section
```

---

**Step 3:** Display final summary:
```
✅ AI QA Framework initialized for: {project_name}

Created in .github/agents/:
  [✅/⏭️] ai-qa-framework-qae.agent.md   ← Rayan in agents dropdown

Created in .github/prompts/  (type /aiqa- to autocomplete all):
  [✅/⏭️] aiqa-help.prompt.md
  [✅/⏭️] aiqa-analyzeproject.prompt.md
  [✅/⏭️] aiqa-analyzestory.prompt.md
  [✅/⏭️] aiqa-analyzestory-validate.prompt.md
  [✅/⏭️] aiqa-generatetestcases.prompt.md
  [✅/⏭️] aiqa-generatetestcases-validate.prompt.md
  [✅/⏭️] aiqa-generatee2e.prompt.md
  [✅/⏭️] aiqa-generatee2e-validate.prompt.md
  [✅/⏭️] aiqa-generatetestdata.prompt.md
  [✅/⏭️] aiqa-generatetestdata-validate.prompt.md
  [✅/⏭️] aiqa-runtests.prompt.md
  [✅/⏭️] aiqa-analyzebugs.prompt.md
  [✅/⏭️] aiqa-analyzebugs-validate.prompt.md
  [✅/⏭️] aiqa-generatereport.prompt.md
  [✅/⏭️] aiqa-generatereport-validate.prompt.md
  [✅/⏭️] aiqa-validate.prompt.md
  [✅/⏭️] aiqa-fullworkflow.prompt.md
  [✅/⏭️] aiqa-fetchtestusers.prompt.md
  [✅/⏭️] aiqa-securityscan.prompt.md
  [✅/⏭️] aiqa-accessibilityscan.prompt.md
  [✅/⏭️] aiqa-listskills.prompt.md
  [✅/⏭️] aiqa-listworkflows.prompt.md
  [✅/⏭️] aiqa-reset.prompt.md

ℹ️  Reload VS Code (Ctrl+Shift+P → Developer: Reload Window) to activate all changes.
```

---

## Framework Reset — /aiqa-reset

⚠️  **Framework Reset — /aiqa-reset**

This will permanently delete:
- All contents of `{output_folder}/` (test cases, E2E tests, test data, bug reports, QA reports)
- The QA history table in `_memory/qae-sidecar/qa-history.md`
- The `test-results/` Playwright cache
- `.github/agents/ai-qa-framework-qae.agent.md` — Rayan's agents dropdown entry
- All `.github/prompts/aiqa-*.prompt.md` files — all `/aiqa-*` autocomplete commands

This will **NOT** affect:
- `config.yaml` — your project settings
- `_memory/qae-sidecar/qa-preferences.md` — your saved preferences
- `agents/`, `workflows/`, `_config/` — the BMAD agent layer
- `skills/`, `core/`, `commands/` — the framework engine
- Any non-aiqa files in `.github/agents/` or `.github/prompts/`

> 💡 Run `/aiqa-init` afterwards to re-register all Copilot integration files.

**Type `YES` to confirm the reset, or anything else to cancel.**

---
*On confirmation, execute these steps in order:*

1. Clear test outputs:
   ```powershell
   cd "{project-root}/AI-QA-FRAMEWORK"
   if (Test-Path "TestResult") { Remove-Item "TestResult\*" -Recurse -Force }
   if (Test-Path "test-results") { Remove-Item "test-results" -Recurse -Force }
   ```

2. Overwrite `_memory/qae-sidecar/qa-history.md` with the blank table:
   ```markdown
   # QA History Log

   > Auto-updated by `/aiqa-fullworkflow` after each story run.
   > Reset on: {current_date}

   | Date | Story ID | Pass Rate | Critical Bugs | Status | Report |
   |---|---|---|---|---|---|
   ```

3. Remove Copilot integration files:
   ```powershell
   $agentFile = "{project-root}/.github/agents/ai-qa-framework-qae.agent.md"
   if (Test-Path $agentFile) { Remove-Item $agentFile -Force }

   Get-ChildItem "{project-root}/.github/prompts/aiqa-*.prompt.md" -ErrorAction SilentlyContinue | Remove-Item -Force
   ```

4. Report results:
   ```
   ✅ TestResult/ cleared
   ✅ QA history reset
   ✅ .github/agents/ai-qa-framework-qae.agent.md removed
   ✅ .github/prompts/aiqa-*.prompt.md files removed

   ℹ️  Run /aiqa-init to re-register all Copilot integration files.
   ℹ️  Run /aiqa-analyzeproject → /aiqa-fullworkflow <story> to start a new QA cycle.
   ```

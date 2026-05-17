# User Story: Restructure AI-QA-FRAMEWORK to Follow BMAD Method Patterns

**Story ID:** QA-BMAD-001  
**Date:** 2026-05-16  
**Author:** GitHub Copilot  
**Status:** Ready for Implementation

---

## Story Statement

**As** Ahmed Al Wakeel (QA framework user),  
**I want** the AI-QA-FRAMEWORK to operate using the same patterns and conventions as the BMAD Method,  
**So that** I can interact with it using the same mental model I use for BMAD — with a named agent persona, config-driven settings, a manifest/discovery system, BMAD-style workflow files, and a structured output folder — making the framework feel native and consistent within the project.

---

## Background / Context

The BMAD Method provides a powerful, proven pattern for AI-agent orchestration:
- Named personas with XML activation steps
- Config YAML loaded JIT by the AI
- CSV manifests for agent/workflow/skill discovery
- YAML+XML workflow files with sequential execution
- Structured output folders
- Memory sidecars for persistent preferences
- Module-based extensibility

The current AI-QA-FRAMEWORK works well as a **Node.js CLI tool** but lacks:
1. A BMAD-style agent persona (no named agent, no activation steps)
2. A config.yaml for project-level settings (uses `project.config.json` for detected settings, not user preferences)
3. CSV manifests for agent and skill discovery
4. BMAD-compatible workflow YAML/XML files
5. A structured output folder aligned with BMAD conventions
6. A memory sidecar system for QA preferences
7. A module-level config.yaml (the framework has no persona-level config)
8. A `qa-help.csv` for slash-command discovery

---

## Acceptance Criteria

### AC-1: Config System (BMAD-style)
- [ ] `AI-QA-FRAMEWORK/config.yaml` is created with fields: `project_name`, `user_name`, `communication_language`, `document_output_language`, `output_folder`, `reporting_language`, `test_mode`
- [ ] All hardcoded values in skills (e.g., `language: ar`, `reporting.language`) must be resolved from `config.yaml`
- [ ] The config references `{project-root}` as a runtime placeholder consistent with BMAD

### AC-2: Named QA Agent (`qae` agent)
- [ ] `AI-QA-FRAMEWORK/agents/qae.md` is created with BMAD-style agent structure (YAML frontmatter + XML persona block)
- [ ] Agent has a named persona: **"Layla"** — Senior AI QA Engineer
- [ ] Activation protocol follows BMAD 9-step pattern: load config → store session vars → greet → show menu → wait
- [ ] Agent menu includes: Chat, Analyze Project, Analyze Story, Full Workflow, Run Tests, Generate Report, Dismiss
- [ ] Menu items trigger skills via `workflow` or `action` attributes consistent with BMAD handlers

### AC-3: Manifest / Discovery System
- [ ] `AI-QA-FRAMEWORK/_config/agent-manifest.csv` is created listing the `qae` agent with all metadata fields matching BMAD format
- [ ] `AI-QA-FRAMEWORK/_config/skill-manifest.csv` is created listing all 13 skills with: `id`, `name`, `description`, `phase`, `path`
- [ ] `AI-QA-FRAMEWORK/_config/workflow-manifest.csv` is created listing all named workflows (full-workflow, regression-test, security-scan, etc.) with trigger phrases
- [ ] `AI-QA-FRAMEWORK/_config/qa-help.csv` is created for `/qa-help` slash command support

### AC-4: Workflow Files (BMAD-compatible)
- [ ] `AI-QA-FRAMEWORK/workflows/full-workflow/workflow.yaml` is created following BMAD workflow YAML schema with: `name`, `description`, `config_source`, `instructions` path
- [ ] `AI-QA-FRAMEWORK/workflows/full-workflow/instructions.xml` is created with BMAD XML step format (`<step>`, `<action>`, `<check>`, `<ask>`)
- [ ] `AI-QA-FRAMEWORK/workflows/analyze-story/workflow.yaml` is created similarly
- [ ] `AI-QA-FRAMEWORK/workflows/generate-report/workflow.yaml` is created similarly
- [ ] All workflow files reference `config_source: "{project-root}/AI-QA-FRAMEWORK/config.yaml"`

### AC-5: Output Folder Convention
- [ ] `AI-QA-FRAMEWORK/config.yaml` declares `output_folder: "{project-root}/AI-QA-FRAMEWORK/TestResult"`
- [ ] All skill `run.mjs` files that write outputs use `output_folder` from config instead of hardcoded paths
- [ ] Sub-folders follow BMAD convention: `{output_folder}/{story-id}/test-cases/`, `/e2e/`, `/test-data/`, `/bug-reports/`, `/reports/`

### AC-6: Memory Sidecar System
- [ ] `AI-QA-FRAMEWORK/_memory/config.yaml` is created for session tracking
- [ ] `AI-QA-FRAMEWORK/_memory/qae-sidecar/qa-preferences.md` is created for persistent QA preferences (reporting language, test mode, preferred browser, etc.)
- [ ] `AI-QA-FRAMEWORK/_memory/qae-sidecar/qa-history.md` is created to track previously tested stories

### AC-7: Module-level `module-help.csv`
- [ ] `AI-QA-FRAMEWORK/module-help.csv` is created listing all available commands with descriptions and trigger phrases, mirroring BMAD's `module-help.csv` pattern

### AC-8: Skill Structure Alignment
- [ ] Each skill's `skill.json` is updated to include a `workflow` field pointing to its corresponding `AI-QA-FRAMEWORK/workflows/<skill>/workflow.yaml` (where applicable)
- [ ] Each skill's `prompt.md` is updated with a BMAD-style header declaring: `config_source`, `communication_language`, `output_folder` variable references
- [ ] The `full-workflow` skill's `prompt.md` references `{{communication_language}}` and `{{output_folder}}` from config instead of hardcoded values

### AC-9: README and Documentation Update
- [ ] `AI-QA-FRAMEWORK/README.md` is updated to document the new BMAD-style structure and how to activate the `qae` agent
- [ ] A section "BMAD Integration" explains the config system, agent activation, and manifest discovery

---

## Tasks

### Task 1: Create Config System
**Subtasks:**
- [x] 1.1 Create `AI-QA-FRAMEWORK/config.yaml` with all user-configurable fields
- [ ] 1.2 Create `AI-QA-FRAMEWORK/_config/` directory structure

### Task 2: Create QAE Agent
**Subtasks:**
- [ ] 2.1 Create `AI-QA-FRAMEWORK/agents/` directory
- [ ] 2.2 Create `AI-QA-FRAMEWORK/agents/qae.md` with full BMAD agent structure
- [ ] 2.3 Verify activation steps follow BMAD 9-step pattern exactly

### Task 3: Create Manifests
**Subtasks:**
- [ ] 3.1 Create `AI-QA-FRAMEWORK/_config/agent-manifest.csv`
- [ ] 3.2 Create `AI-QA-FRAMEWORK/_config/skill-manifest.csv`
- [ ] 3.3 Create `AI-QA-FRAMEWORK/_config/workflow-manifest.csv`
- [ ] 3.4 Create `AI-QA-FRAMEWORK/_config/qa-help.csv`

### Task 4: Create BMAD-style Workflow Files
**Subtasks:**
- [ ] 4.1 Create `AI-QA-FRAMEWORK/workflows/` directory
- [ ] 4.2 Create `full-workflow/workflow.yaml` + `instructions.xml`
- [ ] 4.3 Create `analyze-story/workflow.yaml` + `instructions.xml`
- [ ] 4.4 Create `generate-report/workflow.yaml` + `instructions.xml`
- [ ] 4.5 Create `generate-e2e/workflow.yaml` + `instructions.xml`

### Task 5: Create Memory System
**Subtasks:**
- [ ] 5.1 Create `AI-QA-FRAMEWORK/_memory/config.yaml`
- [ ] 5.2 Create `AI-QA-FRAMEWORK/_memory/qae-sidecar/qa-preferences.md`
- [ ] 5.3 Create `AI-QA-FRAMEWORK/_memory/qae-sidecar/qa-history.md`

### Task 6: Create Module Help
**Subtasks:**
- [ ] 6.1 Create `AI-QA-FRAMEWORK/module-help.csv`

### Task 7: Update Skill Prompts
**Subtasks:**
- [ ] 7.1 Update `skills/full-workflow/prompt.md` to use config variables
- [ ] 7.2 Update `skills/user-story-analysis/prompt.md` with BMAD-style header
- [ ] 7.3 Update `skills/playwright-generation/prompt.md` with BMAD-style header
- [ ] 7.4 Update `skills/bug-analysis/prompt.md` with BMAD-style header
- [ ] 7.5 Update `skills/qa-reporting/prompt.md` with BMAD-style header

### Task 8: Update README
**Subtasks:**
- [ ] 8.1 Update `AI-QA-FRAMEWORK/README.md` with BMAD-style structure docs

---

## Definition of Done

- [ ] All files listed in Tasks 1-8 are created or updated
- [ ] A new user activating the `qae` agent experiences the same pattern as activating any BMAD agent
- [ ] Config-driven values (language, output folder, project name) flow through all prompts
- [ ] Discovery manifests allow the AI to list all available skills and workflows on demand
- [ ] The existing Node.js CLI (`orchestrator.mjs`) continues to work unchanged — BMAD integration is additive, not replacing

---

## Notes / Constraints

- The Node.js CLI (`orchestrator.mjs`) remains the runtime execution engine — BMAD patterns are for AI-agent interaction layer only
- Existing skill `run.mjs` and `skill.json` files are NOT modified (except `skill.json` to add `workflow` field)
- All new files are purely configuration/instruction files for the AI, not executable code
- The `qae` agent name is "Layla" — Senior AI QA Engineer, with practical, data-driven communication style
- `config.yaml` reporting language defaults to Arabic (`ar`) to preserve existing behavior

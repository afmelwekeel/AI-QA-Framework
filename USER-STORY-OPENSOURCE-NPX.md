# User Story: Open-Source AI-QA-Framework with NPX Installer

**Story ID:** QA-OSS-001  
**Date:** 2026-05-17  
**Author:** Ahmed Al Wakeel  
**Status:** Ready for Implementation  
**Priority:** High

### Key Decisions (Locked)

| Decision | Choice | Rationale |
|---|---|---|
| Install method | Bundle in npm package | Framework files ship inside the package; installer copies from `node_modules/`. Works offline, reproducible — same as bmad-method. |
| Bootstrap scripts | Replace with new CLI | `setup/bootstrap.ps1` and `setup/bootstrap.sh` are deleted. `bin/installer.mjs` is the single entry point for all users. |
| GitHub username | `afmelwekeel` | Repository: `https://github.com/afmelwekeel/AI-QA-Framework` |
| Host package.json | Do not modify | Framework is self-contained with its own `package.json`. Like bmad-method, the host project is not touched. |

---

## Overview

This document covers the complete roadmap to transform the AI-QA-Framework from a private, project-specific tool into a **fully open-source, community-ready framework** that any developer can install in seconds using:

```bash
npx ai-qa-framework install
```

Modeled after the [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) open-source pattern.

---

## Epic 1 — NPX CLI Installer

### Story Statement

**As** a developer,  
**I want** to run `npx ai-qa-framework install` in any project folder,  
**So that** the framework installs itself interactively with the right configuration for my project, just like `npx bmad-method install`.

### Acceptance Criteria

#### AC-1.0: Prerequisite — Package Name Availability (BLOCKING)
- [ ] Run `npm info ai-qa-framework` before any implementation
- [ ] If name is taken → use scoped package `@afmelwekeel/ai-qa-framework` and update install command everywhere to `npx @afmelwekeel/ai-qa-framework install`
- [ ] Name availability confirmed before Epic 4 work begins

#### AC-1.1: Package Entry Point
- [ ] `package.json` has a `"bin"` field: `{ "ai-qa-framework": "./bin/cli.mjs" }`
- [ ] `package.json` removes `"private": true` to allow npm publication
- [ ] `package.json` adds: `"repository"` pointing to `https://github.com/afmelwekeel/AI-QA-Framework`, `"homepage"`, `"bugs"`, `"keywords"`, `"license": "MIT"`, `"publishConfig": { "access": "public" }`
- [ ] `package.json` adds `"files"` array to whitelist only installer + framework files (exclude TestResult, _memory, node_modules, project.config.json)

#### AC-1.2: CLI Entry File (`bin/cli.mjs`)
- [ ] File exists at `bin/cli.mjs` as the main npx entry point
- [ ] Supports subcommands: `install`, `update`, `help`, `version`
- [ ] Running `npx ai-qa-framework` with no args prints help
- [ ] Running `npx ai-qa-framework install` starts the interactive installer
- [ ] Running `npx ai-qa-framework update` detects existing install and offers quick-update

#### AC-1.3: Interactive Installer (`bin/installer.mjs`)
The installer follows bmad-method's interactive flow:

**Step 1 — Welcome**
- [ ] Prints ASCII banner with framework name and version
- [ ] Detects if already installed (looks for `.ai-qa-framework/` or `ai-qa-framework/config.yaml`)
- [ ] If already installed → offers "Quick Update" or "Modify Install"

**Step 2 — Installation Directory**
- [ ] Prompts: "Where should the framework be installed?" (default: `./ai-qa-framework/`)
- [ ] Accepts `--directory <path>` flag to skip prompt

**Step 3 — Project Configuration**
- [ ] Prompts for `project_name` (default: reads from `package.json` name or folder name)
- [ ] Prompts for `user_name` (default: reads from `git config user.name`)
- [ ] Prompts for `communication_language` (default: English)
- [ ] Prompts for `reporting_language` (default: English; offer Arabic as option)
- [ ] Prompts for `test_mode` (headed / headless — default: headed)

**Step 4 — AI Tool Integration**
- [ ] Shows checkbox list: Claude Code, Cursor, GitHub Copilot, Windsurf, Other
- [ ] For each selected tool, generates the correct config file:
  - Claude Code → `.claude/commands/` stubs
  - Cursor → `.cursorrules` stub
  - GitHub Copilot → `.github/copilot-instructions.md` stub

**Step 5 — Module Selection**
- [ ] Shows checkbox list of optional modules:
  - `core` (always installed — orchestrator, detectors, adapters)
  - `e2e-playwright` (Playwright test generation + execution)
  - `test-cases-xlsx` (Arabic/English XLSX test case generation)
  - `security-scan` (OWASP security validation)
  - `accessibility-scan` (axe-core a11y audit)
  - `regression-testing` (baseline diff testing)

**Step 6 — Install**
- [ ] Copies selected framework files from `node_modules/ai-qa-framework/` (the bundled source) into the user's chosen target directory
- [ ] Does NOT modify the host project's `package.json` — framework is self-contained
- [ ] Runs `npm install` inside the installed framework directory for its own dependencies
- [ ] Runs `npx playwright install chromium` for browser
- [ ] Writes `config.yaml` with user answers
- [ ] Writes `_config/manifest.yaml` recording installed version, modules, and install timestamp
- [ ] Prints post-install instructions

#### AC-1.4: Non-Interactive Flags
- [ ] `--yes` / `-y`: Accept all defaults, skip all prompts
- [ ] `--modules <list>`: Comma-separated module IDs (e.g., `--modules core,e2e-playwright`)
- [ ] `--tools <list>`: AI tool IDs (e.g., `--tools claude-code,cursor`)
- [ ] `--directory <path>`: Install target path
- [ ] `--language <code>`: Set both communication and reporting language
- [ ] `--reporting-language <code>`: Override reporting language only
- [ ] `--version`: Print installed framework version

### Tasks

| # | Task | File(s) |
|---|---|---|
| 1.0 | Check npm name availability: `npm info ai-qa-framework` | — |
| 1.1 | Update `package.json` for npm publication | `package.json` |
| 1.2 | Delete `setup/bootstrap.ps1` and `setup/bootstrap.sh` (replaced by new CLI) | `setup/` |
| 1.3 | Create CLI entry point | `bin/cli.mjs` |
| 1.4 | Create interactive installer | `bin/installer.mjs` |
| 1.5 | Create installer utilities (prompts, file copy, progress) | `bin/utils/prompts.mjs`, `bin/utils/copy.mjs` |
| 1.6 | Create post-install instructions printer | `bin/utils/post-install.mjs` |
| 1.7 | Add `--help` text with all flags | `bin/cli.mjs` |
| 1.8 | Test `npx .` locally before publishing | local test |

---

## Epic 2 — Framework De-coupling (Remove Project-Specific Config)

### Story Statement

**As** a new user installing the framework,  
**I want** the framework to have no pre-existing project data from another project (WhatsAppCampPro),  
**So that** I get a clean, blank slate that the auto-detector will fill in for MY project.

### Acceptance Criteria

#### AC-2.1: Clean Default Config
- [ ] `config.yaml` ships with generic placeholder values (not WhatsAppCampPro data):
  ```yaml
  project_name: "MyProject"
  user_name: "Your Name"
  ```
- [ ] Installer overwrites `config.yaml` with user's actual answers

#### AC-2.2: Clean Project Detection Cache
- [ ] `core/project.config.json` is NOT shipped in the npm package (added to `.npmignore`)
- [ ] `core/project.config.json` is added to `.gitignore` (it's generated at runtime per project)
- [ ] The auto-detector regenerates it fresh on first run in any new project

#### AC-2.3: Clean Memory
- [ ] `_memory/qae-sidecar/qa-history.md` ships empty (no WhatsAppCampPro history)
- [ ] `_memory/qae-sidecar/qa-preferences.md` ships with generic defaults

#### AC-2.4: Clean TestResult
- [ ] `TestResult/` directory is NOT shipped (added to `.npmignore` and `.gitignore`)
- [ ] Installer creates an empty `TestResult/.gitkeep` placeholder

### Tasks

| # | Task | File(s) |
|---|---|---|
| 2.1 | Reset `config.yaml` to generic defaults | `config.yaml` |
| 2.2 | Add `core/project.config.json` to `.gitignore` | `.gitignore` |
| 2.3 | Create `.npmignore` excluding generated/project-specific files | `.npmignore` |
| 2.4 | Reset `_memory/` files to blank/generic defaults | `_memory/**` |
| 2.5 | Remove `TestResult/` from git tracking | `.gitignore` |

---

## Epic 3 — GitHub Open-Source Repository Setup

### Story Statement

**As** a developer in the community,  
**I want** to find the AI-QA-Framework on GitHub with proper open-source conventions,  
**So that** I can contribute to it, report bugs, request features, and trust it as a serious project.

### Acceptance Criteria

#### AC-3.1: Repository Structure
- [ ] GitHub repository created at `https://github.com/afmelwekeel/AI-QA-Framework`
- [ ] Repository is set to **Public**
- [ ] Description: "Universal AI QA Automation Framework — install with `npx ai-qa-framework install`"
- [ ] Topics/tags: `qa`, `testing`, `playwright`, `ai`, `automation`, `npx`, `cli`, `bmad`

#### AC-3.2: License
- [ ] `LICENSE` file exists with **MIT License** (matching bmad-method's open-source approach)
- [ ] `package.json` has `"license": "MIT"`

#### AC-3.3: Git Ignore
- [ ] `.gitignore` excludes:
  - `node_modules/`
  - `TestResult/`
  - `core/project.config.json`
  - `*.log`
  - `.env`
  - `dist/`
  - `.vs/`
  - `_memory/qae-sidecar/qa-history.md` (project-specific history)

#### AC-3.4: Contributing Guide
- [ ] `CONTRIBUTING.md` file covers:
  - How to clone and run locally
  - How to add a new skill
  - How to add a new workflow
  - How to add a new project detector
  - PR template instructions
  - Code style notes
- [ ] `CHANGELOG.md` file exists with an initial entry for `v2.0.0` covering what the framework does
- [ ] Version bumping convention documented: patch for bug fixes, minor for new skills/workflows, major for breaking changes to the installer or config schema

#### AC-3.5: GitHub Issue Templates
- [ ] `.github/ISSUE_TEMPLATE/bug_report.md` — structured bug report template
- [ ] `.github/ISSUE_TEMPLATE/feature_request.md` — feature request template
- [ ] `.github/ISSUE_TEMPLATE/skill_request.md` — request a new QA skill

#### AC-3.6: PR Template
- [ ] `.github/PULL_REQUEST_TEMPLATE.md` covering:
  - Type of change (skill / workflow / detector / docs / fix)
  - Checklist (tests pass, skill.json updated, README updated)

#### AC-3.7: GitHub Actions CI
- [ ] `.github/workflows/ci.yml` runs on every PR:
  - `node --version` check (must be ≥ 18)
  - `npm install`
  - `npm run detect` on a dummy project
  - Basic smoke test for installer
- [ ] `.github/workflows/publish.yml` publishes to npm on version tag push (`v*`)

#### AC-3.8: README for Open Source
- [ ] `README.md` rewritten with open-source sections:
  - **Hero section**: name, description, install command in a code block
  - **What it does**: 7-phase pipeline with a simple diagram
  - **Quick Start**: 3-step install + first run
  - **Commands reference**: table of all commands
  - **Configuration**: `config.yaml` reference
  - **Modules**: list of optional modules
  - **AI Tool Integration**: Claude Code, Cursor, Copilot setup
  - **Architecture**: folder map
  - **Contributing**: link to CONTRIBUTING.md
  - **License**: MIT badge

### Tasks

| # | Task | File(s) |
|---|---|---|
| 3.1 | Create GitHub repository (manual step — guide below) | GitHub.com |
| 3.2 | Create `LICENSE` (MIT) | `LICENSE` |
| 3.3 | Create/update `.gitignore` | `.gitignore` |
| 3.4 | Create `CONTRIBUTING.md` | `CONTRIBUTING.md` |
| 3.5 | Create GitHub issue templates | `.github/ISSUE_TEMPLATE/` |
| 3.6 | Create PR template | `.github/PULL_REQUEST_TEMPLATE.md` |
| 3.7 | Create CI workflow | `.github/workflows/ci.yml` |
| 3.8 | Create publish workflow | `.github/workflows/publish.yml` |
| 3.9 | Rewrite `README.md` for open-source audience | `README.md` |

---

## Epic 4 — NPM Package Publication

### Story Statement

**As** a developer,  
**I want** to install the framework with `npx ai-qa-framework install` without cloning anything,  
**So that** I get up and running in 30 seconds from a single command.

### Acceptance Criteria

#### AC-4.1: Package Registry
- [ ] Package published to npm as `ai-qa-framework`
- [ ] Package is public (`"publishConfig": { "access": "public" }`)
- [ ] Version follows semantic versioning starting at `2.0.0`
- [ ] `npm info ai-qa-framework` returns correct package details

#### AC-4.2: Package Contents (via `"files"` whitelist)
Published package includes ONLY:
- [ ] `bin/` — CLI entry points
- [ ] `core/` — orchestrator, autonomous-loop (NOT project.config.json)
- [ ] `agents/` — qae.md persona
- [ ] `skills/` — all 11 skills (skill.json + prompt.md + run.mjs)
- [ ] `workflows/` — all workflow YAML + XML
- [ ] `templates/` — report + test case templates
- [ ] `rules/` — quality gates + selectors
- [ ] `adapters/` — stack-specific adapters
- [ ] `project-detectors/` — detection modules
- [ ] `reusable-prompts/` — shared prompts
- [ ] `commands/registry.yaml`
- [ ] `_config/` — manifests (NOT _memory/)
- [ ] `config.yaml` — generic default config
- [ ] `playwright.config.js`
- [ ] `package.json`
- [ ] `README.md`
- [ ] `LICENSE`

#### AC-4.3: npmignore (exclusions)
- [ ] `.npmignore` excludes: `TestResult/`, `_memory/`, `core/project.config.json`, `.vs/`, `node_modules/`, `.github/`, `test-cases/`, `test-data/`, `traces/`, `*.md` (except README + LICENSE)

#### AC-4.4: Automated Publish (CI)
- [ ] GitHub Action publishes to npm automatically when a git tag like `v2.1.0` is pushed
- [ ] Uses `NPM_TOKEN` secret stored in GitHub repository settings

### Tasks

| # | Task | File(s) |
|---|---|---|
| 4.1 | Create npm account or use existing | npmjs.com |
| 4.2 | Update `package.json` with all publication metadata | `package.json` |
| 4.3 | Create `.npmignore` | `.npmignore` |
| 4.4 | Test local publish with `npm pack` (inspect the tarball) | local |
| 4.5 | Publish first version: `npm publish --access public` | npm |
| 4.6 | Create publish GitHub Action | `.github/workflows/publish.yml` |

---

## Epic 5 — Documentation Website (Optional / Phase 2)

### Story Statement

**As** a potential user,  
**I want** a documentation website for the framework,  
**So that** I can learn how to use it without reading raw markdown files on GitHub.

### Acceptance Criteria

#### AC-5.1: Documentation Site
- [ ] Docs site hosted on GitHub Pages (free, no external account needed)
- [ ] Built with **VitePress** (lighter than Docusaurus, ES module native — matches the framework's Node.js ESM style)
- [ ] Sections: Getting Started, Commands, Configuration, Skills Reference, Workflows, Contributing
- [ ] Decision deferred: tool choice (VitePress) is locked but implementation is Phase 2

#### AC-5.2: Automatic Deployment
- [ ] GitHub Action deploys docs on push to `main`

> **Note:** This epic is Phase 2 — complete Epics 1-4 first.

---

## Implementation Order (Recommended)

```
Phase 1 (Foundation — do this first):
  Epic 2: De-couple framework from WhatsAppCampPro
  Epic 3.2-3.3: Create LICENSE + .gitignore

Phase 2 (GitHub Setup):
  Epic 3.1: Create GitHub repo
  Epic 3.4-3.6: CONTRIBUTING.md + issue templates + PR template
  Epic 3.9: Rewrite README.md

Phase 3 (NPX Installer):
  Epic 1: Build bin/cli.mjs + bin/installer.mjs
  Epic 4.2-4.3: Update package.json + .npmignore

Phase 4 (Publish):
  Epic 4.4: Test with npm pack
  Epic 4.5: Publish to npm
  Epic 3.7-3.8: Set up CI/CD GitHub Actions

Phase 5 (Optional):
  Epic 5: Documentation website
```

---

## GitHub Setup Guide (Step-by-Step for Ahmed)

### Step 1: Create the Repository

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `ai-qa-framework`
3. Description: `Universal AI QA Automation Framework — install with npx ai-qa-framework install`
4. Visibility: **Public**
5. Do NOT initialize with README (you already have one)
6. Click **Create repository**

### Step 2: Push Local Code to GitHub

Run these commands from `C:\Hard\Projects\AI-QA-Framework`:

```powershell
# Initialize git (already done — repo exists)
git init

# Add all files (after .gitignore is in place)
git add .

# First commit
git commit -m "feat: initial open-source release of AI-QA-Framework v2.0.0"

# Add GitHub remote
git remote add origin https://github.com/afmelwekeel/AI-QA-Framework.git

# Push to GitHub
git push -u origin main
```

### Step 3: Set Up npm Token for Auto-Publish

1. Go to [npmjs.com](https://www.npmjs.com) → create account or log in
2. Go to **Access Tokens** → Generate new token (Automation type)
3. Copy the token
4. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
5. Add secret: Name = `NPM_TOKEN`, Value = paste your npm token

### Step 4: Publish First Version Manually

```powershell
npm login          # log in to npm
npm pack           # inspect the tarball first
npm publish --access public   # publish!
```

### Step 5: Test Installation

```powershell
# In a NEW empty folder
mkdir test-install && cd test-install
npx ai-qa-framework install
```

---

## Definition of Done

- [ ] `npx ai-qa-framework install` runs successfully in a blank folder
- [ ] Interactive prompts ask for project name, user, language, test mode, AI tools
- [ ] Framework files are copied to target directory
- [ ] `config.yaml` is written with user's answers
- [ ] `npm run detect` works after install
- [ ] GitHub repository is public and has: LICENSE, README, CONTRIBUTING, issue templates, CI workflow
- [ ] Package is published on npm as `ai-qa-framework`
- [ ] No WhatsAppCampPro-specific data ships in the package
- [ ] CI passes on every PR (install smoke test)

---

## Notes

- **Package name check is a blocking prerequisite** — run `npm info ai-qa-framework` before starting Epic 1. If taken, fallback is `@afmelwekeel/ai-qa-framework` (scoped) → install command becomes `npx @afmelwekeel/ai-qa-framework install`
- `setup/bootstrap.ps1` and `setup/bootstrap.sh` are deleted in Task 1.2 — they are fully replaced by `bin/installer.mjs`
- The installer uses Node.js built-in `readline` for prompts — no third-party dependencies, keeping the installer itself lean
- The installer must work with Node.js ≥ 18 (uses native `fetch`, top-level `await`, ES modules)
- Installer copies files from `node_modules/ai-qa-framework/` (the bundled package source) — no internet needed after `npx` downloads it
- The host project's `package.json` is never modified — the framework is entirely self-contained in its installed subdirectory
- GitHub repo: `https://github.com/afmelwekeel/AI-QA-Framework`
- Docs site (Phase 2): VitePress on GitHub Pages
- Match the BMAD Method's UX pattern closely so users familiar with BMAD feel at home immediately

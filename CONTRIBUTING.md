# Contributing to AI-QA-Framework

Thank you for your interest in contributing! This guide covers everything you need to get started.

## Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [How to Add a New Skill](#how-to-add-a-new-skill)
- [How to Add a New Workflow](#how-to-add-a-new-workflow)
- [How to Add a Project Detector](#how-to-add-a-project-detector)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)

---

## Getting Started

```bash
# 1. Fork and clone
git clone https://github.com/afmelwekeel/AI-QA-Framework.git
cd AI-QA-Framework

# 2. Install dependencies
npm install
npx playwright install chromium

# 3. Run the detector to verify your setup
node ./core/orchestrator.mjs detect

# 4. Create a branch
git checkout -b feat/my-improvement
```

---

## Project Structure

```
bin/                  ← npx CLI entry point + installer
core/                 ← orchestrator.mjs (routes commands to skills)
skills/<name>/        ← each skill has: skill.json, prompt.md, run.mjs
workflows/<name>/     ← each workflow has: workflow.yaml, instructions.xml
project-detectors/    ← stack detection (frontend, backend, DB, auth, routes)
adapters/             ← stack-specific glue (Angular, .NET, React, etc.)
templates/            ← report/test-case output templates
rules/                ← quality gates and selector strategies
_config/              ← agent/skill/workflow manifests (CSV)
agents/               ← Rayan QA agent persona (qae.md)
```

---

## How to Add a New Skill

1. Create the folder: `skills/<your-skill-name>/`
2. Add three files:

**`skill.json`** — descriptor:
```json
{
  "id": "your-skill-name",
  "name": "Human Readable Name",
  "version": "1.0.0",
  "description": "What this skill does in one sentence.",
  "phase": 3,
  "inputs": [{ "name": "story", "required": false }],
  "outputs": [{ "type": "file", "path": "{output_folder}/{story-id}/..." }]
}
```

**`prompt.md`** — the AI prompt template:
```markdown
# Skill: Your Skill Name
Config source: {config_source}
Output folder: {output_folder}

## Instructions
...your prompt here...
```

**`run.mjs`** — the Node.js handler:
```js
export async function run(inputs, config) {
  // inputs: object from orchestrator
  // config: loaded config.yaml values
  return { success: true, artifacts: [] };
}
```

3. Register it in `commands/registry.yaml`:
```yaml
- id: your-skill-name
  skill: your-skill-name
  phase: 3
  description: What it does
  args: []
```

4. Add it to `_config/skill-manifest.csv`:
```
your-skill-name,Human Readable Name,What it does,3,skills/your-skill-name
```

---

## How to Add a New Workflow

1. Create the folder: `workflows/<your-workflow>/`
2. Add `workflow.yaml`:
```yaml
name: your-workflow
description: What this workflow does
config_source: "{project-root}/ai-qa-framework/config.yaml"
instructions: ./instructions.xml
```

3. Add `instructions.xml` with sequential steps:
```xml
<workflow>
  <step id="1">
    <action>execute-skill</action>
    <skill>your-skill-name</skill>
  </step>
</workflow>
```

4. Register in `_config/workflow-manifest.csv`.

---

## How to Add a Project Detector

Detectors live in `project-detectors/`. Each exports a `detect(projectRoot)` function:

```js
// project-detectors/mytech.detector.mjs
export async function detect(projectRoot) {
  // scan files, return facts
  return { framework: 'mytech', version: '1.0', detected: true };
}
```

Register it in `project-detectors/index.mjs`.

---

## Pull Request Process

1. Branch name: `feat/...`, `fix/...`, `docs/...`, `chore/...`
2. Fill out the PR template completely
3. Ensure:
   - `node ./core/orchestrator.mjs detect` runs without errors
   - `skill.json` is updated if you added/changed a skill
   - `_config/skill-manifest.csv` is updated
   - README is updated if you added a user-facing feature
4. PRs require approval from `@afmelwekeel` (enforced by CODEOWNERS)

---

## Code Style

- **ES Modules only** — always use `import`/`export`, never `require()`
- **Node.js ≥ 18** — use native `fetch`, `readline/promises`, top-level `await`
- **No comments explaining what** — only add a comment if the WHY is non-obvious
- **No unused variables** — clean up before submitting
- **Filenames** — kebab-case for files, camelCase for exported functions

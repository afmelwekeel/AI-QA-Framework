import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Run /aiqa-init for each selected tool.
 * Creates agent + prompt files in the correct folder per tool:
 *   github-copilot → .github/agents/  + .github/prompts/
 *   claude-code    → .claude/commands/
 *   cursor         → .cursor/rules/
 *   windsurf       → .windsurf/rules/
 *
 * Always creates the .github/ files as the universal baseline.
 * Skips any file that already exists (safe to re-run).
 */
export function runInit(installDir, tools = []) {
  const root = process.cwd();
  const results = [];

  writeFiles(root, buildGithubFiles(installDir), results);
  if (tools.includes('claude-code')) writeFiles(root, buildClaudeFiles(installDir), results);
  if (tools.includes('cursor'))      writeFiles(root, buildCursorFiles(installDir), results);
  if (tools.includes('windsurf'))    writeFiles(root, buildWindsurfFiles(installDir), results);

  return results;
}

function writeFiles(root, files, results) {
  for (const { path, content } of files) {
    const fullPath = join(root, path);
    mkdirSync(join(fullPath, '..'), { recursive: true });
    if (existsSync(fullPath)) {
      results.push({ path, status: 'skipped' });
    } else {
      writeFileSync(fullPath, content, 'utf8');
      results.push({ path, status: 'created' });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// Command catalogue — the framework has 3 prompts + setup + fullworkflow.
// ─────────────────────────────────────────────────────────────────────
const COMMANDS = [
  { name: 'aiqa-help', desc: 'Show the Rayan command menu', steps: (fw) => `
3. Display Rayan's welcome greeting and command menu exactly as defined in the agent file
4. Show current configuration summary: project, language, app URL, browser mode, output folder, min pass rate
5. Wait for user input` },

  { name: 'aiqa-setup', desc: 'One-time setup: stack, test users, EXECUTION-GUIDE, INDEX, DATABASE-TABLES', steps: (fw) => `
3. Load and execute the workflow at {project-root}/${fw}/workflows/setup/workflow.yaml
4. Follow skills/project-setup/prompt.md. Read-only on the app and database
5. Show the filled EXECUTION-GUIDE.md and WAIT for the user to confirm it` },

  { name: 'aiqa-writetestcases', desc: 'Prompt 2 — story file → test-case Markdown files (one per screen)', steps: (fw) => `
3. Load and execute the workflow at {project-root}/${fw}/workflows/write-test-cases/workflow.yaml
4. Follow {project-root}/${fw}/reusable-prompts/write-test-cases.prompt.md exactly
5. Story file path(s) = the command argument; if none, ask. Several files of one feature → one story folder
6. Output Markdown only to {output_folder}/test-cases/<story-folder>/. No XLSX, no spec files` },

  { name: 'aiqa-executetests', desc: 'Prompt 1 — run one test-case file with Playwright MCP (browser visible)', steps: (fw) => `
3. Load and execute the workflow at {project-root}/${fw}/workflows/execute-tests/workflow.yaml
4. Follow {project-root}/${fw}/reusable-prompts/execute-tests.prompt.md exactly
5. Test file = the command argument; if none, list files with status from INDEX.md and ask
6. Browser: VISIBLE (headed) by default. Headless only if the user passed --headless or said so. Never choose headless yourself
7. --summary → run the final restore check and write test-results/SUMMARY.md instead
8. One test file per run. Stop after the summary` },

  { name: 'aiqa-fixbug', desc: 'Prompt 3 — reproduce, fix, verify, commit one bug', steps: (fw) => `
3. Load and execute the workflow at {project-root}/${fw}/workflows/fix-bug/workflow.yaml
4. Follow {project-root}/${fw}/reusable-prompts/fix-bug.prompt.md exactly
5. Bug file = the command argument; if none, list Open bugs from BUGS-INDEX.md and ask
6. Reproduce first. Smallest fix. Verify with build + tests + repro. One bug per run` },

  { name: 'aiqa-fullworkflow', desc: 'Chain write → execute → bugs → fix → summary', steps: (fw) => `
3. Load and execute the workflow at {project-root}/${fw}/workflows/full-workflow/workflow.yaml
4. Story file(s) = the command argument; if none, ask
5. Confirm with the user between prompts; browser visible unless the user asked for headless` },

  { name: 'aiqa-listskills', desc: 'List available skills', steps: (fw) => `
3. Read {project-root}/${fw}/_config/skill-manifest.csv
4. Display: Skill | Description | Command` },

  { name: 'aiqa-listworkflows', desc: 'List available workflows', steps: (fw) => `
3. Read {project-root}/${fw}/_config/workflow-manifest.csv
4. Display: Workflow | Description | /aiqa-* command` },

  { name: 'aiqa-reset', desc: 'Reset generated outputs (asks first)', steps: (fw) => `
3. Follow the "Framework Reset" section of {project-root}/${fw}/agents/qae-init.md` },
];

function header(fw) {
  return `1. Load {project-root}/${fw}/config.yaml and store ALL fields as session variables\n2. Load {project-root}/${fw}/agents/qae-compact.md for Rayan's persona and execution rules`;
}

function body(fw, cmd) {
  return `${header(fw)}${cmd.steps(fw)}`;
}

// ─────────────────────────────────────────────────────────────────────
// GitHub Copilot / VS Code — .github/agents/ + .github/prompts/
// ─────────────────────────────────────────────────────────────────────
function buildGithubFiles(fw) {
  const files = [{
    path: '.github/agents/ai-qa-framework-qae.agent.md',
    content: `---
description: 'Rayan — Senior AI QA Engineer: test cases from stories, live Playwright MCP execution (browser visible), bug reports, bug fixes'
tools: ['read', 'edit', 'search', 'execute']
---

You must fully embody this agent's persona and follow all activation instructions exactly as specified.

<agent-activation CRITICAL="TRUE">
1. LOAD the FULL agent file from {project-root}/${fw}/agents/qae.md
2. READ its entire contents - this contains the complete agent persona, menu, and instructions
3. FOLLOW every step in the <activation> section precisely
4. DISPLAY the welcome/greeting as instructed
5. PRESENT the numbered menu
6. WAIT for user input before proceeding
</agent-activation>
`,
  }];
  for (const c of COMMANDS) {
    files.push({
      path: `.github/prompts/${c.name}.prompt.md`,
      content: `---\ndescription: 'Rayan — ${c.desc}'\nagent: 'agent'\ntools: ['read', 'edit', 'search', 'execute']\n---\n${body(fw, c).trim()}\n`,
    });
  }
  return files;
}

// ─────────────────────────────────────────────────────────────────────
// Claude Code — .claude/commands/aiqa-*.md (slash commands)
// ─────────────────────────────────────────────────────────────────────
function buildClaudeFiles(fw) {
  const files = [{
    path: '.claude/commands/aiqa-init.md',
    content: `# /aiqa-init\nLoad ${fw}/agents/qae.md and activate Rayan the Senior AI QA Engineer.\nFollow all steps in the <activation> section of the agent file.\n`,
  }];
  for (const c of COMMANDS) {
    files.push({
      path: `.claude/commands/${c.name}.md`,
      content: `# /${c.name}\n${c.desc}\n\nArguments: $ARGUMENTS\n\n${body(fw, c).trim()}\n`,
    });
  }
  return files;
}

// ─────────────────────────────────────────────────────────────────────
// Cursor — .cursor/rules/aiqa-*.mdc
// ─────────────────────────────────────────────────────────────────────
function buildCursorFiles(fw) {
  return COMMANDS.map(c => ({
    path: `.cursor/rules/${c.name}.mdc`,
    content: `---\ndescription: 'Rayan — ${c.desc}'\nalwaysApply: false\n---\n\n${body(fw, c)}`,
  }));
}

// ─────────────────────────────────────────────────────────────────────
// Windsurf — .windsurf/rules/aiqa-*.md
// ─────────────────────────────────────────────────────────────────────
function buildWindsurfFiles(fw) {
  return COMMANDS.map(c => ({
    path: `.windsurf/rules/${c.name}.md`,
    content: body(fw, c),
  }));
}

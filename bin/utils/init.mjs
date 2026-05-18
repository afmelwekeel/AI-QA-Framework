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

  // ── Always: .github/agents/ + .github/prompts/ (Copilot + universal baseline)
  writeFiles(root, buildGithubFiles(installDir), results);

  // ── Claude Code: .claude/commands/aiqa-*.md (slash commands)
  if (tools.includes('claude-code')) {
    writeFiles(root, buildClaudeFiles(installDir), results);
  }

  // ── Cursor: .cursor/rules/aiqa-*.mdc
  if (tools.includes('cursor')) {
    writeFiles(root, buildCursorFiles(installDir), results);
  }

  // ── Windsurf: .windsurf/rules/aiqa-*.md
  if (tools.includes('windsurf')) {
    writeFiles(root, buildWindsurfFiles(installDir), results);
  }

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

// ─────────────────────────────────────────────────────────────────────────────
// GitHub Copilot / VS Code — .github/agents/ + .github/prompts/
// ─────────────────────────────────────────────────────────────────────────────
function buildGithubFiles(fw) {
  return [
    {
      path: '.github/agents/ai-qa-framework-qae.agent.md',
      content: `---
description: 'Rayan — Senior AI QA Engineer: story analysis, test case generation, E2E automation, bug triage, QA reporting, security scanning, accessibility validation'
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
    },
    {
      path: '.github/prompts/aiqa-help.prompt.md',
      content: promptFile(fw, 'Show full AI QA Framework command menu and quick-start guide', `
1. Load {project-root}/${fw}/config.yaml and store ALL fields as session variables
2. Load the full agent file from {project-root}/${fw}/agents/qae.md to establish Rayan's persona
3. Display Rayan's full welcome greeting and command menu exactly as defined in the agent file
4. Show current configuration summary: project, language, browser, output folder, min pass rate
5. Wait for user input`),
    },
    { path: '.github/prompts/aiqa-analyzestory.prompt.md',      content: analyzeStoryPrompt(fw, 'prompt') },
    { path: '.github/prompts/aiqa-analyzeproject.prompt.md',    content: analyzeProjectPrompt(fw, 'prompt') },
    { path: '.github/prompts/aiqa-generatetestcases.prompt.md', content: generateTestCasesPrompt(fw, 'prompt') },
    { path: '.github/prompts/aiqa-generatee2e.prompt.md',       content: generateE2EPrompt(fw, 'prompt') },
    { path: '.github/prompts/aiqa-generatetestdata.prompt.md',  content: generateTestDataPrompt(fw, 'prompt') },
    { path: '.github/prompts/aiqa-runtests.prompt.md',          content: runTestsPrompt(fw, 'prompt') },
    { path: '.github/prompts/aiqa-analyzebugs.prompt.md',       content: analyzeBugsPrompt(fw, 'prompt') },
    { path: '.github/prompts/aiqa-generatereport.prompt.md',    content: generateReportPrompt(fw, 'prompt') },
    { path: '.github/prompts/aiqa-fullworkflow.prompt.md',      content: fullWorkflowPrompt(fw, 'prompt') },
    { path: '.github/prompts/aiqa-fixbugs.prompt.md',           content: fixBugsPrompt(fw, 'prompt') },
    { path: '.github/prompts/aiqa-securityscan.prompt.md',      content: securityScanPrompt(fw, 'prompt') },
    { path: '.github/prompts/aiqa-accessibilityscan.prompt.md', content: accessibilityPrompt(fw, 'prompt') },
    { path: '.github/prompts/aiqa-regressiontest.prompt.md',    content: regressionTestPrompt(fw, 'prompt') },
    { path: '.github/prompts/aiqa-autorun.prompt.md',           content: autoRunPrompt(fw, 'prompt') },
    { path: '.github/prompts/aiqa-listskills.prompt.md',        content: listSkillsPrompt(fw, 'prompt') },
    { path: '.github/prompts/aiqa-listworkflows.prompt.md',     content: listWorkflowsPrompt(fw, 'prompt') },
    { path: '.github/prompts/aiqa-reset.prompt.md',             content: resetPrompt(fw, 'prompt') },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Claude Code — .claude/commands/aiqa-*.md (slash commands)
// ─────────────────────────────────────────────────────────────────────────────
function buildClaudeFiles(fw) {
  return [
    {
      path: '.claude/commands/aiqa-init.md',
      content: `# /aiqa-init
Load ${fw}/agents/qae.md and activate Rayan the Senior AI QA Engineer.
Follow all steps in the <activation> section of the agent file.`,
    },
    { path: '.claude/commands/aiqa-help.md',              content: claudeCmd('aiqa-help',              fw, 'Show the full Rayan QA command menu', analyzeStoryPrompt(fw, 'claude')) },
    { path: '.claude/commands/aiqa-analyzestory.md',      content: claudeCmd('aiqa-analyzestory',      fw, 'Analyze a user story — extract acceptance criteria, scenarios and risk', analyzeStoryPrompt(fw, 'claude')) },
    { path: '.claude/commands/aiqa-analyzeproject.md',    content: claudeCmd('aiqa-analyzeproject',    fw, 'Auto-detect project stack, URLs, auth flow', analyzeProjectPrompt(fw, 'claude')) },
    { path: '.claude/commands/aiqa-generatetestcases.md', content: claudeCmd('aiqa-generatetestcases', fw, 'Generate Arabic XLSX + MD test cases from a user story', generateTestCasesPrompt(fw, 'claude')) },
    { path: '.claude/commands/aiqa-generatee2e.md',       content: claudeCmd('aiqa-generatee2e',       fw, 'Generate Playwright E2E tests (POM)', generateE2EPrompt(fw, 'claude')) },
    { path: '.claude/commands/aiqa-generatetestdata.md',  content: claudeCmd('aiqa-generatetestdata',  fw, 'Generate JSON test data for all E2E suites', generateTestDataPrompt(fw, 'claude')) },
    { path: '.claude/commands/aiqa-runtests.md',          content: claudeCmd('aiqa-runtests',          fw, 'Run Playwright tests in headed browser', runTestsPrompt(fw, 'claude')) },
    { path: '.claude/commands/aiqa-analyzebugs.md',       content: claudeCmd('aiqa-analyzebugs',       fw, 'Triage test failures → generate Arabic bug reports', analyzeBugsPrompt(fw, 'claude')) },
    { path: '.claude/commands/aiqa-generatereport.md',    content: claudeCmd('aiqa-generatereport',    fw, 'Generate QA summary report (HTML + XLSX + MD)', generateReportPrompt(fw, 'claude')) },
    { path: '.claude/commands/aiqa-fullworkflow.md',      content: claudeCmd('aiqa-fullworkflow',      fw, 'Run the full 9-phase QA pipeline end-to-end', fullWorkflowPrompt(fw, 'claude')) },
    { path: '.claude/commands/aiqa-fixbugs.md',           content: claudeCmd('aiqa-fixbugs',           fw, 'Fix all open bugs in bug-reports/ and retest each one', fixBugsPrompt(fw, 'claude')) },
    { path: '.claude/commands/aiqa-securityscan.md',      content: claudeCmd('aiqa-securityscan',      fw, 'OWASP-style security scan', securityScanPrompt(fw, 'claude')) },
    { path: '.claude/commands/aiqa-accessibilityscan.md', content: claudeCmd('aiqa-accessibilityscan', fw, 'WCAG 2.1 AA accessibility audit', accessibilityPrompt(fw, 'claude')) },
    { path: '.claude/commands/aiqa-regressiontest.md',    content: claudeCmd('aiqa-regressiontest',    fw, 'Re-run @regression suite and diff against baseline', regressionTestPrompt(fw, 'claude')) },
    { path: '.claude/commands/aiqa-autorun.md',           content: claudeCmd('aiqa-autorun',           fw, 'Run full autonomous QA loop without human input', autoRunPrompt(fw, 'claude')) },
    { path: '.claude/commands/aiqa-listskills.md',        content: claudeCmd('aiqa-listskills',        fw, 'List all available QA skills', listSkillsPrompt(fw, 'claude')) },
    { path: '.claude/commands/aiqa-listworkflows.md',     content: claudeCmd('aiqa-listworkflows',     fw, 'List all available QA workflows', listWorkflowsPrompt(fw, 'claude')) },
    { path: '.claude/commands/aiqa-reset.md',             content: claudeCmd('aiqa-reset',             fw, 'Reset all test outputs for a fresh cycle', resetPrompt(fw, 'claude')) },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Cursor — .cursor/rules/aiqa-*.mdc
// ─────────────────────────────────────────────────────────────────────────────
function buildCursorFiles(fw) {
  const commands = [
    { name: 'aiqa-analyzestory',      desc: 'Analyze user story',                  body: analyzeStoryPrompt(fw, 'cursor') },
    { name: 'aiqa-analyzeproject',    desc: 'Auto-detect project stack',            body: analyzeProjectPrompt(fw, 'cursor') },
    { name: 'aiqa-generatetestcases', desc: 'Generate Arabic XLSX test cases',      body: generateTestCasesPrompt(fw, 'cursor') },
    { name: 'aiqa-generatee2e',       desc: 'Generate Playwright tests',            body: generateE2EPrompt(fw, 'cursor') },
    { name: 'aiqa-generatetestdata',  desc: 'Generate JSON test data',              body: generateTestDataPrompt(fw, 'cursor') },
    { name: 'aiqa-runtests',          desc: 'Run Playwright tests',                 body: runTestsPrompt(fw, 'cursor') },
    { name: 'aiqa-analyzebugs',       desc: 'Triage failures → bug reports',        body: analyzeBugsPrompt(fw, 'cursor') },
    { name: 'aiqa-generatereport',    desc: 'Generate QA report',                   body: generateReportPrompt(fw, 'cursor') },
    { name: 'aiqa-fullworkflow',      desc: 'Full 9-phase QA pipeline',             body: fullWorkflowPrompt(fw, 'cursor') },
    { name: 'aiqa-fixbugs',           desc: 'Fix bugs and retest each',             body: fixBugsPrompt(fw, 'cursor') },
    { name: 'aiqa-securityscan',      desc: 'OWASP security scan',                  body: securityScanPrompt(fw, 'cursor') },
    { name: 'aiqa-accessibilityscan', desc: 'Accessibility audit',                  body: accessibilityPrompt(fw, 'cursor') },
    { name: 'aiqa-regressiontest',    desc: 'Regression test and diff baseline',    body: regressionTestPrompt(fw, 'cursor') },
    { name: 'aiqa-autorun',           desc: 'Autonomous QA loop',                   body: autoRunPrompt(fw, 'cursor') },
  ];
  return commands.map(c => ({
    path: `.cursor/rules/${c.name}.mdc`,
    content: `---
description: 'Rayan — ${c.desc}'
alwaysApply: false
---

${c.body}`,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Windsurf — .windsurf/rules/aiqa-*.md
// ─────────────────────────────────────────────────────────────────────────────
function buildWindsurfFiles(fw) {
  const commands = [
    { name: 'aiqa-analyzestory',      body: analyzeStoryPrompt(fw, 'windsurf') },
    { name: 'aiqa-analyzeproject',    body: analyzeProjectPrompt(fw, 'windsurf') },
    { name: 'aiqa-generatetestcases', body: generateTestCasesPrompt(fw, 'windsurf') },
    { name: 'aiqa-generatee2e',       body: generateE2EPrompt(fw, 'windsurf') },
    { name: 'aiqa-generatetestdata',  body: generateTestDataPrompt(fw, 'windsurf') },
    { name: 'aiqa-runtests',          body: runTestsPrompt(fw, 'windsurf') },
    { name: 'aiqa-analyzebugs',       body: analyzeBugsPrompt(fw, 'windsurf') },
    { name: 'aiqa-generatereport',    body: generateReportPrompt(fw, 'windsurf') },
    { name: 'aiqa-fullworkflow',      body: fullWorkflowPrompt(fw, 'windsurf') },
    { name: 'aiqa-fixbugs',           body: fixBugsPrompt(fw, 'windsurf') },
    { name: 'aiqa-securityscan',      body: securityScanPrompt(fw, 'windsurf') },
    { name: 'aiqa-accessibilityscan', body: accessibilityPrompt(fw, 'windsurf') },
    { name: 'aiqa-regressiontest',    body: regressionTestPrompt(fw, 'windsurf') },
    { name: 'aiqa-autorun',           body: autoRunPrompt(fw, 'windsurf') },
  ];
  return commands.map(c => ({
    path: `.windsurf/rules/${c.name}.md`,
    content: c.body,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

function header(fw) {
  return `1. Load {project-root}/${fw}/config.yaml and store ALL fields as session variables\n2. Load the full agent file from {project-root}/${fw}/agents/qae.md to establish Rayan's persona`;
}

/** Reference a skill's prompt.md as the authoritative instruction source. */
function skillRef(fw, skillId) {
  return `3. Load and read the skill file from {project-root}/${fw}/skills/${skillId}/prompt.md\n4. Follow ALL instructions in the skill file precisely`;
}

function promptFile(fw, description, steps) {
  return `---\ndescription: 'Rayan — ${description}'\nagent: 'agent'\ntools: ['read', 'edit', 'search', 'execute']\n---\n${steps.trim()}\n`;
}

function claudeCmd(name, fw, description, steps) {
  return `# /${name}\n${description}\n\n${steps.trim()}\n`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt builders — one per skill/workflow command
// ─────────────────────────────────────────────────────────────────────────────

function analyzeStoryPrompt(fw, _) {
  return `${header(fw)}
${skillRef(fw, 'user-story-analysis')}
5. Load and execute the workflow at {project-root}/${fw}/workflows/analyze-story/
6. If a story file path was provided as an argument, use it directly; otherwise ask the user for the story file path
7. Output acceptance criteria, test scenarios, edge cases, and risk assessment`;
}

function analyzeProjectPrompt(fw, _) {
  return `${header(fw)}
${skillRef(fw, 'project-analysis')}
5. Load and execute the workflow at {project-root}/${fw}/workflows/analyze-project/
6. Follow ALL steps — detect frontend framework, backend stack, database, auth flow, base URLs, API endpoints
7. Save results to {project-root}/${fw}/core/project.config.json
8. Display a summary of all detected project properties`;
}

function generateTestCasesPrompt(fw, _) {
  return `${header(fw)}
${skillRef(fw, 'test-case-generation')}
5. If a story file path was provided as an argument, use it directly; otherwise ask the user for the story file path
6. Generate Arabic XLSX + MD test cases covering: positive, negative, edge, security, permission scenarios
7. Output to {output_folder}/{story-id}/test-cases/`;
}

function generateE2EPrompt(fw, _) {
  return `${header(fw)}
${skillRef(fw, 'playwright-generation')}
5. Load and execute the workflow at {project-root}/${fw}/workflows/generate-e2e/
6. If a story file path was provided as an argument, use it directly; otherwise ask the user for the story file path
7. Generate JavaScript Playwright POM + spec files → output to {output_folder}/{story-id}/e2e/`;
}

function generateTestDataPrompt(fw, _) {
  return `${header(fw)}
${skillRef(fw, 'test-data-generation')}
5. Generate JSON test data for each E2E suite — valid inputs, boundary values, security payloads, role credentials
6. Output to {output_folder}/{story-id}/test-data/`;
}

function runTestsPrompt(fw, _) {
  return `${header(fw)}
${skillRef(fw, 'test-execution')}
5. Execute: node {project-root}/${fw}/core/orchestrator.mjs run-tests
6. Monitor execution — capture screenshots, videos, console errors, and network errors
7. Report pass/fail summary and flag any failures for bug analysis
8. If pass rate is below {min_pass_rate}%, automatically suggest running /aiqa-analyzebugs then /aiqa-generatereport`;
}

function analyzeBugsPrompt(fw, _) {
  return `${header(fw)}
${skillRef(fw, 'bug-analysis')}
5. Read test failure output from {output_folder}/{story-id}/
6. For every failed test generate a Markdown bug report with: Bug ID, title, steps, actual vs expected, severity, priority, attachments, root cause, suggested fix
7. Save reports to {output_folder}/{story-id}/bug-reports/`;
}

function generateReportPrompt(fw, _) {
  return `${header(fw)}
${skillRef(fw, 'qa-reporting')}
5. Load and execute the workflow at {project-root}/${fw}/workflows/generate-report/
6. Generate HTML dashboard + XLSX + MD report in {reporting_language}
7. Output artifacts to {output_folder}/{story-id}/reports/
8. Display a summary of the report location and key metrics`;
}

function fullWorkflowPrompt(fw, _) {
  return `${header(fw)}
${skillRef(fw, 'full-workflow')}
5. Load and execute the workflow at {project-root}/${fw}/workflows/full-workflow/
6. If a story file path was provided as an argument, use it directly; otherwise ask the user for the story file path
7. Execute all 9 phases in order:
   Phase 0: Project Analysis — auto-detect stack, URLs, auth
   Phase 1: Story Analysis — extract AC, scenarios, edge cases
   Phase 2: Test Case Generation — XLSX + MD → /test-cases/
   Phase 3: E2E Generation — JS Playwright POM + specs → /e2e/
   Phase 4: Test Data Generation — JSON per suite → /test-data/
   Phase 5: Test Execution — headed browser, slowMo 60ms (Playwright retries each test ONCE automatically; if still failing → log bug and move on — do NOT retry the suite)
   Phase 6: Bug Analysis — triage failures → /bug-reports/
   Phase 7: QA Reporting — HTML + XLSX + MD → /reports/
   Phase 8: Bug Fixing — read each bug report, fix source code, retest that single test (one fix attempt per bug — if still failing mark ❌ and move on)
8. Report final pass rate vs {min_pass_rate}% quality gate`;
}

function fixBugsPrompt(fw, _) {
  return `${header(fw)}
${skillRef(fw, 'bug-fixing')}
5. Read all open bug reports from {output_folder}/bug-reports/ (files matching BUG-XXXX.md)
6. For EACH bug, one at a time:
   a. Read the bug report — extract test name, error message, stack trace, spec/module file
   b. Read the failing spec file and any page objects or source files referenced in the trace
   c. Identify the root cause — wrong selector, wrong assertion, app bug, or test data issue
   d. Apply the MINIMAL fix to the correct file (spec, page object, or app source)
   e. Retest ONLY this single test: npx playwright test --headed --grep "EXACT TEST NAME"
   f. If exit code = 0 → append ✅ تم الإصلاح block to the bug report
   g. If exit code ≠ 0 → append ❌ لا يزال فاشلاً block with description of what was tried — then move on
   RULE: one fix attempt per bug. No retrying failed fixes.
7. After all bugs processed, print a summary table: Bug ID | Fix Applied | Retest Result
8. Run /aiqa-generatereport to update the QA dashboard with fix statuses`;
}

function securityScanPrompt(fw, _) {
  return `${header(fw)}
${skillRef(fw, 'security-validation')}
5. Execute OWASP Top 10 security checks: XSS payloads, SQL injection, auth bypass, CSRF validation, header checks
6. Generate a security report in {reporting_language} → {output_folder}/security-report/
7. Flag any CRITICAL or HIGH severity findings immediately`;
}

function accessibilityPrompt(fw, _) {
  return `${header(fw)}
${skillRef(fw, 'accessibility-validation')}
5. Run @axe-core/playwright against each detected page
6. Run WCAG 2.1 AA audit: keyboard navigation, ARIA labels, color contrast, alt text, form labels, semantic HTML
7. Generate an a11y report in {reporting_language} → {output_folder}/accessibility-report/
8. List violations by severity: Critical → Serious → Moderate → Minor`;
}

function regressionTestPrompt(fw, _) {
  return `${header(fw)}
${skillRef(fw, 'regression-testing')}
5. Re-run the @regression tagged Playwright suite
6. Diff results against {output_folder}/reports/baseline.json
7. Emit {output_folder}/reports/regression-diff.md highlighting newly failing tests
8. Flag any test that passed before but now fails`;
}

function autoRunPrompt(fw, _) {
  return `${header(fw)}
${skillRef(fw, 'autonomous-testing')}
5. Run all QA phases autonomously without human intervention:
   1. analyze-project
   2. user-story-analysis (for each story in {implementation_artifacts}/)
   3. test-case-generation
   4. playwright-generation
   5. test-execution (headed)
   6. bug-analysis
   7. qa-reporting
6. Stop early and report if any phase fails critically
7. Print a final autonomous run summary`;
}

function listSkillsPrompt(fw, _) {
  return `${header(fw)}
3. Read {project-root}/${fw}/_config/skill-manifest.csv
4. Display all available skills in a formatted table: Skill Name | Description | Phase | Output
5. Group by phase order (Phase 0 → Phase 8, then extras)`;
}

function listWorkflowsPrompt(fw, _) {
  return `${header(fw)}
3. Read {project-root}/${fw}/_config/workflow-manifest.csv
4. Display all available workflows: Workflow | Description | Phases | CLI Command | /aiqa-* command`;
}

function resetPrompt(fw, _) {
  return `${header(fw)}
3. Follow the reset-framework prompt handler defined in the agent file`;
}

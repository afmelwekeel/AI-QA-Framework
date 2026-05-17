import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ask, select, checkbox, section, ok, info, warn, closeRL } from './utils/prompts.mjs';
import { copyFramework, writeConfig, writeManifest, writeToolStubs } from './utils/copy.mjs';
import { printPostInstall } from './utils/post-install.mjs';

const PKG_ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const { version } = JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf8'));

const BANNER = `
╔═══════════════════════════════════════════════════════════╗
║           AI-QA-Framework  v${version.padEnd(29)}║
║     Universal AI QA Automation — npx ai-qa-framework      ║
║     https://github.com/afmelwekeel/AI-QA-Framework        ║
╚═══════════════════════════════════════════════════════════╝`;

const MODULES = [
  { id: 'core',               label: 'Core',               required: true,  description: 'Orchestrator, detectors, adapters, Rayan agent' },
  { id: 'e2e-playwright',     label: 'E2E Playwright',      default: true,   description: 'Generate and run Playwright Page Object tests' },
  { id: 'test-cases-xlsx',   label: 'Test Cases XLSX',     default: true,   description: 'Generate structured XLSX test cases from user stories' },
  { id: 'security-scan',     label: 'Security Scan',       default: false,  description: 'OWASP-style security validation' },
  { id: 'accessibility-scan',label: 'Accessibility Scan',  default: false,  description: 'axe-core a11y audit' },
  { id: 'regression-testing',label: 'Regression Testing',  default: false,  description: 'Baseline diff testing against previous runs' },
];

const TOOLS = [
  { id: 'claude-code', label: 'Claude Code',     description: 'Adds .claude/commands/qa.md' },
  { id: 'cursor',      label: 'Cursor',          description: 'Adds .cursorrules stub' },
  { id: 'copilot',     label: 'GitHub Copilot',  description: 'Adds .github/copilot-instructions.md' },
  { id: 'windsurf',    label: 'Windsurf',         description: 'Manual — reference agents/qae.md' },
  { id: 'none',        label: 'None / Other',     description: 'Skip tool integration stubs' },
];

const LANGUAGES = [
  { id: 'English', label: 'English (en)' },
  { id: 'Arabic',  label: 'Arabic (ar)' },
  { id: 'French',  label: 'French (fr)' },
  { id: 'Spanish', label: 'Spanish (es)' },
];

const REPORTING_CODES = { English: 'en', Arabic: 'ar', French: 'fr', Spanish: 'es' };

export async function runInstall(flags = {}) {
  console.log(BANNER);

  // ── Detect existing install ─────────────────────────────────────────────────
  const defaultDir = 'ai-qa-framework';
  const existingDirs = [defaultDir, 'AI-QA-Framework', 'ai-qa-framework'].filter(d => existsSync(join(process.cwd(), d, 'config.yaml')));

  if (existingDirs.length > 0 && !flags.yes) {
    warn(`Existing installation detected at: ./${existingDirs[0]}/`);
    const action = await select('What would you like to do?', [
      { label: 'Quick Update — refresh files, keep your config.yaml', id: 'update' },
      { label: 'Modify Install — change modules, tools, or directory', id: 'modify' },
      { label: 'Fresh Install — overwrite everything',                 id: 'fresh' },
    ]);
    if (action.label.startsWith('Quick Update')) {
      return runQuickUpdate(existingDirs[0]);
    }
  }

  // ── Step 1: Install directory ───────────────────────────────────────────────
  section('Step 1 of 5 — Installation Directory');
  const installDir = flags.directory || flags.yes
    ? (flags.directory || defaultDir)
    : await ask('Where should the framework be installed?', defaultDir);
  const targetDir = resolve(process.cwd(), installDir);
  info(`Installing to: ${targetDir}`);

  // ── Step 2: Project config ──────────────────────────────────────────────────
  section('Step 2 of 5 — Project Configuration');

  let detectedProjectName = 'MyProject';
  let detectedUserName = 'Your Name';
  try {
    const hostPkg = join(process.cwd(), 'package.json');
    if (existsSync(hostPkg)) detectedProjectName = JSON.parse(readFileSync(hostPkg, 'utf8')).name || detectedProjectName;
  } catch { /* ignore */ }
  try {
    detectedUserName = execSync('git config user.name', { stdio: ['pipe','pipe','pipe'] }).toString().trim() || detectedUserName;
  } catch { /* ignore */ }

  const projectName = flags.yes ? detectedProjectName : await ask('Project name', detectedProjectName);
  const userName    = flags.yes ? detectedUserName    : await ask('Your name',    detectedUserName);

  const commLang = flags.language
    ? LANGUAGES.find(l => l.id.toLowerCase() === flags.language.toLowerCase())?.id || 'English'
    : flags.yes ? 'English'
    : (await select('Communication language (Claude speaks to you in)', LANGUAGES)).id;

  const reportLang = flags.reportingLanguage
    ? flags.reportingLanguage
    : flags.yes ? REPORTING_CODES[commLang]
    : (await select('Reporting language (test cases, bug reports, QA summaries)', LANGUAGES)).id === commLang
      ? REPORTING_CODES[commLang]
      : REPORTING_CODES[(await select('Reporting language', LANGUAGES)).id];

  const testModeChoice = flags.yes ? { id: 'headed' } : await select('Test execution mode', [
    { id: 'headed',   label: 'Headed',   description: 'Browser window visible — watch tests run (recommended for dev)' },
    { id: 'headless', label: 'Headless', description: 'No browser window — faster, better for CI' },
  ]);

  // ── Step 3: AI tool integration ─────────────────────────────────────────────
  section('Step 3 of 5 — AI Tool Integration');
  const selectedTools = flags.tools
    ? flags.tools.split(',').map(t => t.trim())
    : flags.yes ? ['claude-code']
    : (await checkbox('Which AI tools do you use? (select all that apply)', TOOLS, false)).map(t => t.id);

  // ── Step 4: Module selection ────────────────────────────────────────────────
  section('Step 4 of 5 — Module Selection');
  const selectedModules = flags.modules
    ? ['core', ...flags.modules.split(',').map(m => m.trim())]
    : flags.yes ? MODULES.map(m => m.id)
    : (await checkbox('Which modules do you want to install?', MODULES, false)).map(m => m.id);

  // ── Step 5: Install ─────────────────────────────────────────────────────────
  section('Step 5 of 5 — Installing');

  const answers = {
    projectName,
    userName,
    communicationLanguage: commLang,
    reportingLanguage: typeof reportLang === 'string' ? reportLang : REPORTING_CODES[commLang],
    testMode: testModeChoice.id || testModeChoice,
    tools: selectedTools.filter(t => t !== 'none'),
    modules: selectedModules,
    installDir,
  };

  info('Copying framework files…');
  copyFramework(targetDir, selectedModules);
  ok('Framework files copied');

  info('Writing config.yaml…');
  writeConfig(targetDir, answers);
  ok('config.yaml written');

  info('Writing manifest…');
  writeManifest(targetDir, version, selectedModules);
  ok('_config/manifest.yaml written');

  if (answers.tools.length > 0) {
    info('Writing AI tool integration stubs…');
    writeToolStubs(answers.tools, installDir);
    ok(`Tool stubs written for: ${answers.tools.join(', ')}`);
  }

  info('Installing npm dependencies…');
  try {
    execSync('npm install', { cwd: targetDir, stdio: 'inherit' });
    ok('Dependencies installed');
  } catch {
    warn('npm install failed — run it manually: cd ' + installDir + ' && npm install');
  }

  info('Installing Playwright browser (chromium)…');
  try {
    execSync('npx playwright install chromium', { cwd: targetDir, stdio: 'inherit' });
    ok('Playwright chromium installed');
  } catch {
    warn('Playwright install failed — run manually: cd ' + installDir + ' && npx playwright install chromium');
  }

  closeRL();
  printPostInstall(installDir, answers);
}

async function runQuickUpdate(installDir) {
  section('Quick Update');
  const targetDir = resolve(process.cwd(), installDir);
  info('Refreshing framework files (your config.yaml is preserved)…');

  const savedConfig = existsSync(join(targetDir, 'config.yaml'))
    ? readFileSync(join(targetDir, 'config.yaml'), 'utf8')
    : null;

  copyFramework(targetDir);

  if (savedConfig) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(join(targetDir, 'config.yaml'), savedConfig);
    ok('config.yaml preserved');
  }

  writeManifest(targetDir, version, ['core']);
  ok(`Updated to v${version}`);
  closeRL();
  console.log('\n  Done. Run `cd ' + installDir + ' && npm run detect` to re-detect your project.\n');
}

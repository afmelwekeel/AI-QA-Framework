import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ask, select, checkbox, confirm, section, ok, info, warn, createSpinner, closeRL, c } from './utils/prompts.mjs';
import { copyFramework, writeConfig, writeManifest, writeToolStubs } from './utils/copy.mjs';
import { printPostInstall } from './utils/post-install.mjs';
import { runInit } from './utils/init.mjs';

const PKG_ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const { version } = JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf8'));

// ── Banner ────────────────────────────────────────────────────────────────────
function printBanner() {
  const b  = c.blue;  const cy = c.cyan;  const ma = c.magenta;
  const bo = c.bold;  const di = c.dim;   const ye = c.yellow;
  const gr = c.green; const r  = c.reset;

  const W  = 56;            // box interior width
  const NW = 15;            // ninja column visible width
  const TW = W - NW - 1;   // text column = 40

  // pad ninja string to exactly NW visible chars
  const pn = (s) => s + ' '.repeat(Math.max(0, NW - s.replace(/\x1b\[[0-9;]*m/g, '').length));
  // center text string within TW visible chars
  const ct = (s) => {
    const raw = s.replace(/\x1b\[[0-9;]*m/g, '');
    const pad = Math.max(0, TW - raw.length);
    const l = Math.floor(pad / 2);
    return ' '.repeat(l) + s + ' '.repeat(pad - l);
  };

  // 13 rows, each NW=15 visible chars — ninja kid art
  const ninjaRows = [
    pn(``),
    pn(`  ${cy}▄████████▄${r}  `),
    pn(` ${cy}▐█${r}${ye}◉${r}${cy}      ${r}${ye}◉${r}${cy}█▌${r} `),
    pn(` ${cy}▐█${r}${b} ▓▓▓▓▓▓ ${r}${cy}█▌${r} `),
    pn(`  ${cy}▀████████▀${r}  `),
    pn(` ${b}▄███████████▄${r} `),
    pn(` ${b}▐█${gr}*${b}███████${gr}*${b}█▌${r} `),
    pn(`${b}▐█████████████▌${r}`),
    pn(` ${b}▐█${ye}*${b}███████${ye}*${b}█▌${r} `),
    pn(` ${b}▀███████████▀${r} `),
    pn(`  ${di}▐███▌${r} ${di}▐███▌${r}  `),
    pn(`  ${di}▀▀▀▀▀${r} ${di}▀▀▀▀▀${r}  `),
    pn(` ${ma}✦${r} ${cy}${bo}Rayan${r} ${ma}✦${r}  `),
  ];

  // 13 rows centered within TW=40 — text shifted 2 rows down for visual balance
  const textRows = [
    ct(``),
    ct(``),
    ct(`${cy}${bo}✦  AI-QA-Framework  ✦${r}`),
    ct(`${ma}${bo}v${version}${r}`),
    ct(``),
    ct(`${di}Universal AI QA Automation${r}`),
    ct(`${di}npx ai-qa-framework install${r}`),
    ct(`${di}by Ahmed Al Wakeel${r}`),
    ct(``),
    ct(``),
    ct(``),
    ct(``),
    ct(``),
  ];

  console.log(`\n  ${b}╔${'═'.repeat(W)}╗${r}`);
  for (let i = 0; i < ninjaRows.length; i++) {
    const nl = ninjaRows[i];
    const tl = textRows[i] ?? ' '.repeat(TW);
    console.log(`  ${b}║${r}${nl}${di}│${r}${tl}${b}║${r}`);
  }
  console.log(`  ${b}╚${'═'.repeat(W)}╝${r}\n`);
}

// ── Run a shell command with a spinner ───────────────────────────────────────
function runCmd(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd, shell: true, stdio: 'pipe' });
    let out = '';
    proc.stdout?.on('data', d => { out += d; });
    proc.stderr?.on('data', d => { out += d; });
    proc.on('close', code => code === 0 ? resolve() : reject(new Error(out.slice(-400))));
  });
}

// ── Module / tool definitions ─────────────────────────────────────────────────
const MODULES = [
  { id: 'core',               label: 'Core',               required: true,  description: 'Orchestrator, detectors, adapters, Rayan agent' },
  { id: 'e2e-playwright',     label: 'E2E Playwright',      default: true,   description: 'Generate and run Playwright Page Object tests' },
  { id: 'test-cases-xlsx',    label: 'Test Cases XLSX',     default: true,   description: 'Generate structured XLSX test cases from user stories' },
  { id: 'security-scan',      label: 'Security Scan',       default: false,  description: 'OWASP-style security validation' },
  { id: 'accessibility-scan', label: 'Accessibility Scan',  default: false,  description: 'axe-core a11y audit' },
  { id: 'regression-testing', label: 'Regression Testing',  default: false,  description: 'Baseline diff testing against previous runs' },
];

const TOOLS = [
  { id: 'claude-code', label: 'Claude Code',    description: 'Creates .claude/commands/ slash commands' },
  { id: 'cursor',      label: 'Cursor',         description: 'Creates .cursor/rules/ MDC rules' },
  { id: 'copilot',     label: 'GitHub Copilot', description: 'Creates .github/agents/ + .github/prompts/' },
  { id: 'windsurf',    label: 'Windsurf',        description: 'Creates .windsurf/rules/ Markdown rules' },
  { id: 'none',        label: 'None / Other',    description: 'Skip AI tool integration' },
];

const LANGUAGES = [
  { id: 'English', label: 'English' },
  { id: 'Arabic',  label: 'Arabic'  },
  { id: 'French',  label: 'French'  },
  { id: 'Spanish', label: 'Spanish' },
];

const REPORTING_CODES = { English: 'en', Arabic: 'ar', French: 'fr', Spanish: 'es' };

// ── Main install flow ─────────────────────────────────────────────────────────
export async function runInstall(flags = {}) {
  printBanner();

  // ── Detect existing install ────────────────────────────────────────────────
  const defaultDir    = 'ai-qa-framework';
  const existingDirs  = [defaultDir, 'AI-QA-Framework'].filter(d => existsSync(join(process.cwd(), d, 'config.yaml')));

  if (existingDirs.length > 0 && !flags.yes) {
    warn(`Existing installation detected at: ./${existingDirs[0]}/`);
    const action = await select('What would you like to do?', [
      { id: 'update', label: 'Quick Update',   description: 'Refresh files, keep your config.yaml' },
      { id: 'modify', label: 'Modify Install', description: 'Change modules, tools, or directory' },
      { id: 'fresh',  label: 'Fresh Install',  description: 'Overwrite everything' },
    ]);
    if (action.id === 'update') return runQuickUpdate(existingDirs[0]);
  }

  // ── Step 1: Directory ──────────────────────────────────────────────────────
  section('Step 1 of 6 — Installation Directory');
  const installDir = flags.directory || flags.yes
    ? (flags.directory || defaultDir)
    : await ask('Where should the framework be installed?', defaultDir);
  const targetDir = resolve(process.cwd(), installDir);
  info(`Installing to: ${c.cyan}${targetDir}${c.reset}`);

  // ── Step 2: Project config ─────────────────────────────────────────────────
  section('Step 2 of 6 — Project Configuration');

  let detectedProject = 'MyProject';
  let detectedUser    = 'Your Name';
  try {
    const hostPkg = join(process.cwd(), 'package.json');
    if (existsSync(hostPkg)) detectedProject = JSON.parse(readFileSync(hostPkg, 'utf8')).name || detectedProject;
  } catch { /* ignore */ }
  try {
    const { execSync } = await import('node:child_process');
    detectedUser = execSync('git config user.name', { stdio: ['pipe','pipe','pipe'] }).toString().trim() || detectedUser;
  } catch { /* ignore */ }

  const projectName = flags.yes ? detectedProject : await ask('Project name', detectedProject);
  const userName    = flags.yes ? detectedUser    : await ask('Your name',    detectedUser);

  const commLang = flags.language
    ? LANGUAGES.find(l => l.id.toLowerCase() === flags.language.toLowerCase())?.id || 'English'
    : flags.yes ? 'English'
    : (await select('Communication language  (Rayan speaks to you in)', LANGUAGES)).id;

  const reportLang = flags.reportingLanguage
    ? flags.reportingLanguage
    : flags.yes ? REPORTING_CODES[commLang]
    : REPORTING_CODES[(await select('Reporting language  (test cases and reports)', LANGUAGES)).id];

  const testModeChoice = flags.yes
    ? { id: 'headed' }
    : await select('Test execution mode', [
        { id: 'headed',   label: 'Headed',   description: 'Browser visible — watch tests run (recommended)' },
        { id: 'headless', label: 'Headless', description: 'No browser window — faster, good for CI' },
      ]);

  // ── Database connection (optional) ──────────────────────────────────────────
  let dbConnectionString = '';
  let dbUsersTable       = 'users';
  let dbUsernameColumn   = 'email';
  let dbPasswordColumn   = 'password';

  if (!flags.yes) {
    const connectDB = await confirm(
      'Connect to a database so Rayan can fetch test users automatically?',
      false
    );
    if (connectDB) {
      console.log(`\n  ${c.dim}Supported: SQL Server, PostgreSQL, MySQL, MongoDB, SQLite${c.reset}`);
      dbConnectionString = await ask('Database connection string');
      dbUsersTable       = await ask('Users table / collection name', 'users');
      dbUsernameColumn   = await ask('Username or email column',       'email');
      dbPasswordColumn   = await ask('Password column',                'password');
      ok(`Database config saved — ${c.dim}Rayan will query ${dbUsersTable} when test users are needed${c.reset}`);
    }
  }

  // ── Step 3: AI tools ───────────────────────────────────────────────────────
  section('Step 3 of 6 — AI Tool Integration');
  const selectedTools = flags.tools
    ? flags.tools.split(',').map(t => t.trim())
    : flags.yes ? ['claude-code']
    : (await checkbox('Which AI tools do you use?', TOOLS, false)).map(t => t.id);

  // ── Step 4: Modules ────────────────────────────────────────────────────────
  section('Step 4 of 6 — Module Selection');
  const selectedModules = flags.modules
    ? ['core', ...flags.modules.split(',').map(m => m.trim())]
    : flags.yes ? MODULES.map(m => m.id)
    : (await checkbox('Which modules do you want to install?', MODULES, false)).map(m => m.id);

  // ── Step 5: Install ────────────────────────────────────────────────────────
  section('Step 5 of 6 — Installing');

  const answers = {
    projectName,
    userName,
    communicationLanguage: commLang,
    reportingLanguage: typeof reportLang === 'string' ? reportLang : REPORTING_CODES[commLang],
    dbConnectionString,
    dbUsersTable,
    dbUsernameColumn,
    dbPasswordColumn,
    testMode: testModeChoice.id || testModeChoice,
    tools: selectedTools.filter(t => t !== 'none'),
    modules: selectedModules,
    installDir,
  };

  // Copy files (synchronous, fast)
  let sp = createSpinner('Copying framework files…');
  copyFramework(targetDir, selectedModules);
  sp.succeed('Framework files copied');

  sp = createSpinner('Writing configuration…');
  writeConfig(targetDir, answers);
  writeManifest(targetDir, version, selectedModules);
  sp.succeed('config.yaml and manifest written');

  if (answers.tools.length > 0) {
    sp = createSpinner(`Writing AI tool stubs for: ${answers.tools.join(', ')}…`);
    writeToolStubs(answers.tools, installDir);
    sp.succeed(`Tool stubs written for: ${c.cyan}${answers.tools.join(', ')}${c.reset}`);
  }

  // npm install (async so spinner animates)
  sp = createSpinner('Installing npm dependencies…');
  try {
    await runCmd('npm', ['install'], targetDir);
    sp.succeed('npm dependencies installed');
  } catch (e) {
    sp.warn(`npm install failed — run manually: ${c.dim}cd ${installDir} && npm install${c.reset}`);
  }

  // Playwright browser (async)
  sp = createSpinner('Installing Playwright browser (chromium)…');
  try {
    await runCmd('npx', ['playwright', 'install', 'chromium'], targetDir);
    sp.succeed('Playwright chromium ready');
  } catch {
    sp.warn(`Playwright install failed — run manually: ${c.dim}cd ${installDir} && npx playwright install chromium${c.reset}`);
  }

  // ── Step 6: /aiqa-init ─────────────────────────────────────────────────────
  section('Step 6 of 6 — AI Tool Integration Files  (/aiqa-init)');
  sp = createSpinner('Creating integration files…');
  try {
    const initResults = runInit(installDir, answers.tools);
    const created = initResults.filter(r => r.status === 'created');
    const skipped = initResults.filter(r => r.status === 'skipped');
    sp.succeed(`/aiqa-init complete — ${c.green}${created.length} created${c.reset}, ${c.dim}${skipped.length} skipped${c.reset}`);
    created.forEach(r => ok(`  ${c.dim}${r.path}${c.reset}`));
  } catch (e) {
    sp.warn('/aiqa-init failed: ' + e.message);
    warn('Run /aiqa-init manually inside your AI tool after activation.');
  }

  closeRL();
  printPostInstall(installDir, answers);
}

// ── Quick update ──────────────────────────────────────────────────────────────
async function runQuickUpdate(installDir) {
  section('Quick Update');
  const targetDir = resolve(process.cwd(), installDir);

  const savedConfig = existsSync(join(targetDir, 'config.yaml'))
    ? readFileSync(join(targetDir, 'config.yaml'), 'utf8')
    : null;

  let sp = createSpinner('Refreshing framework files…');
  copyFramework(targetDir);
  if (savedConfig) {
    writeFileSync(join(targetDir, 'config.yaml'), savedConfig);
  }
  writeManifest(targetDir, version, ['core']);
  sp.succeed(`Updated to ${c.magenta}v${version}${c.reset} — config.yaml preserved`);

  closeRL();
  console.log(`\n  ${c.dim}Run ${c.cyan}cd ${installDir} && npm run detect${c.reset}${c.dim} to re-detect your project.${c.reset}\n`);
}

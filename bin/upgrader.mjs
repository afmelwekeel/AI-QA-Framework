import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { select, confirm, section, ok, info, warn, createSpinner, closeRL, c } from './utils/prompts.mjs';
import { copyFramework, writeManifest, packageRoot } from './utils/copy.mjs';
import { runInit } from './utils/init.mjs';

const PKG_ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const { version: NEW_VERSION } = JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf8'));

// ── Banner ─────────────────────────────────────────────────────────────────────
function printBanner(installedVersion) {
  const W = 56;
  const center = (text, width) => {
    const raw = text.replace(/\x1b\[[0-9;]*m/g, '');
    const pad = Math.max(0, width - raw.length);
    return ' '.repeat(Math.floor(pad / 2)) + text + ' '.repeat(pad - Math.floor(pad / 2));
  };
  const arrow = installedVersion && installedVersion !== NEW_VERSION
    ? `${c.dim}v${installedVersion}${c.reset} → ${c.green}${c.bold}v${NEW_VERSION}${c.reset}`
    : `${c.green}${c.bold}v${NEW_VERSION}${c.reset} ${c.dim}(already latest)${c.reset}`;

  console.log(`\n  ${c.blue}╔${'═'.repeat(W)}╗${c.reset}`);
  console.log(`  ${c.blue}║${c.reset}${' '.repeat(W)}${c.blue}║${c.reset}`);
  console.log(`  ${c.blue}║${c.reset}${center(`${c.cyan}${c.bold}  ✦  AI-QA-Framework Upgrade  ✦${c.reset}`, W)}${c.blue}║${c.reset}`);
  console.log(`  ${c.blue}║${c.reset}${center(arrow, W)}${c.blue}║${c.reset}`);
  console.log(`  ${c.blue}║${c.reset}${' '.repeat(W)}${c.blue}║${c.reset}`);
  console.log(`  ${c.blue}╚${'═'.repeat(W)}╝${c.reset}\n`);
}

// ── Shell command runner ────────────────────────────────────────────────────────
function runCmd(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd, shell: true, stdio: 'pipe' });
    let out = '';
    proc.stdout?.on('data', d => { out += d; });
    proc.stderr?.on('data', d => { out += d; });
    proc.on('close', code => code === 0 ? resolve() : reject(new Error(out.slice(-400))));
  });
}

// ── Find installed framework directory ─────────────────────────────────────────
function findInstallDir(flagDirectory) {
  // 1. Explicit --directory flag
  if (flagDirectory) {
    const p = resolve(process.cwd(), flagDirectory);
    if (existsSync(join(p, '_config', 'manifest.yaml'))) return { dir: flagDirectory, path: p };
    if (existsSync(join(p, 'config.yaml'))) return { dir: flagDirectory, path: p };
    return null;
  }

  // 2. Scan common names
  const candidates = ['ai-qa-framework', 'AI-QA-Framework', 'qa-framework', 'qa'];
  for (const name of candidates) {
    const p = join(process.cwd(), name);
    if (existsSync(join(p, '_config', 'manifest.yaml'))) return { dir: name, path: p };
    if (existsSync(join(p, 'config.yaml'))) return { dir: name, path: p };
  }

  // 3. Scan one level deep for any dir with config.yaml + skills/
  try {
    for (const entry of readdirSync(process.cwd(), { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const p = join(process.cwd(), entry.name);
      if (existsSync(join(p, 'config.yaml')) && existsSync(join(p, 'skills'))) {
        return { dir: entry.name, path: p };
      }
    }
  } catch { /* ignore */ }

  return null;
}

// ── Read installed version from manifest ──────────────────────────────────────
function readInstalledVersion(targetPath) {
  const manifestPath = join(targetPath, '_config', 'manifest.yaml');
  if (!existsSync(manifestPath)) return null;
  const m = readFileSync(manifestPath, 'utf8').match(/^version:\s+"?([^"\s]+)"?/m);
  return m ? m[1] : null;
}

// ── Read installed tools from manifest ────────────────────────────────────────
function readInstalledTools(targetPath) {
  // Try manifest first
  const manifestPath = join(targetPath, '_config', 'manifest.yaml');
  if (existsSync(manifestPath)) {
    const content = readFileSync(manifestPath, 'utf8');
    const tools = [];
    if (content.includes('claude-code') || existsSync(join(process.cwd(), '.claude', 'commands'))) tools.push('claude-code');
    if (content.includes('cursor')      || existsSync(join(process.cwd(), '.cursor', 'rules')))    tools.push('cursor');
    if (content.includes('copilot')     || existsSync(join(process.cwd(), '.github', 'prompts')))  tools.push('copilot');
    if (content.includes('windsurf')    || existsSync(join(process.cwd(), '.windsurf', 'rules')))  tools.push('windsurf');
    if (tools.length > 0) return tools;
  }
  // Fallback: detect from filesystem
  const tools = [];
  if (existsSync(join(process.cwd(), '.claude',   'commands'))) tools.push('claude-code');
  if (existsSync(join(process.cwd(), '.cursor',   'rules')))    tools.push('cursor');
  if (existsSync(join(process.cwd(), '.github',   'prompts')))  tools.push('copilot');
  if (existsSync(join(process.cwd(), '.windsurf', 'rules')))    tools.push('windsurf');
  return tools;
}

// ── Read installed modules from manifest ──────────────────────────────────────
function readInstalledModules(targetPath) {
  const manifestPath = join(targetPath, '_config', 'manifest.yaml');
  if (!existsSync(manifestPath)) return ['core'];
  const content = readFileSync(manifestPath, 'utf8');
  const matches = [...content.matchAll(/^\s+-\s+(.+)$/gm)];
  return matches.length > 0 ? matches.map(m => m[1].trim()) : ['core'];
}

// ── Main upgrade flow ──────────────────────────────────────────────────────────
export async function runUpgrade(flags = {}) {
  // ── Find installation ────────────────────────────────────────────────────────
  const found = findInstallDir(flags.directory);
  if (!found) {
    console.log(`\n  ${c.red}✗  No AI-QA-Framework installation found.${c.reset}`);
    console.log(`  ${c.dim}Run ${c.cyan}npx ai-qa-framework install${c.reset}${c.dim} first, or use --directory to specify the path.${c.reset}\n`);
    process.exit(1);
  }

  const { dir: installDir, path: targetPath } = found;
  const installedVersion = readInstalledVersion(targetPath);
  const installedModules = readInstalledModules(targetPath);
  const detectedTools    = readInstalledTools(targetPath);

  printBanner(installedVersion);

  // ── Show current state ───────────────────────────────────────────────────────
  section('Detected Installation');
  info(`Directory : ${c.cyan}./${installDir}/${c.reset}`);
  info(`Version   : ${c.dim}${installedVersion ?? 'unknown'}${c.reset} → ${c.green}v${NEW_VERSION}${c.reset}`);
  info(`Modules   : ${c.dim}${installedModules.join(', ')}${c.reset}`);
  info(`AI Tools  : ${c.dim}${detectedTools.length > 0 ? detectedTools.join(', ') : 'none detected'}${c.reset}`);
  console.log();

  // ── Already up to date ───────────────────────────────────────────────────────
  if (installedVersion === NEW_VERSION && !flags.force) {
    const proceed = flags.yes
      ? false
      : await confirm(`Already on v${NEW_VERSION}. Force re-copy framework files anyway?`, false);
    if (!proceed) {
      console.log(`\n  ${c.green}✓  Already up to date (v${NEW_VERSION}).${c.reset}\n`);
      closeRL();
      return;
    }
  }

  // ── Confirm upgrade ──────────────────────────────────────────────────────────
  if (!flags.yes) {
    const go = await confirm(
      `Upgrade framework files from v${installedVersion ?? 'unknown'} to v${NEW_VERSION}?\n  ${c.dim}config.yaml will be preserved. New AI tool commands will be refreshed.${c.reset}`,
      true
    );
    if (!go) {
      console.log(`\n  ${c.dim}Upgrade cancelled.${c.reset}\n`);
      closeRL();
      return;
    }
  }

  // ── Step 1: Back up config.yaml ──────────────────────────────────────────────
  section('Step 1 of 4 — Preserving Your Configuration');
  const configPath = join(targetPath, 'config.yaml');
  const savedConfig = existsSync(configPath) ? readFileSync(configPath, 'utf8') : null;
  if (savedConfig) {
    ok(`config.yaml backed up in memory — will be restored after file copy`);
  } else {
    warn('No config.yaml found — a default one will be generated');
  }

  // ── Step 2: Copy framework files ─────────────────────────────────────────────
  section('Step 2 of 4 — Upgrading Framework Files');
  let sp = createSpinner('Copying new framework files…');
  try {
    copyFramework(targetPath, installedModules);
    // Restore config.yaml (copyFramework may have overwritten it)
    if (savedConfig) {
      writeFileSync(configPath, savedConfig, 'utf8');
    }
    writeManifest(targetPath, NEW_VERSION, installedModules);
    sp.succeed(`Framework upgraded to ${c.green}v${NEW_VERSION}${c.reset} — config.yaml preserved`);
  } catch (e) {
    sp.fail(`File copy failed: ${e.message}`);
    closeRL();
    process.exit(1);
  }

  // ── Step 3: npm install ───────────────────────────────────────────────────────
  section('Step 3 of 4 — Updating Dependencies');
  sp = createSpinner('Running npm install…');
  try {
    await runCmd('npm', ['install'], targetPath);
    sp.succeed('npm dependencies updated');
  } catch {
    sp.warn(`npm install failed — run manually: ${c.dim}cd ${installDir} && npm install${c.reset}`);
  }

  // ── Step 4: Refresh AI tool commands ─────────────────────────────────────────
  section('Step 4 of 4 — Refreshing AI Tool Commands');

  let toolsToRefresh = detectedTools;
  if (!flags.yes && detectedTools.length > 0) {
    const refresh = await confirm(
      `Refresh AI tool command files for: ${c.cyan}${detectedTools.join(', ')}${c.reset}?\n  ${c.dim}This adds any new commands (e.g. /AIQA-FixBugs). Existing files are skipped unless forced.${c.reset}`,
      true
    );
    if (!refresh) toolsToRefresh = [];
  }

  if (toolsToRefresh.length > 0) {
    sp = createSpinner(`Refreshing commands for: ${toolsToRefresh.join(', ')}…`);
    try {
      const initResults = runInit(installDir, toolsToRefresh);
      const created = initResults.filter(r => r.status === 'created');
      const skipped = initResults.filter(r => r.status === 'skipped');
      sp.succeed(`Commands refreshed — ${c.green}${created.length} new${c.reset}, ${c.dim}${skipped.length} already up to date${c.reset}`);
      created.forEach(r => ok(`  ${c.dim}+ ${r.path}${c.reset}`));
    } catch (e) {
      sp.warn('Command refresh failed: ' + e.message);
    }
  } else {
    info('AI tool command refresh skipped.');
  }

  // ── Done ──────────────────────────────────────────────────────────────────────
  closeRL();
  printPostUpgrade(installDir, NEW_VERSION, installedVersion);
}

// ── Post-upgrade summary ──────────────────────────────────────────────────────
function printPostUpgrade(installDir, newVersion, oldVersion) {
  const W = 68;
  const line = (content = '') => {
    const raw = content.replace(/\x1b\[[0-9;]*m/g, '');
    const pad = Math.max(0, W - raw.length);
    return `  ${c.blue}║${c.reset}${content}${' '.repeat(pad)}${c.blue}║${c.reset}`;
  };
  const label = (key, val) => line(`   ${c.dim}${key.padEnd(9)}${c.reset}  ${c.cyan}${val}${c.reset}`);
  const step  = (n, text) => line(`   ${c.cyan}${n}.${c.reset} ${text}`);
  const blank = line();
  const rule  = `  ${c.blue}╠${'═'.repeat(W)}╣${c.reset}`;

  const changed = oldVersion && oldVersion !== newVersion;
  const vline = changed
    ? `   ${c.green}${c.bold}✓  Upgraded  v${oldVersion}  →  v${newVersion}${c.reset}`
    : `   ${c.green}${c.bold}✓  Re-applied v${newVersion} — files refreshed${c.reset}`;

  console.log(`\n  ${c.blue}╔${'═'.repeat(W)}╗${c.reset}`);
  console.log(blank);
  console.log(line(vline));
  console.log(blank);
  console.log(rule);
  console.log(blank);
  console.log(label('Location', `./${installDir}/`));
  console.log(label('Config',   `./${installDir}/config.yaml  (preserved)`));
  console.log(label('Version',  `v${newVersion}`));
  console.log(blank);
  console.log(rule);
  console.log(blank);
  console.log(line(`   ${c.bold}${c.white}NEXT STEPS${c.reset}`));
  console.log(blank);
  console.log(step(1, `Re-activate Rayan in your AI tool (reload the agent file)`));
  console.log(step(2, `Run ${c.cyan}/AIQA-Init${c.reset} to register any new commands`));
  console.log(step(3, `Check changelog: ${c.dim}https://github.com/afmelwekeel/AI-QA-Framework/releases${c.reset}`));
  console.log(blank);
  console.log(rule);
  console.log(blank);
  console.log(label('Changelog', 'https://github.com/afmelwekeel/AI-QA-Framework/releases'));
  console.log(label('Issues',    'https://github.com/afmelwekeel/AI-QA-Framework/issues'));
  console.log(blank);
  console.log(`  ${c.blue}╚${'═'.repeat(W)}╝${c.reset}\n`);
}

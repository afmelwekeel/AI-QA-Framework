#!/usr/bin/env node
// AI-QA-Framework — SessionStart hook
//
// Runs once at Claude Code session start:
//   1. Resolves the terse mode (env var > config.yaml > 'full')
//   2. If mode is 'off' — clears flag, exits silently
//   3. Writes current mode to flag file
//   4. Emits terse rules from agents/terse-rules.md as hidden system context
//      (Claude Code injects SessionStart stdout as system prompt — invisible to user)
//   5. Filters emitted rules to the active intensity level only
//   6. Detects missing statusline config and emits setup nudge

'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { getDefaultMode, safeWriteFlag } = require('./aiqa-terse-config');

const claudeDir  = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const flagPath   = path.join(claudeDir, '.aiqa-terse-active');
// Check project-local settings first, then user-global
const projectSettingsPath = path.join(__dirname, '..', '.claude', 'settings.json');
const globalSettingsPath  = path.join(claudeDir, 'settings.json');

const mode = getDefaultMode();

// 'off' — clear flag and exit without injecting any rules
if (mode === 'off') {
  try { fs.unlinkSync(flagPath); } catch (_) {}
  process.exit(0);
}

// Write flag
safeWriteFlag(flagPath, mode);

// Read terse-rules.md from agents/ directory (relative to this hook's parent)
const rulesPath = path.join(__dirname, '..', 'agents', 'terse-rules.md');
let rulesContent = '';
try {
  rulesContent = fs.readFileSync(rulesPath, 'utf8');
} catch (_) {}

let output;

if (rulesContent) {
  // Strip YAML frontmatter
  const body = rulesContent.replace(/^---[\s\S]*?---\s*/, '');

  // Filter intensity table rows and examples to active level only
  const filtered = body.split('\n').reduce((acc, line) => {
    // Intensity table rows: | **level** | ...
    const tableMatch = line.match(/^\|\s*\*\*(\S+?)\*\*\s*\|/);
    if (tableMatch) {
      if (tableMatch[1] === mode) acc.push(line);
      return acc;
    }
    // Example lines: "- level: ..." — keep only active level
    const exampleMatch = line.match(/^- (\S+?):\s/);
    if (exampleMatch) {
      if (exampleMatch[1] === mode) acc.push(line);
      return acc;
    }
    acc.push(line);
    return acc;
  }, []);

  output = `TERSE MODE ACTIVE — level: ${mode}\n\n` + filtered.join('\n');
} else {
  // Fallback hardcoded minimum when terse-rules.md is not found
  output =
    `TERSE MODE ACTIVE — level: ${mode}\n\n` +
    'Respond terse like smart agent. All technical substance stays. Only fluff dies.\n\n' +
    'ACTIVE EVERY RESPONSE. No revert. Off only: "normal mode" / "verbose mode".\n\n' +
    'Drop: articles, filler (just/really/basically/simply), pleasantries, hedging. ' +
    'Fragments OK. Short synonyms. No tool-call narration. Code/paths exact.\n\n' +
    'Language: preserve user\'s language. Arabic input → Arabic terse output.\n\n' +
    'Auto-clarity: suspend terse for security warnings, destructive confirmations, ' +
    'ambiguous multi-step ops. Resume after.\n\n' +
    'Never compress: generated E2E code, XLSX test case content, bug report body, ' +
    'quoted error messages.';
}

// Detect missing statusline config — offer setup nudge
// Check project-local .claude/settings.json first, then user-global ~/.claude/settings.json
try {
  let hasStatusline = false;
  for (const settingsPath of [projectSettingsPath, globalSettingsPath]) {
    if (fs.existsSync(settingsPath)) {
      const raw = fs.readFileSync(settingsPath, 'utf8');
      // Strip JSON comments (JSONC) before parsing
      const stripped = raw.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
      try {
        const settings = JSON.parse(stripped);
        if (settings.statusLine) { hasStatusline = true; break; }
      } catch (_) {}
    }
  }

  if (!hasStatusline) {
    const isWindows  = process.platform === 'win32';
    const scriptName = isWindows ? 'aiqa-terse-statusline.ps1' : 'aiqa-terse-statusline.sh';
    const scriptPath = path.join(__dirname, scriptName);
    const command    = isWindows
      ? `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`
      : `bash "${scriptPath}"`;
    output +=
      '\n\nSTATUSLINE SETUP AVAILABLE: Add this to ' + projectSettingsPath +
      ' to show terse mode badge: ' +
      '"statusLine": { "type": "command", "command": ' + JSON.stringify(command) + ' }' +
      ' — Proactively offer to set this up for the user on first interaction.';
  }
} catch (_) {}

process.stdout.write(output);

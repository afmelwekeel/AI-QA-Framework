#!/usr/bin/env node
// AI-QA-Framework — UserPromptSubmit hook
//
// Runs on every user message. Responsibilities:
//   1. /aiqa-terse slash command → update mode flag
//   2. /aiqa-tokenstats → block prompt, return stats inline
//   3. Natural language activation → write flag
//   4. Natural language deactivation → delete flag
//   5. Per-turn reinforcement → emit hookSpecificOutput so terse mode
//      stays in model attention even when context compresses CLAUDE.md away

'use strict';

const fs    = require('fs');
const path  = require('path');
const os    = require('os');
const { execFileSync } = require('child_process');
const { getDefaultMode, safeWriteFlag, readFlag, VALID_MODES } = require('./aiqa-terse-config');

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const flagPath  = path.join(claudeDir, '.aiqa-terse-active');

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data   = JSON.parse(input);
    const rawPrompt = (data.prompt || '').trim();
    const prompt    = rawPrompt.toLowerCase();

    // ── /aiqa-tokenstats handler ─────────────────────────────────────────────
    // Block the prompt and return stats immediately — no AI round-trip needed.
    const statsMatch = /^\/aiqa-tokenstats(?:\s+(.*))?$/.exec(prompt);
    if (statsMatch) {
      const tailArgs = (statsMatch[1] || '').trim().split(/\s+/).filter(Boolean);
      try {
        const statsPath = path.join(__dirname, '..', 'core', 'token-stats.mjs');
        const argv = [];
        if (data.transcript_path) argv.push('--session-file', data.transcript_path);
        if (tailArgs.includes('--all'))   argv.push('--all');
        if (tailArgs.includes('--share')) argv.push('--share');
        const sinceIdx = tailArgs.indexOf('--since');
        if (sinceIdx !== -1 && tailArgs[sinceIdx + 1]) argv.push('--since', tailArgs[sinceIdx + 1]);

        const out = execFileSync(process.execPath, [statsPath, ...argv], {
          encoding: 'utf8', timeout: 8000
        });
        process.stdout.write(JSON.stringify({ decision: 'block', reason: out.trim() }));
      } catch (e) {
        process.stdout.write(JSON.stringify({
          decision: 'block',
          reason: 'aiqa-tokenstats: could not run stats.\nTry: node core/token-stats.mjs'
        }));
      }
      return;
    }

    // ── /aiqa-terse slash command ─────────────────────────────────────────────
    let cmdHandled = false;
    if (prompt.startsWith('/aiqa-terse')) {
      const parts = prompt.split(/\s+/);
      const arg   = parts[1] || '';

      if (arg === 'off' || arg === 'stop' || arg === 'disable') {
        try { fs.unlinkSync(flagPath); } catch (_) {}
        cmdHandled = true;
      } else if (VALID_MODES.includes(arg) && arg !== 'off') {
        safeWriteFlag(flagPath, arg);
        cmdHandled = true;
      } else if (!arg) {
        // bare /aiqa-terse → activate at configured default
        const defMode = getDefaultMode();
        if (defMode !== 'off') safeWriteFlag(flagPath, defMode);
        cmdHandled = true;
      }
    }

    // ── Natural language activation ───────────────────────────────────────────
    // Skip NL checks when the prompt is a slash command — prevents \bterse\b
    // inside /aiqa-terse tokens from triggering false-positive NL activation.
    const nlActivate = !cmdHandled && !rawPrompt.startsWith('/') && (
      /\b(be brief|be terse|less tokens|fewer tokens|shorter answers|compress your responses)\b/i.test(rawPrompt) ||
      /\b(activate|enable|turn on|start)\b.*\bterse\b/i.test(rawPrompt) ||
      /\bterse\b.*\b(activate|enable|turn on|mode)\b/i.test(rawPrompt)
    );

    const nlDeactivate = !cmdHandled && !rawPrompt.startsWith('/') &&
      /\b(normal mode|verbose mode|stop terse|disable terse|turn off terse|full answers|stop compressing)\b/i.test(rawPrompt);

    if (nlActivate && !nlDeactivate) {
      const defMode = getDefaultMode();
      if (defMode !== 'off') safeWriteFlag(flagPath, defMode);
    }

    // ── Natural language deactivation ─────────────────────────────────────────
    if (nlDeactivate) {
      try { fs.unlinkSync(flagPath); } catch (_) {}
    }

    // ── Per-turn reinforcement ────────────────────────────────────────────────
    // Injects a short reminder every turn so the model keeps terse style after
    // other context (tool results, long outputs) pushes CLAUDE.md out of attention.
    const activeMode = readFlag(flagPath);
    if (activeMode && activeMode !== 'off') {
      const levelHint = activeMode === 'ultra'
        ? 'Fragments only. Arrows for causality (X → Y). Omit conjunctions.'
        : activeMode === 'lite'
          ? 'Drop filler/hedging. Keep full sentences.'
          : 'Drop articles/filler/pleasantries/narration. Fragments OK.';

      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'UserPromptSubmit',
          additionalContext:
            `TERSE MODE ACTIVE (${activeMode}). ${levelHint} ` +
            'Code/paths/terms exact. Language: preserve user\'s language. ' +
            'Never compress: E2E test code, XLSX test content, bug report body.'
        }
      }));
    }

  } catch (_) {
    // Silent fail — never block a user prompt
  }
});

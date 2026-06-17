#!/usr/bin/env node
// AI-QA-Framework — token-stats
// Reads the active Claude Code session JSONL, reports token usage + estimated savings.
// Appends a snapshot to the lifetime history log for cross-session totals.
//
// Usage:
//   node core/token-stats.mjs                      — current session
//   node core/token-stats.mjs --all                — lifetime totals
//   node core/token-stats.mjs --since 7d           — last 7 days
//   node core/token-stats.mjs --share              — one-line shareable summary
//   node core/token-stats.mjs --session-file <p>   — explicit transcript path

import fs   from 'fs';
import path from 'path';
import os   from 'os';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { appendFlag, readHistory, safeWriteFlag } = require('../hooks/aiqa-terse-config.js');

// ── Compression ratios by mode (from caveman benchmarks, mean per-task) ──────
const COMPRESSION = { lite: 0.30, full: 0.65, ultra: 0.75 };

// ── Claude output token pricing (USD per million) ─────────────────────────────
// Most-specific prefixes first. Update when Anthropic revises pricing.
const MODEL_PRICE_PER_M = [
  ['claude-opus-4-8',    25.00],
  ['claude-opus-4-7',    25.00],
  ['claude-opus-4',      25.00],
  ['claude-sonnet-4-6',  15.00],
  ['claude-sonnet-4',    15.00],
  ['claude-haiku-4-5',    5.00],
  ['claude-haiku-4',      5.00],
  ['claude-3-5-sonnet',  15.00],
  ['claude-3-5-haiku',    4.00],
  ['claude-3-opus',      75.00],
];

function priceForModel(model) {
  if (!model) return null;
  // Strip Bedrock cross-region inference prefix (us., eu., ap.) before matching
  const normalized = model.replace(/^(us|eu|ap)\./, '');
  for (const [prefix, price] of MODEL_PRICE_PER_M) {
    if (normalized.startsWith(prefix)) return price;
  }
  return null;
}

function formatUsd(amount) {
  if (amount >= 1)    return `$${amount.toFixed(2)}`;
  if (amount >= 0.01) return `$${amount.toFixed(3)}`;
  return `$${amount.toFixed(4)}`;
}

function humanizeTokens(n) {
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
  return String(Math.round(n));
}

// ── Parse a session JSONL file ────────────────────────────────────────────────
function parseSession(filePath) {
  let raw;
  try { raw = fs.readFileSync(filePath, 'utf8'); }
  catch { return { outputTokens: 0, cacheReadTokens: 0, turns: 0, model: null }; }

  let outputTokens = 0, cacheReadTokens = 0, turns = 0, model = null;
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }
    if (entry.type !== 'assistant' || !entry.message) continue;
    const usage = entry.message.usage;
    if (!usage) continue;
    outputTokens    += usage.output_tokens            || 0;
    cacheReadTokens += usage.cache_read_input_tokens  || 0;
    turns++;
    if (!model && entry.message.model) model = entry.message.model;
  }
  return { outputTokens, cacheReadTokens, turns, model };
}

// ── Find the most recently modified session JSONL ─────────────────────────────
function findRecentSession(claudeDir) {
  const projectsDir = path.join(claudeDir, 'projects');
  let best = null;
  const stack = [];
  try { for (const e of fs.readdirSync(projectsDir, { withFileTypes: true })) stack.push(path.join(projectsDir, e.name)); }
  catch { return null; }

  while (stack.length) {
    const p = stack.pop();
    let st;
    try { st = fs.statSync(p); } catch { continue; }
    if (st.isDirectory()) {
      try { for (const c of fs.readdirSync(p)) stack.push(path.join(p, c)); } catch {}
    } else if (p.endsWith('.jsonl') && (!best || st.mtimeMs > best.mtime)) {
      best = { file: p, mtime: st.mtimeMs };
    }
  }
  return best ? best.file : null;
}

// ── Detect compressed .md pairs (*.original.md + compressed sibling) ─────────
function findCompressedPairs(dirs) {
  const pairs = [];
  for (const dir of dirs) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (!e.isFile() || !e.name.endsWith('.original.md')) continue;
      const base           = e.name.slice(0, -'.original.md'.length);
      const originalPath   = path.join(dir, e.name);
      const compressedPath = path.join(dir, `${base}.md`);
      let oSize, cSize;
      try { oSize = fs.statSync(originalPath).size; cSize = fs.statSync(compressedPath).size; }
      catch { continue; }
      if (oSize > cSize) pairs.push({ name: base, originalSize: oSize, compressedSize: cSize });
    }
  }
  return pairs;
}

// ── Savings estimate for one session ─────────────────────────────────────────
function deriveSavings({ outputTokens, mode, model }) {
  const ratio = COMPRESSION[mode] ?? null;
  const price = priceForModel(model);
  if (ratio === null) return { estSavedTokens: 0, estSavedUsd: 0 };
  const estNormal      = Math.round(outputTokens / (1 - ratio));
  const estSavedTokens = estNormal - outputTokens;
  const estSavedUsd    = price !== null ? (estSavedTokens / 1_000_000) * price : 0;
  return { estSavedTokens, estSavedUsd };
}

// ── Duration parser ("7d", "24h" → ms) ───────────────────────────────────────
function parseDuration(spec) {
  if (!spec) return null;
  const m = /^(\d+)([dh])$/.exec(spec.trim());
  if (!m) return null;
  return m[2] === 'd' ? parseInt(m[1]) * 86_400_000 : parseInt(m[1]) * 3_600_000;
}

// ── Aggregate lifetime history ────────────────────────────────────────────────
function aggregateHistory(historyPath, sinceMs) {
  const lines   = readHistory(historyPath);
  const cutoff  = sinceMs ? Date.now() - sinceMs : null;
  const latest  = new Map();
  for (const line of lines) {
    let e; try { e = JSON.parse(line); } catch { continue; }
    if (!e || typeof e !== 'object') continue;
    if (cutoff !== null && (e.ts || 0) < cutoff) continue;
    const id   = e.session_id || '_';
    const prev = latest.get(id);
    if (!prev || (e.ts || 0) >= (prev.ts || 0)) latest.set(id, e);
  }
  let outputTokens = 0, estSavedTokens = 0, estSavedUsd = 0;
  for (const e of latest.values()) {
    outputTokens    += e.output_tokens     || 0;
    estSavedTokens  += e.est_saved_tokens  || 0;
    estSavedUsd     += e.est_saved_usd     || 0;
  }
  return { sessions: latest.size, outputTokens, estSavedTokens, estSavedUsd };
}

// ── Formatters ────────────────────────────────────────────────────────────────
const SEP = '──────────────────────────────────';

function formatSessionStats({ outputTokens, cacheReadTokens, turns, mode, model, sessionPath, compressedPairs }) {
  if (turns === 0) return `\nToken Stats\n${SEP}\nNo turns yet — stats available after first response.\n${SEP}\n`;

  const ratio = COMPRESSION[mode] ?? null;
  const price = priceForModel(model);
  const shortPath = sessionPath && sessionPath.length > 50
    ? '...' + sessionPath.slice(-50) : (sessionPath || '');

  let savingsBlock = '';
  let footer = '';
  if (ratio !== null) {
    const estNormal = Math.round(outputTokens / (1 - ratio));
    const estSaved  = estNormal - outputTokens;
    let usdLine = '';
    if (price !== null) {
      usdLine = `Est. saved (USD):      ~${formatUsd((estSaved / 1_000_000) * price)}\n`;
      footer  = `Savings from benchmarks (mean, ${mode} mode). Model: ${model}. Actual varies.`;
    } else {
      footer = `Savings from benchmarks (mean, ${mode} mode). Actual varies.`;
    }
    savingsBlock =
      `Est. without terse:    ${estNormal.toLocaleString()}\n` +
      `Est. tokens saved:     ${estSaved.toLocaleString()} (~${Math.round(ratio * 100)}%)\n` +
      usdLine.replace(/\n$/, '');
  } else if (mode && mode !== 'off') {
    savingsBlock = `No savings estimate for '${mode}' mode.`;
  } else {
    savingsBlock = 'Terse mode not active this session.';
  }

  let memoryLine = '';
  if (compressedPairs && compressedPairs.length > 0) {
    const bytes = compressedPairs.reduce((s, p) => s + p.originalSize - p.compressedSize, 0);
    const tokensApprox = Math.round(bytes / 4).toLocaleString();
    const count = compressedPairs.length;
    memoryLine = `${SEP}\nCompressed files:      ${count} file${count === 1 ? '' : 's'}, ~${tokensApprox} tokens saved per session\n`;
  }

  return (
    `\nToken Stats — Current Session\n${SEP}\n` +
    (shortPath ? `Session:  ${shortPath}\n` : '') +
    `Turns:    ${turns}\n${SEP}\n` +
    `Output tokens:         ${outputTokens.toLocaleString()}\n` +
    `Cache-read tokens:     ${cacheReadTokens.toLocaleString()}\n${SEP}\n` +
    `${savingsBlock}\n` +
    memoryLine +
    (footer ? footer + '\n' : '')
  );
}

function formatLifetimeStats({ sessions, outputTokens, estSavedTokens, estSavedUsd, since }) {
  const window = since ? ` (last ${since})` : '';
  if (sessions === 0) return `\nToken Stats — Lifetime${window}\n${SEP}\nNo sessions logged yet. Run /aiqa-tokenstats inside a session to start tracking.\n${SEP}\n`;
  const usdLine = estSavedUsd > 0 ? `Est. saved (USD):      ~${formatUsd(estSavedUsd)}\n` : '';
  return (
    `\nToken Stats — Lifetime${window}\n${SEP}\n` +
    `Sessions:              ${sessions.toLocaleString()}\n${SEP}\n` +
    `Output tokens:         ${outputTokens.toLocaleString()}\n` +
    `Est. tokens saved:     ${estSavedTokens.toLocaleString()}\n` +
    usdLine + SEP + '\n'
  );
}

function formatShare({ outputTokens, turns, mode, model }) {
  if (turns === 0) return '⛏ aiqa-terse armed but no turns yet.';
  const ratio = COMPRESSION[mode] ?? null;
  const price = priceForModel(model);
  if (ratio !== null) {
    const estSaved = Math.round(outputTokens / (1 - ratio)) - outputTokens;
    let usd = '';
    if (price !== null) usd = ` (~${formatUsd((estSaved / 1_000_000) * price)})`;
    return `⛏ Saved ${estSaved.toLocaleString()} output tokens${usd} across ${turns} turns — AI-QA-Framework terse mode`;
  }
  return `⛏ ${turns} turns, ${outputTokens.toLocaleString()} output tokens — AI-QA-Framework`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const args           = process.argv.slice(2);
const share          = args.includes('--share');
const all            = args.includes('--all');
const hasSessionFile = args.includes('--session-file');
const sfIdx          = args.indexOf('--session-file');
const sessionFileArg = sfIdx !== -1 ? (args[sfIdx + 1] || null) : null;
const sinceIdx       = args.indexOf('--since');
const sinceArg       = sinceIdx !== -1 ? (args[sinceIdx + 1] || null) : null;

const claudeDir    = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const historyPath  = path.join(claudeDir, '.aiqa-terse-history.jsonl');
const flagPath     = path.join(claudeDir, '.aiqa-terse-active');

// Lifetime aggregation short-circuits before needing a live session
if (all || sinceArg) {
  const sinceMs = parseDuration(sinceArg);
  if (sinceArg && sinceMs === null) {
    process.stderr.write('aiqa-tokenstats: --since takes Nh or Nd (e.g. 7d, 24h)\n');
    process.exit(2);
  }
  const agg = aggregateHistory(historyPath, sinceMs);
  process.stdout.write(formatLifetimeStats({ ...agg, since: sinceArg || null }));
  process.exit(0);
}

// Current session
if (hasSessionFile && !sessionFileArg) {
  process.stderr.write('aiqa-tokenstats: --session-file requires a path argument.\n');
  process.exit(2);
}
const sessionFile = (hasSessionFile ? sessionFileArg : null) || findRecentSession(claudeDir);
if (!sessionFile) {
  process.stderr.write('aiqa-tokenstats: no Claude Code session found.\n');
  process.exit(1);
}

const parsed = parseSession(sessionFile);

// Read current terse mode from flag file
let mode = null;
try {
  const { readFlag } = require('../hooks/aiqa-terse-config.js');
  mode = readFlag(flagPath);
} catch (_) {}

// Append session snapshot to lifetime history
if (parsed.turns > 0) {
  const { estSavedTokens, estSavedUsd } = deriveSavings({ ...parsed, mode });
  const sessionId = path.basename(sessionFile, '.jsonl');
  appendFlag(historyPath, JSON.stringify({
    ts:               Date.now(),
    session_id:       sessionId,
    mode:             mode || null,
    model:            parsed.model || null,
    output_tokens:    parsed.outputTokens,
    est_saved_tokens: estSavedTokens,
    est_saved_usd:    estSavedUsd,
  }));

  // Update statusline suffix file
  const agg    = aggregateHistory(historyPath, null);
  const suffix = agg.estSavedTokens > 0 ? `⛏  ${humanizeTokens(agg.estSavedTokens)}` : '';
  safeWriteFlag(path.join(claudeDir, '.aiqa-terse-statusline-suffix'), suffix);
}

if (share) {
  process.stdout.write(formatShare({ ...parsed, mode }) + '\n');
} else {
  // Scan for compressed file pairs
  const scanDirs = [
    path.resolve(process.cwd()),
    path.join(process.cwd(), 'agents'),
    path.join(process.cwd(), '_memory', 'qae-sidecar'),
    path.join(process.cwd(), 'reusable-prompts'),
    claudeDir,
  ].filter((d, i, a) => a.indexOf(d) === i);

  const compressedPairs = findCompressedPairs(scanDirs);
  process.stdout.write(formatSessionStats({ ...parsed, mode, sessionPath: sessionFile, compressedPairs }));
}

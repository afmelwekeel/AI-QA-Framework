#!/usr/bin/env node
// AI-QA-Framework — shared terse-mode configuration resolver
//
// Priority order for default mode:
//   1. AIQA_TERSE_MODE environment variable
//   2. terse_mode field in config.yaml (project-local)
//   3. 'full' (built-in default)

'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const VALID_MODES = ['off', 'lite', 'full', 'ultra'];

// Walk up from __dirname/../ to locate config.yaml
function findConfigYaml() {
  // Start from the hooks directory's parent (project root)
  const projectRoot = path.resolve(__dirname, '..');
  const candidate = path.join(projectRoot, 'config.yaml');
  try {
    const st = fs.lstatSync(candidate);
    if (!st.isSymbolicLink() && st.isFile()) return candidate;
  } catch (_) {}
  return null;
}

// Minimal YAML field extractor — reads only the terse_mode line.
// Handles: terse_mode: full  |  terse_mode: "off"  |  terse_mode: 'lite'
function readTerseModeFromConfig(configPath) {
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const match = raw.match(/^terse_mode\s*:\s*["']?(\w+)["']?\s*(?:#.*)?$/m);
    if (match) {
      const m = match[1].toLowerCase();
      if (VALID_MODES.includes(m)) return m;
    }
  } catch (_) {}
  return null;
}

function getDefaultMode() {
  // 1. Environment variable (highest priority)
  const envMode = (process.env.AIQA_TERSE_MODE || '').toLowerCase();
  if (VALID_MODES.includes(envMode)) return envMode;

  // 2. config.yaml
  const configPath = findConfigYaml();
  if (configPath) {
    const cfgMode = readTerseModeFromConfig(configPath);
    if (cfgMode) return cfgMode;
  }

  // 3. Default
  return 'full';
}

// ── Symlink-safe flag write ───────────────────────────────────────────────────
// Atomic temp-file + rename. Refuses symlinks at the flag target.
// 0o600 permissions. Silent-fails on any filesystem error.
function safeWriteFlag(flagPath, content) {
  try {
    const flagDir = path.dirname(flagPath);
    fs.mkdirSync(flagDir, { recursive: true });

    // Resolve parent symlink if present; verify it's in the user's home
    let realFlagDir;
    try {
      const lst = fs.lstatSync(flagDir);
      if (lst.isSymbolicLink()) {
        realFlagDir = fs.realpathSync(flagDir);
        const rst = fs.statSync(realFlagDir);
        if (!rst.isDirectory()) return;
        if (typeof process.getuid === 'function') {
          if (rst.uid !== process.getuid()) return;
        } else {
          // Windows — verify path is under home dir
          const home = path.resolve(os.homedir()).toLowerCase();
          if (!path.resolve(realFlagDir).toLowerCase().startsWith(home)) return;
        }
      } else {
        realFlagDir = flagDir;
      }
    } catch (_) { return; }

    // Refuse if the flag file itself is a symlink
    const realFlagPath = path.join(realFlagDir, path.basename(flagPath));
    try {
      if (fs.lstatSync(realFlagPath).isSymbolicLink()) return;
    } catch (e) {
      if (e.code !== 'ENOENT') return;
    }

    const tmpPath = path.join(realFlagDir, `.aiqa-terse-tmp-${process.pid}-${Date.now()}`);
    // O_NOFOLLOW is POSIX-only; on Windows it degrades to 0 (flag unavailable).
    // O_EXCL still prevents overwriting an existing file; the unpredictable tmp
    // name (pid + ms timestamp) makes a race-condition symlink attack impractical.
    const O_NOFOLLOW = (typeof fs.constants.O_NOFOLLOW === 'number') ? fs.constants.O_NOFOLLOW : 0;
    const openFlags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | O_NOFOLLOW;
    let fd;
    try {
      fd = fs.openSync(tmpPath, openFlags, 0o600);
      fs.writeSync(fd, String(content));
      try { fs.fchmodSync(fd, 0o600); } catch (_) {}
    } finally {
      if (fd !== undefined) try { fs.closeSync(fd); } catch (_) {}
    }
    // On Windows (no O_NOFOLLOW): verify the written tmp is a regular file before rename
    try { if (fs.lstatSync(tmpPath).isSymbolicLink()) { fs.unlinkSync(tmpPath); return; } } catch (_) {}
    fs.renameSync(tmpPath, realFlagPath);
  } catch (_) {}
}

// ── Symlink-safe flag read ────────────────────────────────────────────────────
// 64-byte cap + VALID_MODES whitelist. Returns null on any anomaly.
const MAX_FLAG_BYTES = 64;

function readFlag(flagPath) {
  try {
    let st;
    try { st = fs.lstatSync(flagPath); } catch (_) { return null; }
    if (st.isSymbolicLink() || !st.isFile()) return null;
    if (st.size > MAX_FLAG_BYTES) return null;

    const O_NOFOLLOW = (typeof fs.constants.O_NOFOLLOW === 'number') ? fs.constants.O_NOFOLLOW : 0;
    let fd, out;
    try {
      fd = fs.openSync(flagPath, fs.constants.O_RDONLY | O_NOFOLLOW);
      const buf = Buffer.alloc(MAX_FLAG_BYTES);
      const n = fs.readSync(fd, buf, 0, MAX_FLAG_BYTES, 0);
      out = buf.slice(0, n).toString('utf8');
    } finally {
      if (fd !== undefined) try { fs.closeSync(fd); } catch (_) {}
    }
    const raw = out.trim().toLowerCase();
    if (!VALID_MODES.includes(raw)) return null;
    return raw;
  } catch (_) { return null; }
}

// ── Symlink-safe append (for lifetime history log) ────────────────────────────
function appendFlag(filePath, line) {
  try {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });

    let realDir;
    try {
      const lst = fs.lstatSync(dir);
      if (lst.isSymbolicLink()) {
        realDir = fs.realpathSync(dir);
        const rst = fs.statSync(realDir);
        if (!rst.isDirectory()) return;
        if (typeof process.getuid === 'function') {
          if (rst.uid !== process.getuid()) return;
        } else {
          const home = path.resolve(os.homedir()).toLowerCase();
          if (!path.resolve(realDir).toLowerCase().startsWith(home)) return;
        }
      } else {
        realDir = dir;
      }
    } catch (_) { return; }

    const realPath = path.join(realDir, path.basename(filePath));
    try { if (fs.lstatSync(realPath).isSymbolicLink()) return; }
    catch (e) { if (e.code !== 'ENOENT') return; }

    const O_NOFOLLOW = (typeof fs.constants.O_NOFOLLOW === 'number') ? fs.constants.O_NOFOLLOW : 0;
    const openFlags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_APPEND | O_NOFOLLOW;
    let fd;
    try {
      fd = fs.openSync(realPath, openFlags, 0o600);
      fs.writeSync(fd, String(line).replace(/\n$/, '') + '\n');
      try { fs.fchmodSync(fd, 0o600); } catch (_) {}
    } finally {
      if (fd !== undefined) try { fs.closeSync(fd); } catch (_) {}
    }
  } catch (_) {}
}

// ── Symlink-safe history read ─────────────────────────────────────────────────
function readHistory(filePath) {
  try {
    const st = fs.lstatSync(filePath);
    if (st.isSymbolicLink() || !st.isFile()) return [];
    const O_NOFOLLOW = (typeof fs.constants.O_NOFOLLOW === 'number') ? fs.constants.O_NOFOLLOW : 0;
    let fd, raw;
    try {
      fd = fs.openSync(filePath, fs.constants.O_RDONLY | O_NOFOLLOW);
      raw = fs.readFileSync(fd, 'utf8');
    } finally {
      if (fd !== undefined) try { fs.closeSync(fd); } catch (_) {}
    }
    return raw.split('\n').filter(l => l.trim());
  } catch (_) { return []; }
}

module.exports = { getDefaultMode, safeWriteFlag, readFlag, appendFlag, readHistory, VALID_MODES };

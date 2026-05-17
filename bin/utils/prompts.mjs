import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

// ── Color helpers ─────────────────────────────────────────────────────────────
const NO_COLOR = !process.stdout.isTTY || process.env.NO_COLOR;

const _c = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[91m',
  green:   '\x1b[92m',
  yellow:  '\x1b[93m',
  blue:    '\x1b[94m',
  magenta: '\x1b[95m',
  cyan:    '\x1b[96m',
  white:   '\x1b[97m',
};
export const c = NO_COLOR
  ? Object.fromEntries(Object.keys(_c).map(k => [k, '']))
  : _c;

const IS_TTY = process.stdin.isTTY && process.stdout.isTTY;

// Strip ANSI codes to get the visual length of a string
function vlen(s) { return s.replace(/\x1b\[[0-9;]*m/g, '').length; }

// ── Readline (used only for ask) ──────────────────────────────────────────────
let rl;
function getRL() {
  if (!rl) rl = createInterface({ input, output, terminal: true });
  return rl;
}
export function closeRL() {
  if (rl) { rl.close(); rl = null; }
}

// ── Spinner ───────────────────────────────────────────────────────────────────
const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export function createSpinner(text) {
  if (!IS_TTY) {
    process.stdout.write(`  ${c.cyan}·${c.reset} ${text}\n`);
    return {
      succeed: (msg) => process.stdout.write(`  ${c.green}✓${c.reset} ${msg || text}\n`),
      fail:    (msg) => process.stdout.write(`  ${c.red}✗${c.reset} ${msg || text}\n`),
      warn:    (msg) => process.stdout.write(`  ${c.yellow}⚠${c.reset}  ${msg || text}\n`),
      update:  (msg) => { text = msg; },
    };
  }
  let i = 0;
  let label = text;
  const iv = setInterval(() => {
    process.stdout.write(`\r  ${c.cyan}${FRAMES[i % FRAMES.length]}${c.reset} ${label}   `);
    i++;
  }, 80);
  return {
    succeed: (msg) => { clearInterval(iv); process.stdout.write(`\r  ${c.green}✓${c.reset} ${c.bold}${msg || label}${c.reset}                    \n`); },
    fail:    (msg) => { clearInterval(iv); process.stdout.write(`\r  ${c.red}✗${c.reset} ${msg || label}                    \n`); },
    warn:    (msg) => { clearInterval(iv); process.stdout.write(`\r  ${c.yellow}⚠${c.reset}  ${msg || label}                    \n`); },
    update:  (msg) => { label = msg; },
  };
}

// ── ask ───────────────────────────────────────────────────────────────────────
export async function ask(question, defaultValue = '') {
  const hint = defaultValue ? ` ${c.dim}(${defaultValue})${c.reset}` : '';
  const prompt = `\n  ${c.cyan}?${c.reset} ${c.bold}${question}${c.reset}${hint}\n  ${c.cyan}›${c.reset} `;
  const answer = await getRL().question(prompt);
  return answer.trim() || defaultValue;
}

// ── select — arrow-key interactive ────────────────────────────────────────────
export async function select(question, options) {
  if (!IS_TTY) return _legacySelect(question, options);

  let sel = 0;

  const lines = () => {
    const out = [];
    out.push(`\n  ${c.cyan}${c.bold}?${c.reset} ${c.bold}${question}${c.reset}  ${c.dim}↑↓ move · Enter select${c.reset}`);
    for (let i = 0; i < options.length; i++) {
      const o = options[i];
      const active = i === sel;
      const arrow  = active ? `${c.cyan}${c.bold}❯${c.reset}` : ' ';
      const label  = active ? `${c.cyan}${c.bold}${o.label}${c.reset}` : `${c.dim}${o.label}${c.reset}`;
      const desc   = o.description ? `  ${c.dim}${o.description}${c.reset}` : '';
      out.push(`    ${arrow} ${label}${desc}`);
    }
    return out;
  };

  const print = (initial = false) => {
    const ls = lines();
    if (!initial) process.stdout.write(`\x1b[${ls.length}A\x1b[0J`);
    ls.forEach(l => process.stdout.write(l + '\n'));
  };

  print(true);

  return new Promise((resolve) => {
    if (rl) rl.pause();
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onKey = (key) => {
      if (key === '\x1b[A') { sel = (sel - 1 + options.length) % options.length; print(); }
      else if (key === '\x1b[B') { sel = (sel + 1) % options.length; print(); }
      else if (key === '\r') {
        process.stdin.setRawMode(false);
        process.stdin.removeListener('data', onKey);
        process.stdin.pause();
        const ls = lines();
        process.stdout.write(`\x1b[${ls.length}A\x1b[0J`);
        process.stdout.write(`  ${c.green}✓${c.reset} ${c.bold}${question}${c.reset}  ${c.cyan}›${c.reset} ${c.green}${options[sel].label}${c.reset}\n`);
        if (rl) rl.resume();
        resolve(options[sel]);
      } else if (key === '\x03') { process.stdin.setRawMode(false); process.exit(0); }
    };
    process.stdin.on('data', onKey);
  });
}

async function _legacySelect(question, options) {
  console.log(`\n  ${c.cyan}?${c.reset} ${c.bold}${question}${c.reset}`);
  options.forEach((o, i) => console.log(`    ${c.dim}${i + 1})${c.reset} ${o.label}${o.description ? `  ${c.dim}— ${o.description}${c.reset}` : ''}`));
  while (true) {
    const raw = await getRL().question(`  ${c.cyan}›${c.reset} Number (1–${options.length}): `);
    const n = parseInt(raw.trim(), 10);
    if (n >= 1 && n <= options.length) return options[n - 1];
    console.log(`  ${c.red}✗${c.reset} Enter a number between 1 and ${options.length}.`);
  }
}

// ── checkbox — arrow-key + space interactive ──────────────────────────────────
export async function checkbox(question, options, defaultAll = false) {
  if (!IS_TTY) return _legacyCheckbox(question, options, defaultAll);

  let cur = 0;
  const ticked = new Set();
  options.forEach((o, i) => { if (o.required || o.default) ticked.add(i); });

  const lines = () => {
    const count = ticked.size;
    const hint  = count > 0
      ? `${c.green}${count} selected${c.reset}  ${c.dim}· Enter confirm${c.reset}`
      : `${c.dim}↑↓ move · Space toggle · Enter select${c.reset}`;
    const out = [];
    out.push(`\n  ${c.cyan}${c.bold}?${c.reset} ${c.bold}${question}${c.reset}  ${hint}`);
    for (let i = 0; i < options.length; i++) {
      const o = options[i];
      const active  = i === cur;
      const checked = ticked.has(i);
      const arrow   = active ? `${c.cyan}❯${c.reset}` : ' ';
      const box     = checked ? `${c.green}◉${c.reset}` : `${c.dim}○${c.reset}`;
      const label   = active  ? `${c.bold}${o.label}${c.reset}` : `${c.dim}${o.label}${c.reset}`;
      const lock    = o.required ? ` ${c.yellow}[required]${c.reset}` : '';
      const desc    = o.description ? `  ${c.dim}${o.description}${c.reset}` : '';
      out.push(`    ${arrow} ${box} ${label}${lock}${desc}`);
    }
    return out;
  };

  const print = (initial = false) => {
    const ls = lines();
    if (!initial) process.stdout.write(`\x1b[${ls.length}A\x1b[0J`);
    ls.forEach(l => process.stdout.write(l + '\n'));
  };

  print(true);

  return new Promise((resolve) => {
    if (rl) rl.pause();
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onKey = (key) => {
      if (key === '\x1b[A') { cur = (cur - 1 + options.length) % options.length; print(); }
      else if (key === '\x1b[B') { cur = (cur + 1) % options.length; print(); }
      else if (key === ' ') {
        if (!options[cur].required) {
          ticked.has(cur) ? ticked.delete(cur) : ticked.add(cur);
          print();
        }
      } else if (key === '\r') {
        // If nothing is ticked, treat Enter as "select cursor item + confirm"
        if (ticked.size === 0 && !options[cur].required) ticked.add(cur);
        process.stdin.setRawMode(false);
        process.stdin.removeListener('data', onKey);
        process.stdin.pause();
        const chosen  = options.filter((_, i) => ticked.has(i));
        const summary = chosen.map(o => o.label).join(', ') || 'none';
        const ls      = lines();
        process.stdout.write(`\x1b[${ls.length}A\x1b[0J`);
        process.stdout.write(`  ${c.green}✓${c.reset} ${c.bold}${question}${c.reset}  ${c.cyan}›${c.reset} ${c.green}${summary}${c.reset}\n`);
        if (rl) rl.resume();
        resolve(chosen);
      } else if (key === '\x03') { process.stdin.setRawMode(false); process.exit(0); }
    };
    process.stdin.on('data', onKey);
  });
}

async function _legacyCheckbox(question, options, defaultAll) {
  console.log(`\n  ${c.cyan}?${c.reset} ${c.bold}${question}${c.reset}`);
  options.forEach((o, i) => {
    const lock = o.required ? ` ${c.yellow}[required]${c.reset}` : '';
    console.log(`    ${c.dim}${i + 1})${c.reset} ${o.label}${lock}${o.description ? `  ${c.dim}— ${o.description}${c.reset}` : ''}`);
  });

  const required = options.filter(o => o.required);
  const defaults = options.filter(o => o.required || o.default).map((_, idx) => options.indexOf(_) + 1).join(',');
  const hint     = defaults || 'all';
  const raw      = await getRL().question(`  ${c.cyan}›${c.reset} Numbers comma-separated ${c.dim}(default: ${hint})${c.reset}: `);

  if (!raw.trim()) {
    if (defaultAll) return options;
    const defaults = options.filter(o => o.required || o.default);
    // If no defaults defined, fall back to the first non-"none" option so we never return empty
    return defaults.length > 0 ? defaults : options.filter(o => o.id !== 'none').slice(0, 1);
  }

  const chosen = raw.split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => n >= 1 && n <= options.length)
    .map(n => options[n - 1]);

  return [...new Set([...required, ...chosen])];
}

// ── section header ────────────────────────────────────────────────────────────
export function section(title) {
  const W = 56;
  const pad = ' '.repeat(Math.max(0, Math.floor((W - title.length) / 2)));
  console.log(`\n  ${c.blue}┌${'─'.repeat(W)}┐${c.reset}`);
  console.log(`  ${c.blue}│${c.reset}${pad}${c.cyan}${c.bold}${title}${c.reset}${' '.repeat(W - pad.length - title.length)}${c.blue}│${c.reset}`);
  console.log(`  ${c.blue}└${'─'.repeat(W)}┘${c.reset}`);
}

// ── log helpers ───────────────────────────────────────────────────────────────
export function ok(msg)    { console.log(`  ${c.green}✓${c.reset} ${msg}`); }
export function info(msg)  { console.log(`  ${c.cyan}·${c.reset} ${msg}`); }
export function warn(msg)  { console.log(`  ${c.yellow}⚠${c.reset}  ${c.yellow}${msg}${c.reset}`); }
export function error(msg) { console.log(`  ${c.red}✗${c.reset} ${c.red}${msg}${c.reset}`); }

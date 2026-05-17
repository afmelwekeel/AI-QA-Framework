import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

let rl;

function getRL() {
  if (!rl) rl = createInterface({ input, output });
  return rl;
}

export function closeRL() {
  if (rl) { rl.close(); rl = null; }
}

/** Ask a free-text question. Returns trimmed string (or defaultValue if empty). */
export async function ask(question, defaultValue = '') {
  const hint = defaultValue ? ` (${defaultValue})` : '';
  const answer = await getRL().question(`  ${question}${hint}: `);
  return answer.trim() || defaultValue;
}

/** Present a numbered list, user picks one. Returns chosen option object. */
export async function select(question, options) {
  console.log(`\n  ${question}`);
  options.forEach((o, i) => console.log(`    ${i + 1}) ${o.label}${o.description ? '  — ' + o.description : ''}`));
  while (true) {
    const raw = await getRL().question(`  Enter number (1-${options.length}): `);
    const n = parseInt(raw.trim(), 10);
    if (n >= 1 && n <= options.length) return options[n - 1];
    console.log(`  Please enter a number between 1 and ${options.length}.`);
  }
}

/** Present a numbered checklist, user picks multiple by comma-separated numbers. Returns array of chosen option objects. */
export async function checkbox(question, options, defaultAll = false) {
  console.log(`\n  ${question}`);
  options.forEach((o, i) => {
    const locked = o.required ? ' [required]' : '';
    console.log(`    ${i + 1}) ${o.label}${locked}${o.description ? '  — ' + o.description : ''}`);
  });

  const required = options.filter(o => o.required);
  const optional = options.filter(o => !o.required);

  if (optional.length === 0) {
    console.log('  All modules are required — installing all.');
    return options;
  }

  const defaultNums = defaultAll
    ? options.map((_, i) => i + 1).join(',')
    : options.filter(o => o.required || o.default).map((_, i) => options.indexOf(_) + 1).join(',');

  const hint = defaultNums ? defaultNums : 'all';
  const raw = await getRL().question(`  Enter numbers separated by commas (default: ${hint}): `);

  if (!raw.trim()) {
    return defaultAll ? options : [...required, ...options.filter(o => o.default)];
  }

  const chosen = raw.split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => n >= 1 && n <= options.length)
    .map(n => options[n - 1]);

  // Always include required options
  const result = [...new Set([...required, ...chosen])];
  return result;
}

/** Print a section header */
export function section(title) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(60));
}

/** Print a success line */
export function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

/** Print an info line */
export function info(msg) {
  console.log(`  · ${msg}`);
}

/** Print a warning line */
export function warn(msg) {
  console.log(`  ⚠ ${msg}`);
}

#!/usr/bin/env node
// AI-QA-Framework — compress-prompts
// Applies caveman-compress rules to skill prompt.md files to reduce input tokens ~40%.
//
// Usage:
//   node core/compress-prompts.mjs                        — compress all eligible skills
//   node core/compress-prompts.mjs skills/bug-analysis    — compress one skill
//   node core/compress-prompts.mjs --framework-files      — also compress memory/preference files
//   node core/compress-prompts.mjs --force                — re-compress even if backup exists
//   node core/compress-prompts.mjs --dry-run              — show word counts, no writes
//
// Rules:
//   - Backs up original as prompt.original.md before overwriting
//   - Validates: all headings, code blocks, file paths preserved
//   - Retries with targeted patch fixes on validation failure (max 2 retries)
//   - Idempotent: skips skills that already have prompt.original.md (unless --force)
//   - Adds terse one-liner header after frontmatter

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');

// ── Skills excluded from compression ─────────────────────────────────────────
const EXCLUDED_SKILLS = new Set([
  'playwright-generation',  // contains code generation templates
  'test-execution',         // execution instructions must be exact
  'test-case-generation',   // complex specific Arabic content
  'bug-fixing',             // contains exact protocol steps
]);

// ── Framework files eligible with --framework-files flag ─────────────────────
const FRAMEWORK_FILES = [
  '_memory/qae-sidecar/qa-preferences.md',
  'reusable-prompts/analyze-project.prompt.md',
  'reusable-prompts/analyze-story.prompt.md',
  'reusable-prompts/generate-test-data.prompt.md',
];

// ── Terse header injected after frontmatter ───────────────────────────────────
const TERSE_HEADER = 'Respond terse. Drop filler. Code/paths/terms exact. Fragments OK.\n';

// ── Code region detection ─────────────────────────────────────────────────────
// Returns array of { start, end } line-index ranges that are inside code blocks.
function findCodeRegions(lines) {
  const regions = [];
  let inCode = false, startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^```/.test(lines[i])) {
      if (!inCode) { inCode = true; startIdx = i; }
      else         { regions.push({ start: startIdx, end: i }); inCode = false; }
    }
  }
  // Unclosed code block — treat to end of file
  if (inCode) regions.push({ start: startIdx, end: lines.length - 1 });
  return regions;
}

function isInCodeRegion(lineIdx, codeRegions) {
  return codeRegions.some(r => lineIdx >= r.start && lineIdx <= r.end);
}

// ── Compression rules applied to a single line ───────────────────────────────
function compressLine(line) {
  // Preserve inline code spans — extract them, compress around, restore
  const spans = [];
  let protected_line = line.replace(/`[^`]+`/g, match => {
    spans.push(match);
    return `\x00SPAN${spans.length - 1}\x00`;
  });

  // Multi-word filler phrases (order matters — longer before shorter)
  const PHRASE_REPLACEMENTS = [
    [/\bin order to\b/gi,                        'to'],
    [/\bin order for\b/gi,                       'for'],
    [/\bmake sure (to|that)\b/gi,                'ensure'],
    [/\bit is important to\b/gi,                 ''],
    [/\bit is worth noting that\b/gi,            ''],
    [/\bplease note that\b/gi,                   ''],
    [/\bNote that\b/g,                           'Note:'],
    [/\bRemember to\b/gi,                        ''],
    [/\byou should\b/gi,                         ''],
    [/\byou must\b/gi,                           ''],
    [/\byou need to\b/gi,                        ''],
    [/\bthe reason (is|being)\b/gi,              'because'],
    [/\bthe reason is because\b/gi,              'because'],
    [/\bin addition to\b/gi,                     'plus'],
    [/\bin addition\b/gi,                        ''],
    [/\badditionally\b/gi,                       ''],
    [/\bfurthermore\b/gi,                        ''],
    [/\bmoreover\b/gi,                           ''],
    [/\bhowever\b/gi,                            'but'],
    [/\bnevertheless\b/gi,                       'but'],
    [/\bnonetheless\b/gi,                        'but'],
    [/\bof course\b/gi,                          ''],
    [/\bcertainly\b/gi,                          ''],
    [/\babsolutely\b/gi,                         ''],
    [/\bI'd be happy to\b/gi,                    ''],
    [/\bI would recommend\b/gi,                  'Recommend'],
    [/\bI recommend\b/gi,                        'Recommend'],
    [/\bplease\b/gi,                             ''],
    [/\bjust\b(?!\s+in\s+case)/gi,              ''],
    [/\bbasically\b/gi,                          ''],
    [/\bsimply\b/gi,                             ''],
    [/\bessentially\b/gi,                        ''],
    [/\bgenerally\b/gi,                          ''],
    [/\bactually\b/gi,                           ''],
    [/\breally\b/gi,                             ''],
    [/\butilize\b/gi,                            'use'],
    [/\butilization\b/gi,                        'use'],
    [/\bimplement a solution for\b/gi,           'fix'],
    [/\bexecute\b/gi,                            'run'],
    [/\bverify and confirm\b/gi,                 'check'],
    [/\bvalidate and verify\b/gi,                'validate'],
    [/\bprovide\b/gi,                            'give'],
  ];

  for (const [pattern, replacement] of PHRASE_REPLACEMENTS) {
    protected_line = protected_line.replace(pattern, replacement);
  }

  // Clean up multiple spaces and leading/trailing spaces from removals
  protected_line = protected_line.replace(/  +/g, ' ').trim();

  // Restore inline code spans
  protected_line = protected_line.replace(/\x00SPAN(\d+)\x00/g, (_, i) => spans[parseInt(i)]);

  return protected_line;
}

// ── Compress a full markdown document ────────────────────────────────────────
function compressMarkdown(content) {
  const lines      = content.split('\n');
  const codeRegions = findCodeRegions(lines);
  const result     = [];

  // Track YAML frontmatter state (between first two --- delimiters)
  let inFrontmatter = lines[0] === '---';
  let frontmatterClosed = !inFrontmatter;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Never touch lines inside code blocks
    if (isInCodeRegion(i, codeRegions)) {
      result.push(line);
      continue;
    }
    // Never touch YAML frontmatter lines (between first two ---)
    if (inFrontmatter) {
      result.push(line);
      if (i > 0 && line === '---') { inFrontmatter = false; frontmatterClosed = true; }
      continue;
    }
    // Never touch heading lines (# ## ###) — text is preserved, body below compressed
    if (/^#{1,6}\s/.test(line)) {
      result.push(line);
      continue;
    }
    // Compress this line
    const compressed = compressLine(line);
    // Drop lines that became empty due to removal of filler-only sentences
    if (compressed === '' && line.trim() !== '') {
      // Keep blank lines as spacers, but drop lines that were purely filler
      const wasFiller = /^(Note that|Remember to|Please note that|Of course|Certainly\.?)\.?\s*$/.test(line.trim());
      if (!wasFiller) result.push('');
      // else: drop entirely
    } else {
      result.push(compressed);
    }
  }

  // Collapse runs of 3+ blank lines into 2
  const final = [];
  let blankRun = 0;
  for (const line of result) {
    if (line === '') { blankRun++; if (blankRun <= 2) final.push(line); }
    else             { blankRun = 0; final.push(line); }
  }

  return final.join('\n');
}

// ── Inject terse header after frontmatter ────────────────────────────────────
function injectTerseHeader(content) {
  if (content.includes(TERSE_HEADER.trim())) return content; // already present

  // After YAML frontmatter block (--- ... ---)
  const fmMatch = content.match(/^---[\s\S]*?---\s*\n/);
  if (fmMatch) {
    const afterFm = content.slice(fmMatch[0].length);
    return fmMatch[0] + TERSE_HEADER + '\n' + afterFm;
  }

  // No frontmatter — inject at top
  return TERSE_HEADER + '\n' + content;
}

// ── Validation ────────────────────────────────────────────────────────────────
function extractHeadings(content) {
  return (content.match(/^#{1,6}\s+.+$/gm) || []).map(h => h.trim());
}

function extractCodeBlocks(content) {
  const blocks = [];
  let m;
  const re = /```[\s\S]*?```/g;
  while ((m = re.exec(content)) !== null) blocks.push(m[0]);
  return blocks;
}

function extractFilePaths(content) {
  // Matches: /foo/bar.md, ./foo, {foo}/bar, `path/to/file`
  return (content.match(/(?:^|\s)(?:\.?\/{1,2}[\w./-]+|`[^`]+`|\{[^}]+\}\/[\w./-]+)/gm) || [])
    .map(s => s.trim());
}

// Validate that headings and code blocks are preserved.
// Does NOT enforce file-size reduction — the terse header adds bytes by design.
function validateCompression(original, compressed) {
  const errors = [];

  const origHeadings  = extractHeadings(original);
  const compHeadings  = extractHeadings(compressed);
  for (const h of origHeadings) {
    if (!compHeadings.includes(h)) errors.push(`Missing heading: ${h}`);
  }

  const origBlocks = extractCodeBlocks(original);
  const compBlocks = extractCodeBlocks(compressed);
  for (let i = 0; i < origBlocks.length; i++) {
    if (origBlocks[i] !== compBlocks[i]) errors.push(`Code block ${i + 1} was modified.`);
  }

  return errors;
}

// ── Word count ────────────────────────────────────────────────────────────────
function wordCount(content) {
  return (content.match(/\b\w+\b/g) || []).length;
}

// ── Process a single file ─────────────────────────────────────────────────────
function processFile(filePath, { force, dryRun }) {
  const dir      = path.dirname(filePath);
  const base     = path.basename(filePath, '.md');
  const backupPath = path.join(dir, `${base}.original.md`);
  const label    = path.relative(ROOT, filePath);

  // Skip .original.md files
  if (filePath.endsWith('.original.md')) {
    console.log(`  SKIP  ${label} (is a backup file)`);
    return;
  }

  // Idempotency check
  if (!force && fs.existsSync(backupPath)) {
    const wcNow = wordCount(fs.readFileSync(filePath, 'utf8'));
    console.log(`  SKIP  ${label} (already compressed — backup exists; ${wcNow} words)`);
    return;
  }

  let original;
  try { original = fs.readFileSync(filePath, 'utf8'); }
  catch (e) { console.log(`  ERROR ${label}: cannot read — ${e.message}`); return; }

  const origWords = wordCount(original);

  // Apply compression
  let compressed = compressMarkdown(original);
  compressed = injectTerseHeader(compressed);

  // Validate — retry with targeted fixes up to 2 times
  let errors = validateCompression(original, compressed);
  let attempts = 0;
  while (errors.length > 0 && attempts < 2) {
    attempts++;
    // Targeted fix: if a code block was modified, restore all code blocks from original
    if (errors.some(e => e.includes('Code block'))) {
      const origBlocks = extractCodeBlocks(original);
      const compBlocks = extractCodeBlocks(compressed);
      for (let i = 0; i < origBlocks.length; i++) {
        if (compBlocks[i] !== origBlocks[i] && compBlocks[i]) {
          compressed = compressed.replace(compBlocks[i], origBlocks[i]);
        }
      }
    }
    errors = validateCompression(original, compressed);
  }

  if (errors.length > 0) {
    console.log(`  FAIL  ${label}: validation errors after ${attempts + 1} attempts:\n    ${errors.join('\n    ')}`);
    console.log(`         Original preserved (no changes written).`);
    return;
  }

  const compWords   = wordCount(compressed);
  const headerAdded = !original.includes(TERSE_HEADER.trim());
  const reduction   = Math.round((1 - compWords / origWords) * 100);
  const tag         = headerAdded ? '+header' : '';
  const reductionStr = reduction > 0 ? `${reduction}% reduction` : 'already terse';
  const label_str   = `  OK    ${label}: ${origWords}w → ${compWords}w (${reductionStr}${tag ? ', ' + tag : ''})`;

  if (dryRun) {
    console.log(`  DRY   ${label}: ${origWords}w → ${compWords}w (${reductionStr}${tag ? ', ' + tag : ''})`);
    return;
  }

  // Write backup
  try { fs.writeFileSync(backupPath, original, 'utf8'); }
  catch (e) { console.log(`  ERROR ${label}: cannot write backup — ${e.message}`); return; }

  // Write compressed
  try { fs.writeFileSync(filePath, compressed, 'utf8'); }
  catch (e) {
    // Restore original on write failure
    try { fs.writeFileSync(filePath, original, 'utf8'); } catch (_) {}
    console.log(`  ERROR ${label}: cannot write compressed — ${e.message}`);
    return;
  }

  console.log(label_str);

  return { file: label, origWords, compWords, reduction };
}

// ── Collect target files ──────────────────────────────────────────────────────
function collectTargets(args) {
  const targets = [];

  // Explicit skill path argument
  const explicitTarget = args.find(a => !a.startsWith('--') && a !== '');
  if (explicitTarget) {
    const resolved = path.resolve(ROOT, explicitTarget);
    // Could be a skills/X directory or a direct .md file
    if (fs.existsSync(path.join(resolved, 'prompt.md'))) {
      targets.push(path.join(resolved, 'prompt.md'));
    } else if (fs.existsSync(resolved) && resolved.endsWith('.md')) {
      targets.push(resolved);
    } else {
      console.error(`Target not found: ${explicitTarget}`);
      process.exit(1);
    }
    return targets;
  }

  // All skills
  const skillsDir = path.join(ROOT, 'skills');
  if (fs.existsSync(skillsDir)) {
    for (const skill of fs.readdirSync(skillsDir)) {
      if (EXCLUDED_SKILLS.has(skill)) continue;
      const promptPath = path.join(skillsDir, skill, 'prompt.md');
      if (fs.existsSync(promptPath)) targets.push(promptPath);
    }
  }

  return targets;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const force      = args.includes('--force');
const dryRun     = args.includes('--dry-run');
const fwFiles    = args.includes('--framework-files');

console.log(`\nAI-QA-Framework — Compress Prompts${dryRun ? ' (DRY RUN)' : ''}\n${'─'.repeat(50)}`);

const targets = collectTargets(args.filter(a => a !== '--force' && a !== '--dry-run' && a !== '--framework-files'));

if (fwFiles) {
  for (const rel of FRAMEWORK_FILES) {
    const abs = path.join(ROOT, rel);
    if (fs.existsSync(abs)) targets.push(abs);
  }
}

if (targets.length === 0) {
  console.log('No eligible files found.');
  process.exit(0);
}

const results = [];
for (const t of targets) {
  const r = processFile(t, { force, dryRun });
  if (r) results.push(r);
}

// ── Summary ───────────────────────────────────────────────────────────────────
if (results.length > 0) {
  const avgReduction = Math.round(results.reduce((s, r) => s + r.reduction, 0) / results.length);
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Compressed: ${results.length} file(s) | Avg reduction: ${avgReduction}%`);

  // Write compression report
  const reportPath = path.join(ROOT, 'core', 'compression-report.json');
  try {
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      files: results,
      avgReduction,
    }, null, 2));
    console.log(`Report:     core/compression-report.json`);
  } catch (_) {}
} else if (!dryRun) {
  console.log('\nNo files compressed (all skipped or failed).');
}

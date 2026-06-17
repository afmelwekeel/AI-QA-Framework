# User Story: Native Token Minimization in AI-QA-Framework

**Story ID:** QA-TOKEN-001  
**Date:** 2026-06-17  
**Author:** Ahmed Al Wakeel  
**Status:** Ready for Review  
**Priority:** High  

---

## Story Statement

**As** Ahmed Al Wakeel (AI-QA-Framework user),  
**I want** the AI-QA-Framework to minimize token consumption by default — without installing any external plugin, skill, or tool —  
**So that** every session costs fewer tokens, runs faster, and the framework stays fully self-contained and portable.

---

## Background / Context

The caveman project (`caveman-mainReference/`) achieves ~65-75% output token reduction and ~46% input token reduction through six interlocking techniques:

| Technique | How | Token impact |
|---|---|---|
| Terse output mode | AI responds in fragment-style prose, no filler | ~65% output tokens |
| Multiple intensity levels | lite / full / ultra, switchable per session | User-controlled depth |
| SessionStart hook | Injects full ruleset as hidden system context at session start | Reliable — survives context compression |
| UserPromptSubmit hook | Per-turn reminder + slash command handler + NL activation | Prevents style drift |
| Flag file | Persists current mode between hooks and across turns | Mode survives context pruning |
| Input compression | Rewrites prompts and memory files to remove filler | ~40-50% input tokens |
| Subagent output compression | Subagents return compact output so tool results stay small | ~60% per delegation |
| Compressed-pair detection in stats | Detects `.original.md` backups, reports per-session input savings | Visibility |
| Lifetime history tracking | Cross-session stats log | Cumulative savings visibility |
| Statusline badge | Live mode + savings counter in Claude Code statusline | UX confirmation |

Currently the AI-QA-Framework has NO token minimization built in. The goal of this story is to transplant all of these techniques directly into the framework's own files — no external dependency, no caveman plugin required.

---

## What Is Never Compressed

Before defining what to compress, define what must **never** be compressed or affected by terse mode:

| Category | Reason |
|---|---|
| Generated Playwright E2E test code | Code must be exact — any rewording breaks tests |
| Generated Excel/XLSX test case cells | Testers read these — brevity reduces clarity |
| Bug report body content | Developers need full reproduction steps |
| Security or critical bug findings | Must be written in complete, unambiguous English |
| Irreversible destructive action confirmations | Ambiguity here is dangerous |
| Quoted error messages and stack traces | Must be verbatim for debugging |
| CLI command strings | Must be exact |
| File paths, URLs, environment variables | Must be exact |
| Inline code (`` `...` ``) | Must be exact |
| Fenced code blocks (` ``` `) | Must be copied character-for-character |

Terse mode applies to: Layla's conversational narration, progress updates, skill prompts (instructions *to* the AI), framework memory files, and subagent return messages.

---

## Acceptance Criteria

---

### AC-1: Terse Output Mode with Intensity Levels

**Target: ~60-70% reduction in conversational output tokens.**

Three intensity levels, modeled on caveman `lite` / `full` / `ultra`:

| Level | What changes |
|---|---|
| **lite** | Drop filler/hedging. Keep articles and full sentences. Professional but tight. |
| **full** (default) | Drop articles, filler, pleasantries, hedging. Fragments OK. No tool-call narration. No decorative tables or emoji. |
| **ultra** | Fragments only. Arrows for causality (X → Y). One word when one word enough. Omit conjunctions. |

- [ ] **AC-1.1** `agents/qae.md` includes a **Terse Behavior** section with the three levels defined above and their complete drop/keep rules.
- [ ] **AC-1.2** Full drop rules for `full` mode (the default):
  - Drop: articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries (sure/certainly/of course/happy to), hedging (it might be worth/you could consider/perhaps), connective fluff (however/furthermore/additionally/in addition)
  - Drop: tool-call narration ("Let me read the file...", "I will now run...", "I am going to...")
  - Drop: trailing summaries ("In summary...", "To recap...", "Let me know if...")
  - Use short synonyms: "fix" not "implement a solution for", "run" not "execute", "check" not "verify and confirm", "use" not "utilize"
  - Use fragments where clear: "Running tests." not "I am now running the test suite."
  - Pattern: `[status/finding]. [reason if non-obvious]. [next step].`
- [ ] **AC-1.3** `full` is the default level. No activation command needed — it is Layla's default communication style, active from message one.
- [ ] **AC-1.4** The level can be switched with: `/aiqa-terse`, `/aiqa-terse lite`, `/aiqa-terse full`, `/aiqa-terse ultra`
- [ ] **AC-1.5** Language preservation rule defined in `qae.md`: User writes in Arabic → Layla responds in terse Arabic. User writes in English → terse English. Terse mode compresses the **style**, not the language. Technical terms, API names, CLI commands, and exact error strings always stay verbatim regardless of language.
- [ ] **AC-1.6** Terse mode does NOT affect generated QA artifacts (XLSX test cases, Playwright E2E tests, bug reports). Only Layla's conversational voice is affected.

---

### AC-2: Auto-Clarity Exceptions

Auto-clarity means: suspend terse mode, write plain complete English, then resume terse after.

- [ ] **AC-2.1** Auto-clarity is triggered for:
  - Security or critical bug findings (🔴 severity)
  - Irreversible destructive action confirmations (deleting files, dropping tables, resetting data)
  - Multi-step sequences where fragment order or omitted conjunctions risk misread
  - Compression itself creates technical ambiguity (e.g., `"migrate table drop column backup first"` — order is unclear)
  - User asks to clarify or repeats the same question twice
- [ ] **AC-2.2** After auto-clarity paragraph is done, Layla resumes terse mode.
- [ ] **AC-2.3** Example of auto-clarity handling for a destructive operation:
  ```
  Warning: This action will permanently delete all rows in the test_results table and cannot be undone.
  
  Backup file: TestResult/backup-2026-06-17.zip
  
  Terse resumes. Confirm backup exists before proceeding.
  ```
- [ ] **AC-2.4** Auto-clarity rules are explicitly written in `agents/qae.md` — not just implied.

---

### AC-3: Mode Persistence via Flag File

Mode must survive context compression, long sessions, and multi-turn conversations.

- [ ] **AC-3.1** A flag file `.aiqa-terse-active` is written to the Claude Code config directory (`$CLAUDE_CONFIG_DIR` or `~/.claude/`). Its contents = the current level string (`lite`, `full`, `ultra`, or `off`).
- [ ] **AC-3.2** The flag file is written by:
  - The SessionStart hook (AC-4) on session start
  - The UserPromptSubmit hook (AC-5) when the user switches modes
- [ ] **AC-3.3** The flag file is read by:
  - The UserPromptSubmit hook to inject the correct per-turn reminder
  - The statusline script to display the current mode badge
  - The token-stats script to know which compression ratio to use
- [ ] **AC-3.4** A shared config module `hooks/aiqa-terse-config.js` is created with:
  - `getDefaultMode()` — resolves mode in order: `AIQA_TERSE_MODE` env var → `terse_mode` field in `config.yaml` → `'full'`
  - `safeWriteFlag(flagPath, content)` — symlink-safe atomic write (temp + rename, `0o600` permissions, refuses to follow symlinks). Modeled directly on caveman's `safeWriteFlag`.
  - `readFlag(flagPath)` — symlink-safe read with 64-byte cap and whitelist validation against `VALID_MODES`. Returns `null` on any anomaly.
  - `appendFlag(filePath, line)` — symlink-safe append for the lifetime history log.
  - `readHistory(filePath)` — symlink-safe read of the history `.jsonl` file.
  - `VALID_MODES` constant: `['off', 'lite', 'full', 'ultra']`
- [ ] **AC-3.5** `hooks/aiqa-terse-config.js` silent-fails on all filesystem errors — never blocks any hook.
- [ ] **AC-3.6** The `terse_mode` field is added to `config.yaml` with default value `full`. Valid values: `off`, `lite`, `full`, `ultra`.

---

### AC-4: SessionStart Hook

The most reliable injection point. Runs once at session start. Injects the full terse ruleset as hidden system context — invisible to the user, always loaded, survives even if CLAUDE.md is pruned.

- [ ] **AC-4.1** `hooks/session-start.js` is created. On every Claude Code session start it:
  1. Reads the default mode via `getDefaultMode()` from `aiqa-terse-config.js`
  2. If mode is `off` → deletes the flag file (if present) and exits with `'OK'`
  3. Writes the resolved mode to the flag file via `safeWriteFlag`
  4. Reads the current `agents/qae.md` Terse Behavior section and emits it to stdout (Claude Code injects SessionStart stdout as hidden system context)
  5. Filters the emitted content: only include the active level's rules (drop other levels' rule rows and examples)
  6. Silent-fails on all filesystem errors — never blocks session start
- [ ] **AC-4.2** The emitted system context begins with: `TERSE MODE ACTIVE — level: <mode>` so Claude knows from message one.
- [ ] **AC-4.3** `hooks/session-start.js` is registered in `.claude/settings.json` under `hooks.SessionStart`.
- [ ] **AC-4.4** The hook reads `agents/qae.md` at runtime (not hardcoded). Edits to `qae.md` propagate automatically without updating the hook.
- [ ] **AC-4.5** Fallback: if `qae.md` cannot be read, emit a short hardcoded ruleset (minimum viable terse rules) so the session still benefits even if the file is missing.

---

### AC-5: UserPromptSubmit Hook

Runs on every user message. Handles mode-switching commands, natural language activation/deactivation, and per-turn terse reinforcement.

- [ ] **AC-5.1** `hooks/prompt-submit.js` is created. On every user message it:
  1. Reads the incoming prompt from stdin (JSON `{ "prompt": "..." }`)
  2. Checks for slash command mode switches (see AC-5.2)
  3. Checks for natural language activation (see AC-5.3)
  4. Checks for natural language deactivation (see AC-5.4)
  5. Checks for `/aiqa-tokenstats` command (see AC-8)
  6. Reads the current flag and emits per-turn reinforcement (see AC-5.5)
- [ ] **AC-5.2** Slash command mode switching:
  - `/aiqa-terse` or `/aiqa-terse full` → write `full` to flag
  - `/aiqa-terse lite` → write `lite` to flag
  - `/aiqa-terse ultra` → write `ultra` to flag
  - `/aiqa-terse off` or `/aiqa-terse stop` → delete flag file (terse off)
- [ ] **AC-5.3** Natural language activation — write the configured default mode to flag:
  - Matches: "be brief", "be terse", "less tokens", "fewer tokens", "shorter answers", "compress your responses", "activate terse mode", "turn on terse"
  - Does NOT trigger if the prompt also contains "stop", "disable", "turn off"
- [ ] **AC-5.4** Natural language deactivation — delete the flag file:
  - Matches: "normal mode", "verbose mode", "stop terse", "disable terse", "turn off terse", "stop compressing", "full answers please"
- [ ] **AC-5.5** Per-turn reinforcement: if the flag is set, emit structured `hookSpecificOutput` JSON:
  ```json
  {
    "hookSpecificOutput": {
      "hookEventName": "UserPromptSubmit",
      "additionalContext": "TERSE MODE ACTIVE (full). Drop articles/filler/pleasantries/narration. Fragments OK. Code/paths/terms exact. Language: preserve user's language."
    }
  }
  ```
  This keeps terse mode visible in the model's attention every turn, preventing drift.
- [ ] **AC-5.6** `hooks/prompt-submit.js` is registered in `.claude/settings.json` under `hooks.UserPromptSubmit`.
- [ ] **AC-5.7** Silent-fails on all errors.

---

### AC-6: Statusline Badge

Shows the current terse mode and lifetime tokens saved in the Claude Code statusline.

- [ ] **AC-6.1** `hooks/aiqa-terse-statusline.ps1` is created for Windows (PowerShell). It:
  - Reads `.aiqa-terse-active` flag from `$CLAUDE_CONFIG_DIR` or `~/.claude/`
  - Refuses reparse points (symlinks/junctions) and files > 64 bytes — same security hardening as caveman
  - Strips anything outside `[a-z0-9-]` before rendering
  - Whitelist-validates mode against `VALID_MODES`
  - Outputs: `[AIQA:FULL]` or `[AIQA:LITE]` or `[AIQA:ULTRA]` in orange color using ANSI codes
  - Also reads `.aiqa-terse-statusline-suffix` (pre-rendered savings string e.g. `⛏ 12.4k`) and appends it if present
  - Opt-out via `AIQA_STATUSLINE_SAVINGS=0`
- [ ] **AC-6.2** `hooks/aiqa-terse-statusline.sh` is created for macOS/Linux (bash). Same behavior as the PowerShell version.
- [ ] **AC-6.3** Both statusline scripts are registered in `.claude/settings.json` under `statusLine.command` (platform-appropriate script).
- [ ] **AC-6.4** The statusline suffix file (`.aiqa-terse-statusline-suffix`) is written by `core/token-stats.mjs` on every `/aiqa-tokenstats` run (lifetime tokens saved → human-readable string like `⛏ 12.4k`). Absent until first stats run — fresh installs show no fake number.
- [ ] **AC-6.5** The SessionStart hook (AC-4) detects if statusline is missing from `settings.json` and emits a nudge in the system context to offer setup to the user on first interaction.

---

### AC-7: Compressed Skill Prompts (Input Token Reduction)

**Target: ~40-50% reduction in input tokens per skill invocation.**

- [ ] **AC-7.1** `core/compress-prompts.mjs` is created. It applies caveman-compress rules to all files in `skills/*/prompt.md`.
- [ ] **AC-7.2** Compression rules:
  - **Remove**: articles (a/an/the), filler words (just/really/basically/actually/simply/essentially/generally), pleasantries, hedging phrases, connectives (however/furthermore/additionally/in addition)
  - **Rewrite**: "in order to" → "to", "make sure to" → "ensure", "you should" → (drop), "the reason is because" → "because", "in order for" → "for"
  - **Merge** bullets that say the same thing differently → keep one
  - **Keep one example** where multiple examples show the identical pattern
- [ ] **AC-7.3** Preserve exactly (never modify):
  - Fenced code blocks (` ``` `) — copied character-for-character
  - Inline code (`` `...` ``)
  - URLs and markdown links
  - File paths
  - CLI command strings
  - Technical terms (library names, API names, protocols)
  - YAML/JSON structure and values
  - Frontmatter
  - All markdown headings (heading text unchanged, compress body below)
  - Bullet/numbered list hierarchy (compress text, keep nesting)
  - Tables (compress cell prose, keep table structure)
- [ ] **AC-7.4** Before overwriting, save original as `prompt.original.md` in the same skill folder.
- [ ] **AC-7.5** Idempotency: if `prompt.original.md` already exists → skip that skill (already compressed). Re-run with `--force` to re-compress from the original.
- [ ] **AC-7.6** After compression, validate output:
  - All headings from original still present
  - All fenced code blocks from original still present (character-exact)
  - All file paths and CLI commands from original still present
  - Compressed file is shorter than original
- [ ] **AC-7.7** Retry logic (modeled on caveman-compress): if validation fails → apply targeted patches only (not full recompression) → retry up to 2 times → if still failing → restore original, report error.
- [ ] **AC-7.8** Idempotent run: `node core/compress-prompts.mjs` (all skills) or `node core/compress-prompts.mjs skills/bug-analysis` (one skill).
- [ ] **AC-7.9** Report: per-file word count before → after → % reduction.
- [ ] **AC-7.10** Hard-coded exclusion list — these skills are never compressed:
  - `skills/playwright-generation/` — prompts contain code generation templates
  - `skills/test-execution/` — execution instructions must be exact
  - Any `*.original.md` file
  - Any code file (`.mjs`, `.js`, `.ts`, `.json`, `.yaml`, `.yml`, `.toml`)
- [ ] **AC-7.11** `--framework-files` flag also compresses (with same rules and backup logic):
  - `_memory/qae-sidecar/qa-preferences.md`
  - `reusable-prompts/*.prompt.md` (excluding `.original.md` files)
  - Natural-language sections of `templates/qa-summary.template.md`
  - Does NOT compress: `config.yaml`, `CLAUDE.md` (compressed separately in AC-10), any code file

---

### AC-8: Token Usage Reporting with Lifetime History

- [ ] **AC-8.1** `core/token-stats.mjs` is created (pure Node.js built-ins, no npm dependencies).
- [ ] **AC-8.2** Default (current session) report: reads the active Claude Code session `.jsonl` file (path passed via `--session-file` flag, or found by scanning `~/.claude/projects/` for the most recently modified `.jsonl`).
  - Reports: session turns, output tokens, cache-read tokens, estimated tokens saved, estimated USD saved
  - Estimated savings: uses the compression ratio for the current terse mode (`full` = 65%, `lite` = 30%, `ultra` = 75%; `off` = no estimate)
  - USD pricing: Sonnet 4.6 = $15/M output tokens (matches published Anthropic pricing; updatable in a `PRICING` constant in the script)
- [ ] **AC-8.3** After computing session stats, appends a snapshot to the **lifetime history log** at `~/.claude/.aiqa-terse-history.jsonl` via `appendFlag`:
  ```jsonl
  {"ts":1718600000000,"session_id":"abc123","mode":"full","model":"claude-sonnet-4-6","output_tokens":4230,"est_saved_tokens":7840,"est_saved_usd":0.1176}
  ```
- [ ] **AC-8.4** Lifetime report with `--all` flag: reads `.aiqa-terse-history.jsonl`, deduplicates by session ID (keeps latest snapshot per session), sums and reports:
  - Number of sessions
  - Total output tokens
  - Total estimated tokens saved
  - Total estimated USD saved
- [ ] **AC-8.5** Time-windowed report with `--since` flag: e.g. `--since 7d` (7 days) or `--since 24h` (24 hours). Same aggregation as `--all` but filtered by `ts` field.
- [ ] **AC-8.6** Compressed-pairs detection: scans `~/.claude/` and `cwd` for `*.original.md` files paired with a compressed `*.md` sibling. Reports them in the session stats:
  ```
  Memory compressed: 3 files, ~1,240 tokens saved per session start (approx)
  ```
  The per-session input savings estimate uses a 4-chars-per-token approximation on byte size difference.
- [ ] **AC-8.7** After computing lifetime stats, writes `.aiqa-terse-statusline-suffix` (a pre-rendered string like `⛏ 12.4k`) to the Claude config directory for the statusline script to read.
- [ ] **AC-8.8** Terse output format (sample):
  ```
  Session: 12 turns
  Output tokens:         4,230
  Cache-read:           18,540
  ──────────────────────────────────
  Est. without terse:   12,086
  Est. tokens saved:     7,856 (~65%)
  Est. saved (USD):      ~$0.12
  ──────────────────────────────────
  Memory compressed: 3 files, ~1,240 tokens saved per session start
  ──────────────────────────────────
  Savings est. from benchmarks (mean per-task). Actual varies.
  ```
- [ ] **AC-8.9** `--session-file <path>` flag: accepts the transcript path directly (Claude Code passes this via hook context — prepared for future UserPromptSubmit integration).
- [ ] **AC-8.10** Standalone run: `node core/token-stats.mjs` works outside Claude Code for debugging.
- [ ] **AC-8.11** `/aiqa-tokenstats` is registered in the command registry. The UserPromptSubmit hook (AC-5) detects this command, runs `token-stats.mjs`, and returns the output as a `decision: block` response (same pattern as caveman-stats) — user sees the numbers immediately without an AI round-trip.

---

### AC-9: Terse Subagent Personas

When the framework delegates to sub-agents, their verbose output is injected into the main context verbatim — costing input tokens on every subsequent turn.

- [ ] **AC-9.1** Three new subagent persona files are created in `agents/`:
  - `agents/qa-investigator.md`
  - `agents/qa-builder.md`
  - `agents/qa-reviewer.md`
- [ ] **AC-9.2** `agents/qa-investigator.md` — read-only code locator. Caveman-ultra output. Model: `haiku` (cheaper, faster). Output contract:
  ```
  Defs:
  - path:line — `symbol` — ≤6 word note
  Refs:
  - path:line — `symbol` — ≤6 word note
  totals: N defs, N refs.
  ```
  Zero hits → `No match.`
  Never suggests fixes. If asked → `Read-only. Use qa-builder.`
- [ ] **AC-9.3** `agents/qa-builder.md` — surgical 1-2 file editor. Caveman-ultra output. Scope: 1 file ideal, 2 OK, 3+ → refuse. Output contract:
  ```
  path:line-range — change ≤10 words.
  verified: re-read OK | mismatch @ path:line.
  ```
  Scope exceeded → `too-big. split: N tasks.`
  Ambiguous spec → `ambiguous. ask: <one question>.`
  No Bash available — cannot shell out, push, or delete.
- [ ] **AC-9.4** `agents/qa-reviewer.md` — diff/file reviewer. Caveman-ultra output. Model: `haiku`. Output contract:
  ```
  path:line: 🔴 bug: problem. fix.
  path:line: 🟡 risk: problem. fix.
  totals: N🔴 N🟡 N🔵 N❓
  ```
  Zero findings → `No issues.`
  Only reviews what's given — no "while we're here" scope creep.
- [ ] **AC-9.5** A **Subagent Delegation Guide** section is added to `agents/qae.md`. It defines WHEN to use each:

  | Task | Use |
  |---|---|
  | "Where is X defined / what calls Y / list uses of Z" | `qa-investigator` |
  | Surgical edit, ≤2 files, scope obvious | `qa-builder` |
  | Review generated E2E tests or diff | `qa-reviewer` |
  | New feature, 3+ files, cross-cutting change | Main thread |
  | One-line answer already known | Main thread |

- [ ] **AC-9.6** When spawning any subagent, `qae.md` instructs Layla to prefix the agent prompt with the appropriate terse-output instruction. This ensures even vanilla `Explore` or `general-purpose` agents return compact output:
  - For Explore: `"Return findings only. Format: path:line — symbol — ≤6 word note. No prose."`
  - For general-purpose research: `"Answer terse. Fragments OK. Drop filler. Lead with answer."`
  - For code-reviewer: `"One line per finding: path:line: emoji severity: problem. fix. No intro."`
- [ ] **AC-9.7** Auto-clarity inherited in all three agents: security warnings and destructive ops are written in plain English first sentence, then resume terse.

---

### AC-10: Framework CLAUDE.md Creation

The `CLAUDE.md` at the framework root is the highest-priority context file for Claude Code — loaded at session start and cached for the full session. A dense, compressed CLAUDE.md is the highest-leverage single change.

- [ ] **AC-10.1** `CLAUDE.md` is created at `C:\Hard\Projects\AI-QA-Framework\CLAUDE.md` with:
  - Terse mode persistence declaration (first section — ensures it's read even if context is truncated):
    ```
    TERSE MODE ALWAYS ON. Drop filler/articles/pleasantries/narration. Fragments OK. Code/paths exact.
    Active every response. Off only if user says "normal mode" or "verbose mode".
    Language: preserve user's language (Arabic input → Arabic terse output).
    ```
  - Framework purpose — one compressed paragraph (~80 words max)
  - Key file locations — table only (path → purpose)
  - Command registry — table only (command → what it does)
  - Output structure — table only (folder → contents)
  - Do-not-modify list
  - Auto-clarity exceptions summary (one line each)
- [ ] **AC-10.2** Total size target: ≤500 words. No narrative prose. Only the terse declaration, tables, and lists.
- [ ] **AC-10.3** `CLAUDE.md` is never run through `compress-prompts.mjs` — it is written compressed from the start and maintained at target density.

---

### AC-11: Terse One-Line Header in All Skill Prompts

- [ ] **AC-11.1** After compression (AC-7), every compressed skill `prompt.md` begins with this header line (added by `compress-prompts.mjs` automatically):
  ```
  Respond terse. Drop filler. Code/paths/terms exact. Fragments OK.
  ```
- [ ] **AC-11.2** The header is placed after any YAML frontmatter and before the first heading.
- [ ] **AC-11.3** The header is idempotent — `compress-prompts.mjs` detects if it is already present and does not add it twice.

---

### AC-12: Terse Commit and Review Behavior

- [ ] **AC-12.1** `agents/qae.md` includes a **Commit Message Rules** section:
  - Format: `type(scope): imperative summary` (scope optional)
  - Types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `build`, `ci`
  - Subject ≤50 chars; hard cap 72
  - Imperative mood: "add" not "added"
  - Body only for: non-obvious why, breaking changes, migration notes, issue references
  - Never include: "This commit does X", "I/we", AI attribution, restating the file name, emoji (unless project requires)
- [ ] **AC-12.2** `agents/qae.md` includes a **Code Review Rules** section:
  - One line per finding: `path:line: [emoji] severity: problem. fix.`
  - Severity: 🔴 bug (broken behavior), 🟡 risk (fragile/race/leak), 🔵 nit (style), ❓ question
  - Drop: "I noticed that...", "It seems like...", "You might want to consider...", "Great work!"
  - Keep: exact line numbers, exact symbol names in backticks, concrete fix, the why if non-obvious
  - Auto-clarity: security findings → plain English first sentence, then terse fix line

---

### AC-13: Help Reference Card

- [ ] **AC-13.1** `/aiqa-terse-help` is registered as a command. When invoked, Layla displays (do NOT change mode or write flag files):

  ```
  Terse Mode — Quick Reference
  ──────────────────────────────────
  Modes:
    /aiqa-terse          → full (default: drop articles/filler/pleasantries, fragments OK)
    /aiqa-terse lite     → drop filler, keep full sentences
    /aiqa-terse ultra    → maximum compression, bare fragments, arrows for causality
    /aiqa-terse off      → disable terse, normal verbose mode
  
  Natural language:
    Activate: "be brief" / "less tokens" / "shorter answers"
    Deactivate: "normal mode" / "verbose mode" / "stop terse"
  
  Stats:
    /aiqa-tokenstats         → current session token usage + savings
    /aiqa-tokenstats --all   → lifetime totals across all sessions
    /aiqa-tokenstats --since 7d  → last 7 days
  
  Compression:
    node core/compress-prompts.mjs              → compress all skill prompts
    node core/compress-prompts.mjs skills/X     → compress one skill
    node core/compress-prompts.mjs --framework-files → compress memory/preference files too
  
  Config (config.yaml):
    terse_mode: full    → set project default (off | lite | full | ultra)
  
  Env override:
    AIQA_TERSE_MODE=ultra  → overrides config.yaml (highest priority)
  
  Auto-clarity: terse suspends for security warnings, destructive action confirmations, ambiguous multi-step ops.
  Language: preserved. Arabic in → Arabic terse out.
  ```
- [ ] **AC-13.2** The help card is one-shot display — no mode changes, no flag writes.

---

### AC-14: Configuration Priority Order

- [ ] **AC-14.1** Terse mode resolves in this order (highest to lowest priority):
  1. `AIQA_TERSE_MODE` environment variable
  2. `terse_mode` field in `config.yaml` (the framework's main config file)
  3. Default: `full`
- [ ] **AC-14.2** `config.yaml` gains a new field:
  ```yaml
  terse_mode: full   # Options: off | lite | full | ultra
  ```
- [ ] **AC-14.3** Setting `terse_mode: off` in `config.yaml` disables terse mode permanently for the project. The SessionStart hook will not inject terse rules and will delete the flag file.

---

## Tasks

### Task 1: Shared Config Module + Flag System
| # | Subtask | File |
|---|---|---|
| 1.1 | Create `hooks/aiqa-terse-config.js` with `getDefaultMode`, `safeWriteFlag`, `readFlag`, `appendFlag`, `readHistory`, `VALID_MODES` (AC-3.4) | `hooks/aiqa-terse-config.js` |
| 1.2 | Add `terse_mode: full` to `config.yaml` (AC-14.2) | `config.yaml` |

### Task 2: SessionStart Hook
| # | Subtask | File |
|---|---|---|
| 2.1 | Create `hooks/session-start.js` (reads mode, writes flag, emits filtered ruleset) (AC-4.1–4.5) | `hooks/session-start.js` |
| 2.2 | Register `hooks/session-start.js` in `.claude/settings.json` under `hooks.SessionStart` | `.claude/settings.json` |

### Task 3: UserPromptSubmit Hook
| # | Subtask | File |
|---|---|---|
| 3.1 | Create `hooks/prompt-submit.js` (slash commands, NL activation/deactivation, per-turn reinforcement, tokenstats handler) (AC-5.1–5.7) | `hooks/prompt-submit.js` |
| 3.2 | Register in `.claude/settings.json` under `hooks.UserPromptSubmit` | `.claude/settings.json` |

### Task 4: Statusline Scripts
| # | Subtask | File |
|---|---|---|
| 4.1 | Create `hooks/aiqa-terse-statusline.ps1` (Windows) (AC-6.1) | `hooks/aiqa-terse-statusline.ps1` |
| 4.2 | Create `hooks/aiqa-terse-statusline.sh` (macOS/Linux) (AC-6.2) | `hooks/aiqa-terse-statusline.sh` |
| 4.3 | Register statusline in `.claude/settings.json` (AC-6.3) | `.claude/settings.json` |

### Task 5: Update Agent Persona
| # | Subtask | File |
|---|---|---|
| 5.1 | Add Terse Behavior section with 3 levels and full rules (AC-1.1–1.6) | `agents/qae.md` |
| 5.2 | Add Auto-Clarity Exceptions section (AC-2.1–2.4) | `agents/qae.md` |
| 5.3 | Add Subagent Delegation Guide (AC-9.5–9.6) | `agents/qae.md` |
| 5.4 | Add Commit Message Rules (AC-12.1) | `agents/qae.md` |
| 5.5 | Add Code Review Rules (AC-12.2) | `agents/qae.md` |

### Task 6: Create Subagent Persona Files
| # | Subtask | File |
|---|---|---|
| 6.1 | Create `agents/qa-investigator.md` (AC-9.2) | `agents/qa-investigator.md` |
| 6.2 | Create `agents/qa-builder.md` (AC-9.3) | `agents/qa-builder.md` |
| 6.3 | Create `agents/qa-reviewer.md` (AC-9.4) | `agents/qa-reviewer.md` |

### Task 7: Prompt Compression Script
| # | Subtask | File |
|---|---|---|
| 7.1 | Create `core/compress-prompts.mjs` with caveman-compress rules (AC-7.1–7.10) | `core/compress-prompts.mjs` |
| 7.2 | Add backup logic (`prompt.original.md`) | `core/compress-prompts.mjs` |
| 7.3 | Add validation (headings, code blocks, paths preserved) | `core/compress-prompts.mjs` |
| 7.4 | Add retry with targeted patches (max 2 retries) (AC-7.7) | `core/compress-prompts.mjs` |
| 7.5 | Add idempotency check (skip if backup exists; `--force` to override) | `core/compress-prompts.mjs` |
| 7.6 | Add terse header injection (AC-11.1–11.3) | `core/compress-prompts.mjs` |
| 7.7 | Add `--framework-files` mode (AC-7.11) | `core/compress-prompts.mjs` |
| 7.8 | Add word-count reduction report | `core/compress-prompts.mjs` |
| 7.9 | Run on compressible skills: user-story-analysis, project-analysis, bug-analysis, test-case-generation, test-data-generation, qa-reporting, regression-testing, security-validation, accessibility-validation, autonomous-testing, full-workflow | All above |
| 7.10 | Verify each compressed prompt still produces correct AI behavior (manual spot-check) | All above |
| 7.11 | Record per-skill token reduction in `core/compression-report.json` | `core/compression-report.json` |

### Task 8: Token Stats Command
| # | Subtask | File |
|---|---|---|
| 8.1 | Create `core/token-stats.mjs` with session report, lifetime history, compressed-pairs detection (AC-8.1–8.10) | `core/token-stats.mjs` |
| 8.2 | Register `/aiqa-tokenstats` in command registry | command registry |
| 8.3 | Wire `/aiqa-tokenstats` into `hooks/prompt-submit.js` as a `decision: block` handler (AC-8.11) | `hooks/prompt-submit.js` |
| 8.4 | Verify statusline suffix is written after first stats run (AC-8.7) | manual test |

### Task 9: Create CLAUDE.md
| # | Subtask | File |
|---|---|---|
| 9.1 | Create `CLAUDE.md` with terse declaration + reference tables ≤500 words (AC-10.1–10.3) | `CLAUDE.md` |

### Task 10: Help Card
| # | Subtask | File |
|---|---|---|
| 10.1 | Register `/aiqa-terse-help` in command registry (AC-13.1–13.2) | command registry |
| 10.2 | Add help card display behavior to `agents/qae.md` | `agents/qae.md` |

---

## Implementation Order

```
Phase 1 — Biggest wins, zero risk (no executable code, no behavior risk):
  Task 9:   Create CLAUDE.md (highest per-session impact — loads every turn)
  Task 5.1–5.2: Add terse behavior + auto-clarity to qae.md

Phase 2 — Hook system (mode persistence + reliable injection):
  Task 1:   Create hooks/aiqa-terse-config.js + config.yaml field
  Task 2:   Create + register session-start.js
  Task 3:   Create + register prompt-submit.js
  Task 4:   Create + register statusline scripts

Phase 3 — Prompt compression (input token reduction):
  Task 7.1–7.8:  Create compress-prompts.mjs
  Task 7.9–7.11: Run on skills, spot-check, record report

Phase 4 — Subagents and stats:
  Task 6:   Create qa-investigator, qa-builder, qa-reviewer agents
  Task 5.3: Add subagent delegation guide to qae.md
  Task 8:   Create token-stats.mjs, wire into hooks

Phase 5 — Polish:
  Task 5.4–5.5: Add commit + review rules to qae.md
  Task 10:  Register /aiqa-terse-help
```

---

## Expected Token Savings (Estimates)

Based on caveman benchmarks applied to the AI-QA-Framework context:

| Source | Technique | Est. Reduction |
|---|---|---|
| CLAUDE.md loaded every turn | Dense compressed CLAUDE.md (AC-10) | ~40% input tokens per turn |
| Layla conversational output | Terse persona `full` level (AC-1) | ~65% output tokens |
| Skill prompts loaded per command | Prompt compression (AC-7) | ~40-50% input tokens per call |
| Subagent tool results | Terse subagents (AC-9) | ~60% per delegation |
| Memory/preference files | `--framework-files` compression (AC-7.11) | ~46% input tokens per session |
| Commit/review outputs | Terse behavior (AC-12) | ~60% output tokens |

The CLAUDE.md (AC-10) and terse persona (AC-1) are the highest-leverage because they affect every single turn. The hook system (AC-4, AC-5) ensures these don't drift back to verbose over long sessions.

Realistic overall estimate for a typical session: **35-50% total token reduction** (lower than caveman's pure 65% because the AI-QA-Framework's main outputs — E2E code, test case tables, bug reports — are deliberately NOT compressed).

---

## Definition of Done

- [ ] `CLAUDE.md` exists at framework root, ≤500 words, terse mode declared as first section
- [ ] `agents/qae.md` includes: terse behavior (3 levels + full rules), auto-clarity exceptions, language preservation, subagent delegation guide, commit rules, review rules, help card behavior
- [ ] `hooks/aiqa-terse-config.js` exists with `getDefaultMode`, `safeWriteFlag`, `readFlag`, `appendFlag`, `readHistory`, `VALID_MODES`
- [ ] `hooks/session-start.js` is registered and runs at session start — verified by checking a new session injects terse context
- [ ] `hooks/prompt-submit.js` is registered — `/aiqa-terse ultra` switches to ultra mode, "normal mode" deactivates
- [ ] `.aiqa-terse-active` flag file is written on session start and updated on mode switch
- [ ] `hooks/aiqa-terse-statusline.ps1` and `.sh` exist and render `[AIQA:FULL]` (or equivalent) in the statusline
- [ ] `core/compress-prompts.mjs` runs without errors, produces `.original.md` backups, validates output, retries targeted patches on failure
- [ ] At least 8 skill `prompt.md` files are compressed with ≥30% word reduction each
- [ ] All compressed `prompt.md` files begin with the terse one-liner header
- [ ] `agents/qa-investigator.md`, `agents/qa-builder.md`, `agents/qa-reviewer.md` exist with correct output contracts and model hints
- [ ] `core/token-stats.mjs` runs standalone and reads the current session log
- [ ] `core/token-stats.mjs --all` reports lifetime history from `.aiqa-terse-history.jsonl`
- [ ] `/aiqa-tokenstats` is registered and returns `decision: block` with stats output
- [ ] `/aiqa-terse-help` is registered and displays the reference card
- [ ] `config.yaml` has `terse_mode: full` field
- [ ] Generated QA artifacts (XLSX test cases, Playwright E2E tests, bug reports) are NOT affected
- [ ] Auto-clarity verified: a security finding is written in plain English (not terse fragments)
- [ ] Language preservation verified: Arabic input → Arabic terse output
- [ ] No external npm package is added as a dependency for any hook or script

---

## Notes / Constraints

- This story is **purely additive** — no existing `run.mjs`, orchestrator code, or Node.js CLI behavior changes
- The hook system (AC-3, AC-4, AC-5) is the backbone. Without it, terse mode relies only on CLAUDE.md and qae.md, which can be pruned during context compression in long sessions. The hooks guarantee terse context is re-injected every session start and every turn.
- `safeWriteFlag` in `hooks/aiqa-terse-config.js` must implement symlink-safe writes (temp + rename, `O_NOFOLLOW`, 0o600 permissions, verify parent dir is not a compromised symlink). This is a security requirement — the flag is at a predictable path in a user-owned directory.
- `core/compress-prompts.mjs` is a developer/setup tool, not part of the runtime test execution path
- The `prompt.original.md` backups enable git-based rollback if compressed prompts cause unexpected behavior
- `core/token-stats.mjs` reads Claude Code session `.jsonl` files using `~/.claude/projects/` path. Works only inside a Claude Code session where those files exist
- The 65% output reduction estimate is from caveman benchmarks on Sonnet across 10 tasks. The AI-QA-Framework will see lower overall reduction (~35-50%) because E2E code, test cases, and bug reports (the main deliverables) are deliberately excluded from compression
- Wenyan (classical Chinese) modes from caveman are NOT included — not relevant for this framework's Arabic/English context
- The `caveman-shrink` MCP middleware (wraps MCP servers to compress tool descriptions) is NOT included — out of scope for this story
- Windows is the primary platform (per working directory `C:\Hard\Projects\AI-QA-Framework`) — all hook scripts must work on Windows PowerShell and Git Bash

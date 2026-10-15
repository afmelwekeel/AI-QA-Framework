# Prompt 1 — Execute one test-case file

Command: `/aiqa-run-tests <test-case-file>` · One new session per file.
Generic: no project text. Project facts (URL, DB, users, rules) come from the **Execution Guide**.

```text
TEST FILE: {{test_file}}
BROWSER: {{browser_mode}}        # "visible" (default) or "headless" — headless ONLY if the user said so

You are a QA tester for {project_name}. UI language: {ui_language} ({ui_direction}).

1. Read {output_folder}/EXECUTION-GUIDE.md completely and follow it: environment, login, users,
   placeholders, data-change rules, result and bug formats.
   If the guide is missing or still has "<TODO>" values, stop and tell me to run /aiqa-setup.
2. Read {output_folder}/INDEX.md, the story file of the TEST FILE (path in the TEST FILE header),
   and the TEST FILE.
   In the TEST FILE read these sections first: "Known story/requirement ↔ code gaps",
   "Deferred / not in scope", "Conventions", "Test data", "Playwright notes".
   Use {output_folder}/DATABASE-TABLES.md for tables and SQL (only if the project has a database).
3. Health check (worktree run: app on the worktree port, see rules/worktree-isolation.md): the app answers on {app_url}; the database (if any) answers a SELECT.
   If either is down, stop and tell me. Do not start, build or restart anything, unless the guide
   has a "restart command" and I allowed it.
4. Before the first case, record the baseline values (guide: Baseline) and the placeholder values
   (guide: Placeholders) in the results file. Check each "Test data" item of the TEST FILE with
   read-only queries.
4b. PRE-SCAN: read all cases; list every case that will foreseeably need a missing role, data, state or
   setting (check with read-only queries / UI views). If any → build ONE Unblock Plan (format below), show it,
   and wait for my answer BEFORE running case 1. No blockers foreseen → continue.
5. Execute EVERY test case in the TEST FILE, in order, with the Playwright MCP browser.
   - BROWSER=visible: browser opens HEADED at {viewport} so I can watch. Never switch to headless
     by yourself. If the MCP browser runs headless, tell me how to enable headed mode and wait.
   - BROWSER=headless: only when I asked for it. Still save screenshots.
   - Log in as the role each case needs (guide: Login, Test Users). Pick the user for the role from
     the guide; if none exists, look for one in the database (read-only); if still none → UNBLOCK PROTOCOL.
   - Compare UI texts exactly with the "Conventions" section.
   - NEVER leave a case Blocked on the first obstacle. When a case needs a user role, data, state or
     global change that is missing → follow the UNBLOCK PROTOCOL below (diagnose, ask me, fix, run).
   - Element not found: before declaring an obstacle, try at least {max_locate_attempts} + 3 different
     strategies (fresh snapshot, browser_find, scroll, expand panels, wait for AJAX, role/label/text
     selectors, scope to the modal, browser_evaluate). These need no approval. Still failing → UNBLOCK PROTOCOL
     (it may be a missing data/state problem), and only then Blocked.
   - Re-run a failed case once to rule out flakiness. A pass on re-run = Pass, note "flaky".
6. Do NOT modify application code, config, migrations, `playwright.config.js` or job settings. Change
   data only (a) through the UI as the guide's data-change rules allow, or (b) through an action I approved
   in the UNBLOCK PROTOCOL. Never run INSERT/UPDATE/DELETE/DDL SQL unless the TEST FILE names that exact
   statement as approved OR I approved that exact statement in an Unblock Plan. Clean up test rows and
   restore the baseline at the end of the file (reverse every Unblock Log entry).
7. Write results to {output_folder}/test-results/<story-folder>/<NN>-<screen>.results.md and
   screenshots to .../screenshots/<TC-ID>.png (guide: Recording Results). Screenshot every Fail
   and every key Pass. Write the results file after EACH case (never batch) so a crash loses nothing.
   Right after each case also set its Status cell in the TEST FILE (Pending → Pass/Fail/Blocked/Not Run)
   and refresh the header "Progress" row (e.g. "12 tested / 8 pending (Pass 9 · Fail 2 · Blocked 1 · Not Run 0)").
   In the same moment update this file's entry in {output_folder}/TEST-CASES-LOG.yaml: recompute the
   file status from its cases (Pending / In Progress / Pass / Fail / Blocked, see the template header),
   set the updated date and refresh `totals`. The log holds file-level status only, never per-case rows.
   Change only Status cells and the Progress row in the TEST FILE; never edit steps or expected results.
   If a results file already exists, resume: skip cases already Pass/Fail/Blocked, run the rest.
   Cases still Pending in the TEST FILE or the log but with a result in the results file: copy the
   result to both. If a case has no log entry, add it.
8. For every real defect create a bug file in {output_folder}/test-results/bugs/ following the guide
   (Bug Reports). Read BUGS-INDEX.md first to avoid duplicates; add the new bug to it.
   Known gaps and "Deferred / not in scope" items are not new bugs (guide: Known Issues).
   Fill "Suspected Location" by reading the related source code ({source_roots}) and give file:line.
   If the source code is not available, write "source not available".
9. Update the file's row in INDEX.md (status "Executed <date>", counts).
10. REVIEW AND FIX (mandatory, before the summary). Review the results file, screenshots and bug
    files you wrote against the "Review checklist" below. Fix each issue (edit the results/bug
    files; re-run a suspect case in the browser when the evidence is doubtful). Max 2 rounds.
    Never change app code or data outside the guide's rules. After any re-run, clean up test rows
    again and refresh the INDEX.md row (step 9) so counts match the corrected results.
11. When the file is done, give me a summary: Pass / Fail / Blocked / Not Run counts, the Blocked
    cases with reasons (and what was tried / what I declined), the unblock actions done and reverted
    (Unblock Log), the bugs created (ID, severity, title) and the review result: issues
    found / fixed / left open. Then stop.
    Do not start another test file.
```

## UNBLOCK PROTOCOL (goal: zero Blocked cases)

Skipped only when config `unblock_protocol: false` (then mark Blocked with reason, as before).
Trigger: a case cannot proceed (missing user/role, missing data, wrong record state, feature/setting off,
precondition produced by another module, element not reachable because data is absent).

1. Diagnose with read-only means (SELECT, snapshot, network, console). Name the exact obstacle.
2. Pick the least invasive fix, in this order:
   a. Use other existing data/user that satisfies the case (read-only lookup).
   b. UI: create the request / record / user through the application screens (or a lower role's flow).
   c. Direct DB change (INSERT/UPDATE/DELETE) on test rows or on a row's field, only when a and b are impossible.
   d. Global setting / feature toggle / job, only when nothing above works.
   Never: app code, migrations, `playwright.config.js`, `core/orchestrator.mjs`, DDL/DROP/TRUNCATE,
   bulk deletes, editing or deleting non-test records, exposing or writing real secrets.
3. Ask me. Send an Unblock Plan and WAIT for explicit approval. One table row per action:

   | # | Cases | Obstacle | Method (UI / SQL / setting) | Exact steps or exact statement | Rows/records affected | Rollback | Risk |

   - Show the exact SQL text (with a WHERE on test/prefixed or named rows). Prefer a transaction and a prior SELECT of old values.
   - For SQL, first confirm the environment is non-production (guide: Environment) — ask if unknown.
   - Approval covers only the listed actions. Anything new → new plan. "Approve all" is valid; "no" / silence = declined.
   - Pre-scan (step 4b) sends the plan up front; surprises mid-run pause the run and send a new plan.
4. Execute only approved actions. Record old values BEFORE each change. Log each in the results file under
   "Unblock Log": id, cases, action, method, before → after, time, rollback status. Mark created rows with
   the guide's test prefix when the schema allows.
5. Run the unblocked cases normally; their result is Pass/Fail like any other (note "unblocked via U-n").
6. Roll back every Unblock Log entry at the end of the file (or earlier when no later case needs it). Verify
   with read-only queries; update the Unblock Log rollback status. If a rollback fails, tell me at once.
7. Blocked is allowed ONLY when: I declined the plan item; the only fix is forbidden (see "Never");
   or approved attempts all failed. The Blocked reason must list: obstacle, what was tried, what is
   needed from me. Re-offer unblocking in the final summary for every remaining Blocked case.

## Review checklist (step 10)

- Every case in the TEST FILE has exactly one result (Pass/Fail/Blocked/Not Run); counts add up.
- Every Status cell in the TEST FILE equals the results file's value; none is still Pending (a case
  not run on purpose is "Not Run"); the Progress row matches the totals. Steps/expected text unchanged.
- This file has exactly one entry in TEST-CASES-LOG.yaml whose status matches the final result of its cases
  (Fail if any Fail, else Blocked if any Blocked/Not Run, else Pass); the log's `totals` equal the count
  of its entries; the file is valid YAML.
- Every Fail has actual result, evidence (screenshot) and a bug or known-gap reference. Every Blocked has a
  reason that shows it fits protocol step 7 (declined / forbidden / attempts failed, with what was tried).
- No unapproved change: every data change appears in the Unblock Log with my approval; each is rolled back and verified.
- No false Fail: re-read the case's expected result and "Conventions"; if the Fail came from a wrong
  selector, timing, wrong user or misread text, re-run the case and correct the result.
- No false Pass: a Pass has the expected text/value actually observed, not assumed.
- Bug files: complete per the guide format, correct severity, steps reproduce, `file:line` filled,
  no duplicates in BUGS-INDEX.md, known gaps not filed as bugs.
- Baseline restored and no test rows left (read-only queries). INDEX.md row and counts match.
- Secrets masked (`****`) in every file written.

## Final session variant (after all files)

```text
Read {output_folder}/EXECUTION-GUIDE.md. Do not execute test cases.
Check with read-only queries that every baseline value is restored and that no test rows remain.
Report any difference to me; do not fix data yourself.
Then write {output_folder}/test-results/SUMMARY.md (totals per story and file, all bugs with severity
from BUGS-INDEX.md, confirmed gaps).
REVIEW AND FIX: re-read SUMMARY.md against the results files and BUGS-INDEX.md. Totals, bug counts,
severities and statuses must match the source files exactly; fix any mismatch (max 2 rounds). Stop.
```
Command: `/aiqa-run-tests --summary`.

## Rules the prompt enforces

- Real execution only. Never invent a result. Result values: **Pass / Fail / Blocked / Not Run**.
- Browser visible by default. Headless only on explicit user request.
- No app/config/code changes. No write-SQL unless I approved the exact statement (Unblock Plan). Restore baseline.
- No case stays Blocked without running the Unblock Protocol first.
- One test file per session. Stop after the summary.

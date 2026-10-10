# Skill: project-setup  (`/aiqa-setup`)

Run once per project, re-run to refresh. Produces the three documents the 3 prompts depend on.
Update existing documents in place. Never replace a filled value with `<TODO>`.

## Steps

1. Read `config.yaml`. Run project detection (`skills/project-analysis`, writes `core/project.config.json`) or read it if present.
2. Ask the user only for what cannot be found in code, docs or DB:
   app URL · start/restart command (and may AI use it? default no) · database engine/connection (read-only) ·
   login method · UI language and direction · source roots · ignored paths · build/test commands ·
   requirements/stories folder · code-standards files · browser mode (default visible).
   Save answers to `config.yaml`.
3. Test users: extract roles from stories/authorization attributes. If a DB is configured, find matching
   accounts with **SELECT only**. Else ask the user. Never write real secrets; store `****`.
   List roles that have no user → "Missing roles".
4. Generate in `{output_folder}/`, from `templates/`:
   - `EXECUTION-GUIDE.md` ← `EXECUTION-GUIDE.template.md`
   - `INDEX.md` ← `INDEX.template.md` (list existing test-case files if any)
   - `DATABASE-TABLES.md` ← `DATABASE-TABLES.template.md` (read-only schema inspection; skip if no DB)
   Verify every fact (URL answers, DB answers SELECT, login works). Record the date. Baseline values
   come from read-only queries. Leave `<TODO>` only where the user must decide.
5. Create `{output_folder}/test-cases/`, `{output_folder}/test-results/bugs/` and copy
   `BUGS-INDEX.template.md` to `test-results/bugs/BUGS-INDEX.md` if missing.
6. REVIEW AND FIX (mandatory, before showing the user). Re-read the three documents as a reviewer.
   Check: every fact verified (URL answers, DB answers SELECT, login works); no wrong or stale
   values; test users match roles in the stories; Missing roles listed; data-change rules strict;
   baseline values present; secrets masked; no `<TODO>` left that could be found in code/DB;
   INDEX.md lists the existing test-case files. Fix each issue, re-verify. Max 2 rounds.
7. Show the user the filled guide (hard stop): ask to confirm URLs, users, data rules and protected
   settings. Apply corrections. Do not continue until confirmed.
8. Report: files written, review result (issues found / fixed / open), remaining `<TODO>` items, next command `/aiqa-writetestcases <story>`.

## Rules

- Read-only on app and DB. Do not start/stop/build the app.
- Data-change rules in the guide default to the strictest set (UI only, test-prefixed rows, restore baseline).
- Host-project files outside `{output_folder}` stay untouched, except `config.yaml` of this framework.

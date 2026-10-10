# Prompt 3 — Fix one bug

Command: `/aiqa-fixbug <bug-file>` · One new session per bug.
Generic: no project text. Conventions come from the **Execution Guide** and the project's code standards.

```text
BUG FILE: {{bug_file}}

You are a senior {tech_stack} developer on {project_name}. Read {code_standards_files} for conventions.

1. Read the BUG FILE, then {output_folder}/EXECUTION-GUIDE.md for environment and login.
2. Read the story it cites and the requirement it quotes ({project_knowledge}).
3. Reproduce the bug first (Playwright MCP browser — visible unless I said headless — or a request
   with the session cookie). If it does not reproduce, set Status to "Cannot Reproduce" with
   details, update BUGS-INDEX.md, and stop.
4. Find the root cause and make the smallest correct fix in {source_roots}. Never touch
   {ignored_paths}. Do not fix anything else, do not refactor.
   If the fix needs a schema change, add a NEW migration (never edit an old one) and tell me
   before applying it.
5. Verify:
   - build: {build_command}
   - tests: {test_command}; add or update a test for this fix
   - if the app needs a restart, ask me to restart it (or use the guide's restart command if I
     allowed it), then repeat the reproduction steps and confirm the expected result
6. Update the BUG FILE: Status = Fixed, fill "Fix Notes" (root cause, files changed, how verified).
   Update its row in BUGS-INDEX.md to Fixed. If the fix failed: Status = "Fix Failed" with notes.
7. REVIEW AND FIX (mandatory, before the commit). Review your own change as a code reviewer:
   run `git diff` against the "Review checklist" below. Fix each issue, then re-run build, tests
   and the reproduction. Max 2 rounds.
8. Commit on the current branch with a message that references the bug ID (type(scope): summary),
   then tell me what changed and the review result: issues found / fixed / left open. Stop.
   Do not fix other bugs.
```

## Review checklist (step 7)

- The diff contains only the fix and its test. No debug code, no unrelated or formatting-only changes.
- Root cause is fixed, not the symptom. The same defect pattern elsewhere is reported, not fixed.
- Follows {code_standards_files}; no secrets; no edits in {ignored_paths}; no edited old migration.
- Edge cases of the bug area (null/empty, roles, boundaries) are not broken by the change.
- Build and tests pass; the new test fails without the fix. Reproduction now shows the expected result.
- Bug file: Status, Fix Notes (root cause, files, verification) and BUGS-INDEX.md row are accurate.

## Rules the prompt enforces

- Reproduce before fixing. One bug per session. Smallest fix.
- No fix without verification evidence. Never mark Fixed on a guess.
- Never skip hooks, never force-push, never commit unrelated files.
- Bug files stay normal prose (not terse): they are read by other people.

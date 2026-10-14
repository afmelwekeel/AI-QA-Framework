# Skill: execute-tests  (`/aiqa-run-tests <test-case-file>`)

Load and follow `reusable-prompts/execute-tests.prompt.md` exactly. Set `{{test_file}}` to the argument.
`{{browser_mode}}` = visible unless the user said headless (`--headless`). Never choose headless by yourself.
`--summary` → run the "Final session variant" instead (restore check + `SUMMARY.md`).
Do the mandatory REVIEW AND FIX step (prompt step 10, and in `--summary` mode the SUMMARY check) before reporting. Report found / fixed / open.
After each case set its `Status` cell (and the `Progress` row) in the test-case file; touch nothing else there. Then update this file's single entry in `{output_folder}/TEST-CASES-LOG.yaml` with its overall file status.
One test file per run. Stop after the summary. Never invent results.
Bug file bodies and results notes: plain prose, not terse.

## Worktree isolation (applies first and last)
Before step 1: follow Phase A of rules/worktree-isolation.md (git worktree + sub-branch; app on a different port when the app/browser is needed). After the review pass: Phase B (reset port to base value, commit on sub-branch) and Phase C (ask the user to commit/push/merge and remove the sub-branch). Last line of the response: `(Next Step is : <next command>)`.

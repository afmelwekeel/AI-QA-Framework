# Skill: fix-bug  (`/aiqa-fixbug <bug-file>`)

Load and follow `reusable-prompts/fix-bug.prompt.md` exactly. Set `{{bug_file}}` to the argument.
Do the mandatory REVIEW AND FIX step (prompt step 7) on your own diff before committing. Report found / fixed / open.
Reproduce first. Smallest fix. Verify with build + tests + repro. One bug per run. Stop after the report.
Commit message and bug notes: normal prose, not terse.

## Worktree isolation (applies first and last)
Before step 1: follow Phase A of rules/worktree-isolation.md (git worktree + sub-branch; app on a different port when the app/browser is needed). After the review pass: Phase B (reset port to base value, commit on sub-branch) and Phase C (ask the user to commit/push/merge and remove the sub-branch). Last line of the response: `(Next Step is : <next command>)`.

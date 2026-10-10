# Skill: fix-bug  (`/aiqa-fixbug <bug-file>`)

Load and follow `reusable-prompts/fix-bug.prompt.md` exactly. Set `{{bug_file}}` to the argument.
Reproduce first. Smallest fix. Verify with build + tests + repro. One bug per run. Stop after the report.
Commit message and bug notes: normal prose, not terse.

# Skill: execute-tests  (`/aiqa-executetests <test-case-file>`)

Load and follow `reusable-prompts/execute-tests.prompt.md` exactly. Set `{{test_file}}` to the argument.
`{{browser_mode}}` = visible unless the user said headless (`--headless`). Never choose headless by yourself.
`--summary` → run the "Final session variant" instead (restore check + `SUMMARY.md`).
One test file per run. Stop after the summary. Never invent results.
Bug file bodies and results notes: plain prose, not terse.

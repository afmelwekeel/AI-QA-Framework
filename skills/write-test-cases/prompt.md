# Skill: write-test-cases  (`/aiqa-writetestcases <story-file>`)

Load and follow `reusable-prompts/write-test-cases.prompt.md` exactly. Set `{{story_file}}` to the argument.
Several story files of one feature: merge into ONE story folder named after the first file.
Do the mandatory REVIEW AND FIX step (prompt step 10) before reporting. Report found / fixed / open.
Every case gets `Status` = `Pending`; header table gets a `Progress` row. Add every test-case file (not each case) to `{output_folder}/TEST-CASES-LOG.yaml` (file path, case count, status).
Output: Markdown only, under `{output_folder}/test-cases/<story-folder>/`. Update `INDEX.md`. Stop after the file list.
Never compress test-case content (steps, expected results, exact UI texts).

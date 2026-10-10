# Skill: write-test-cases  (`/aiqa-writetestcases <story-file>`)

Load and follow `reusable-prompts/write-test-cases.prompt.md` exactly. Set `{{story_file}}` to the argument.
Several story files of one feature: merge into ONE story folder named after the first file.
Output: Markdown only, under `{output_folder}/test-cases/<story-folder>/`. Update `INDEX.md`. Stop after the file list.
Never compress test-case content (steps, expected results, exact UI texts).

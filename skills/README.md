# Skills

Each subfolder is one capability: `skill.json` (descriptor) · `prompt.md` (instructions) · `run.mjs` (validates input, returns the instruction envelope).

| Skill | Command | Purpose |
|---|---|---|
| project-setup | `/aiqa-setup` | Fill config + EXECUTION-GUIDE / INDEX / DATABASE-TABLES |
| project-analysis | (used by setup) | Detect stack, routes, auth, DB |
| write-test-cases | `/aiqa-create-testcases` | Prompt 2 — story → test-case Markdown |
| execute-tests | `/aiqa-run-tests` | Prompt 1 — run cases with Playwright MCP, results + bugs |
| fix-bug | `/aiqa-fixbug` | Prompt 3 — reproduce, fix, verify, commit one bug |

`_shared/prompt-skill.mjs` is the common handler. The canonical prompts live in `reusable-prompts/`.

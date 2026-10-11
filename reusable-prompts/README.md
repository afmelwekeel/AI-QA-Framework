# Reusable Prompts — the 3 prompts of the framework

| File | Command | Does |
|---|---|---|
| `write-test-cases.prompt.md` | `/aiqa-create-testcases <story>` | Story → test-case Markdown files (one per screen) |
| `execute-tests.prompt.md` | `/aiqa-run-tests <test-file>` | Run every case with Playwright MCP (browser visible), write results + bugs |
| `fix-bug.prompt.md` | `/aiqa-fixbug <bug-file>` | Reproduce, fix, verify, commit one bug |

All three are project-agnostic. Project facts live in three generated documents (made by `/aiqa-setup`):

| Document | Content |
|---|---|
| `{output_folder}/EXECUTION-GUIDE.md` | environment, login, test users, placeholders, data rules, result + bug formats |
| `{output_folder}/INDEX.md` | test-case file table + consolidated gaps |
| `{output_folder}/DATABASE-TABLES.md` | schema reference for read-only checks |

Variables (`{project_name}`, `{app_url}`, `{output_folder}`, …) come from `config.yaml`.
Skills and workflows load these prompts; they do not copy them.
You can also paste a prompt into any new AI session after replacing the first-line path.

Flow: `setup` once → per story `create-testcases` → per file `run-tests` → per bug `fixbug` → `run-tests --summary`.

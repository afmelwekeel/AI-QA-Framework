# Skills

Each subfolder is one **atomic AI QA capability**, structured for triple
compatibility (CLI · MCP · VS Code extension):

```
skills/<id>/
  skill.json   # MCP tool descriptor (id, inputs, outputs)
  prompt.md    # Reusable LLM prompt
  run.mjs      # Deterministic Node handler invoked by the orchestrator
```

| Skill | Purpose |
|---|---|
| project-analysis | Detect stack, routes, auth, DB |
| user-story-analysis | Parse stories into testable units |
| test-case-generation | Arabic CSV test cases |
| playwright-generation | POM + spec scaffolding |
| test-execution | Headed Playwright run |
| bug-analysis | Triage failures + Arabic bug reports |
| qa-reporting | Arabic summary (MD + HTML + CSV) |
| regression-testing | Baseline diff |
| security-validation | OWASP-style probe |
| accessibility-validation | axe-core a11y scan |
| autonomous-testing | Full pipeline driver |

To add a new skill:
1. Create the folder triplet above.
2. Register the command in `commands/registry.yaml` AND `core/orchestrator.mjs`.

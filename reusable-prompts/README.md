# Reusable Prompts

These are project-agnostic prompts the orchestrator (or any LLM driver)
can attach as the "system" or "task" message when invoking a skill.

| File | Skill |
|---|---|
| `analyze-project.prompt.md` | project-analysis |
| `analyze-story.prompt.md`   | user-story-analysis |
| `generate-test-cases.prompt.md` | test-case-generation |
| `generate-e2e.prompt.md` | playwright-generation |
| `analyze-bugs.prompt.md` | bug-analysis |
| `qa-report.prompt.md` | qa-reporting |

Each prompt:
- Contains NO project-specific text
- Refers to the input via the standard `ctx` envelope keys
- Outputs JSON or files described in the matching `skill.json`

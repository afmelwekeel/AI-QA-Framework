# Skill: Playwright E2E Generation

<!-- BMAD-aligned: variables resolved from config.yaml -->
<!-- config_source: {project-root}/AI-QA-FRAMEWORK/config.yaml -->
<!-- communication_language: {{communication_language}} -->
<!-- output_folder: {{output_folder}} -->
<!-- test_mode: {{test_mode}} -->
<!-- default_browser: {{default_browser}} -->

You generate Playwright tests in JavaScript using the Page Object Model.

Hard rules:
- Use `@playwright/test` only (no other runners).
- Each suite must produce TWO files:
  1) `testing/pages/<suite>.page.ts` (POM)
  2) `testing/tests/<suite>.spec.ts` (specs)
- Tests MUST use `expect(...).toBeVisible()` / `toHaveURL` / `toHaveText` — never bare assertions.
- All selectors prefer `getByRole`, `getByLabel`, `getByTestId` (in that order).
- Capture screenshot on every failure (configured globally).
- Add `console` and `pageerror` listeners that record into the Playwright report.
- Headed mode is the default for human-visible execution.
- Use the helpers in `testing/helpers/` for auth, network, and console capture.

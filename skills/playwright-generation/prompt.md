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
  1) `testing/pages/<suite>.page.js` (POM — JavaScript, not TypeScript)
  2) `testing/tests/<suite>.spec.js` (specs — JavaScript, not TypeScript)
- Tests MUST use `expect(...).toBeVisible()` / `toHaveURL` / `toHaveText` — never bare assertions.
- All selectors prefer `getByRole`, `getByLabel`, `getByTestId` (in that order).
- Capture screenshot on every failure (configured globally).
- Add `console` and `pageerror` listeners that record into the Playwright report.
- Headed mode is the default for human-visible execution.
- Use the helpers in `testing/helpers/` for auth, network, and console capture.

## URL Validation (MANDATORY after generating any spec file):

After writing each spec file, you MUST verify every URL path used in `page.goto()` calls:

1. **Extract** every unique path segment from all `page.goto()` calls (e.g., `/dashboard`, `/auth/login`)
2. **Cross-reference** each path against `routes.pages` in the framework's `core/project.config.json`
3. **For any path NOT found in project.config.json** — read the host project source code to find the real route:
   - Next.js: scan `pages/` or `app/` directory tree — the folder structure IS the route
   - React Router: read `src/**/routes*`, `src/**/App.*`, `src/**/router.*`
   - Vue Router: read `src/router/index.*` or `src/router.*`
   - Angular: read `src/app/**/*-routing.module.*`
   - Express / NestJS: read `src/**/routes*`, `src/**/*.controller.*`
4. **Correct** any wrong or invented URL paths with the actual routes found in source
5. **If a route truly cannot be confirmed** from source, add a `// TODO: verify route` comment in the spec — do NOT leave a guessed path silently

This rule exists because invented route paths cause every navigation test to fail immediately.

# Skill: Playwright E2E Generation

<!-- BMAD-aligned: variables resolved from config.yaml -->
<!-- config_source: {project-root}/AI-QA-FRAMEWORK/config.yaml -->
<!-- communication_language: {{communication_language}} -->
<!-- output_folder: {{output_folder}} -->
<!-- test_mode: {{test_mode}} -->
<!-- default_browser: {{default_browser}} -->

You generate Playwright tests in JavaScript using the Page Object Model.

## Source Code Reading (MANDATORY — do this BEFORE writing any file)

Before writing a single line of test code, read the actual host project source:

1. **Identify target pages** from the story ACs and known routes in `core/project.config.json`
2. **Read each page/component source file** completely:
   - Next.js (pages router): `pages/{route}.jsx|tsx|js|ts`
   - Next.js (app router): `app/{route}/page.jsx|tsx|js|ts`
   - React: `src/**/pages/**` and `src/**/components/**`
   - Vue: `src/**/views/**` and `src/**/components/**`
   - Angular: `src/app/**/*.component.html` + `.component.ts`
3. **Extract from each file**:
   - All `data-testid`, `data-cy`, `data-qa` attributes → use in `getByTestId()`
   - All form labels and input types → use in `getByLabel()`
   - All button text, aria-labels, and roles → use in `getByRole()`
   - Navigation links (href, router-link to) → confirm actual URL paths
   - Error/validation containers (class names, aria-live, role="alert") → use in assertions
   - API calls (fetch/axios URLs) → document as comments
4. **Read router config** (`src/router/index.*`, `src/**/App.*`, `src/**/routes.*`) to confirm all URL paths
5. **Never write a selector you didn't find in the source** — if you can't find it, use `// TODO: verify selector` rather than inventing one

## Selector priority (use in this order):
1. `getByTestId('...')` — if data-testid exists in source
2. `getByRole('...', { name: '...' })` — with EXACT text from source
3. `getByLabel('...')` — with EXACT label text from source
4. `getByText('...')` — with EXACT visible text from source
5. `locator('[data-cy="..."]')` — only if data-cy found in source

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

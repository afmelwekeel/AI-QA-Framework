# Test Data Generation Prompt

## Role
You are a senior QA data engineer. Generate comprehensive test data for Playwright E2E tests.

## Task
For the E2E suite: **{{suite}}**
Project detected: **{{config.frontend.framework}}** + **{{config.backend.framework}}**

## Output
Generate a `test-data/{{suite}}.testdata.json` file containing:

1. **User roles** with realistic credentials per role (admin, agent, supervisor, viewer)
2. **Valid inputs** — realistic positive test data matching the feature's domain
3. **Invalid inputs** — boundary values, empty strings, special chars, SQL injection, XSS payloads
4. **Suite-specific data** — domain data matching the feature (e.g. for campaigns: campaign name, audience, schedule)
5. **Expected messages** — success, error, validation message patterns in both Arabic and English

## Rules
- Never put real passwords — use placeholder `REPLACE_WITH_REAL_PASSWORD`
- Cover all input field types detected in the story
- Add both Arabic and English values where applicable
- Include `_meta` block with generated timestamp and framework version

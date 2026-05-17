# Reusable Prompt: Generate Test Data

## Role
You are a senior QA data engineer generating realistic test data for Playwright E2E tests.

## Task
Generate test data for suite: **{{suite}}**

## Requirements

- Output format: JSON file at `/test-data/{{suite}}.testdata.json`
- Include ALL of the following sections:

### 1. `_meta`
```json
{
  "_meta": {
    "suite": "{{suite}}",
    "generatedAt": "ISO timestamp",
    "version": "1.0.0"
  }
}
```

### 2. `path` — URL path for this suite

### 3. `baseUrl` — read from `core/project.config.json`

### 4. `users` — 4 roles: admin, agent, supervisor, readOnly
Each role must have: `email`, `password`, `displayName`, `role`, `permissions[]`

### 5. `validInputs` — at least 5 valid test inputs matching the suite's domain

### 6. `invalidInputs` — always include:
- XSS: `<script>alert('xss')</script>`
- SQL injection: `' OR 1=1 --`
- Empty string: `""`
- Very long string: 256+ characters
- Special chars: `!@#$%^&*()`

### 7. `specific` — suite-specific data (e.g., campaign names for campaign suite)

### 8. `expectedMessages` — success + error messages expected in the UI

## Rules
- Do NOT include real credentials
- Passwords must be at least 8 chars, include uppercase + number
- All data must be realistic (not "test123")
- Generate Arabic labels where appropriate

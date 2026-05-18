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

---

## User Review Checkpoint (MANDATORY — do NOT skip)

After generating the data files, execute this review loop **for each generated file**:

### Step R1 — Display the file content
Show the **full content** of the generated file to the user inside a code block. Do not summarize — show the raw JSON.

### Step R2 — Ask for confirmation
```
📋 Data Review Required — {file_name}

I've generated the test data above. Please review it carefully:

  • Are the URLs and endpoints correct for your environment?
  • Are the field names and values realistic for your project?
  • Are any credentials, IDs, or domain-specific values wrong or missing?
  • Should any value be replaced with a real one?

Reply with:
  ✅ "OK" / "looks good" / "correct" → I will proceed to the next file
  ✏️  Describe what is wrong → I will fix it and show you the corrected version
```

### Step R3 — WAIT for user response
**Do NOT proceed until the user explicitly confirms.** This is a hard stop.

### Step R4 — If user reports issues
1. Read each correction the user described
2. Apply all corrections to the file immediately (edit the actual JSON file)
3. Display the corrected full content again
4. Ask: *"I've applied your corrections. Does this look right now?"*
5. WAIT for confirmation again
6. Repeat until user says OK

### Step R5 — Only after all files are confirmed
Move to the next phase. Never skip the review for any file.

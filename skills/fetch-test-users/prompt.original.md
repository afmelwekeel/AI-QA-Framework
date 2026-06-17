# Skill: fetch-test-users

## Purpose
Read one or more user story files, identify every distinct **role / actor** required for testing, then fetch matching real accounts from the configured database — or guide the user through manual entry. Save the resulting test users to `config.yaml` so all subsequent QA commands can use them without prompting.

---

## When This Skill Is Used
- Before `/aiqa-generatee2e` or `/aiqa-fullworkflow` when `test_users` in `config.yaml` is empty
- When the user runs `/aiqa-fetchtestusers` directly
- When a command needs credentials and none are saved

---

## Step-by-Step Instructions

### Step 0 — Load configuration
Read `{project-root}/AI-QA-FRAMEWORK/config.yaml` and store:
- `{db_connection_string}`, `{db_users_table}`, `{db_username_column}`, `{db_password_column}`, `{db_role_column}`
- `{test_users}` — currently saved users (may be empty)

### Step 1 — Extract required roles from user stories

If one or more story files were provided (as arguments or via `/aiqa-fetchtestusers <story-file>`):

1. Read **each** story file fully.
2. Identify every **actor / role** mentioned using these patterns:
   - `as an <role>` / `as a <role>` (formal user story format)
   - Role keywords in acceptance criteria: *admin, manager, supervisor, agent, editor, viewer, guest, customer, owner, operator, employee, staff, reviewer, regular user*
   - Permission statements: "only admins can…", "managers must approve…", "guests should not see…"
3. De-duplicate and normalise role names (e.g. "system administrator" → "admin", "regular user" → "user").
4. Display the list:

```
📋 Roles required by the user story/stories:
   • admin
   • agent
   • regular_user
```

If **no story files** were provided, skip this step and proceed to Step 2 without any role filter (fetch all user types).

### Step 2 — Check existing test users

If `{test_users}` is not empty, show the list (mask passwords as `****`) and ask:
```
You already have N saved test user(s). What would you like to do?
  1) Add more users
  2) Replace all users (clear and start fresh)
  3) Keep current users and exit
```
- If user chooses **3**, stop.
- If user chooses **2**, clear `{test_users}`.

### Step 3 — Choose fetch method

Ask:
```
How would you like to provide test users?
  A) Fetch from database automatically — uses db_connection_string from config.yaml
  B) Enter users manually one by one
```

If user chooses **A** and `{db_connection_string}` is empty, ask the user to provide:
- Database connection string
- Users table name (default: `users`)
- Username column (default: `email`)
- Password column (default: `password`)
- Role column (default: `role`)

Save all provided values to `config.yaml` before continuing.

### Step 4a — Fetch from database (Path A)

Execute the orchestrator skill to run the database query:
```
node {project-root}/AI-QA-FRAMEWORK/core/orchestrator.mjs fetch-test-users [--stories "path1 path2"]
```

The skill will:
1. Detect DB type from the connection string
2. Generate and execute a parameterised query filtered by the required roles
3. Return a JSON result with `{ rolesNeeded, usersFound, source, dbType, count }`

Display results as a table:
```
✅ Fetched N user(s) from "{db_users_table}":

| #  | Role      | Username           | Password |
|----|-----------|-------------------|----------|
| 1  | admin     | admin@example.com | ****     |
| 2  | agent     | agent@example.com | ****     |
```

Ask:
```
Select which users to save (comma-separated numbers, "all", or "none"):
```

For each selected user, confirm or assign a role label:
```
Role label for admin@example.com [admin]:
```

If the query fails, offer:
1. Retry with a corrected connection string
2. Switch to manual entry (Path B)

### Step 4b — Manual entry (Path B)

Collect users one by one. For each user ask:
- Role / type (e.g. admin, manager, guest)
- Username or email
- Password (**never echo it back in plain text**)
- Notes (optional — e.g. "account with view-only permissions")

Show: `✓ User added: {role} — {username} — ****`

Ask: `Add another user? [Yes / No]`

### Step 5 — Save to config.yaml

Write the selected/collected users to `config.yaml` under `test_users:`:

```yaml
test_users:
  - role: "admin"
    username: "admin@example.com"
    password: "ActualPassword123"
    notes: ""
  - role: "agent"
    username: "agent@example.com"
    password: "AgentPass456"
    notes: "Primary agent account"
```

**Quality checks before saving:**
- `FU-1`: YAML is valid and properly indented
- `FU-2`: Every selected user has `role`, `username`, and `password` fields
- `FU-3`: No passwords appear in console output — always shown as `****`

### Step 6 — Confirm

Display final summary:
```
✅ Test users saved to config.yaml

| # | Role  | Username           | Notes |
|---|-------|--------------------|-------|
| 1 | admin | admin@example.com  |       |
| 2 | agent | agent@example.com  | ...   |

Total: N user(s) saved.

These credentials will be used automatically in:
  • /aiqa-generatee2e  (Phase 3 test data)
  • /aiqa-runtests     (Phase 5 login steps)
  • /aiqa-fullworkflow (Phases 3 & 5)

Run /aiqa-fetchtestusers at any time to update them.
```

---

## Critical Rules

- **NEVER** display passwords in plain text — always mask as `****`
- **NEVER** invent or hard-code fake credentials
- **ALWAYS** save to `config.yaml` before completing — in-memory users are lost on session end
- Use parameterised SQL queries — never concatenate user input into query strings
- After saving, confirm the YAML is syntactically valid (proper indentation, quoted strings)

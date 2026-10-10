# <Screen name> — Test Cases — Story <E.S>

| Item | Value |
|---|---|
| Route (+ query params) | `<GET /path>`; AJAX endpoints: `<...>` |
| Handler / Controller.Action | `<...>` |
| View / component file(s) | `<path>` |
| Story + ACs covered | Story <E.S>, AC <n>, AC <n> (every AC has ≥1 case) |
| Requirement refs | <id + exact quote> |
| Allowed roles | `<roles from code>` |
| Test users | <users from EXECUTION-GUIDE>. ⚠ needs user with role `<X>` (missing) |

## Known story/requirement ↔ code gaps to verify

| # | Gap | Exposed by |
|---|---|---|
| G-<SCR>-1 | <story says X, code does Y. Mark "likely defect (Severity)" when code contradicts an AC> | TC-<E><S>-<SCR>-NNN |

## Deferred / not in scope (do not raise as new bugs)

- <accepted gap, pre-existing behaviour, item from deferred-work>

## Conventions

- Priority: P1 = blocks story / data integrity, P2 = main behaviour, P3 = UI / edge.
- Type: FUNC, UI, RBAC, DATA, NEG, VAL, SEC, A11Y, EXP, NAV, REG.
- Exact texts (from code, original language): labels, buttons, validation, success, error, confirm dialogs, empty state.
- Placeholders: P_cur, P_past, classes, test-record prefix (from EXECUTION-GUIDE).
- Do not create, change or delete real data. Read-only queries and GET calls to check state.

## Test data (tester sets this up before running)

| Id | Data | How |
|---|---|---|
| D-<SCR>-1 | <needed data> | <existing / created by TC-… / read-only check query> |

## Test cases

### A. Role access
| ID | Title | Preconditions | Steps | Expected | Pri | Type | AC |
|---|---|---|---|---|---|---|---|
| TC-<E><S>-<SCR>-001 | <title> | <user, data> | 1. … 2. … | <exact result> | P1 | RBAC | AC1 |

### B. Functional
### C. Validation
### D. Data / DB checks
### E. Negative / error handling
### F. Security (injection, XSS, IDOR, CSRF token, forced browsing)
### G. Export / print
### H. UI, direction, responsive, accessibility
### I. Regression of neighbouring screens

## Playwright notes (this screen)

- Selectors / ids, collapsed panels to expand, modals (scope selectors), AJAX list requests to wait for, session/timeouts, duplicate ids.

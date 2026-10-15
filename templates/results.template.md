# Results — Story <E.S> — <NN> <screen> — <date> — tester: AI (Playwright MCP, <visible|headless>)

## Environment and placeholders
| Item | Value |
|---|---|
| URL | <app_url> |
| P_cur / P_past | <…> |
| Users used | <user (alias), …> |
| Baseline values recorded | <…> |

## Results
| ID | Result | Actual / Notes | Evidence |
|---|---|---|---|
| TC-… | Pass | … | screenshots/TC-….png |
| TC-… | Pass | Unblocked via U-1 (created user with role X via UI) | screenshots/TC-….png |
| TC-… | Blocked | Obstacle: …; tried: …; needed: … (user declined U-2 / forbidden / attempts failed) | — |
| TC-… | Fail | Expected …, got … → BUG-<E>-<S>-001 | screenshots/TC-….png |

Result values: Pass / Fail / Blocked / Not Run. Known-gap case: record observed behaviour + gap id.

## Totals
Pass N · Fail N · Blocked N · Not Run N

## Unblock Log
Every user-approved data change made to unblock cases (see UNBLOCK PROTOCOL). "None" if no unblock was needed.
| ID | Cases | Action | Method (UI / SQL / setting) | Before → After | Approved | Time | Rollback status |
|---|---|---|---|---|---|---|---|
| U-1 | TC-… | … | … | … → … | yes | <time> | reverted / failed / kept (reason) |

## Clean-up
<test rows created/deleted, values restored, read-only check result>

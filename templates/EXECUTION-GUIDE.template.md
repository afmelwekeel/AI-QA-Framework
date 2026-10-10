# <Project> — Test Execution Guide (for any new AI session)

> **Instruction to the AI model:** Read this file first, then INDEX.md, then the story file and test-case file you were given. Execute with the **Playwright MCP browser, visible (headed)** unless the user asked for headless. Record results as in section 8. Do not change application code. Ask the user before any action not described here.

Facts verified on **<date>**. Values marked `<TODO>` must be filled by `/aiqa-setup` before execution.

## 1. Environment
| Item | Value |
|---|---|
| Application | <stack, project file> |
| URL | <app_url> (certificate notes) |
| If the app is down | Stop and tell the user. Restart command: <none \| command> (use only if the user allowed it) |
| Database | <engine/host/name/auth>. Read-only command: `<…>` |
| Schema reference | DATABASE-TABLES.md |
| Ignore | <legacy/irrelevant folders> |
| UI language / direction | <language>, <LTR/RTL>. Compare texts exactly |
| UI libraries | <dialog / toast / select selectors> |
| Viewport | <1920×1080> |
| Browser mode | visible (headed). Headless only when the user asks |
| Session | <idle timeout> |
| Exports | <how to inspect downloaded files> |

## 2. Login
| Page | Use for | Notes |
|---|---|---|

Steps (visible): open page · type identity · type secret (never write real secrets in files; mask as ****) · click login · wait for landing page.
Switch user: <logout route/method>; else clear cookies.

## 3. Test Users
| User | Roles | Alias | Use |
|---|---|---|---|

Missing roles (no user holds them): <list>. Cases needing them are **Blocked** unless the user approves creating the account.

Role → screen access (from authorization attributes / route config):
| Screen | Roles |
|---|---|

## 4. Baseline (record before testing, restore at the end)
| Item | Value on <date> | How to check |
|---|---|---|

## 5. Test Data
### 5.1 Placeholders
| Placeholder | Value |
|---|---|
| P_cur | … |
| Test record prefix | e.g. `99…` / `E2E …` |

### 5.2 Data that does not exist yet
| Need | Status | What to do |
|---|---|---|

### 5.3 Rules for data changes
- Allowed through the UI only: create / edit / delete the test rows a test case creates (prefix above); record the old value before every edit; restore at the end of the file.
- Never run INSERT / UPDATE / DELETE / DDL SQL. SELECT only.
- Never delete or edit existing non-test records. Note cascades.
- Never change <protected settings>. Never trigger jobs.
- Ask the user first for any global change (activate / deactivate plans, create users, toggle jobs).
- Direct POST for negative cases: read the anti-forgery token from the page form; use the browser session; target test rows only.
- End of each file: read-only check that no test rows remain and section 4 is restored.

## 6. Execution Order
One test-case file per session. Order: <epics / stories>. Inside a story: file-number order. Final session: restore check + SUMMARY.md.

## 7. How to Execute (Playwright MCP)
Tools: `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`, `browser_select_option`, `browser_take_screenshot`, `browser_network_requests`, `browser_console_messages`, `browser_evaluate`. Resize to viewport first.
- Use the "Playwright notes" selectors; else labels / roles from `browser_snapshot`.
- Wait for AJAX lists after load / filter / save. Expand collapsed filter panels. Scope selectors to the modal form.
- Data checks: compare the screen with a SELECT or the AJAX response.
- "Block the server" cases: route interception (500). Never stop the app or DB.
- After 2 failed attempts to locate an element → Blocked with reason, continue.

## 8. Recording Results
| Output | Path |
|---|---|
| Results per file | `test-results/<story-folder>/<NN>-<screen>.results.md` |
| Screenshots | `test-results/<story-folder>/screenshots/<TC-ID>.png` |
| Bugs | `test-results/bugs/BUG-<E>-<S>-<SEQ>-<kebab-title>.md` + `BUGS-INDEX.md` |
| Final summary | `test-results/SUMMARY.md` |
| Test cases log (all test-case files, path, status) | `TEST-CASES-LOG.yaml` |

Formats: `templates/results.template.md`, `templates/bug-report.template.md`, `templates/BUGS-INDEX.template.md`.
Result values: Pass / Fail / Blocked / Not Run. Every case also has a `Status` cell in its test-case file: `Pending` until executed, then the result value; update it (and the file's `Progress` row) and the file's entry in `TEST-CASES-LOG.yaml` right after each case. Screenshot every Fail and key Pass. After each file: short summary, then stop.

### 8.1 Bug Reports
One file per real defect (not a data / environment problem). Read BUGS-INDEX.md first; if duplicate, add the TC id to the existing bug. Add one row per bug to the index.
Code locations for "Suspected Location": <source roots by layer>.
Severity guide:
- **Critical** — other tenant / plan data changed or exposed, data loss, access control broken, screen-blocking crash.
- **High** — AC or business rule not enforced, main function broken.
- **Medium** — wrong / missing message, wrong export, filter / paging wrong, missing field.
- **Low** — wording, layout, direction, cosmetic.

## 9. Known Issues (do not log again)
1. Everything in each test file's "Known gaps" and "Deferred / not in scope".
2. Everything in <deferred-work file>.
3. Test-environment settings (e.g. password not checked in test login).
